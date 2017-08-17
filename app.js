var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var multer = require('multer');
var controller = require('./controller.js');

var app = express();
// view engine setup


// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(multer().any());
app.use(controller);
// catch 404 and forward to error handler
app.use(function(req, res) {
  res.status(404).send({error:true, message: "page not found"});
});

// error handler
app.use(function(err, req, res, next) {
  console.log(err.message);
  res.status(500).send({error:true, message: "server Error"});
});
module.exports = app;
