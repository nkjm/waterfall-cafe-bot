'use strict';

let Promise = require('bluebird');
let line = require('../service/line');
let hue = require('../service/hue');

module.exports = class ActionTurnOffLight {

    constructor() {
    }

    finish(line_event, conversation){
        return hue.turn_off().then(
            (response) => {
                let messages = [{
                    type: "text",
                    text: "了解しましたー。"
                }];

                return line.replyMessage(line_event.replyToken, messages);
            },
            (response) => {
                return Promise.reject("Failed to turn on light.");
            }
        );
    }
};
