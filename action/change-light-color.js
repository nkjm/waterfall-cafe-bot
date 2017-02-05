'use strict';

let Promise = require('bluebird');
let memory = require('memory-cache');
let line = require('../line');
let hue = require('../hue');

module.exports = class ActionChangeLightColor {

    constructor(conversation, line_event) {
        this._conversation = conversation;
        this._line_event = line_event;
        this._required_parameter = {
            color: {
                message_to_confirm: {
                    type: "text",
                    text: "何色にしますか？"
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
        return hue.change_color(that._conversation.confirmed.color).then(
            function(response){
                let messages = [{
                    type: "text",
                    text: "了解しましたー。"
                }];

                let promise = line.replyMessage(that._line_event.replyToken, messages);

                // Update memory.
                that._conversation.is_complete = true;
                memory.put(that._line_event.source.userId, that._conversation);

                return promise;
            },
            function(response){
                return Promise.reject("Failed to turn on light.");
            }
        );
    }

    add_parameter(answer){
        let answer_key = Object.keys(answer)[0];
        let answer_value = answer[Object.keys(answer)[0]];

        if (answer_value === null || answer_value == ""){
            return;
        }

        const color_mappings = [{
            label: "青",
            code: "0000ff"
        },{
            label: "ブルー",
            code: "0000ff"
        },{
            label: "赤",
            code: "ff0000"
        },{
            label: "レッド",
            code: "ff0000"
        },{
            label: "黄",
            code: "ffff00"
        },{
            label: "イエロー",
            code: "ffff00"
        },{
            label: "橙",
            code: "FFA500"
        },{
            label: "オレンジ",
            code: "FFA500"
        },{
            label: "緑",
            code: "000800"
        },{
            label: "グリーン",
            code: "000800"
        },{
            label: "ピンク",
            code: "FF69B4"
        },{
            label: "紫",
            code: "800080"
        },{
            label: "パープル",
            code: "800080"
        },{
            label: "栗",
            code: "800000"
        },{
            label: "茶",
            code: "800000"
        },{
            label: "ブラウン",
            code: "800000"
        }];

        // Replace color name with color code.
        if (answer_key == "color"){
            for (let color_mapping of color_mappings){
                if (answer_value.replace("色", "") == color_mapping.label){
                    answer_value = color_mapping.code;
                }
            }
            answer[Object.keys(answer)[0]] = answer_value;
        }

        console.log("Adding parameter {" + answer_key + ":'" + answer_value + "'}");

        // Add parameter.
        Object.assign(this._conversation.confirmed, answer);

        // Remove item from to_confirm.
        delete this._conversation.to_confirm[answer_key];
        if (this._conversation.confirming == answer_key){
            this._conversation.confirming = null;
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
