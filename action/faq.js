'use strict';

let request = require('request');
let Promise = require('bluebird');
let memory = require('memory-cache');
let wfc = require('../waterfall-cafe');
let line = require('../line');

module.exports = class ActionFaq {

    static unknown(conversation, line_event){
        // reply to user.
        console.log("Going to apologize.");
        let reply_token = line_event.replyToken;
        let messages = [{
            type: "text",
            text: conversation.intent.fulfillment.speech
        }]
        return line.replyMessage(reply_token, messages);
    }

};
