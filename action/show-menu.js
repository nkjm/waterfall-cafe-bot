'use strict';

let request = require('request');
let Promise = require('bluebird');
let memory = require('memory-cache');
let wfc = require('../waterfall-cafe');
let line = require('../line');
let yyyymmdd = require('../yyyymmdd');

module.exports = class ActionShowMenu {

    constructor(conversation, line_event) {
        this._conversation = conversation;
        this._line_event = line_event;
        this._required_parameter = {
            date: {
                message_to_confirm: {
                    type: "template",
                    altText: "いつのメニューですか？昨日？今日？明日？",
                    template: {
                        type: "buttons",
                        text: "いつのメニューですか？",
                        actions: [{
                            type: "postback",
                            label: "昨日",
                            data: "昨日"
                        },{
                            type: "postback",
                            label: "今日",
                            data: "今日"
                        },{
                            type: "postback",
                            label: "明日",
                            data: "明日"
                        }]
                    }
                }
            }
        }

        // If this is the very first time of the conversation, we set to_confirm following required_parameter.
        if (
            Object.keys(this._conversation.to_confirm).length == 0 &&
            Object.keys(this._required_parameter).length > 0 &&
            Object.keys(this._conversation.confirmed).length == 0
        ){
            this._conversation.to_confirm = this._required_parameter;
        }

        console.log("We have " + Object.keys(this._conversation.to_confirm).length + " parameters to confirm.");
    }

    is_parameter_sufficient(){
        if (Object.keys(this._conversation.to_confirm).length > 0){
            return false;
        }
        return true;
    }

    collect(){
        if (Object.keys(this._conversation.to_confirm).length == 0){
            console.log("While collect() is called, there is no parameter to confirm.");
            Promise.reject();
            return;
        }
        let messages = [this._conversation.to_confirm[Object.keys(this._conversation.to_confirm)[0]].message_to_confirm];

        // Update the memory.
        this._conversation.confirming = Object.keys(this._conversation.to_confirm)[0];
        memory.put(this._line_event.source.userId, this._conversation);

        return line.replyMessage(this._line_event.replyToken, messages);
    }

    finish(){
        let that = this;
        return wfc.getMenu(that._conversation.confirmed.date).then(
            function(response){
                console.log("Got menu.");

                let food_list = {};
                for (let food of response){
                    food_list[food.plate] = food;
                }

                if (food_list === {}){
                    return Promise.reject("Food list is 0.")
                }

                // Update memory.
                that._conversation.is_complete = true;
                memory.put(that._line_event.source.userId, that._conversation);

                // reply to user.
                console.log("Going to reply today's menu.");
                let messages = [{
                    type: "text",
                    text: "今日のPLATE Aは" + food_list.a.menu + "です。"
                }]
                return line.replyMessage(that._line_event.replyToken, messages);
            },
            function(response){
                return Promise.reject("Failed to get today's menu.");
            }
        );
    }

    add_parameter(answer){
        let answer_key = Object.keys(answer)[0];
        let answer_value = answer[Object.keys(answer)[0]];

        if (answer_value === null || answer_value == ""){
            return;
        }

        // Manipulate the answer if required.
        if (answer_key == "date"){
            if (answer_value.match(/昨日/)){
                answer_value = yyyymmdd.yesterday();
            } else if (answer_value.match(/今日/)){
                answer_value = yyyymmdd.today();
            } else if (answer_value.match(/明日/)){
                answer_value = yyyymmdd.tomorrow();
            } else {
                console.log("Assume when is yyyy-mm-dd.");
            }
            answer[Object.keys(answer)[0]] = answer_value;
        }

        console.log("Adding parameter '" + answer_key + "': " + answer_value + "'");

        // Add parameter.
        Object.assign(this._conversation.confirmed, answer);

        // Remove item from to_confirm.
        delete this._conversation.to_confirm[answer_key];
        if (this.conversation.confirming == answer_key){
            this.conversation.confirming = null;
        }

        // Update memory.
        memory.put(this._line_event.source.userId, this._conversation);

        console.log("We have " + Object.keys(this._conversation.to_confirm).length + " parameters to confirm.");
    }

    run(){
        if (this.is_parameter_sufficient()){
            return this.finish();
        }
        return this.collect();
    }
};