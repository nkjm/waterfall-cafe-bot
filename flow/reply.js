'use strict';

/*
** Import Packages
*/
let Promise = require('bluebird');
let Flow = require("./flow");


module.exports = class ReplyFlow extends Flow {
    /*
    ** ### Reply Flow ###
    ** - Check if the event is supported one in this flow.
    ** - Identify Intent.
    ** - Add Parameter from message text or postback data.
    ** - Run final action.
    */

    constructor(line_event, conversation) {
        super(line_event, conversation);
    }

    run(){
        console.log("\n### This is Reply Flow. ###\n");

        // Check if the event is supported one in this flow.
        if ((this.line_event.type == "message" && this.line_event.message.type == "text") || this.line_event.type == "postback" ){
            console.log("This is supported event type in this flow.");
        } else {
            console.log("This is unsupported event type in this flow.");
            return new Promise((resolve, reject) => {
                resolve();
            });
        }

        // Add Parameter from message text or postback data.
        let parameter = {};
        if (this.line_event.type == "message"){
            parameter[this.conversation.confirming] = this.line_event.message.text;
        } else if (this.line_event.type == "postback"){
            parameter[this.conversation.confirming] = this.line_event.postback.data;
        }
        if (parameter !== {}){
            // Parse parameters using skill specific parsing logic.
            parameter = this.skill.parse_parameter(parameter);

            if (parameter){
                super.add_parameter(parameter);
            }
        }

        // Run final action.
        return super.finish();
    }
}
