'use strict';

/*
** Import Packages
*/
let Promise = require('bluebird');
let flow_tool = require('./flow_tool');
let wfc = require('../waterfall-cafe');
let line = require('../line');
let yyyymmdd = require('../yyyymmdd');


module.exports = class ChangeParameterFlow {

    constructor(line_event, conversation) {
        this.line_event = line_event;
        this.conversation = null;
        this.action = null;
    }

    run(){
        console.log("\n### This is Change Parameter Flow. ###\n");
        let that = this;
        return new Promise(function(resolve, reject){
            // "message" is the only supported event on starting conversation.
            if (that.line_event.type != "message" || that.line_event.type != "postback"){
                console.log("Not supported event type in this flow.");
                return resolve();
            }

            /*
            ** Instantiate action depending on the intent.
            ** The implementations of each action are located under /action directory.
            */
            that.action = flow_tool.instantiate_action(that.conversation.intent.action);
            that.action.to_confirm = flow_tool.identify_to_confirm_parameter(that.action.required_parameter, that.conversation.confirmed);

            /*
            ** If api.ai return some parameters. we save them in conversation object so that Bot can remember.
            */
            let parameter = {};
            if (line_event.type == "message"){
                parameter[conversation.previous.confirmed] = line_event.message.text;
            } else if (line_event.type == "postback"){
                parameter[conversation.previous.confirmed] = line_event.postback.data;
            }
            if (parameter !== {}){
                let action = flow_tool.instantiate_action(conversation.intent.action);
                parameter = action.parse_parameter(parameter);
                if (parameter){
                    flow_tool.add_parameter(that.conversation, parameter);
                }
            }

            /*
            ** Run the intent oriented action.
            ** This may lead collection of another parameter or final action for this intent.
            */
            return flow_tool.run(that.action);
        }); // End of Return new Promise()
    } // End of run()
};
