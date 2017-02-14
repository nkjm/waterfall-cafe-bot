'use strict';

const memory_retention = process.env.MEMORY_RETENTION;
const APIAI_CLIENT_ACCESS_TOKEN = process.env.APIAI_CLIENT_ACCESS_TOKEN;

let Promise = require('bluebird');
let memory = require('memory-cache');
let apiai = require('apiai');
let line = require('../line');
let action_play_music = require('../action/play-music');
let action_show_menu = require('../action/show-menu');
let action_show_calorie = require('../action/show-calorie');
let action_turn_on_light = require('../action/turn-on-light');
let action_turn_off_light = require('../action/turn-off-light');
let action_change_light_color = require('../action/change-light-color');
let action_faq = require('../action/faq');
let action_request = require('../action/request');
let action_clear_conversation = require('../action/clear-conversation');

module.exports = class FlowTool {
    static identify_to_confirm_parameter(required_parameter, confirmed){
        let to_confirm = {};
        // Scan confirmed parameters and if missing required parameters found, we add them to to_confirm.
        for (let req_param_key of Object.keys(required_parameter)){
            if (!confirmed[req_param_key]){
                to_confirm[req_param_key] = required_parameter[req_param_key];
            }
        }
        console.log("We have " + Object.keys(to_confirm).length + " parameters to confirm.");
        return to_confirm;
    }

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

    static instantiate_action(action_name){
        let action;
        switch (action_name) {
            case "show-menu":
                action = new action_show_menu();
            break;
            case "show-calorie":
                action = new action_show_calorie();
            break;
            case "play-music":
                action = new action_play_music();
            break;
            case "turn-on-light":
                action = new action_turn_on_light();
            break;
            case "turn-off-light":
                action = new action_turn_off_light();
            break;
            case "change-light-color":
                action = new action_change_light_color();
            break;
            case "request":
                action = new action_request();
            break;
            case "clear-conversation":
                action = new action_clear_conversation();
            break;
            default:
                action = new action_faq();
            break;
        }
        return action;
    }

    static add_parameter(conversation, parameter){
        console.log("Adding parameter {" + Object.keys(parameter)[0] + ":'" + parameter[Object.keys(parameter)[0]] + "'}");

        // Add the parameter to "confirmed".
        Object.assign(conversation.confirmed, parameter);

        // At the same time, save the parameter key as "previously confirmed" thing.
        conversation.previous.confirmed = Object.keys(parameter)[0];

        // Remove item from to_confirm.
        if (conversation.to_confirm[Object.keys(parameter)[0]]){
            delete conversation.to_confirm[Object.keys(parameter)[0]];
        }

        // Clear confirming.
        if (conversation.confirming == Object.keys(parameter)[0]){
            conversation.confirming = null;
        }

        console.log("We have " + Object.keys(conversation.to_confirm).length + " parameters to confirm.");
    }

    static is_parameter_sufficient(conversation){
        if (Object.keys(conversation.to_confirm).length > 0){
            return false;
        }
        return true;
    }

    static collect(conversation, reply_token){
        if (Object.keys(conversation.to_confirm).length == 0){
            console.log("While collect() is called, there is no parameter to confirm.");
            return Promise.reject();
        }
        let messages = [conversation.to_confirm[Object.keys(conversation.to_confirm)[0]].message_to_confirm];

        // Set confirming.
        conversation.confirming = Object.keys(conversation.to_confirm)[0];

        // Send question to the user.
        return line.replyMessage(reply_token, messages);
    }

    static run(action, line_event, conversation){
        if (Object.keys(conversation.to_confirm).length > 0){
            return FlowTool.collect(conversation, line_event.replyToken);
        }
        return action.finish(line_event, conversation);
    }
};
