'use strict';

const memory_retention = Number(process.env.MEMORY_RETENTION);

let Promise = require('bluebird');
let memory = require('memory-cache');
let line = require('../line');

module.exports = class ActionRequest {

    constructor(conversation, line_event) {
        this._conversation = conversation;
        this._line_event = line_event;
        this._required_parameter = {
            request: {
                message_to_confirm: {
                    type: "text",
                    text: "どうぞ。"
                }
            }
        }

        // Scan confirmed parameters and if missing required parameters found, we add them to to_confirm.
        for (let req_param_key of Object.keys(this._required_parameter)){
            if (!this._conversation.confirmed[req_param_key] && !this._conversation.to_confirm[req_param_key]){
                this._conversation.to_confirm[req_param_key] = this._required_parameter[req_param_key];
            }
        }

        console.log("We have " + Object.keys(this._conversation.to_confirm).length + " parameters to confirm.");
    }

    parse_parameter(parameter){
        return parameter;
    }

    finish(){
        messages = [{
            type: "text",
            text: "却下。"
        }];
        return line.replyMessage(that._line_event.replyToken, messages);
    }
};
