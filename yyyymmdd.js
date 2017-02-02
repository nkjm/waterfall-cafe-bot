'use strict';

module.exports = class yyyymmdd {
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
};
