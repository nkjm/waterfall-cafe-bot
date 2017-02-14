'use strict';

let Promise = require('bluebird');
let memory = require('memory-cache');
let wfc = require('../service/waterfall-cafe');
let line = require('../service/line');
let yyyymmdd = require('../yyyymmdd');

module.exports = class ActionShowMenu {

    constructor() {
        this.required_parameter = {
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
        };
        this.plate_mapping = {
            a: "Plate A",
            b: "Plate B",
            don: "丼セット",
            noodle: "麺",
            pasta: "パスタ",
            p600: "Plate 600"
        };
    }

    parse_parameter(param){
        let param_key = Object.keys(param)[0];
        let param_value = param[Object.keys(param)[0]];
        let parsed_param = {};

        // Manipulate the answer for date if required.
        if (param_key == "date"){
            if (param_value === null || param_value == ""){
                return false;
            }
            if (param_value.match(/一昨日/) || param_value.match(/おととい/)){
                param_value = yyyymmdd.day_before_yesterday();
            } else if (param_value.match(/昨日/)){
                param_value = yyyymmdd.yesterday();
            } else if (param_value.match(/今日/)){
                param_value = yyyymmdd.today();
            } else if (param_value.match(/明日/)){
                param_value = yyyymmdd.tomorrow();
            } else if (param_value.match(/明後日/) || param_value.match(/あさって/)){
                param_value = yyyymmdd.day_after_tomorrow();
            } else if (yyyymmdd.parse(param_value)){
                param_value = param_value;
            } else {
                // This is not suitable parameter for date.
                return false;
            }
        } else if (param_key == "plate"){
            if (param_value === null || param_value == ""){
                return false;
            }
            if (param_value.match(/[pP][lL][aA][tT][eE] [aA]/) || param_value.match(/プレート[aA]/) || param_value.match(/プレート [aA]/) || param_value.match(/^[aA]$/) || param_value.match(/^[aA].$/) || param_value.match(/^[aA]。$/)){
                param_value = "a";
            } else if (param_value.match(/[pP][lL][aA][tT][eE] [bB]/) || param_value.match(/プレート[bB]/) || param_value.match(/プレート [bB]/) || param_value.match(/^[bB]$/) || param_value.match(/^[bB].$/) || param_value.match(/^[bB]。$/)){
                param_value = "b";
            } else if (param_value.match(/[pP][lL][aA][tT][eE] 600/) || param_value.match(/[pP][lL][aA][tT][eE]600/) || param_value.match(/プレート600/) || param_value.match(/プレート 600/) || param_value.match(/^600$/) || param_value.match(/^600。$/) || param_value.match(/^600.$/) || param_value.match(/p600/)){
                param_value = "p600";
            } else if (param_value.match(/[dD][oO][nN] [sS][eE][tT]/) || param_value.match(/[dD][oO][nN]セット/) || param_value.match(/[dD][oO][nN] セット/) || param_value.match(/丼セット/) || param_value.match(/丼 セット/) || param_value.match(/丼[sS][eE][tT]/) || param_value.match(/丼 [sS][eE][tT]/) || param_value.match(/丼/) || param_value.match(/[dD][oO][nN]/)){
                param_value = "don";
            } else if (param_value.match(/[nN][oO][oO][dD][lL][eE]/) || param_value.match(/ヌードル/) || param_value.match(/麺/)){
                param_value = "noodle";
            } else if (param_value.match(/[pP][aA][sS][tT][aA]/) || param_value.match(/パスタ/) || param_value.match(/スパゲッティ/) || param_value.match(/スパゲッティー/)){
                param_value = "pasta";
            } else {
                // This is not suitable parameter for plate
                return false;
            }
        } else {
            // This is unnecessary parameter so ignore this.
            return false;
        }
        parsed_param[param_key] = param_value;
        return parsed_param;
    }

    finish(line_event, conversation){
        let that = this;
        return wfc.getMenu(conversation.confirmed.date).then(
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
                    if (conversation.confirmed.plate){
                        // Reply specific menu.
                        for (let food of response){
                            if (food.plate == conversation.confirmed.plate){
                                messages[0].text = that.plate_mapping[conversation.confirmed.plate] + "は「" + food.menu + "」";
                            }
                        }
                    } else {
                        // Reply all menus.
                        for (let food of response){
                            if (food.plate && food.menu){
                                messages[0].text += that.plate_mapping[food.plate] + "は「" + food.menu + "」、\n";
                            }
                        }
                    }

                    if (messages[0].text == ""){
                        messages[0].text == "おかしいなぁ。メニューが見当たりませんでした。ごめんね。";
                    } else {
                        messages[0].text += "です。";
                    }
                }

                return line.replyMessage(line_event.replyToken, messages);
            },
            function(response){
                return Promise.reject("Failed to get today's menu.");
            }
        );
    }
};
