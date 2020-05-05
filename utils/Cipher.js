"use strict";
const Settings = require('../Settings');
const crypto = require("crypto");

var Cipher = {


    checksum(dataString) {

        return crypto
            .createHash('sha256')
            .update(dataString, 'utf8')
            .digest('hex')
  
    }

}

module.exports = Cipher;
