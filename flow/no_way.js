'use strict';

/*
** Import Packages
*/
let Promise = require('bluebird');
let flow_tool = require('./flow_tool');


module.exports = class AnotherStartConversationFlow {

    constructor(line_event, conversation) {
        this.line_event = line_event;
        this.conversation = conversation;
        this.action = null;
    }

    run(){
        console.log("\n### This is No Way Flow. ###\n");
        let that = this;

        // "text message" is the only supported event.
        if (that.line_event.type == "message" && that.line_event.message.type == "text"){
            console.log("This is supported event type in this flow.");
        } else {
            console.log("This is unsupported event type in this flow.");
            return new Promise(function(resolve, reject){
                resolve();
            });
        }

        console.log("Intent is " + that.conversation.intent.action);

        /*
        ** Instantiate action depending on the intent.
        ** The implementations of each action are located under /action directory.
        */
        that.action = flow_tool.instantiate_action(that.conversation.intent.action);
        that.conversation.to_confirm = flow_tool.identify_to_confirm_parameter(that.action.required_parameter, that.conversation.confirmed);

        /*
        ** Run the intent oriented action.
        ** This may lead collection of another parameter or final action for this intent.
        */
        return flow_tool.run(that.action, that.line_event, that.conversation);
    } // End of run()
};
