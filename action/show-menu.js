'use strict';

let request = require('request');
let Promise = require('bluebird');
let memory = require('memory-cache');
let wfc = require('../waterfall-cafe');
let line = require('../line');

module.exports = class ActionShowMenu {

    constructor(conversation, line_event) {
        this._conversation = conversation;
        this._line_event = line_event;
        this._required_context = {
            date: {
                message_to_confirm: {
                    type: "template",
                    altText: "いつのメニューですか？",
                    template: {
                        type: "buttons",
                        text: "いつのメニューですか？",
                        actions: [{
                            type: "postback",
                            label: "昨日",
                            data: JSON.stringify({date: "yesterday"})
                        },{
                            type: "postback",
                            label: "今日",
                            data: JSON.stringify({date: "today"})
                        },{
                            type: "postback",
                            label: "明日",
                            data: JSON.stringify({date: "tomorrow"})
                        }]
                    }
                }
            }
        }

        // If this is the very first time of the conversation, we set to_confirm following required_context.
        if (Object.keys(this._conversation.to_confirm).length == 0 && this._required_context.length > 0 && Object.keys(this._conversation.confirmed).length == 0){
            this._conversation.to_confirm = this._required_context;
        }
    }

    is_context_sufficient(){
        if (Object.keys(this._conversation.to_confirm).length > 0){
            return false;
        }
        return true;
    }

    collect(){
        if (Object.keys(this._conversation.to_confirm).length == 0){
            console.log("While collect() is called, there is no context to confirm.");
            Promise.reject();
            return;
        }
        let messages = [this._conversation.to_confirm[Object.keys(this._conversation.to_confirm)[0]].message_to_confirm];

        // Update the memory.
        this._conversation.confirming = this._conversation.to_confirm[Object.keys(this._conversation.to_confirm)[0]];
        memory.put(this._line_event.source.userId, this._conversation);

        return line.replyMessage(this._line_event.replyToken, messages);
    }

    finish(conversation){
        return wfc.getTodaysMenu().then(
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
                this._conversation.is_complete = true;
                memory.put(this._line_event.source.userId, this._conversation);

                // reply to user.
                console.log("Going to reply today's menu.");
                let messages = [{
                    type: "text",
                    text: "今日のPLATE Aは" + food_list.plate_a.menu + "です。"
                }]
                return line.replyMessage(this._line_event.replyToken, messages);
            },
            function(response){
                return Promise.reject("Failed to get today's menu.");
            }
        );
    }

    add_context(answer){
        Object.assign(this._conversation.confirmed, answer);
        delete this._conversation.to_confirm[Object.keys(answer)[0]];
        memory.put(this._line_event.source.userId, this._conversation);
    }

    run(){
        if (this.is_context_sufficient()){
            return this.finish();
        }
        return this.collect();
    }

};
