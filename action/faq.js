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

        // Scan confirmed parameters and if missing required parameters found, we add them to to_confirm.
        for (let req_param_key of Object.keys(this._required_parameter)){
            if (!this._conversation.confirmed[req_param_key] && !this._conversation.to_confirm[req_param_key]){
                this._conversation.to_confirm[req_param_key] = this._required_parameter[req_param_key];
            }
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
