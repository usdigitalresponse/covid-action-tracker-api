'use strict';
const Settings = require('../Settings');
process.env.PORT = 2000 + Math.floor(Math.random() * 10000);
const request = require('supertest');
const Logger = require('../utils/Logger');
const app = require('../index.js');
const ActionMeta = require('../models/mongo/ActionMeta');
const Action = require('../models/mongo/Action');

const _ = require('lodash');

var dataMeta = null;

const testArrayType = async (field) => {

    let type = _.sample(dataMeta[field]);

    const response = await request(app).get(`/data/search?limit=2&${field}=${[type].join(',')}`);
    let qry = {dateOfAction: {$ne: null}};
    qry[field] = type;
    let count = await Action.countDocuments(qry);

    expect(response.status).toEqual(200)
    expect(response.type).toEqual("application/json");
    
    let searchMeta = response.body.meta;
    Logger.debug(`${field} meta = `, searchMeta);
    expect(searchMeta.limit).toEqual(2);
    expect(searchMeta.skip).toEqual(0);    
    expect(searchMeta.totalResults).toEqual(count);

    let items = response.body.results;

    expect(items[0][field]).toContain(type);
    if (response.body.meta.totalResults > 1){
        expect(items[1][field]).toContain(type);
    }
}

describe('/data', () => {

    beforeAll(async () => {     
               
        dataMeta = await ActionMeta.findOne({});
            
        expect(_.isEmpty(dataMeta.actionTypes)).toEqual(false);
        expect(_.isEmpty(dataMeta.policyAreas)).toEqual(false);
        expect(_.isEmpty(dataMeta.states)).toEqual(false);
        expect(_.isEmpty(dataMeta.populations)).toEqual(false);

        return;
    });

    /*
    test('GET /geo/search', async () => {

        const response = await request(app).get("/data/geo/search")
        
        expect(response.status).toEqual(200)
        expect(response.type).toEqual("application/json")

        console.log(response.body)
        //expect(typeof response.body.started).toBe('string')
        //expect(typeof response.body.uptime).toBe('number')

    });
    */

    describe('/data/search', () => {

        test.only('Searching using actionTypes', async () => {
            return await testArrayType('actionTypes');
        }); 

        test('Searching using policyAreas', async () => {
            return await testArrayType('policyAreas');
        });         

        test('Searching using populations', async () => {
            return await testArrayType('populations');
        });          

    });

   
});