'use strict';

let request = require('request');
let Promise = require('bluebird');
let crypto = require('crypto');
let base64url = require('base64url');
const API_BASE = "https://apex.oracle.com/pls/apex/" + process.env.ORACLE_WORKSPACE + "/wfc";

module.exports = class WaterfallCafe {

    static getMenu(when){
        return new Promise(function(resolve, reject){
            const url = API_BASE + "/menu/" + when;
            const headers = {
                'Content-Type': 'application/json'
            };
            request({
                url: url,
                method: 'GET',
                headers: headers,
                json: true,
            }, function (error, response, body) {
                (error) ? reject(error) : resolve(body.items);
            });
        });
    }

};
