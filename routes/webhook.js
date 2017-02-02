'use strict'

const APIAI_CLIENT_ACCESS_TOKEN = process.env.APIAI_CLIENT_ACCESS_TOKEN;

let express = require('express');
let router = express.Router();
let Promise = require('bluebird');
let apiai = require('apiai');
let memory = require('memory-cache');
let line = require('../line');
let action_play_music = require('../action/play-music');
let action_show_menu = require('../action/show-menu');
let action_faq = require('../action/faq');

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

    /*
     * Recall the memory with this user.
     */
    let conversation = memory.get(line_event.source.userId);
    if (conversation && !conversation.is_complete){
        console.log("Found incomplete conversation.");

        let action;
        switch(conversation.intent.action){
            case "play-music":
                action = new action_play_music(conversation, line_event);
                break;
            case "show-menu":
                action = new action_show_menu(conversation, line_event);
                break;
            default:
                action = new action_faq(conversation, line_event);
                break;
        }
        if (line_event.type == "message"){
            let context = {};
            context[Object.keys(conversation.confirming)[0]] = line_event.message.text;
            action.add_context(context); // TBD: Need to process text in some way.
        } else if (line_event.type == "postback"){
            action.add_context(JSON.parse(line_event.postback.data));
        }
        action.run().then(
            function(response){
                console.log("End of webhook process.");
            },
            function(response){
                console.log("Failed to get intent.");
                console.log(response);
            }
        );
        return;
    }

    console.log("Brand new conversation.");

    /*
     * It seems this conversation is about new intent. So we try to identify user's intent.
     */
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

            // Initiate the conversation object.
            let conversation = {
                intent: response.result,
                confirmed: {},
                to_confirm: {},
                confirming: null,
                is_complete: false
            }

            let action;
            switch (conversation.intent.action) {
                case "show-menu":
                    action = new action_show_menu(conversation, line_event);
                    break;
                case "play-music":
                    action = new action_play_music(conversation, line_event);
                    break;
                default:
                    action = new action_faq(conversation, line_event);
                    break;
            }

            // If api.ai return some parameters. we add them to context.
            if (conversation.intent.parameters && Object.keys(conversation.intent.parameters).length > 0){
                for (let param of Object.keys(conversation.intent.parameters)){
                    let context = {};
                    context[param] = conversation.intent.parameters[param];
                    action.add_context(context);
                }
            }

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
        }
    )
});

module.exports = router;
