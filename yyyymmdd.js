'use strict';

module.exports = class yyyymmdd {
    static day_before_yesterday(){
        let now = new Date();
        let d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2);
        let yyyymmdd = d.getFullYear() + "-" + (Number(d.getMonth()) + 1) + "-" + d.getDate();
        return yyyymmdd;
    }

    static yesterday(){
        let now = new Date();
        let d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        let yyyymmdd = d.getFullYear() + "-" + (Number(d.getMonth()) + 1) + "-" + d.getDate();
        return yyyymmdd;
    }

    static today(){
        let now = new Date();
        let d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        let yyyymmdd = d.getFullYear() + "-" + (Number(d.getMonth()) + 1) + "-" + d.getDate();
        return yyyymmdd;
    }

    static tomorrow(){
        let now = new Date();
        let d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        let yyyymmdd = d.getFullYear() + "-" + (Number(d.getMonth()) + 1) + "-" + d.getDate();
        return yyyymmdd;
    }

    static day_after_tomorrow(){
        let now = new Date();
        let d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2);
        let yyyymmdd = d.getFullYear() + "-" + (Number(d.getMonth()) + 1) + "-" + d.getDate();
        return yyyymmdd;
    }

    static parse(yyyymmdd){
        let reg = /(\d{4})-(0[1-9]|1[0-2]|[1-9])-(0[1-9]|[12][0-9]|3[01]|[1-9])/;
        if (reg.exec(yyyymmdd)){
            return true;
        }
        return false;
    }
};
