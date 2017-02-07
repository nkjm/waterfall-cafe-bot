'use strict';

let soap = require("soap");
let memory = require("memory-cache");

const RN_USER = process.env.RN_USER;
const RN_PASSWORD = process.env.RN_PASSWORD;
const RN_WSDL = process.env.RN_WSDL;
const SOAP_WSS_SECURITY = new soap.WSSecurity(RN_USER, RN_PASSWORD, {hasTimeStamp: false,hasTokenCreated : false});
const APP_API_ID = 'KF Operations';
const APP_IP_ADDRESS = '10.0.0.0';

module.exports = class RightNow {
    static searchAnswer(question){
        return new Promise(function(resolve, reject){
            soap.createClient(RN_WSDL, function(err, client) {
                if (err || !client){
                    console.log("Failed to create soap client.");
                    return reject("Failed to create soap client.");
                }
                console.log("rightnow soap client created.");

                client.setSecurity(SOAP_WSS_SECURITY);
                client.addSoapHeader({
                    ClientInfoHeader: {
                        AppID : APP_API_ID
                    }},          //soapHeader Object({rootName: {name: "value"}}) or strict xml-string
                    '',         //name Unknown parameter (it could just a empty string)
                    'rnm_v1',   //namespace prefix of xml namespace
                    ''          //xmlns URI
                );

                let options = {};
                client.StartInteraction({
                    AppIdentifier: APP_API_ID,
                    UserIPAddress: APP_IP_ADDRESS
                }, function(err, result){
                    if (err) {
                        console.log("Failed to start interaction.");
                        return reject("Failed to start interaction.");
                    } else {
                        client.GetSmartAssistantSearch({
                            SessionToken: result.SessionToken,
                            Body: quesion,
                            Subject: quesion,
                            Limit: 5
                        }, function(err, result){
                            if(!!result.ContentListResponse.SummaryContents&&!!result.ContentListResponse.SummaryContents.SummaryContentList){
                                if(result.ContentListResponse.SummaryContents.SummaryContentList.length>0){
                                    for (var i = 0; i < result.ContentListResponse.SummaryContents.SummaryContentList.length; i ++) {
                                        console.log('/***********     Result ' + (i+1) + '     ***********/');
                                        console.log('Title :' + '\n' + result.ContentListResponse.SummaryContents.SummaryContentList[i].Title);
                                        console.log('Excerpt :'  + '\n' + result.ContentListResponse.SummaryContents.SummaryContentList[i].Excerpt);
                                        console.log('/***********     Result ' + (i+1) + '     ***********/');
                                    }
                                    return resolve(result.ContentListResponse.SummaryContents.SummaryContentList);
                                } else {
                                    console.log('/***********     Result      ***********/');
                                    console.log('Title :' + '\n' + result.ContentListResponse.SummaryContents.SummaryContentList.Title);
                                    console.log('Excerpt :'  + '\n' + result.ContentListResponse.SummaryContents.SummaryContentList.Excerpt);
                                    console.log('/***********     Result      ***********/');
                                    return resolve(result.ContentListResponse.SummaryContents.SummaryContentList);
                                }
                            }
                        }, options);
                    }
                },
                options);
            });
        });
    }
}
