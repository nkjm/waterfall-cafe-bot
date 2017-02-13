'use strict';

let Promise = require('bluebird');
let line = require('../line');

module.exports = class ActionRequest {

    constructor() {
        this.required_parameter = {
            content: {
                message_to_confirm: {
                    type: "text",
                    text: "どうぞ。"
                }
            }
        }
    }

    parse_parameter(param){
        let param_key = Object.keys(param)[0];

        // Manipulate the answer if required.
        if (param_key != "content"){
            return false;
        }
        return param;
    }

    finish(line_event, conversation){
        let messages = [{
            type: "text",
            text: "却下。"
        }];
        return line.replyMessage(line_event.replyToken, messages);
    }
};
