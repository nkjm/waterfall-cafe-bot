'use strict';

const memory_retention = Number(process.env.MEMORY_RETENTION);

const color_mappings = [{
    label: "白",
    code: "ffffff"
},{
    label: "青",
    code: "9AB7FF"
},{
    label: "ブルー",
    code: "9AB7FF"
},{
    label: "赤",
    code: "FF7B7B"
},{
    label: "レッド",
    code: "FF7B7B"
},{
    label: "黄",
    code: "FFFA6A"
},{
    label: "イエロー",
    code: "FFFA6A"
},{
    label: "橙",
    code: "FFA500"
},{
    label: "オレンジ",
    code: "FFA500"
},{
    label: "ネイビー",
    code: "000080"
},{
    label: "緑",
    code: "A3FF7B"
},{
    label: "グリーン",
    code: "A3FF7B"
},{
    label: "ピンク",
    code: "FFBADD"
},{
    label: "桃",
    code: "FFBADD"
},{
    label: "紫",
    code: "E37BFF"
},{
    label: "パープル",
    code: "E37BFF"
},{
    label: "栗",
    code: "800000"
},{
    label: "茶",
    code: "800000"
},{
    label: "ブラウン",
    code: "800000"
},{
    label: "琥珀",
    code: "bf783a"
},{
    label: "金",
    code: "e6b422"
},{
    label: "銀",
    code: "afafb0"
}];

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
                    text: "お任せを。何色にしますか？"
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

    parse_parameter(answer){
        let answer_key = Object.keys(answer)[0];
        let answer_value = answer[Object.keys(answer)[0]];
        let parameter = {};

        // Replace color name with color code.
        if (answer_key == "color"){
            if (answer_value === null || answer_value == ""){
                return false;
            }
            let found_color = false;
            for (let color_mapping of color_mappings){
                if (answer_value.replace("色", "") == color_mapping.label){
                    answer_value = color_mapping.code;
                    found_color = true;
                }
            }
            if (found_color){
                console.log("Color identified.");
                parameter[answer_key] = answer_value;
            } else {
                console.log("Unable to identify color.");
                this._conversation.to_confirm[answer_key].message_to_confirm.text = "色が特定できませんでした。もう一度、端的に色だけ教えてもらえませんか？";
                return false;
            }
        } else {
            // This is unnecessary parameter so ignore this.
            return false;
        }
        return parameter;
    }

    finish(){
        let that = this;
        return hue.change_color(that._conversation.confirmed.color).then(
            function(response){
                let messages = [{
                    type: "text",
                    text: "了解しましたー。"
                }];

                return line.replyMessage(that._line_event.replyToken, messages);
            },
            function(response){
                return Promise.reject("Failed to turn on light.");
            }
        );
    }
};
