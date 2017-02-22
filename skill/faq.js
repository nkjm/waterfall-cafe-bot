'use strict';

let Promise = require('bluebird');
let striptags = require('striptags');
let line = require('../service/line');
let rightnow = require('../service/rightnow');

module.exports = class ActionFaq {

    constructor() {
    }

    finish(line_event, conversation){
        return rightnow.searchAnswer(line_event.message.text).then(
            (response) => {
                let messages;
                if (!response || !response.solution){
                    messages = [{
                        type: "text",
                        text: conversation.intent.fulfillment.speech
                    }];
                } else {
                    messages = [{
                        type: "text",
                        text: striptags(response.solution)
                    }];
                }

                return line.replyMessage(line_event.replyToken, messages);
            },
            (response) => {
                console.log("Failed to get answer from rightnow.");
                return Promise.reject("Failed to get answer from rightnow.");
            }
        );
    }
};
