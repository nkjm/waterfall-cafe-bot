'use strict';

let Promise = require('bluebird');
let line = require('../line');
let hue = require('../hue');

module.exports = class ActionChangeLightColor {

    constructor() {
        this.required_parameter = {
            color: {
                message_to_confirm: {
                    type: "text",
                    text: "何色にしますか？"
                }
            }
        };
        this.color_mappings = [{
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
    }

    parse_parameter(param){
        let param_key = Object.keys(answer)[0];
        let param_value = answer[Object.keys(answer)[0]];
        let parsed_param = {};

        // Replace color name with color code.
        if (param_key == "color"){
            if (param_value === null || param_value == ""){
                return false;
            }
            let found_color = false;
            for (let color_mapping of this.color_mappings){
                if (param_value.replace("色", "") == color_mapping.label){
                    param_value = color_mapping.code;
                    found_color = true;
                }
            }
            if (!found_color){
                console.log("Unable to identify color.");
                return false;
            }
            console.log("Color identified.");
            parsed_param[param_key] = param_value;
        } else {
            // This is unnecessary parameter so ignore this.
            return false;
        }
        return parsed_param;
    }

    finish(line_event, conversation){
        let that = this;
        return hue.change_color(conversation.confirmed.color).then(
            function(response){
                let messages = [{
                    type: "text",
                    text: "了解しましたー。"
                }];

                return line.replyMessage(line_event.replyToken, messages);
            },
            function(response){
                return Promise.reject("Failed to turn on light.");
            }
        );
    }
};
