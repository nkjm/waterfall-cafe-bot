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
let line = require('../line');
let flow = require('../flow');

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

    if (!conversation){
        /* ##########################################
        ** ### This is "Start Conversation" Flow. ###
        ** ##########################################
        ** It seems this is a BRAND NEW CONVERSATION.
        ** To beigin with, we will try to identify user's intent.
        ** If some parameters are set, we save them.
        ** And then we run the process depending on each intents.
        */
        console.log("### This is Start Conversation Flow. ###");

        // "message" is the only supported event on starting conversation.
        if (line_event.type != "message"){
            console.log("Not supported event type in this flow.");
            return;
        }

        // Will be instantiated later on.
        let action;

        // Indentify Intent.
        flow.identify_intent(line_event.source.userId, line_event.message.text).then(
            function(response){
                console.log("Intent is " + response.result.action);

                // Instantiate the conversation object. This will be saved as Bot Memory.
                conversation = {
                    intent: response.result,
                    confirmed: {},
                    to_confirm: {},
                    confirming: null,
                    previous: {
                        confirmed: null
                    }
                }

                /*
                ** Instantiate action depending on the intent.
                ** The implementations of each action are located under /action directory.
                */
                action = flow.instantiate_action(conversation, line_event);

                /*
                ** If api.ai return some parameters. we save them in conversation object so that Bot can remember.
                */
                if (action._conversation.intent.parameters && Object.keys(action._conversation.intent.parameters).length > 0){
                    for (let param_key of Object.keys(action._conversation.intent.parameters)){
                        let parameter = {};
                        parameter[param_key] = action._conversation.intent.parameters[param_key];
                        parameter = action.parse_parameter(parameter);

                        if (parameter){
                            flow.add_parameter(action._conversation, parameter);
                        }
                    }
                }

                /*
                ** Run the intent oriented action.
                ** This may lead collection of another parameter or final action for this intent.
                */
                return flow.run(action);
            },
            function(response){
                console.log("Failed to indentify intent.");
                return Promise.reject(response);
            }
        ).then(
            function(response){
                console.log("End of webhook process.");
                console.log(action._conversation);

                // Update memory.
                memory.put(action._line_event.source.userId, action._conversation, memory_retention);
            },
            function(response){
                console.log("Failed to process event.");
                console.log(response);
                console.log(action._conversation);

                // Clear memory.
                memory.put(line_event.source.userId, null);
            }
        );
    } else {
        if (conversation.confirming){
            /* #############################
            ** ### This is "Reply" Flow. ###
            ** #############################
            ** It seems this event is related to the existing conversation.
            ** We assume this event is the reply to fill out the parameter.
            */
            console.log("### This is Reply Flow. ###");

            /*
            ** Supported event type is "message" and "postback". Otherwise, the event is ignored.
            */
            if (line_event.type != "message" && line_event.type != "postback"){
                console.log("Not supported event type in this flow.");
                return;
            }

            /*
            ** Instantiate action depending on the intent.
            ** The implementations of each action are located under /action directory.
            */
            let action = flow.instantiate_action(conversation, line_event);

            /*
            ** We save the message text or data as the value of the parameter.
            */
            let parameter = {};
            if (action._line_event.type == "message"){
                parameter[action._conversation.confirming] = action._line_event.message.text;
            } else if (action._line_event.type == "postback"){
                parameter[action._conversation.confirming] = action._line_event.postback.data;
            }
            if (parameter !== {}){
                parameter = action.parse_parameter(parameter);

                if (parameter){
                    flow.add_parameter(action._conversation, parameter);
                }
            }

            /*
            ** Run the intent oriented action.
            ** This may lead collection of another parameter or final action for this intent.
            */
            flow.run(action).then(
                function(response){
                    console.log("End of webhook process.");
                    console.log(action._conversation);

                    // Update memory.
                    memory.put(action._line_event.source.userId, action._conversation, memory_retention);
                },
                function(response){
                    console.log("Failed to process the event.");
                    console.log(response);
                    console.log(action._conversation);

                    // Clear memory.
                    memory.put(action._line_event.source.userId, null);
                }
            );
        } else {
            // Will be instantiated later on.
            let action;
            let text;
            if (line_event.type == "message"){
                text = line_event.message.text;
            } else if (line_event.type == "postback"){
                text = line_event.postback.data;
            } else {
                console.log("Not supported event type in this flow.");
                return;
            }

            flow.identify_intent(line_event.source.userId, text).then(
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
                        console.log("### This is Change Intent Flow. ###");

                        // Set new intent while keeping other data.
                        conversation.intent = response.result;

                        /*
                        ** Instantiate action depending on the intent.
                        ** The implementations of each action are located under /action directory.
                        */
                        action = flow.instantiate_action(conversation, line_event);

                        /*
                        ** If api.ai return some parameters. we save them in conversation object so that Bot can remember.
                        */
                        if (action._conversation.intent.parameters && Object.keys(action._conversation.intent.parameters).length > 0){
                            for (let param_key of Object.keys(action._conversation.intent.parameters)){
                                let parameter = {};
                                parameter[param_key] = action._conversation.intent.parameters[param_key];
                                parameter = action.parse_parameter(parameter);

                                if (parameter){
                                    flow.add_parameter(action._conversation, parameter);
                                }
                            }
                        }

                        /*
                        ** Run the intent oriented action.
                        ** This may lead collection of another parameter or final action for this intent.
                        */
                        return flow.run(action);
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
                                action = flow.instantiate_action(conversation, line_event);
                                parameter = action.parse_parameter(parameter);
                                if (parameter){
                                    /* ########################################
                                    ** ### This is "Change Parameter" Flow. ###
                                    ** ########################################
                                    */
                                    console.log("### This is change parameter flow. ###");
                                    flow.add_parameter(action._conversation, parameter);

                                    /*
                                    ** Run the intent oriented action.
                                    ** This may lead collection of another parameter or final action for this intent.
                                    */
                                    return flow.run(action);
                                }
                            }
                        }

                        /* #############################################
                        ** ### This Another Start Conversation Flow. ###
                        ** #############################################
                        */
                        console.log("### This is Another Start Conversation Flow. And the intent is " + response.result.action + ". ###");

                        // Instantiate the conversation object. This will be saved as Bot Memory.
                        conversation = {
                            intent: response.result,
                            confirmed: {},
                            to_confirm: {},
                            confirming: null,
                            previous: {
                                confirmed: null
                            }
                        }

                        /*
                        ** Instantiate action depending on the intent.
                        ** The implementations of each action are located under /action directory.
                        */
                        action = flow.instantiate_action(conversation, line_event);

                        /*
                        ** If api.ai return some parameters. we save them in conversation object so that Bot can remember.
                        */
                        if (action._conversation.intent.parameters && Object.keys(action._conversation.intent.parameters).length > 0){
                            for (let param_key of Object.keys(action._conversation.intent.parameters)){
                                let parameter = {};
                                parameter[param_key] = action._conversation.intent.parameters[param_key];
                                parameter = action.parse_parameter(parameter);

                                if (parameter){
                                    flow.add_parameter(action._conversation, parameter);
                                }
                            }
                        }

                        /*
                        ** Run the intent oriented action.
                        ** This may lead collection of another parameter or final action for this intent.
                        */
                        return flow.run(action);
                    }
                },
                function(response){
                    console.log("Failed to identify intent.");
                    return Promise.reject(response);
                }
            ).then(
                function(response){
                    console.log("End of webhook process.");
                    console.log(action._conversation);

                    // Update memory.
                    memory.put(line_event.source.userId, conversation, memory_retention);
                },
                function(response){
                    console.log("Failed to process event.");
                    console.log(response);
                    console.log(action._conversation);

                    // Clear memory.
                    memory.put(line_event.source.userId, null);
                }
            )
        }
    }
});

module.exports = router;
