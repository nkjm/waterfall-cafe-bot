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
        console.log("\n### ASSUME This is Change Parameter Flow. ###\n");

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
        let param_value;
        if (this.line_event.type == "message"){
            param_value = this.line_event.message.text;
        } else if (this.line_event.type == "postback"){
            param_value = this.line_event.postback.data;
        }
        try {
            super.add_parameter(this.conversation.previous.confirmed, param_value);
            console.log("\n### This is for sure Change Parameter Flow. ###\n");
        } catch(err){
            // It turned out this is not Change Parameter Flow.
            console.log("\n### It turned out this is not Change Parameter Flow. ###\n");
            return Promise.reject(err);
        }

        // Run final action.
        return super.finish();
    } // End of run()
};
