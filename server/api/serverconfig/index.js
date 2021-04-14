'use strict';

var express = require('express');
var controller = require('./serverconfig.controller');

var router = express.Router();
var auth = require('../../auth/auth.service');
var config = require('../../config/environment');
//var redis = require('redis');
//var cache = require('apicache').options({debug:true,statusCodes: {exclude:[404,403,500,502,504],include:[]},redisClient: redis.createClient(config.redis) }).middleware;

//Vuscreen
router.get('/get/details', auth.isAuthenticated(),controller.get_config_detailsg);
router.post('/save',auth.isAuthenticated(), controller.save);




module.exports = router;
