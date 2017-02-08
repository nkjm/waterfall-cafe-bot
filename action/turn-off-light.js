'use strict';

const memory_retention = Number(process.env.MEMORY_RETENTION);

let Promise = require('bluebird');
let memory = require('memory-cache');
let line = require('../line');
let hue = require('../hue');

module.exports = class ActionTurnOffLight {

    constructor(conversation, line_event) {
        this._conversation = conversation;
        this._line_event = line_event;
        this._required_parameter = {
        }

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
    }

    finish(){
        let that = this;
        return hue.all_turn_off().then(
            function(response){
                let messages = [{
                    type: "text",
                    text: "了解しましたー。"
                }];

                let promise = line.replyMessage(that._line_event.replyToken, messages);

                // Update memory.
                that._conversation.is_complete = true;
                memory.put(that._line_event.source.userId, that._conversation, memory_retention);

                return promise;
            },
            function(response){
                return Promise.reject("Failed to turn on light.");
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
