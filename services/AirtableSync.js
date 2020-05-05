const Settings = require('../Settings');
const Airtable = require('airtable');
const Logger = require('../utils/Logger');
const camelCase = require('camelcase');
const _ = require('lodash');
const GeoServices = require('./GeoServices');
const ProgressBar = require('progress');
const Promise = require('bluebird');
const States = require('./States');
const DataAPI = require('../routes/data-meta-api');
const ActionMeta = require('../models/mongo/ActionMeta');
const Action = require('../models/mongo/Action');
const NlpCache = require('../models/mongo/NlpCache');

//var natural = require('natural');
const Cipher = require('../utils/Cipher');
const path = require('path');
const chalk = require("chalk");

/**
 * 
 * @see https://airtable.com/appFkkXqoLBWAkz4v/api/docs#curl/table:cities%20covid-19%20responses:list
 */
class AirtableSync {

    constructor(){

        this.mapping = {
            'Date Added': {key: 'dateAdded', type: 'date'},
            'City': {key: 'city', type: 'string'},
            'State': {key: 'state', type: 'string'},
            'Brief policy description': {key: 'description', type: 'string'},
            'Date of Action': {key: 'dateOfAction', type: 'date'},
            'Policy Area': {key: 'policyAreas', type: 'array'},
            'Action Type': {key: 'actionTypes', type: 'array'},
            'Population Impacted': {key: 'populationImpacted', type: 'array'},
            'Main point of contact full name': {key: 'pocFullName', type: 'string'},
            'Main point of contact phone number': {key: 'pocPhone', type: 'string'},
            'Main contact email': {key: 'pocEmail', type: 'string'},
            'Link to text or Release': {key: 'reference', type: 'string'},            
        }

        this.geo = new GeoServices();
        
        /*
        this.fuse = new Fuse(Object.keys(this.mapping), {
            shouldSort: true,
            threshold: 0.3,
            tokenize: true
        });
        */
        
        const baseId = 'appFkkXqoLBWAkz4v';
        this.base = new Airtable({apiKey: process.env.AIRTABLE_API_KEY}).base(baseId);
    }

    async setup(){
        await this.geo.setup();
    }

    async generateMeta(){
        await ActionMeta.deleteMany({});
        let meta = await ActionMeta.findOne({});
        if (!meta){
            meta = new ActionMeta();
        }
        DataAPI.updateMeta(meta);    
    }


    async processRecord(record){

        function cleanItem(itm){
            if (!itm){
                return null;
            }
            return itm.trim();
        }   

        function toTitleCase(str) {
            return str.replace(/\w\S*/g, function(txt){
                return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
            });
        }
                

        let uuid = record.id;

        /*
        let action = await Action.findOne({uuid: uuid});

        if (!action){
            Logger.debug(`Adding record ${chalk.blue(uuid)}`);
            action = new Action({uuid: uuid});
        }
        else {
            Logger.debug(`Updating record ${chalk.blue(uuid)}`);
        }
        */

        let action = {
            uuid: record.id
        };

        //else {
        //    Logger.debug(`Updating record ${chalk.green(uuid)}`);
        //}


        let keys = Object.keys(record.fields);

        for (let i=0; i<keys.length; i+=1){
            
            let sheetKey = keys[i];

            let meta = this.mapping[sheetKey];
            let val = record.fields[sheetKey];

            if (!meta){
                Logger.warn(`Key "${chalk.blue(sheetKey)}" not found`);
                process.exit(1)
            }

            // Logger.debug(`${sheetKey}`, record.fields, val);
    
            if (meta.type == 'array'){
                if (typeof val == 'string'){
                    let parts = val.split(',')
                    action[meta.key] = _.map(parts, cleanItem);
                }
                else {
                    action[meta.key] = _.map(val, cleanItem);
                }
            }
            else if (meta.type == 'date'){      
                
                // Try to decode date
                var timestamp = Date.parse(val);
    
                if (isNaN(timestamp) == false) {
                    action[meta.key] = new Date(timestamp);
                }                
                else {
                    Logger.error(`Bad time stamp`, val);
                }
    
            }                
            else {
                action[meta.key] = cleanItem(val);    
            }

        }

        // Add state code
        if (action.state){
            let stateInfo = States.find(action.state);
            if (stateInfo && stateInfo.code){
                action.stateCode = stateInfo.code;
            }    
        }

        // Check for city in DB cache
        if (action.city && action.state){
            
            let dem = await this.geo.getCityDemographics(action.city, action.state);

            if (dem){
                action.population = dem.population;
                action.latitude = dem.latitude;
                action.longitude = dem.longitude;
                action.cityFips = dem.fips;
                action.stateFips = dem.stateFips;
            }
            else {
                Logger.error(`No demo data for ${action.city}, ${action.state}`);
            }

        }
        else {
            Logger.error(`No state or city for ${action.uuid}`);
        }
  
        // Try to get NLP info...
        /*
        if (action.description){

            let nlp = await this.__getNlp(action.description);

            if (nlp){
                action.entities = nlp.entities;
                action.categories = nlp.categories;
            }  
    
        }
        else {
            Logger.error(`No description for action ${action.uuid}`);
        }
        */

        return action;
        
    }

    async getDocs(){

        // Delete all first
        //await Action.destroy({ where: {}});
        //await Action.deleteMany({});
        
        let actions = [];

        await new Promise((resolve, reject) => {  
            
            this.base('Cities COVID-19 Responses')
                .select({view: "Grid view"})
                .eachPage(async (records, fetchNextPage)=>{
                
                    Logger.debug(`Found ${records.length} records`)
                    /*
                    // This function (`page`) will get called for each page of records.
                    records.forEach(function(record) {
                        this.__prepItem()
                        Logger.debug('Retrieved', record.get('Date Added'));
                        Logger.debug(record._rawJson);
                        Logger.debug(record.fields);
                    });
                    */
                                 
                    let batch = await Promise.map(records, async (record)=>{
                        return await this.processRecord(record);
                    }, {concurrency:25});

                    actions = actions.concat(batch);

                    // To fetch the next page of records, call `fetchNextPage`.
                    // If there are more records, `page` will get called again.
                    // If there are no more records, `done` will get called.
                    fetchNextPage();
            
                }, function done(err) {
                    if (err){
                        return reject(err);
                    }
                    return resolve();
                }
            );  

        });

        await Action.deleteMany({});

        Logger.debug(`Creating ${actions.length} actions`);

        await Action.insertMany(actions);

        // Reset meta data
        await this.generateMeta();

        return
      
    }

}

if(require.main === module) {

    setTimeout(async ()=>{

        const sync = new AirtableSync();
        await sync.setup();
        await sync.getDocs();
    
        Logger.debug('Finished!');
        process.exit(1);
    
    }, 500);
}
else {
    module.exports = AirtableSync;
}


