'use strict';

let Promise = require('bluebird');
let memory = require('memory-cache');
let line = require('../line');
let hue = require('../hue');

module.exports = class ActionTurnOnLight {

    constructor() {
        this.required_parameter = {}
    }

    parse_parameter(param){
    }

    finish(line_event, conversation){
        return hue.all_turn_on().then(
            function(response){
                let messages = [{
                    type: "text",
                    text: "了解しましたー。"
                }];

                return line.replyMessage(line_event.replyToken, messages);
            },
            function(response){
                return Promise.reject("Failed to turn on light.");
            }
        );
    }
};
