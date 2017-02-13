'use strict';

let request = require('request');
let Promise = require('bluebird');
let crypto = require('crypto');
let base64url = require('base64url');
const API_BASE = "https://apex.oracle.com/pls/apex/" + process.env.ORACLE_WORKSPACE + "/wfc";

module.exports = class WaterfallCafe {
    static randomStringAsBase64Url(size) {
        return base64url(crypto.randomBytes(size));
    }

    static createUser(user){
        return new Promise(function(resolve, reject){
            let headers = {
                'Content-Type': 'application/json'
            };
            let url = API_BASE + '/user';
            let body = {
                user_id: user.userId,
                display_name: user.displayName,
                picture_url: user.pictureUrl
            }

            // 認証用のセキュリティコードを生成
            body.security_code = WaterfallCafe.randomStringAsBase64Url(40);

            request({
                url: url,
                method: 'POST',
                headers: headers,
                body: user,
                json: true,
            }, function (error, response, body) {
                if (error) {
                    return reject(error);
                }
                if (response.statusCode != 200){
                    return reject(response);
                }
                return resolve(person);
            });
        });
    }

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
