'use strict'

const APIAI_CLIENT_ACCESS_TOKEN = process.env.APIAI_CLIENT_ACCESS_TOKEN;

let express = require('express');
let router = express.Router();
let Promise = require('bluebird');
let apiai = require('apiai');
let uuid = require('uuid/v4');
let wfc = require('../waterfall-cafe');
let line = require('../line');
let action = require('../action');

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

    let aiInstance = apiai(APIAI_CLIENT_ACCESS_TOKEN);
    let aiRequest = aiInstance.textRequest(line_event.message.text, {sessionId: uuid()});
    let gotIntent = new Promise(function(resolve, reject){
        aiRequest.on('response', function(response){
            resolve(response);
        });
        aiRequest.end();
    });

    let main = gotIntent.then(
        function(response){
            console.log("Intent is " + response.result.action);

            switch (response.result.action) {
                case "tell-me-todays-menu":
                    return action.tell_me_todays_menu(response.result, line_event);
                    break;
                default:
                    return action.unknown(response.result, line_event);
                    break;
            }
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
