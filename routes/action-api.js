
'use strict';
const Settings = require('../Settings');
const Logger = require('../utils/Logger');
const Action = require('../models/mongo/Action');
const _ = require('lodash');
const uuidv4 = require('uuid/v4');

/**
 * These routes allow a super/admin user administer other users
 */
var ActionAPI = {

	// ///////////////////////////////////////////////////////////////////////////////////////
    
    /**
     * Middleware to load an action
     */
    async load(req, res, next) {

        if (!req.params.actionId){
            throw new Error(`You must specify the action uuid`);
        }

        req.action = await Action.findOne({uuid: req.params.actionId})

		if (!req.action) {
			throw new Error(`Could not find action ${req.params.actionId}`);
		}

		return next();

    },

	// ///////////////////////////////////////////////////////////////////////////////////////

    async get(req, res) {
        res.json(req.action)
    },

	// ///////////////////////////////////////////////////////////////////////////////////////

    async delete(req, res) {        
        req.action.status = 'deleted';
        res.json({ result: 'ok', uuid: req.action.uuid });
    },

	// ///////////////////////////////////////////////////////////////////////////////////////

    /**
     * Update the action
     */
    async update(req, res) {

        // Don't let a caller update these fields
        var forboden = ['_id', 'uuid', 'created', 'modified'];

        for (var key in req.body.action) {
            if (_.indexOf(forboden, key) == -1) {
                req.action[key] = req.body.action[key];
            }
        }

        let updated = await req.action.save();

        res.json(updated);
    },

	// ///////////////////////////////////////////////////////////////////////////////////////

	async create(req, res) {

        let action = new action({ 
            uuid: uuidv4()
        });
        
        await action.save();
        
        res.json(action);

    }
    
};

module.exports = ActionAPI;
