'use strict';

const memory_retention = process.env.MEMORY_RETENTION;
const APIAI_CLIENT_ACCESS_TOKEN = process.env.APIAI_CLIENT_ACCESS_TOKEN;

let Promise = require('bluebird');
let memory = require('memory-cache');
let apiai = require('apiai');
let action_play_music = require('./action/play-music');
let action_show_menu = require('./action/show-menu');
let action_show_calorie = require('./action/show-calorie');
let action_turn_on_light = require('./action/turn-on-light');
let action_turn_off_light = require('./action/turn-off-light');
let action_change_light_color = require('./action/change-light-color');
let action_faq = require('./action/faq');

module.exports = class Flow {
    static identify_intent(session_id, text){
        let ai_instance = apiai(APIAI_CLIENT_ACCESS_TOKEN);
        let ai_request = ai_instance.textRequest(text, {sessionId: session_id});
        let promise_got_intent = new Promise(function(resolve, reject){
            ai_request.on('response', function(response){
                resolve(response);
            });
            ai_request.end();
        });
        return promise_got_intent;
    }

    static instantiate_action(conversation, line_event){
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
        return action;
    }
};
