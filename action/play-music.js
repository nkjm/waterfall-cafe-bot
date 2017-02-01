'use strict';

let request = require('request');
let Promise = require('bluebird');
let memory = require('memory-cache');
let line = require('../line');

module.exports = class ActionPlayMusic {

    static play_music(conversation, line_event){
        const required_context = {
            condition: 'or',
            attributes: ['song','artist','playlist']
        }

        /*
         * If the song has been specified, we just play it and that's it.
         */

        /*
         * If the song has not been specified, ask for the user.
         */
         // Reply.
         // reply to user.
         console.log("Going to ask what kind of song the user likes to play.");
         let reply_token = line_event.replyToken;
         let messages = [{
             type: "text",
             text: "かけたい曲を教えてください。"
         }];
         let replied = line.replyMessage(reply_token, messages);

         // Remember the conversation.
         conversation.asking = 'what-song';
         conversation.is_complete = false;
         memory.put(line_event.source.userId, conversation);

         return replied;
    }

};
