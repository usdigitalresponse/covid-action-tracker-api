"use strict";

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const _ = require('lodash');
const uuidv4 = require('uuid/v4');

let NlpCacheSchema = new Schema({
    uuid: { type: String, default: uuidv4, index: true },       
    text: { type: String },
    checksum: { type: String, index:true },
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
    timestamps: { createdAt: 'created', updatedAt: 'updated' }
})



module.exports = mongoose.model('NlpCache', NlpCacheSchema)