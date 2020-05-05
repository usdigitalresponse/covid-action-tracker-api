'use strict';
const Settings = require('../Settings');
const Logger = require('../utils/Logger');
const needle = require('needle');
const _ = require('lodash');
const CityCache = require('../models/mongo/CityCache');
const GeoCache = require('../models/mongo/GeoCache');
const Promise = require('bluebird');
const States = require('./States');
const path = require('path');
const sleep = async () => {await new Promise(r => setTimeout(r, 2000))};
const chalk = require('chalk');
//const natural = require('natural');
const fs = require('fs');
const ProgressBar = require('progress');
const Fuse = require('fuse.js');

class GeoServices {

    constructor(){

    }

    // ///////////////////////////////////////////////////////////////////////////////

    async setup(){
        // Load all the cities into a fuse js so we can do fuzy searchs on it
        let names = await CityCache.find({}, ['city', 'state', 'uuid']);

        Logger.debug(`Loading ${names.length} cities into fuzzy search engine`);

        // See https://fusejs.io/api/options.html#basic-options
        this.citySearch = new Fuse(names, {
            threshold: 0.4, // fuzziness, 0-1 where 1 would match everything
            includeScore: true,
            keys: ['city']
        });
    }

    // ///////////////////////////////////////////////////////////////////////////////

    /**
     * Import US Census city data with FIPS codes and population.
     * The data file can be downloaded here; 
     * "Subcounty Resident Population Estimates: April 1, 2010 to July 1, 2018 (SUB-EST2018)"
     * @see https://www.census.gov/data/datasets/time-series/demo/popest/2010s-total-cities-and-towns.html#ds
     */
    async __importCityData(){

        let csvFilename = path.resolve(__dirname, '../data/PEP_2018_PEPANNRES_with_ann.csv');
        var lines = fs.readFileSync(csvFilename, 'utf8').split('\r');

        /*        
        GEO.id,Id
        GEO.id2,Id2
        GEO.display-label,Geography
        rescen42010,"April 1, 2010 - Census"
        resbase42010,"April 1, 2010 - Estimates Base"
        respop72010,Population Estimate (as of July 1) - 2010
        respop72011,Population Estimate (as of July 1) - 2011
        respop72012,Population Estimate (as of July 1) - 2012
        respop72013,Population Estimate (as of July 1) - 2013
        respop72014,Population Estimate (as of July 1) - 2014
        respop72015,Population Estimate (as of July 1) - 2015
        respop72016,Population Estimate (as of July 1) - 2016
        respop72017,Population Estimate (as of July 1) - 2017
        respop72018,Population Estimate (as of July 1) - 2018
        */
    
        // Remove first 2 rows to get rid of comments and header
        lines.shift();
        lines.shift();

        var bar = new ProgressBar(`  Importing ${lines.length} cities [:bar] :rate/bps :percent`, {
            total: lines.length,
            width: 40
        });

        await Promise.map(lines, async (row)=>{

            
            // Break into parts, but ignore commas inside quotes
            let parts = row.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);

            if (!parts){
                Logger.error(row);
                bar.tick();
                return
            }
            
            //Logger.debug(parts, row);

            // id2 is made up of the state and city fips code (first 2 digits is state)
            let stateFips = parts[1].slice(0, 2);
            let cityFips = parts[1].slice(2);

            let label = parts[2].replace(/"/g,'');
            let labelParts = label.split(',')
            let state = labelParts[1].trim();
            let city =labelParts[0].trim();

            // the city name is appended with 'city' or 'town', so remove last work
            city = city.replace(/[\W]*\S+[\W]*$/, '')

            let stateInfo = States.find(state);

            let tmp = {        
                uuid: parts[0],
                fips: cityFips,
                stateFips: stateFips,
                city: city,
                state: stateInfo.code,
                population: parseInt(parts[parts.length-1])
            }

            // Now save to DB
            let doc = await CityCache.findOne({uuid: tmp.uuid});

            if (!doc){
                doc = new CityCache({uuid: tmp.uuid});
            }

            doc.fips = tmp.fips;
            doc.stateFips = tmp.stateFips;
            doc.fips = tmp.fips;
            doc.city = tmp.city;
            doc.state = tmp.state;
            doc.population = tmp.population;

            // layer in geo
            let geo = await GeoServices.getCityGeo(doc.city, doc.state);
            if (geo){
                doc.latitude = geo.latitude;
                doc.longitude = geo.longitude;
            }

            //Logger.debug(`Updating ${chalk.gray(doc.fips)} ${chalk.green(doc.city)} ${chalk.green(doc.state)}`);

            bar.tick();

            await doc.save();


        }, {concurrency:25});        



    }

    // ///////////////////////////////////////////////////////////////////////////////

    async getCityDemographics(city, state, debug){

        if (city.search(/new york city/i) !== -1){
            city = 'New York';
        }

        let stateInfo = States.find(state);

        let matches = this.citySearch.search(city);

        if (debug){
            //Logger.warn(`Looking for ${chalk.gray(city)}, ${chalk.green(stateInfo.code)}`, matches);
        }        

        if (_.isEmpty(matches)){
            Logger.warn(`No matches; was looking for ${chalk.green(city)}, ${chalk.green(state)}`, matches);
            return null;
        }

        // Get the best match with the right state
        for (let i=0; i<matches.length; i+=1){
            if (matches[i].item.state == stateInfo.code){
                
                // Best match for this state, load the city info and return 
                let cache = await CityCache.findOne({uuid:matches[i].item.uuid});

                if (debug){
                    Logger.warn(`Looking for ${chalk.green(city)}, ${chalk.green(stateInfo.code)} found ${chalk.red(cache.city)}, ${chalk.red(cache.state)}`);
                }    

                return cache;                
            }
        }

        Logger.warn(`No matches; was looking for ${chalk.green(city)}, ${chalk.green(state)}`);
        return null;

    }

    // ///////////////////////////////////////////////////////////////////////////////

    static async getCityGeo(city, state){

        if (city && state){
            
            let addressStr = `${city}, ${state}`;
            // Lookup in cache first
            let geo = await GeoCache.findOne({addressString: addressStr});

            if (!geo){
                let data = await GeoServices.addressLookup(addressStr);
                if (data){
                    geo = new GeoCache({
                        addressString: addressStr,
                        latitude: data.latitude,
                        longitude: data.longitude,
                        formattedAddress: data.formattedAddress                           
                    });
                    await geo.save();
                }
            }

            return geo;

        }      
        
        return null;
    }

    // ///////////////////////////////////////////////////////////////////////////////
}

if(require.main === module) {

    require('dotenv').config({ silent: false })

    setTimeout(async ()=>{

        let geo = new GeoServices();

        await geo.setup();

        //await geo.__importCityData();
        Logger.debug(await geo.getCityDemographics('New York City', 'NY', true));
        //Logger.debug(await geo.getCityDemographics('Costa Mesa', 'California', true));
        //Logger.debug(await geo.getCityDemographics('Meadow Bridge town',  'wv', true));

        Logger.info('done');
        process.exit(1);


    }, 500);
}
else {
    module.exports = GeoServices;
}

