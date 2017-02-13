'use strict';

/*
** Import Packages
*/
let Promise = require('bluebird');
let flow_tool = require('./flow_tool');
let wfc = require('../waterfall-cafe');
let line = require('../line');
let yyyymmdd = require('../yyyymmdd');


module.exports = class ChangeIntentFlow {

    constructor(line_event, conversation) {
        this.line_event = line_event;
        this.conversation = null;
        this.action = null;
    }

    run(){
        console.log("\n### This is Change Intent Flow. ###\n");
        let that = this;
        return new Promise(function(resolve, reject){
            // "message" is the only supported event on starting conversation.
            if (that.line_event.type != "message"){
                console.log("Not supported event type in this flow.");
                return resolve();
            }

            /*
            ** Instantiate action depending on the intent.
            ** The implementations of each action are located under /action directory.
            */
            that.action = flow_tool.instantiate_action(that.conversation.intent.action);
            that.conversation.to_confirm = flow_tool.identify_to_confirm_parameter(that.action.required_parameter, that.conversation.confirmed);

            /*
            ** If api.ai return some parameters. we save them in conversation object so that Bot can remember.
            */
            if (that.conversation.intent.parameters && Object.keys(that.conversation.intent.parameters).length > 0){
                for (let param_key of Object.keys(that.conversation.intent.parameters)){
                    let parameter = {};
                    parameter[param_key] = that.conversation.intent.parameters[param_key];
                    parameter = action.parse_parameter(parameter);

                    if (parameter){
                        flow_tool.add_parameter(that.conversation, parameter);
                    }
                }
            }

            /*
            ** Run the intent oriented action.
            ** This may lead collection of another parameter or final action for this intent.
            */
            return flow_tool.run(that.action, that.line_event, that.conversation);
        }); // End of Return new Promise()
    } // End of run()
};
