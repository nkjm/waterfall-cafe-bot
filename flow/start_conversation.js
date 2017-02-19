'use strict';

/*
** Import Packages
*/
let Promise = require("bluebird");
let Flow = require("./flow");

module.exports = class StartConversationFlow extends Flow {
    /*
    ** ### Start Conversation Flow ###
    ** - Check if the event is supported one in this flow.
    ** - If we find some parameter from initial message, add them to the conversation.
    ** - Run final action.
    */

    constructor(line_event, conversation) {
        super(line_event, conversation);
    }

    run(){
        console.log("\n### This is Start Conversation Flow. ###\n");

        // Check if the event is supported one in this flow.
        if (this.line_event.type == "message" && this.line_event.message.type == "text"){
            console.log("This is supported event type in this flow.");
        } else {
            console.log("This is unsupported event type in this flow.");
            return new Promise((resolve, reject) => {
                resolve();
            });
        }

        // If we find some parameters from initial message, add them to the conversation.
        if (this.conversation.intent.parameters && Object.keys(this.conversation.intent.parameters).length > 0){
            for (let param_key of Object.keys(this.conversation.intent.parameters)){
                let parameter = {};
                parameter[param_key] = this.conversation.intent.parameters[param_key];

                // Parse parameters using skill specific parsing logic.
                parameter = this.skill.parse_parameter(parameter);

                if (parameter){
                    super.add_parameter(parameter);
                }
            }
        }

        // Run final action.
        return super.finish();
    } // End of run()
};
