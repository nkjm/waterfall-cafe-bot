'use strict';

let request = require('request');
let Promise = require('bluebird');
const MAKER_URL_PREFIX = 'https://maker.ifttt.com/trigger/';
const MAKER_KEY = process.env.MAKER_KEY;

module.exports = class Hue {
    static change_color(color){
        return new Promise(function(resolve, reject){
            let url = MAKER_URL_PREFIX + 'hue_change_color/with/key/' + MAKER_KEY;
            let body = {value1: color};
            request({
                method: "POST",
                url: url,
                body: body,
                json: true
            }, function (error, response, body) {
                (error) ? reject(error) : resolve(body);
            });
        });
    }

    static all_turn_on(){
        return new Promise(function(resolve, reject){
            let url = MAKER_URL_PREFIX + 'hue_all_turn_on/with/key/' + MAKER_KEY;
            request({
                method: "POST",
                url: url,
                json: true
            }, function (error, response, body) {
                (error) ? reject(error) : resolve(body);
            });
        });
    }

    static all_turn_off(){
        return new Promise(function(resolve, reject){
            let url = MAKER_URL_PREFIX + 'hue_all_turn_off/with/key/' + MAKER_KEY;
            request({
                method: "POST",
                url: url,
                json: true
            }, function (error, response, body) {
                (error) ? reject(error) : resolve(body);
            });
        });
    }
}
