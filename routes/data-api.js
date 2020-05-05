'use strict';
const Settings = require('../Settings');
const Logger = require('../utils/Logger');
const Action = require('../models/mongo/Action');
const _ = require('lodash');
const moment = require('moment');
const Papa = require('papaparse');
const ObjectsToCsv = require('objects-to-csv');

var DataAPI = {

	// ///////////////////////////////////////////////////////////////////////////////////////

    /**
     * Get data aggregated by location, used to get data for mapping
     */
    async geoSearch(req, res){

        let query = DataAPI.__generateQuery(req);
        
        query.latitude = {$ne: null};
        query.longitude = {$ne: null};

		let docs = await Action.aggregate([
			{
				$match: query
			},	
			{ 
				$group: {
					_id: {city: "$city", state: "$state"},
                    count: { $sum: 1 },
                    latitude: { $first: "$latitude" },
                    longitude: { $first: "$longitude" },
                    population: { $first: "$population" },
                    uuid: { $push: "$uuid" },
                    cohorts: { $addToSet:  "$populationImpacted" },
                    actionTypes: { $addToSet:  "$actionTypes" },
                    policyAreas: { $addToSet:  "$policyAreas" }
				} 
            },

            { 
                $addFields: {
                 
                    cohorts: {
                        $reduce: {
                            input: "$cohorts",
                            initialValue: [],
                            in: { $setUnion: [ "$$value", "$$this" ] }
                        }
                    },
                    actionTypes: {
                        $reduce: {
                            input: "$actionTypes",
                            initialValue: [],
                            in: { $setUnion: [ "$$value", "$$this" ] }
                        }
                    },
                    policyAreas: {
                        $reduce: {
                            input: "$policyAreas",
                            initialValue: [],
                            in: { $setUnion: [ "$$value", "$$this" ] }
                        }
                    }
                }
            },
			{
				$project: {
                    _id : 0,
					uuids: "$uuid",
					state: "$_id.state",
					city: "$_id.city",
					latitude: "$latitude",
                    longitude: "$longitude",
                    count: "$count",
                    population: "$population",
                    cohorts: "$cohorts",
                    actionTypes: "$actionTypes",
                    policyAreas: "$policyAreas"
				}
            }   
        ]);	
                
        res.json(docs);

    },

    // ///////////////////////////////////////////////////////////////////////////////////////

    async dowmnload(req, res){

        let qry = DataAPI.__generateQuery(req);

        let limit = 999999999;
        let skip = 0;   
        let orderBy = { 'dateOfAction': 1 };
    
        if (req.body.sortKey) {
            orderBy = {};
            req.body.sortDirection = parseInt(req.body.sortDirection);
            orderBy[req.body.sortKey] = (req.body.sortDirection === -1 || req.body.sortDirection === 1) ? req.body.sortDirection : 1;        
        }

        var proj = {
            'dateOfAction': 1, 
            'city': 1, 
            'state': 1, 
            'population': 1,
            'populationImpacted': 1, 
            'policyAreas': 1, 
            'description': 1, 
            'actionTypes': 1, 
            'reference': 1, 
            'pocFullName': 1, 
            'pocPhone': 1, 
            'pocEmail': 1, 
            _id: -1
        };

        if (req.body.projection) {
            proj = req.body.projection.split(',').map(item => item.trim());
        }        
    
        //Logger.debug('Download Params = ', req.body);
        //Logger.debug('Download Query = ', qry);

        let docs = await Action.find(qry, proj).skip(skip).limit(limit).sort(orderBy).exec();
        
        // Convert to clean object
        let objects = _.map(docs, function(o){return o.toJSON()});

        Logger.debug(`Found ${docs.length} ${objects.length} docs`);

        //const csv = new ObjectsToCsv(objects);
        //let txtCsv = await csv.toString();
        var txtCsv = Papa.unparse({
            fields: ["dateOfAction", "city", "state", "population", "populationImpacted", "policyAreas", "description", "actionTypes", "reference", "pocFullName", "pocPhone", "pocEmail"],
            data: objects
        });

        let filename = `actions-${moment().format('MMM-Do-YY')}.csv`;

        //res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Type', 'application/octet-stream');
        
        //res.setHeader('Content-Disposition', `attachment; filename="participants-${moment().format('MMM-Do-YY')}.csv"`);
        
        res.attachment(filename);
        res.status(200).send(txtCsv);        
    },

	// ///////////////////////////////////////////////////////////////////////////////////////

    /**
     * Process query params, and build database query based on them
     */
    __generateQuery(req){
        
        var query = {
            //dateOfAction: {$ne: null}
        };
    
        if (req.body.query) {
            query.$or = [
                {description: new RegExp(req.body.query, "i")},
                {state: new RegExp(req.body.query, "i")},
                {city: new RegExp(req.body.query, "i")}
            ]
        }
    
        const prepArray = (val) => {
            if (typeof val == 'string'){
                return val.split(',').map(item => item.trim());
            }  
            return val;
        }

        const testDate = (val) => {
            
            if (!val || val == 'undefined'){
                return false;
            }

            // Try to decode date
            var timestamp = Date.parse(val);

            if (isNaN(timestamp) == false) {
                return true;
            }                
            else {
                return false;
            }
        }        


        if (req.body.uuid) {
            query.uuid = req.body.uuid;            
        }
        else if (req.body.uuids) {
            query.uuid = { $in: prepArray(req.body.uuids) };   
        }
    

        if (req.body.cities) {
            query.city = { $in: prepArray(req.body.cities) };            
        }
    
        if (req.body.states) {           
            query.state = { $in: prepArray(req.body.states) };         
        }

        if (req.body.policyAreas) {         
            query.policyAreas = { $in: prepArray(req.body.policyAreas) };       
        }

        if (req.body.actionTypes) {        
            query.actionTypes = { $in: prepArray(req.body.actionTypes) };      
        }

        if (req.body.populations) {         
            query.populationImpacted = { $in: prepArray(req.body.populations) };  
        }

        if (req.body.fromDate || req.body.toDate){

            let startDate = testDate(req.body.fromDate) ? moment(req.body.fromDate, 'MM/DD/YYYY').utcOffset(0) : moment().subtract(1, 'year');
            let endDate = testDate(req.body.toDate) ? moment(req.body.toDate, 'MM/DD/YYYY').utcOffset(0) :  moment().add(1, 'month');

            startDate.set({hour:0,minute:0,second:0,millisecond:0})                        
            endDate.set({hour:59,minute:59,second:59,millisecond:999})                        
    
            query.dateOfAction = { $lte: endDate.toDate(), $gte: startDate.toDate()};
        } 


                
        if (req.body.populationRange) {
            
            let val = req.body.populationRange;
            if (typeof val == 'string'){
                val = JSON.parse(val);
            }

            let min = (val.min) ? val.min : -Number.MAX_VALUE;
            let max = (val.max) ? val.max : Number.MAX_VALUE;

            query.population = { $lte: max, $gte: min};
        }


        if (req.body.latitude) {
            
            let val = req.body.latitude;

            if (typeof val == 'string'){
                val = JSON.parse(val);
            }

            let min = (val.min) ? val.min : -Number.MAX_VALUE;
            let max = (val.max) ? val.max : Number.MAX_VALUE;

            query.latitude = { $lte: max, $gte: min};
        }
        
        if (req.body.longitude) {
            
            let val = req.body.longitude;

            if (typeof val == 'string'){
                val = JSON.parse(val);
            }

            let min = (val.min) ? val.min : -Number.MAX_VALUE;
            let max = (val.max) ? val.max : Number.MAX_VALUE;

            query.longitude = { $lte: max, $gte: min};
        }        
        
        return query;

    },

	// ///////////////////////////////////////////////////////////////////////////////////////

    async search(req, res){
              
        let qry = DataAPI.__generateQuery(req);

        //
        // Get sorting and paging optins
        //

        let limit = req.body.limit ? parseInt(req.body.limit) : 50;
        let skip = req.body.skip ? parseInt(req.body.skip) : 0;    
        let orderBy = { 'dateOfAction': 1 };
    
        if (req.body.sortKey) {
            orderBy = {};
            req.body.sortDirection = parseInt(req.body.sortDirection);
            orderBy[req.body.sortKey] = (req.body.sortDirection === -1 || req.body.sortDirection === 1) ? req.body.sortDirection : 1;        
        }

        var proj = ['uuid', 'city', 'state', 'stateCode', 'dateOfAction', 'description', 'reference', 
            'pocFullName', 'pocPhone', 'pocEmail', 'policyAreas', 'actionTypes', 'populationImpacted', 'latitude', 'longitude', 'population', 'cityFips', 'stateFips'];

        if (req.body.projection) {
            proj = req.body.projection.split(',').map(item => item.trim());
        }        
    

    
        // If this is a test query, setup to make use of text indices
        /*
        let docs = [];
        if (req.body.query){

            qry.$text = { $search : req.body.query };
            orderBy.score = {$meta: 'textScore' };

            //docs = await Action.find(qry, { score : { $meta: "textScore" } }).skip(skip).limit(limit).sort(orderBy).exec();

            Logger.info('DOAGSDGSD');

            docs = await Action.find( { $text : { $search : "hospital" } }, { score : { $meta: "textScore" } }).skip(skip).limit(limit).sort({ score : { $meta : 'textScore' } }).exec();

            Logger.debug(docs)

        }
        else {
            docs = await Action.find(qry).skip(skip).limit(limit).sort(orderBy).exec();
        }
        */

        //Logger.debug('Query = ', qry);
        //Logger.debug('Projection = ', proj);

        let docs = await Action.find(qry, proj).skip(skip).limit(limit).sort(orderBy).exec();
        let count = await Action.countDocuments(qry);


        //Logger.debug(docs[0])
        // Get all the docs, but summarized for map view and keep light weight!!!
        //let proj = ['latitude', 'longitude', 'uuid'];
        //let docsLight = await Action.find(query, proj).exec();


        var data = {
            results: docs,
            meta: {
                pageNumber: Math.ceil(skip / limit),
                limit: limit,
                skip: skip,
                numberPages: Math.ceil(count / limit),
                totalResults: count
            }
        };
    
        res.json(data);

    }

};

module.exports = DataAPI;
