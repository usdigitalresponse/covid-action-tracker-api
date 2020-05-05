"use strict";

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const _ = require('lodash');

let AccountSchema = new Schema({
    cities: [{ type: String}],
    states: [{ type: String}],
    cityFips: [{ type: String}],
    policyAreas: [{ type: String}],
    actionTypes: [{ type: String}],
    populations: [{ type: String}],
    pocEmails: [{ type: String}],
    pocNames: [{ type: String}],
    entities: [{ type: String}],
    dateOfActions: [{ type: Date}],
    categories: [{ type: String}],
    totalPeopleImpacted: {type: Number},
    numberCities: {type: Number},
    numberPolicies: {type: Number},
    dateLatest: {type: Date},
    dateOldest: {type: Date}
}, { 
    timestamps: { createdAt: 'created', updatedAt: 'updated' },
    skipVersioning: { policyArea: true, populationImpacted:true, actionType:true }
})



module.exports = mongoose.model('ActionMeta', AccountSchema)