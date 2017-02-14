'use strict';

let Promise = require('bluebird');
let line = require('../service/line');
let hue = require('../service/hue');

module.exports = class ActionTurnOffLight {

    constructor() {
        this.required_parameter = {}
    }

    parse_parameter(param){
    }

    finish(line_event, conversation){
        return hue.turn_off().then(
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
