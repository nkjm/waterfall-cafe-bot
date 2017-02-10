'use strict';

const plate_mapping = {
    a: "Plate A",
    b: "Plate B",
    don: "丼セット",
    noodle: "麺",
    pasta: "パスタ",
    p600: "Plate 600"
}
const memory_retention = Number(process.env.MEMORY_RETENTION);

let Promise = require('bluebird');
let memory = require('memory-cache');
let wfc = require('../waterfall-cafe');
let line = require('../line');
let yyyymmdd = require('../yyyymmdd');



module.exports = class ActionShowCalorie {

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
            },
            plate: {
                message_to_confirm: {
                    type: "text",
                    text: "どのプレートですか？"
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

        // Manipulate the answer if required.
        if (answer_key == "date"){
            if (answer_value === null || answer_value == ""){
                return false;
            }
            if  (answer_value.match(/一昨日/) || answer_value.match(/おととい/)){
                answer_value = yyyymmdd.day_before_yesterday();
            } else (answer_value.match(/昨日/)){
                answer_value = yyyymmdd.yesterday();
            } else if (answer_value.match(/今日/)){
                answer_value = yyyymmdd.today();
            } else if (answer_value.match(/明日/)){
                answer_value = yyyymmdd.tomorrow();
            } else if (answer_value.match(/明後日/) || answer_value.match(/あさって/)){
                answer_value = yyyymmdd.day_after_tomorrow();
            } else if (yyyymmdd.parse(answer_value)){
                answer_value = answer_value;
            } else {
                // This is not suitable parameter for date.
                return false;
            }
        } else if (answer_key == "plate"){
            answer_value = answer_value;
        } else {
            // This is unnecessary parameter so ignore this.
            return false;
        }
        parameter[answer_key] = answer_value;
        return parameter;
    }

    finish(){
        let that = this;
        return wfc.getMenu(that._conversation.confirmed.date).then(
            function(response){
                let messages;
                if (!response || response.length == 0){
                    messages = [{
                        type: "text",
                        text: "あら、該当するメニューがないようです。"
                    }];
                } else {
                    console.log("Got menu.");

                    // Identify the calorie.
                    let calorie;
                    for (let food of response){
                        if (food.plate == that._conversation.confirmed.plate){
                            calorie = food.calorie;
                        }
                    }

                    if (!calorie){
                        messages = [{
                            type: "text",
                            text: "不思議なことに" + plate_mapping[that._conversation.confirmed.plate] + "のカロリー情報が見つかりませんでした。ごめんね。"
                        }]
                    } else {
                        messages = [{
                            type: "text",
                            text: plate_mapping[that._conversation.confirmed.plate] + "は" + calorie + "kcalです。"
                        }]
                    }
                }

                return line.replyMessage(that._line_event.replyToken, messages);
            },
            function(response){
                return Promise.reject("Failed to get today's menu.");
            }
        );
    }
};
