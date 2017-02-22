'use strict';

let Promise = require('bluebird');
let line = require('../service/line');

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

    parse_content(value){
        return value;
    }

    finish(line_event, conversation){
        let messages = [{
            type: "text",
            text: "却下。"
        }];
        return line.replyMessage(line_event.replyToken, messages);
    }
};
