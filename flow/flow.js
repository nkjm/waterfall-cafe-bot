'use strict';

const memory_retention = process.env.MEMORY_RETENTION;
const SKILL_PATH = process.env.SKILL_PATH || "../skill/";
const APIAI_CLIENT_ACCESS_TOKEN = process.env.APIAI_CLIENT_ACCESS_TOKEN;

let Promise = require('bluebird');
let memory = require('memory-cache');
let apiai = require('apiai');
let line = require('../service/line');
let skill = {};
let skill_play_music = require('../skill/play-music');
let skill_show_menu = require('../skill/show-menu');
let skill_show_calorie = require('../skill/show-calorie');
let skill_turn_on_light = require('../skill/turn-on-light');
let skill_turn_off_light = require('../skill/turn-off-light');
let skill_change_light_color = require('../skill/change-light-color');
let skill_faq = require('../skill/faq');
let skill_request = require('../skill/request');
let skill_clear_conversation = require('../skill/clear-conversation');
let skill_greeting = require('../skill/greeting');

module.exports = class Flow {
    constructor(line_event, conversation){
        this.line_event = line_event;
        this.conversation = conversation;
        this.skill = this._instantiate_skill(this.conversation.intent.action);
        console.log(`This skill requires ${Object.keys(this.skill.required_parameter).length} parameters.`);

        this.conversation.to_confirm = this._identify_to_confirm_parameter(this.skill.required_parameter, this.conversation.confirmed);

        console.log(`We have ${Object.keys(this.conversation.to_confirm).length} parameters to confirm.`);
    }

    _instantiate_skill(intent){
        if (!intent){
            console.log("Intent should have been set but not.");
            return;
        }

        // If the intent is not identified, we use faq as skill.
        if (intent == "input.unknown"){
            intent = "faq";
        }

        let Skill;
        try {
            Skill = require(SKILL_PATH + intent);
        } catch (err){
            console.log(`Cannnot import ${SKILL_PATH}${intent}`);
            throw(`Cannnot import ${SKILL_PATH}${intent}`);
        }
        return new Skill();
    }

    /*
    _instantiate_skill(intent){
        if (!intent){
            console.log("Intent should have been set but not.");
        }
        let skill;
        switch (intent) {
            case "show-menu":
                skill = new skill_show_menu();
            break;
            case "show-calorie":
                skill = new skill_show_calorie();
            break;
            case "play-music":
                skill = new skill_play_music();
            break;
            case "turn-on-light":
                skill = new skill_turn_on_light();
            break;
            case "turn-off-light":
                skill = new skill_turn_off_light();
            break;
            case "change-light-color":
                skill = new skill_change_light_color();
            break;
            case "request":
                skill = new skill_request();
            break;
            case "clear-conversation":
                skill = new skill_clear_conversation();
            break;
            case "greeting":
                skill = new skill_greeting();
            break;
            default:
                skill = new skill_faq();
            break;
        }
        return skill;
    }
    */

    _identify_to_confirm_parameter(required_parameter, confirmed){
        let to_confirm = {};
        // Scan confirmed parameters and if missing required parameters found, we add them to to_confirm.
        for (let req_param_key of Object.keys(required_parameter)){
            if (!confirmed[req_param_key]){
                to_confirm[req_param_key] = required_parameter[req_param_key];
            }
        }
        return to_confirm;
    }

    _collect(){
        if (Object.keys(this.conversation.to_confirm).length == 0){
            console.log("While collect() is called, there is no parameter to confirm.");
            return Promise.reject();
        }
        let messages = [this.conversation.to_confirm[Object.keys(this.conversation.to_confirm)[0]].message_to_confirm];

        // Set confirming.
        this.conversation.confirming = Object.keys(this.conversation.to_confirm)[0];

        // Send question to the user.
        return line.replyMessage(this.line_event.replyToken, messages);
    }

    static identify_intent(session_id, text){
        let ai_instance = apiai(APIAI_CLIENT_ACCESS_TOKEN);
        let ai_request = ai_instance.textRequest(text, {sessionId: session_id});
        let promise_got_intent = new Promise((resolve, reject) => {
            ai_request.on('response', (response) => {
                resolve(response);
            });
            ai_request.end();
        });
        return promise_got_intent;
    }

    add_parameter(parameter){
        console.log("Adding parameter {" + Object.keys(parameter)[0] + ":'" + parameter[Object.keys(parameter)[0]] + "'}");

        // Add the parameter to "confirmed".
        Object.assign(this.conversation.confirmed, parameter);

        // At the same time, save the parameter key as "previously confirmed" thing.
        this.conversation.previous.confirmed = Object.keys(parameter)[0];

        // Remove item from to_confirm.
        if (this.conversation.to_confirm[Object.keys(parameter)[0]]){
            delete this.conversation.to_confirm[Object.keys(parameter)[0]];
        }

        // Clear confirming.
        if (this.conversation.confirming == Object.keys(parameter)[0]){
            this.conversation.confirming = null;
        }

        console.log(`We have ${Object.keys(this.conversation.to_confirm).length} parameters to confirm.`);
    }

    finish(){
        // If we still have parameters to confirm, we collect them.
        if (Object.keys(this.conversation.to_confirm).length > 0){
            return this._collect();
        }
        // If we have no parameters to confirm, we finish this conversationw with final reply.
        return this.skill.finish(this.line_event, this.conversation);
    }
};
