'use strict'

let express = require('express');
let router = express.Router();
let wfc = require('../waterfall-cafe');
let line = require('../line');
let Promise = require('bluebird');

Promise.config({
    // Enable cancellation
    cancellation: true
});

router.post('/', function(req, res, next) {
    res.status(200).end();

    // Signature Validation
    /*
    if (!line.validateSignature(req.get('X-Line-Signature'), req.rawBody)){
        console.log('Signature validation failed.');
        return;
    }
    console.log("Signature validation succeeded.");
    */

    // get today's menu
    let main = wfc.getTodaysMenu().then(
        function(response){
            console.log("Got menu");
            console.log(response);

            let food_list = {};
            for (let food of response){
                food_list[food.plate] = food;
            }

            if (food_list === {}){
                console.log("Food list is 0.");
                main.cancel();
                return;
            }

            // reply to user.
            console.log("Going to reply today's menu.");
            let reply_token = req.body.events[0].replyToken;
            let messages = [{
                type: "text",
                text: "今日のPLATE Aは" + food_list.plate_a + "です。"
            }]
            return line.replyMessage(reply_token, messages);
        },
        function(response){
            console.log("Failed to get today's menu.");
            console.log(response);
            main.cancel();
        }
    ).then(
        function(response){
            console.log("Message sent.");
        },
        function(response){
            console.log(response);
        }
    )
});

module.exports = router;
