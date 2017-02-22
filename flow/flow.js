'use strict';

const memory_retention = process.env.MEMORY_RETENTION;
const SKILL_PATH = process.env.SKILL_PATH || "../skill/";
const APIAI_CLIENT_ACCESS_TOKEN = process.env.APIAI_CLIENT_ACCESS_TOKEN;

let Promise = require('bluebird');
let memory = require('memory-cache');
let apiai = require('apiai');
let line = require('../service/line');

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
