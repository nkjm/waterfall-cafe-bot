'use strict';

/*
** Constants
*/
const memory_retention = Number(process.env.MEMORY_RETENTION);

/*
** Import Packages
*/
let express = require('express');
let router = express.Router();
let Promise = require('bluebird');
let memory = require('memory-cache');
let line = require('../service/line');
let wfc = require('../service/waterfall-cafe');
let flow_tool = require('../flow/flow_tool');
let start_conversation_flow = require('../flow/start_conversation');
let reply_flow = require('../flow/reply');
let change_intent_flow = require('../flow/change_intent');
let change_parameter_flow = require('../flow/change_parameter');
let another_start_conversation_flow = require('../flow/another_start_conversation');

/*
** Middleware Configuration
*/
Promise.config({
    // Enable cancellation
    cancellation: true
});


router.post('/', function(req, res, next) {
    res.status(200).end();

    /*
    ** ### Signature Validation ###
    */
    if (!line.validateSignature(req.get('X-Line-Signature'), req.rawBody)){
        console.log('Signature validation failed.');
        return;
    }
    console.log("Signature validation succeeded.");

    let line_event = req.body.events[0];
    console.log(line_event);

    /*
    ** ### Flow Identification ###
    **
    ** Indentify which flow should this event go through.
    **
    ** Flow1. Start Conversation.
    ** Flow2. Reply.
    ** Flow3. Change Parameter.
    ** Flow4. Change Intent.
    */

    // Check memory and judge if this event is related to the existing conversation.
    let conversation = memory.get(line_event.source.userId);
    let promise_flow_completed;
    let flow;

    if (!conversation){
        /* ##########################################
        ** ### This is "Start Conversation" Flow. ###
        ** ##########################################
        ** It seems this is a BRAND NEW CONVERSATION.
        ** To beigin with, we will try to identify user's intent.
        ** If some parameters are set, we save them.
        ** And then we run the process depending on each intents.
        */
        // Instantiate the conversation object. This will be saved as Bot Memory.
        conversation = {
            intent: null,
            confirmed: {},
            to_confirm: {},
            confirming: null,
            previous: {
                confirmed: null
            }
        };
        flow = new start_conversation_flow(line_event, conversation);
        promise_flow_completed = flow.run()
    } else {
        if (conversation.confirming){
            /* #############################
            ** ### This is "Reply" Flow. ###
            ** #############################
            ** It seems this event is related to the existing conversation.
            ** We assume this event is the reply to fill out the parameter.
            */
            flow = new reply_flow(line_event, conversation);
            promise_flow_completed = flow.run();
        } else {
            let text;
            if (line_event.type == "message" && line_event.message.type == "text"){
                text = line_event.message.text;
            } else if (line_event.type == "postback"){
                text = line_event.postback.data;
            } else {
                console.log("Not supported event type in this flow.");
                return;
            }

            promise_flow_completed = flow_tool.identify_intent(line_event.source.userId, text).then(
                function(response){
                    console.log("Intent is " + response.result.action);

                    if (response.result.action != "input.unknown"){
                        /* #####################################
                        ** ### This is "Change Intent" Flow. ###
                        ** #####################################
                        ** This is almost new conversation but user may be still conscious of some parameters.
                        ** So we keep existing parameters while changeing the intent.
                        ** While the name of the flow is "CHANGE Intent", there is a possiblity that intent is same as previous event.
                        */

                        // Set new intent while keeping other data.
                        conversation.intent = response.result;

                        flow = new change_intent_flow(line_event, conversation);
                        return flow.run();
                    } else {
                        // Check if this is Change Parameter Flow.
                        if (conversation.previous.confirmed){
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
                                    /* ########################################
                                    ** ### This is "Change Parameter" Flow. ###
                                    ** ########################################
                                    */
                                    flow = new change_parameter_flow(line_event, conversation);
                                    return flow.run();
                                }
                            }
                        }

                        /* ################################################
                        ** ### This is Another Start Conversation Flow. ###
                        ** ################################################
                        */
                        conversation = {
                            intent: response.result,
                            confirmed: {},
                            to_confirm: {},
                            confirming: null,
                            previous: {
                                confirmed: null
                            }
                        }
                        flow = new another_start_conversation_flow(line_event, conversation);
                        return flow.run();
                    }
                },
                function(response){
                    console.log("Failed to identify intent.");
                    return Promise.reject(response);
                }
            );
        }
    }

    promise_flow_completed.then(
        function(response){
            console.log("End of webhook process.");
            console.log(flow.conversation);

            // Update memory.
            memory.put(line_event.source.userId, flow.conversation, memory_retention);
        },
        function(response){
            console.log("Failed to process event.");
            console.log(response);

            // Clear memory.
            memory.put(line_event.source.userId, null);
        }
    );
});

module.exports = router;
