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

    is_parameter_sufficient(){
        if (Object.keys(this._conversation.to_confirm).length > 0){
            return false;
        }
        return true;
    }

    collect(){
        if (Object.keys(this._conversation.to_confirm).length == 0){
            console.log("While collect() is called, there is no parameter to confirm.");
            Promise.reject();
            return;
        }
        let messages = [this._conversation.to_confirm[Object.keys(this._conversation.to_confirm)[0]].message_to_confirm];

        // Update the memory.
        this._conversation.confirming = Object.keys(this._conversation.to_confirm)[0];
        memory.put(this._line_event.source.userId, this._conversation);

        return line.replyMessage(this._line_event.replyToken, messages);
    }

    finish(){
        let that = this;
        return rightnow.searchAnswer(that._line_event.message.text).then(
            function(response){
                let messages;
                if (!response){
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
                let promise = line.replyMessage(that._line_event.replyToken, messages);

                // Update memory.
                that._conversation.is_complete = true;
                memory.put(that._line_event.source.userId, that._conversation);

                return promise;
            },
            function(response){
                console.log("Failed to get answer from rightnow.");
                return Promise.reject("Failed to get answer from rightnow.");
            }
        );
    }

    add_parameter(answer){

    }

    run(){
        if (this.is_parameter_sufficient()){
            return this.finish();
        }
        return this.collect();
    }
};
