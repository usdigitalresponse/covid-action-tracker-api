"use strict";

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const _ = require('lodash');
const uuidv4 = require('uuid/v4');

let GeoCacheSchema = new Schema({
    uuid: { type: String, default: uuidv4, index: true },       
    addressString: { type: String, index:true },
    latitude: { type: Number },
    longitude:{ type: Number },
    formattedAddress: { type: String }

}, { 
    timestamps: { createdAt: 'created', updatedAt: 'updated' }
})



module.exports = mongoose.model('GeoCache', GeoCacheSchema)