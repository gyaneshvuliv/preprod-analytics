'use strict';

var express = require('express');
var controller = require('./graphs.controller');

var router = express.Router();
var auth = require('../../auth/auth.service');
var config = require('../../config/environment');
//var redis = require('redis');
//var cache = require('apicache').options({debug:true,statusCodes: {exclude:[404,403,500,502,504],include:[]},redisClient: redis.createClient(config.redis) }).middleware;
var cronJob = require('cron').CronJob;

// top 10 Genre played
router.get('/topgenre', auth.isAuthenticated(), controller.top_genre);

// top 10 Content played
router.get('/topcontent', auth.isAuthenticated(), controller.top_content);

// top 10 Food&beverages
router.get('/topfood', auth.isAuthenticated(), controller.top_food);

// time zone
router.get('/timeZoneWiseWIFILogin', auth.isAuthenticated(), controller.timeZoneWiseWIFILogin);

//top 10 destination wise wifilogin
router.get('/destinationWiseWIFILogin', auth.isAuthenticated(), controller.destinationWiseWIFILogin);

module.exports = router;