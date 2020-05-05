'use strict';
const Settings = require('../Settings');
const Logger = require('../utils/Logger');
const Action = require('../models/mongo/Action');
const ActionMeta = require('../models/mongo/ActionMeta');
const CityCache = require('../models/mongo/CityCache');
const _ = require('lodash');

var DataMetaAPI = {

	// ///////////////////////////////////////////////////////////////////////////////////////

    async updateMeta(meta){

        let oldest = await Action.find({}).sort({dateOfAction:-1}).limit(1);
        let latest = await Action.find({}).sort({dateOfAction:1}).limit(1);

        meta = new ActionMeta();
        meta.cities = await Action.distinct('city');
        meta.states = await Action.distinct('state');
        meta.policyAreas = await Action.distinct('policyAreas');
        meta.actionTypes = await Action.distinct('actionTypes');
        meta.populations = await Action.distinct('populationImpacted');
        meta.pocEmails = await Action.distinct('pocEmail');
        meta.pocNames = await Action.distinct('pocFullName');
        meta.entities = await Action.distinct('entities.name');
        meta.categories = await Action.distinct('categories.name');
        meta.cityFips = await Action.distinct('cityFips');            

        meta.numberCities = meta.cities.length;            
        meta.numberPolicies = await Action.countDocuments({}); 

        let cityAgg = await CityCache.aggregate([
			{
				$match: {city: {$in:meta.cities}}
			},	
			{ 
				$group: {
                    _id: null,
                    totalPopulation: { $sum: '$population' }
				} 
            }
        ]);

        Logger.debug(cityAgg)


        meta.totalPeopleImpacted = cityAgg[0].totalPopulation;


        meta.dateLatest = latest[0].dateOfAction;
        meta.dateOldest = oldest[0].dateOfAction;

        return await meta.save();

    },

	// ///////////////////////////////////////////////////////////////////////////////////////

    async getMeta(req, res){
        
        let meta = await ActionMeta.findOne({});

        if (!meta){
            meta = new ActionMeta();            
            meta = await DataMetaAPI.updateMeta(meta);
        }

        res.json(meta);

    }

	// ///////////////////////////////////////////////////////////////////////////////////////


};

module.exports = DataMetaAPI;
