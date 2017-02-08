'use strict';

/*
** Constants
*/
const MEMORY_RETENTION = 1000 * 60 * 3 // 3分

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
        /*
        ** ### This is "Start Conversation" Flow. ###
        **
        ** It seems this is a BRAND NEW CONVERSATION.
        ** To beigin with, we will try to identify user's intent.
        ** If some parameters are set, we save them.
        ** And then we run the process depending on each intents.
        */
        console.log("This is Start Conversation Flow.");

        // "message" is the only supported event on starting conversation.
        if (line_event.type != "message"){
            console.log("Not supported event type in this flow.");
            return;
        }

        // Indentify Intent.
        flow.identify_intent(line_event.source.userId, line_event.message.text).then(
            function(response){
                console.log("Intent is " + response.result.action);

                // Instantiate the conversation object. This will be saved as Bot Memory.
                let conversation = {
                    intent: response.result,
                    confirmed: {},
                    to_confirm: {},
                    confirming: null,
                    is_complete: false
                }

                /*
                ** Instantiate action depending on the intent.
                ** The implementations of each action are located under /action directory.
                */
                let action = flow.instantiate_action(conversation, line_event);

                /*
                ** If api.ai return some parameters. we save them in conversation object so that Bot can remember.
                */
                if (conversation.intent.parameters && Object.keys(conversation.intent.parameters).length > 0){
                    for (let param_key of Object.keys(conversation.intent.parameters)){
                        let parameter = {};
                        parameter[param_key] = conversation.intent.parameters[param_key];
                        action.add_parameter(parameter);
                    }
                }

                /*
                ** Run the intent oriented action.
                ** This may lead collection of another parameter or final action for this intent.
                */
                return action.run();
            },
            function(response){
                console.log("Failed to indentify intent.");
                return Promise.reject(response);
            }
        ).then(
            function(response){
                console.log("End of webhook process.");
            },
            function(response){
                console.log("Failed to process event.");
                console.log(response);

                // Clear memory.
                memory.put(line_event.source.userId, null);
            }
        );
    } else {
        if (conversation.confirming){
            /*
            ** ### This is "Reply" Flow. ###
            **
            ** It seems this event is related to the existing conversation.
            ** We assume this event is the reply to fill out the parameter.
            */
            console.log("This is Reply Flow.");

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
            if (line_event.type == "message"){
                let parameter = {};
                parameter[conversation.confirming] = line_event.message.text;
                action.add_parameter(parameter);
            } else if (line_event.type == "postback"){
                let parameter = {};
                parameter[conversation.confirming] = line_event.postback.data;
                action.add_parameter(parameter);
            }

            /*
            ** Run the intent oriented action.
            ** This may lead collection of another parameter or final action for this intent.
            */
            action.run().then(
                function(response){
                    console.log("End of webhook process.");
                },
                function(response){
                    console.log("Failed to process the event.");
                    console.log(response);

                    // Clear memory.
                    memory.put(line_event.source.userId, null);
                }
            );
        } else {
            console.log("Flow is Change Parameter or Change Intent.");
            flow.identify_intent(line_event.source.userId, line_event.message.text).then(
                function(response){
                    console.log("Intent is " + response.result.action);

                    if (response.result.action != "input.unknown"){
                        /*
                        ** This is "Change Intent" Flow.
                        **
                        ** This is almost new conversation but user may be still conscious of some parameters.
                        ** So we keep existing parameters while changeing the intent.
                        */
                        conversation.intent = response.result;

                        /*
                        ** Instantiate action depending on the intent.
                        ** The implementations of each action are located under /action directory.
                        */
                        let action = flow.instantiate_action(conversation, line_event);

                        /*
                        ** If api.ai return some parameters. we save them in conversation object so that Bot can remember.
                        */
                        if (conversation.intent.parameters && Object.keys(conversation.intent.parameters).length > 0){
                            for (let param_key of Object.keys(conversation.intent.parameters)){
                                let parameter = {};
                                parameter[param_key] = conversation.intent.parameters[param_key];
                                action.add_parameter(parameter);
                            }
                        }

                        /*
                        ** Run the intent oriented action.
                        ** This may lead collection of another parameter or final action for this intent.
                        */
                        return action.run();
                    } else {
                        /*
                        ** This may be "Change Parameter" Flow.
                        **
                        ** But it's very hard to identify which parameter user wants to change.
                        ** For now, we do not support change parameter and just perform default action.
                        */
                        // Instantiate the conversation object. This will be saved as Bot Memory.
                        let conversation = {
                            intent: response.result,
                            confirmed: {},
                            to_confirm: {},
                            confirming: null,
                            is_complete: false
                        }

                        /*
                        ** Instantiate action depending on the intent.
                        ** The implementations of each action are located under /action directory.
                        */
                        let action = flow.instantiate_action(conversation, line_event);

                        /*
                        ** If api.ai return some parameters. we save them in conversation object so that Bot can remember.
                        */
                        if (conversation.intent.parameters && Object.keys(conversation.intent.parameters).length > 0){
                            for (let param_key of Object.keys(conversation.intent.parameters)){
                                let parameter = {};
                                parameter[param_key] = conversation.intent.parameters[param_key];
                                action.add_parameter(parameter);
                            }
                        }

                        /*
                        ** Run the intent oriented action.
                        ** This may lead collection of another parameter or final action for this intent.
                        */
                        return action.run();
                    }
                },
                function(response){
                    console.log("Failed to identify intent.");
                    return Promise.reject(response);
                }
            ).then(
                function(response){
                    console.log("End of webhook process.");
                },
                function(response){
                    console.log("Failed to process event.");
                    console.log(response);

                    // Clear memory.
                    memory.put(line_event.source.userId, null);
                }
            )
        }
    }
});

module.exports = router;
