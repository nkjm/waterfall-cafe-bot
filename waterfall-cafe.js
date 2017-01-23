'use strict';

let request = require('request');
let Promise = require('bluebird');
const API_BASE = "https://apex.oracle.com/pls/apex/evangelist/wfc";

module.exports = class WaterfallCafe {

    static getTodaysMenu(){
        return new Promise(function(resolve, reject){
            const url = API_BASE + "/menu/today";
            const headers = {
                'Content-Type': 'application/json'
            };
            request({
                url: url,
                method: 'GET',
                headers: headers,
                json: true,
            }, function (error, response, body) {
                (error) ? reject(error) : resolve(body);
            });
        });
    }

};
