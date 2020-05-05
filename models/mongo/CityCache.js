"use strict";

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const uuidv4 = require('uuid/v4');

let CitySchema = new Schema({    
    uuid: { type: String, default: uuidv4, index: true, unique: true },      
    fips: { type: String, index: true },
    stateFips: { type: String },
    city: { type: String, index: 'text' },
    state: { type: String, index: true },
    population: { type: Number, default: 0 },
    latitude: { type: Number },
    longitude: { type: Number }
}, { 
    timestamps: { createdAt: 'created', updatedAt: 'updated' }
})

//CitySchema.index({city: "text"}, {weights: {city: 1}});

module.exports = mongoose.model('CityCache', CitySchema)