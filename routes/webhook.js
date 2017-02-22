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
let flow_tool = require('../flow/flow');
let start_conversation_flow = require('../flow/start_conversation');
let reply_flow = require('../flow/reply');
let change_intent_flow = require('../flow/change_intent');
let change_parameter_flow = require('../flow/change_parameter');
let no_way_flow = require('../flow/no_way');

/*
** Middleware Configuration
*/
Promise.config({
    // Enable cancellation
    cancellation: true
});


router.post('/', (req, res, next) => {
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
    //console.log(line_event);

    /*
    ** ### Follow Event Handler
    */
    if (line_event.type == "follow"){
        let main = line.getProfile(line_event.source.userId).then(
            (response) => {
                let user = response;

                // Upsert User.
                return wfc.upsertUser(user);
            },
            (response) => {
                console.log("Failed to get LINE User Profile.");
                return Promise.reject(response);
            }
        ).then(
            (response) => {
                console.log("End of webhook process.");
            },
            (response) => {
                console.log("Failed to handle follow event.");
                console.log(response);
            }
        )
        return;
    } // End of Follow Event Handler

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
        */

        // Check if the event is supported one in this flow.
        if (line_event.type == "message" && line_event.message.type == "text"){
            console.log("This is supported event type in this flow.");
        } else {
            console.log("This is unsupported event type in this flow.");
            return;
        }

        promise_flow_completed = flow_tool.identify_intent(line_event.source.userId, line_event.message.text).then(
            (response) => {
                // Instantiate the conversation object. This will be saved as Bot Memory.
                conversation = {
                    intent: response.result,
                    confirmed: {},
                    to_confirm: {},
                    confirming: null,
                    previous: {
                        confirmed: null
                    }
                };
                try {
                    flow = new start_conversation_flow(line_event, conversation);
                } catch(err) {
                    return Promise.reject(err);
                }
                return flow.run();
            },
            (response) => {
                console.log("Failed to identify intent.");
                return Promise.reject(response);
            }
        );
    } else {
        if (conversation.confirming){
            /* #############################
            ** ### This is "Reply" Flow. ###
            ** #############################
            */
            try {
                flow = new reply_flow(line_event, conversation);
            } catch(err){
                return Promise.reject(err);
            }
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
                (response) => {
                    console.log("Intent is " + response.result.action);

                    if (response.result.action != "input.unknown"){
                        /* #####################################
                        ** ### This is "Change Intent" Flow. ###
                        ** #####################################
                        */

                        // Set new intent while keeping other data.
                        conversation.intent = response.result;
                        try {
                            flow = new change_intent_flow(line_event, conversation);
                        } catch(err){
                            return Promise.reject(err);
                        }
                        return flow.run();
                    } else {
                        if (conversation.previous.confirmed){
                            /* ###############################################
                            ** ### ASSUME this is "Change Parameter" Flow. ###
                            ** ###############################################
                            */
                            try {
                                flow = new change_parameter_flow(line_event, conversation);
                            } catch(err){
                                return Promise.reject(err);
                            }
                            return flow.run().then(
                                (response) => {
                                    return response;
                                },
                                (response) => {
                                    if (response == "failed_to_parse_parameter"){
                                        /* ################################################
                                        ** ### This is No Way Flow. ###
                                        ** ################################################
                                        */
                                        conversation = {
                                            intent: {action:"input.unknown"},
                                            confirmed: {},
                                            to_confirm: {},
                                            confirming: null,
                                            previous: {
                                                confirmed: null
                                            }
                                        }
                                        try {
                                            flow = new no_way_flow(line_event, conversation);
                                        } catch(err){
                                            return Promise.reject(err);
                                        }
                                        return flow.run();
                                    }
                                }
                            );
                        }

                        /* ################################################
                        ** ### This is No Way Flow. ###
                        ** ################################################
                        */
                        conversation = {
                            intent: {action:"input.unknown"},
                            confirmed: {},
                            to_confirm: {},
                            confirming: null,
                            previous: {
                                confirmed: null
                            }
                        }
                        try {
                            flow = new no_way_flow(line_event, conversation);
                        } catch(err){
                            return Promise.reject(err);
                        }
                        return flow.run();
                    }
                },
                (response) => {
                    console.log("Failed to identify intent.");
                    return Promise.reject(response);
                }
            );
        }
    }

    promise_flow_completed.then(
        (response) => {
            console.log("End of webhook process.");
            console.log(flow.conversation);

            // Update memory.
            memory.put(line_event.source.userId, flow.conversation, memory_retention);
        },
        (response) => {
            console.log("Failed to process event.");
            console.log(response);

            // Clear memory.
            memory.put(line_event.source.userId, null);
        }
    );
});

module.exports = router;
