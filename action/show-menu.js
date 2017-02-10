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

        // Scan confirmed parameters and if missing required parameters found, we add them to to_confirm.
        for (let req_param_key of Object.keys(this._required_parameter)){
            if (!this._conversation.confirmed[req_param_key] && !this._conversation.to_confirm[req_param_key]){
                this._conversation.to_confirm[req_param_key] = this._required_parameter[req_param_key];
            }
        }

        console.log("We have " + Object.keys(this._conversation.to_confirm).length + " parameters to confirm.");
    }

    parse_parameter(answer){
        let answer_key = Object.keys(answer)[0];
        let answer_value = answer[Object.keys(answer)[0]];
        let parameter = {};

        // Manipulate the answer for date if required.
        if (answer_key == "date"){
            if (answer_value === null || answer_value == ""){
                return false;
            }
            if (answer_value.match(/一昨日/) || answer_value.match(/おととい/)){
                answer_value = yyyymmdd.day_before_yesterday();
            } else if (answer_value.match(/昨日/)){
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
            if (answer_value === null || answer_value == ""){
                return false;
            }
            if (answer_value.match(/Plate A/) || answer_value.match(/PLATE A/) || answer_value.match(/plate a/) || answer_value.match(/プレートA/) || answer_value.match(/プレート A/) || answer_value.match(/プレート a/) || answer_value.match(/PLATE a/) || answer_value.match(/^[aA]$/) || answer_value.match(/^[aA].$/) || answer_value.match(/^[aA]。$/)){
                answer_value = "a";
            } else if (answer_value.match(/Plate B/) || answer_value.match(/PLATE B/) || answer_value.match(/plate b/) || answer_value.match(/プレートB/) || answer_value.match(/プレート B/) || answer_value.match(/プレート b/) || answer_value.match(/PLATE b/) || answer_value.match(/^[bB]$/) || answer_value.match(/^[bB].$/) || answer_value.match(/^[bB]。$/)){
                answer_value = "b";
            } else if (answer_value.match(/Plate 600/) || answer_value.match(/PLATE 600/) || answer_value.match(/plate 600/) || answer_value.match(/プレート600/) || answer_value.match(/プレート 600/) || answer_value.match(/PLATE600/) || answer_value.match(/^600$/) || answer_value.match(/^600。$/) || answer_value.match(/^600.$/) || answer_value.match(/p600/)){
                answer_value = "p600";
            } else if (answer_value.match(/[dD][oO][nN] [sS][eE][tT]/) || answer_value.match(/[dD][oO][nN]セット/) || answer_value.match(/[dD][oO][nN] セット/) || answer_value.match(/丼セット/) || answer_value.match(/丼 セット/) || answer_value.match(/丼[sS][eE][tT]/) || answer_value.match(/丼 [sS][eE][tT]/) || answer_value.match(/丼/) || answer_value.match(/[dD][oO][nN]/)){
                answer_value = "don";
            } else if (answer_value.match(/[nN][oO][oO][dD][lL][eE]/) || answer_value.match(/ヌードル/) || answer_value.match(/麺/)){
                answer_value = "noodle";
            } else if (answer_value.match(/[pP][aA][sS][tT][aA]/) || answer_value.match(/パスタ/) || answer_value.match(/スパゲッティ/) || answer_value.match(/スパゲッティー/)){
                answer_value = "pasta";
            } else {
                // This is not suitable parameter for plate
                return false;
            }
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

                    // Generate text composed of food menu.
                    messages = [{
                        type: "text",
                        text: ""
                    }];
                    for (let food of response){
                        if (food.plate && food.menu){
                            messages[0].text += plate_mapping[food.plate] + "は「" + food.menu + "」、\n";
                        }
                    }

                    if (messages[0].text == ""){
                        messages[0].text == "おかしいなぁ。メニューが見当たりませんでした。ごめんね。";
                    } else {
                        messages[0].text += "です。";
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
