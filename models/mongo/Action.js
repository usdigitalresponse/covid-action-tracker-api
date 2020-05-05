"use strict";

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const _ = require('lodash');
const uuidv4 = require('uuid/v4');

let ActionSchema = new Schema({

    uuid: { type: String, default: uuidv4, index: true, unique: true },       
    dateAdded: { type: Date },
    city: { type: String, index:'text'  },
    state: { type: String, index:'text'  },
    stateCode: { type: String, index:true  },
    dateOfAction: { type: Date, index:true  },
    description:  { type: String, index:true  },
    reference: { type: String },
    pocFullName:  { type: String },
    pocPhone:  { type: String },
    pocEmail:  { type: String },

    policyAreas: [{ type: String }],
    actionTypes: [{ type: String }],
    populationImpacted: [{ type: String }],

    // Default to center of US
    latitude: { type: Number },
    longitude:{ type: Number },

    population:  { type: Number },

    cityFips: { type: String, index:true  },
    stateFips: { type: String, index:true  },

    entities:  [
        {
            name: { type: String },
            type: { type: String },
            salience: { type: Number },
        }
    ],

    categories:  [
        {
            name: { type: String },
            confidence: { type: String }
        }
    ],

}, { 
    timestamps: { createdAt: 'created', updatedAt: 'updated' },
    skipVersioning: { policyArea: true, populationImpacted:true, actionType:true }
})

/*
ActionSchema.index(
    {city: "text", state: "text", description: "text", reference:"text"}, 
    {weights: {city: 1, state: 2, description: 10, reference: 1}}
)
*/

module.exports = mongoose.model('Action', ActionSchema)