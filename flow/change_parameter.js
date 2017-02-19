'use strict';

/*
** Import Packages
*/
let Promise = require('bluebird');
let Flow = require("./flow");


module.exports = class ChangeParameterFlow extends Flow {
    /*
    ** ### Change Parameter Flow ###
    ** - Check if the event is supported one in this flow.
    ** - Add Parameter from message text or postback data.
    ** - Run final action.
    */

    constructor(line_event, conversation) {
        super(line_event, conversation);
    }

    run(){
        console.log("\n### This is Change Parameter Flow. ###\n");

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
            parameter[this.conversation.previous.confirmed] = this.line_event.message.text;
        } else if (this.line_event.type == "postback"){
            parameter[this.conversation.previous.confirmed] = this.line_event.postback.data;
        }
        if (parameter !== {}){
            // Parse parameters using skill specific parsing logic.
            parameter = this.skill.parse_parameter(parameter);

            if (parameter){
                // Now, this is for sure Change Parameter Flow.
                console.log("This is for sure Change Parameter Flow.");
                super.add_parameter(parameter);
            } else {
                // It turned out this is not Change Parameter Flow.
                console.log("It turned out this is not Change Parameter Flow.");
                return Promise.reject("failed_to_parse_parameter");
            }
        }

        // Run final action.
        return super.finish();
    } // End of run()
};
