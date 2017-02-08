'use strict';

/*
** Import Packages
*/
let express = require('express');
let path = require('path');
let favicon = require('serve-favicon');
let logger = require('morgan');
let cookieParser = require('cookie-parser');
let bodyParser = require('body-parser');
let route_webhook = require('./routes/webhook2');

/*
** Middleware Configuration
*/
let app = express();
app.use(logger('dev'));
app.use(bodyParser.json({
    verify: function(req, res, buf, encoding) {
        req.rawBody = buf;
    }
}));
app.use(cookieParser());

/*
** Router Configuration
*/
app.use('/webhook', route_webhook);

module.exports = app;
