'use strict';

var express = require('express');
var controller = require('./CompaignGraphs.controller');

var router = express.Router();
var auth = require('../../auth/auth.service');
var config = require('../../config/environment');
//var redis = require('redis');
//var cache = require('apicache').options({debug:true,statusCodes: {exclude:[404,403,500,502,504],include:[]},redisClient: redis.createClient(config.redis) }).middleware;
var cronJob = require('cron').CronJob;

// top 10 Genre played
router.get('/topgenres', auth.isAuthenticated(), controller.top_genres);

// top 10 Content played
router.get('/topcontents', auth.isAuthenticated(), controller.top_contents);

// top 10 Food&beverages
router.get('/topfoods', auth.isAuthenticated(), controller.top_foods);

// time zone
router.get('/timeZoneWiseWIFILogins', auth.isAuthenticated(), controller.timeZoneWiseWIFILogins);

//top 10 destination wise wifilogin
router.get('/destinationWiseUsers', auth.isAuthenticated(), controller.destinationWiseUsers);

//daily summary analysis
// router.get('/daily_summarys', auth.isAuthenticated(), controller.daily_summarys);

//destinations wise summary
router.get('/compaignswise_summarys', auth.isAuthenticated(), controller.compaignswise_summarys);

//Host wise summary
// router.get('/hostwise_summarys', auth.isAuthenticated(), controller.hostwise_summarys);

module.exports = router;