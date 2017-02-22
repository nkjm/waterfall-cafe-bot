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

        if (!!this.skill.required_parameter && typeof this.skill.required_parameter == "object"){
            console.log(`This skill requires ${Object.keys(this.skill.required_parameter).length} parameters.`);
        } else {
            console.log(`This skill requires 0 parameters.`);
        }
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

        // If there is no required_parameter, we just return empty object as confirmed.
        if (!required_parameter){
            return to_confirm;
        }

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

    add_parameter(key, value){
        console.log(`Parsing parameter {${key}: "${value}"}`);

        let parsed_value;

        // Parse the value. If the value is not suitable for this key, exception will be thrown.
        if (this.skill.required_parameter[key]){
            if (!!this.skill.required_parameter[key].parse){
                parsed_value = this.skill.required_parameter[key].parse(value);
            } else if (!!this.skill["parse_" + key]){
                parsed_value = this.skill["parse_" + key](value);
            } else {
                throw("Parse method not found.");
            }
        } else if (this.skill.optional_parameter[key]){
            if (!!this.skill.optional_parameter[key].parse){
                parsed_value = this.skill.optional_parameter[key].parse(value);
            } else if (!!this.skill["parse_" + key]){
                parsed_value = this.skill["parse_" + key](value);
            } else {
                throw("Parse method not found.");
            }
        } else {
            // This is not the parameter we care about. So skip it.
            console.log("This is not the parameter we care about.");
            throw("This is not the parameter we care about.");
        }

        console.log(`Adding parameter {${key}: "${parsed_value}"}`);

        // Add the parameter to "confirmed".
        let param = {};
        param[key] = parsed_value;
        Object.assign(this.conversation.confirmed, param);

        // At the same time, save the parameter key as "previously confirmed" thing.
        this.conversation.previous.confirmed = key;

        // Remove item from to_confirm.
        if (this.conversation.to_confirm[key]){
            delete this.conversation.to_confirm[key];
        }

        // Clear confirming.
        if (this.conversation.confirming == key){
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
