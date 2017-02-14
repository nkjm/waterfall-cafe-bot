'use strict';

let Promise = require('bluebird');
let line = require('../service/line');

module.exports = class ActionGreeting {

    constructor() {
        this.required_parameter = {}
    }

    parse_parameter(param){
    }

    finish(line_event, conversation){
        let messages = [{
            type: "text",
            text: conversation.intent.fulfillment.speech
        }];
        return line.replyMessage(line_event.replyToken, messages);
    }
};
