'use strict';

let Promise = require('bluebird');
let memory = require('memory-cache');
let striptags = require('striptags');
let line = require('../line');
let rightnow = require('../rightnow');

module.exports = class ActionFaq {

    constructor(conversation, line_event) {
        this._conversation = conversation;
        this._line_event = line_event;
        this._required_parameter = {};

        // If this is the very first time of the conversation, we set to_confirm following required_parameter.
        if (
            Object.keys(this._conversation.to_confirm).length == 0 &&
            Object.keys(this._required_parameter).length > 0 &&
            Object.keys(this._conversation.confirmed).length == 0
        ){
            this._conversation.to_confirm = this._required_parameter;
        }

        console.log("We have " + Object.keys(this._conversation.to_confirm).length + " parameters to confirm.");
    }

    parse_parameter(answer){
    }

    finish(){
        let that = this;
        return rightnow.searchAnswer(that._line_event.message.text).then(
            function(response){
                let messages;
                if (!response || !response.solution){
                    messages = [{
                        type: "text",
                        text: that._conversation.intent.fulfillment.speech
                    }];
                } else {
                    messages = [{
                        type: "text",
                        text: striptags(response.solution)
                    }];
                }
                
                return line.replyMessage(that._line_event.replyToken, messages);
            },
            function(response){
                console.log("Failed to get answer from rightnow.");
                return Promise.reject("Failed to get answer from rightnow.");
            }
        );
    }
};
