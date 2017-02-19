'use strict';

/*
** Import Packages
*/
let Promise = require('bluebird');
let Flow = require("./flow");


module.exports = class AnotherStartConversationFlow extends Flow {
    /*
    ** ### No Way Flow ###
    ** - Check if the event is supported one in this flow.
    ** - Run final action.
    */

    constructor(line_event, conversation) {
        super(line_event, conversation);
    }

    run(){
        console.log("\n### This is No Way Flow. ###\n");

        // Check if the event is supported one in this flow.
        if (this.line_event.type == "message" && this.line_event.message.type == "text"){
            console.log("This is supported event type in this flow.");
        } else {
            console.log("This is unsupported event type in this flow.");
            return new Promise((resolve, reject) => {
                resolve();
            });
        }

        // Run final action.
        return super.finish();
    } // End of run()
};
