'use strict';

let request = require('request');
let Promise = require('bluebird');
let wfc = require('./waterfall-cafe');
let line = require('./line');

module.exports = class Action {

    static unknown(result, line_event){
        // reply to user.
        console.log("Going to apologize.");
        let reply_token = line_event.replyToken;
        let messages = [{
            type: "text",
            text: result.fulfillment.speech
        }]
        return line.replyMessage(reply_token, messages);
    }

    static tell_me_todays_menu(result, line_event){

        return wfc.getTodaysMenu().then(
            function(response){
                console.log("Got menu");

                let food_list = {};
                for (let food of response){
                    food_list[food.plate] = food;
                }

                if (food_list === {}){
                    return Promise.reject("Food list is 0.")
                }

                // reply to user.
                console.log("Going to reply today's menu.");
                let reply_token = line_event.replyToken;
                let messages = [{
                    type: "text",
                    text: "今日のPLATE Aは" + food_list.plate_a.menu + "です。"
                }]
                return line.replyMessage(reply_token, messages);
            },
            function(response){
                return Promise.reject("Failed to get today's menu.");
            }
        );
    }
};
