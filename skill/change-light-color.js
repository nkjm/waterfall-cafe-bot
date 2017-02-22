'use strict';

let Promise = require('bluebird');
let line = require('../service/line');
let hue = require('../service/hue');

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
            code: "5068FF"
        },{
            label: "ブルー",
            code: "5068FF"
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
            label: "水",
            code: "94CDFF"
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

    parse_color(value){
        // Replace color name with color code.
        if (value === null || value == ""){
            throw("Value is emppty.");
        }

        let parsed_value = {};

        let found_color = false;
        for (let color_mapping of this.color_mappings){
            if (value.replace("色", "") == color_mapping.label){
                parsed_value = color_mapping.code;
                found_color = true;
            }
        }
        if (!found_color){
            throw(`Unable to identify color: ${value}.`);
        }
        return parsed_value;
    }

    finish(line_event, conversation){
        return hue.change_color(conversation.confirmed.color).then(
            (response) => {
                let messages = [{
                    type: "text",
                    text: "了解しましたー。"
                }];
                return line.replyMessage(line_event.replyToken, messages);
            },
            (response) => {
                return Promise.reject("Failed to turn on light.");
            }
        );
    }
};
