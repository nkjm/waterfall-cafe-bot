'use strict';

/*
** Constants
*/
const APIAI_CLIENT_ACCESS_TOKEN = process.env.APIAI_CLIENT_ACCESS_TOKEN;

/*
** Import Packages
*/
let express = require('express');
let router = express.Router();
let Promise = require('bluebird');
let apiai = require('apiai');
let memory = require('memory-cache');
let line = require('../line');
let action_play_music = require('../action/play-music');
let action_show_menu = require('../action/show-menu');
let action_show_calorie = require('../action/show-calorie');
let action_turn_on_light = require('../action/turn-on-light');
let action_turn_off_light = require('../action/turn-off-light');
let action_change_light_color = require('../action/change-light-color');
let action_faq = require('../action/faq');

/*
** Middleware Configuration
*/
Promise.config({
    // Enable cancellation
    cancellation: true
});


router.post('/', function(req, res, next) {
    res.status(200).end();

    // Signature Validation
    if (!line.validateSignature(req.get('X-Line-Signature'), req.rawBody)){
        console.log('Signature validation failed.');
        return;
    }
    console.log("Signature validation succeeded.");

    let line_event = req.body.events[0];

    // Check memory and judge if this event is related to the existing conversation.
    let conversation = memory.get(line_event.source.userId);
    if (conversation && !conversation.is_complete){

        /*
        ** It seems this event is related to the existing conversation.
        */
        console.log("Found previous conversation.");

        /*
        ** Supported event type is "message" and "postback". Otherwise, the event is ignored.
        */
        if (line_event.type != "message" && line_event.type != "postback"){
            return;
        }

        /*
        ** Instantiate action depending on the intent.
        ** The implementations of each action are located under /action directory.
        */
        let action;
        switch(conversation.intent.action){
            case "play-music":
                action = new action_play_music(conversation, line_event);
                break;
            case "show-menu":
                action = new action_show_menu(conversation, line_event);
                break;
            case "show-calorie":
                action = new action_show_calorie(conversation, line_event);
                break;
            case "turn-on-light":
                action = new action_turn_on_light(conversation, line_event);
                break;
            case "turn-off-light":
                action = new action_turn_off_light(conversation, line_event);
                break;
            case "change-light-color":
                action = new action_change_light_color(conversation, line_event);
                break;
            default:
                action = new action_faq(conversation, line_event);
                break;
        }

        /*
        ** If there is a parameter under confirming, we assume this event is the reply to fill out that parameter.
        ** So we save the message text or data as the value of the parameter.
        */
        if (conversation.confirming){
            if (line_event.type == "message"){
                let parameter = {};
                parameter[conversation.confirming] = line_event.message.text;
                action.add_parameter(parameter);
            } else if (line_event.type == "postback"){
                let parameter = {};
                parameter[conversation.confirming] = line_event.postback.data;
                action.add_parameter(parameter);
            }
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
                console.log("Failed to run the action.");
                console.log(response);

                // Clear memory.
                memory.put(line_event.source.userId, null);
            }
        );
        return;
    }


    /*
    ** It seems this is a BRAND NEW CONVERSATION.
    ** To beigin with, we will try to identify user's intent.
    ** If some parameters are set, we save them.
    ** And then we run the process depending on each intents.
    */

    // "message" is the only supported event on starting conversation.
    if (line_event.type != "message"){
        return;
    }

    /*
    ** We try to identify user's intent.
    */
    console.log("Brand new conversation.");
    let aiInstance = apiai(APIAI_CLIENT_ACCESS_TOKEN);
    let aiRequest = aiInstance.textRequest(line_event.message.text, {sessionId: line_event.source.userId});
    let gotIntent = new Promise(function(resolve, reject){
        aiRequest.on('response', function(response){
            resolve(response);
        });
        aiRequest.end();
    });

    let main = gotIntent.then(
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
            let action;
            switch (conversation.intent.action) {
                case "show-menu":
                    action = new action_show_menu(conversation, line_event);
                    break;
                case "show-calorie":
                    action = new action_show_calorie(conversation, line_event);
                    break;
                case "play-music":
                    action = new action_play_music(conversation, line_event);
                    break;
                case "turn-on-light":
                    action = new action_turn_on_light(conversation, line_event);
                    break;
                case "turn-off-light":
                    action = new action_turn_off_light(conversation, line_event);
                    break;
                case "change-light-color":
                    action = new action_change_light_color(conversation, line_event);
                    break;
                default:
                    action = new action_faq(conversation, line_event);
                    break;
            }

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
            console.log("Failed to get intent.");
        }
    ).then(
        function(response){
            console.log("End of webhook process.");
        },
        function(response){
            console.log("Failed to process action.");
            console.log(response);

            // Clear memory.
            memory.put(line_event.source.userId, null);
        }
    )
});

module.exports = router;
