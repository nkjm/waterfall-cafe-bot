'use strict';

let Promise = require('bluebird');
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
                },
                parse: this.parse_date
            }
        };

        this.optional_parameter = {
            plate: {
                parse: this.parse_plate
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

    parse_date(value){
        if (value === null || value == ""){
            throw("Value is emppty.");
        }
        let parsed_value;
        if (value.match(/一昨日/) || value.match(/おととい/)){
            parsed_value = yyyymmdd.day_before_yesterday();
        } else if (value.match(/昨日/)){
            parsed_value = yyyymmdd.yesterday();
        } else if (value.match(/今日/)){
            parsed_value = yyyymmdd.today();
        } else if (value.match(/明日/)){
            parsed_value = yyyymmdd.tomorrow();
        } else if (value.match(/明後日/) || value.match(/あさって/)){
            parsed_value = yyyymmdd.day_after_tomorrow();
        } else if (yyyymmdd.parse(value)){
            parsed_value = value;
        } else {
            // This is not suitable parameter for date.
            throw(`${value} is not suitable for date.`);
        }
        return parsed_value;
    }

    parse_plate(value){
        if (value === null || value == ""){
            throw("Value is emppty.");
        }
        let parsed_value;
        if (value.match(/[pP][lL][aA][tT][eE] [aA]/) || value.match(/プレート[aA]/) || value.match(/プレート [aA]/) || value.match(/^[aA]$/) || value.match(/^[aA].$/) || value.match(/^[aA]。$/)){
            parsed_value = "a";
        } else if (value.match(/[pP][lL][aA][tT][eE] [bB]/) || value.match(/プレート[bB]/) || value.match(/プレート [bB]/) || value.match(/^[bB]$/) || value.match(/^[bB].$/) || value.match(/^[bB]。$/)){
            parsed_value = "b";
        } else if (value.match(/[pP][lL][aA][tT][eE] 600/) || value.match(/[pP][lL][aA][tT][eE]600/) || value.match(/プレート600/) || value.match(/プレート 600/) || value.match(/^600$/) || value.match(/^600。$/) || value.match(/^600.$/) || value.match(/p600/)){
            parsed_value = "p600";
        } else if (value.match(/[dD][oO][nN] [sS][eE][tT]/) || value.match(/[dD][oO][nN]セット/) || value.match(/[dD][oO][nN] セット/) || value.match(/丼セット/) || value.match(/丼 セット/) || value.match(/丼[sS][eE][tT]/) || value.match(/丼 [sS][eE][tT]/) || value.match(/丼/) || value.match(/[dD][oO][nN]/)){
            parsed_value = "don";
        } else if (value.match(/[nN][oO][oO][dD][lL][eE]/) || value.match(/ヌードル/) || value.match(/麺/)){
            parsed_value = "noodle";
        } else if (value.match(/[pP][aA][sS][tT][aA]/) || value.match(/パスタ/) || value.match(/スパゲッティ/) || value.match(/スパゲッティー/)){
            parsed_value = "pasta";
        } else {
            // This is not suitable parameter for date.
            throw(`${value} is not suitable for date.`);
        }
        return parsed_value;
    }

    finish(line_event, conversation){
        return wfc.getMenu(conversation.confirmed.date).then(
            (response) => {
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
                                messages[0].text = this.plate_mapping[conversation.confirmed.plate] + "は「" + food.menu + "」";
                            }
                        }
                    } else {
                        // Reply all menus.
                        for (let food of response){
                            if (food.plate && food.menu){
                                messages[0].text += this.plate_mapping[food.plate] + "は「" + food.menu + "」、\n";
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
            (response) => {
                return Promise.reject("Failed to get today's menu.");
            }
        );
    }
};
