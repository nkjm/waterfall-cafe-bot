'use strict';

let Promise = require('bluebird');
let line = require('../line');

module.exports = class ActionClearConversation {

    constructor() {
        this.required_parameter = {}
    }

    parse_parameter(param){
    }

    finish(line_event, conversation){
        let that = this;
        let messages = [{
            type: "text",
            text: conversation.intent.fulfillment.speech
        }];
        return line.replyMessage(line_event.replyToken, messages).then(
            function(response){
                conversation = null;
            },
            function(response){
                return response;
            }
        );
    }
};
