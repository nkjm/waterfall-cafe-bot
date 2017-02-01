'use strict';

let request = require('request');
let Promise = require('bluebird');
let memory = require('memory-cache');
let wfc = require('./waterfall-cafe');
let line = require('./line');

module.exports = class ActionCommon {
    static is_context_sufficient(){

    }

    static collect(){

    }

    static action(){

    }
}

    static show_todays_menu(conversation, line_event){
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
