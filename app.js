var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var controller = require('./controller.js');
var multer = require('multer')().any();
var app = express();
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(controller);
app.use(function(req, res) {
  res.status(404).send({error:true, message: "page not found"});
});
app.use(function(err, req, res) {
  res.status(500).send({error:true, message: "Something seems to not good"});
});
app.use((err, req, res, next) => {
   console.log(err.message);
   if(err)return res.json({error:true, message: "Oh Uh no Something went wrong with i/p"});
});

module.exports = app;
