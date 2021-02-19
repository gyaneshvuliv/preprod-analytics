'use strict';

var express = require('express');
var controller = require('./vuscreen.controller');

var router = express.Router();
var auth = require('../../auth/auth.service');
var config = require('../../config/environment');
//var redis = require('redis');
//var cache = require('apicache').options({debug:true,statusCodes: {exclude:[404,403,500,502,504],include:[]},redisClient: redis.createClient(config.redis) }).middleware;
var cronJob = require('cron').CronJob;


router.get('/serverclient/datewise', auth.isAuthenticated(), controller.get_serverclient_datewise);
router.get('/serverclient/hourwise', auth.isAuthenticated(), controller.get_serverclient_hourwise);
router.get('/fileplayshare/hourwise', auth.isAuthenticated(), controller.get_fileplayshare_hourwise);
// router.get('/action/summary',auth.isAuthenticated(), controller.get_action_summary);
router.get('/server', auth.isAuthenticated(), controller.vuscreen_index);
router.get('/server/export/csv', auth.isAuthenticated(), controller.vuscreen_export_csv);

//pie graphs
router.get('/busSummary', auth.isAuthenticated(), controller.busSummary);
router.get('/busSummary/:cat', auth.isAuthenticated(), controller.busSummaryDetails);
router.get('/genreSummary', auth.isAuthenticated(), controller.genreSummary);
router.get('/genreSummary/:cat', auth.isAuthenticated(), controller.genreSummaryDetails);

//registration
router.get('/registration', auth.isAuthenticated(), controller.vuscreen_registration_index);
router.get('/registration/export/csv', auth.isAuthenticated(), controller.vuscreen_registration_export_csv);

//events
router.get('/events', auth.isAuthenticated(), controller.vuscreen_events_index);
router.get('/events/export/csv', auth.isAuthenticated(), controller.vuscreen_events_export_csv);

// temp tracker for FOG
router.get('/tracker1', auth.isAuthenticated(), controller.vuscreen_tracker1_index);
router.get('/tracker1/export/csv', auth.isAuthenticated(), controller.vuscreen_tracker1_export_csv);

//tracker
router.get('/tracker', auth.isAuthenticated(), controller.vuscreen_tracker_index);
router.get('/tracker/export/csv', auth.isAuthenticated(), controller.vuscreen_tracker_export_csv);
router.get('/play/real-time', auth.isAuthenticated(), controller.play_real_time);

//game
router.get('/games', auth.isAuthenticated(), controller.vuscreen_game_index);
router.get('/games/export/csv', auth.isAuthenticated(), controller.vuscreen_game_export_csv);

//read
router.get('/reads', auth.isAuthenticated(), controller.vuscreen_read_index);
router.get('/reads/export/csv', auth.isAuthenticated(), controller.vuscreen_read_export_csv);

//travel
router.get('/travels', auth.isAuthenticated(), controller.vuscreen_travel_index);
router.get('/travels/export/csv', auth.isAuthenticated(), controller.vuscreen_travel_export_csv);

//mall
router.get('/malls', auth.isAuthenticated(), controller.vuscreen_mall_index);
router.get('/malls/export/csv', auth.isAuthenticated(), controller.vuscreen_mall_export_csv);

//ads
router.get('/ads', auth.isAuthenticated(), controller.vuscreen_ads_index);
router.get('/ads/export/csv', auth.isAuthenticated(), controller.vuscreen_ads_export_csv);

//// Cabin Crew

router.get('/cabinCrew', auth.isAuthenticated(), controller.vuscreen_cabinCrew_index);
router.get('/cabincrew/export/csv', auth.isAuthenticated(), controller.vuscreen_CabinCrew_export_csv);


//FnB
router.get('/fnb', auth.isAuthenticated(), controller.vuscreen_FnB_index);
router.get('/fnb/export/csv', auth.isAuthenticated(), controller.vuscreen_FnB_export_csv);
router.get('/fnb/export/item/csv', auth.isAuthenticated(), controller.vuscreen_FnB_items_export_csv);

//memorytracker
router.get('/memorytracker', auth.isAuthenticated(), controller.memory_tracker_index);
router.get('/memorytracker/export/csv', auth.isAuthenticated(), controller.memory_tracker_export_csv);

// top 10 content played
router.get('/topcontent', auth.isAuthenticated(), controller.top_10_content);

// top 10 Genre played
router.get('/topgenre', auth.isAuthenticated(), controller.top_10_genre);

// top clicks
router.get('/topclicks', auth.isAuthenticated(), controller.top_clicks);

// top clicks by hosts
router.get('/topclicksbyhosts', auth.isAuthenticated(), controller.top_clicks_by_hosts);

// leaderboard
router.get('/leaderboard', auth.isAuthenticated(), controller.leaderboard);

// get partner details by id
router.get('/get-partner-details/:id', auth.isAuthenticated(), controller.get_partner_detaills)

// edit registration details
router.post('/edit-registration', auth.isAuthenticated(), controller.edit_registration)

// send sms
router.get('/send-sms', auth.isAuthenticated(), controller.send_sms)

// monthlyusage
router.get('/monthlyusage', auth.isAuthenticated(), controller.monthly_usage)

// usage bucket
router.get('/usage-bucket', auth.isAuthenticated(), controller.usage_bucket)

// server session details
router.get('/server-session', controller.serverSessionDetails);

// get count of menu type ss 
router.get('/get-ss', controller.get_ss);

router.get('/event/bottomdata', controller.vuscreen_getEventData_Bottom);
router.get('/play/bottomdata', controller.vuscreen_getplayData_Bottom);
router.get('/read/bottomdata', controller.vuscreen_getreadData_Bottom);
router.get('/game/bottomdata', controller.vuscreen_getGameData_Bottom);
router.get('/fnb/bottomdata', controller.vuscreen_getfnbData_Bottom);
router.get('/analytics/clicks_users_alls', controller.vuscreen_analyticsvu_panl);

// router.get('/analytics/clicks_users_des', controller.vuscreen_analyticsvu_des);
// router.get('/play_duration/bottomdata', controller.get_Platform_duration);   
router.get('/play_duration/bottomdata', controller.get_Platform_duration);
router.get('/analytics/clicks_users_allsPro', controller.vuscreen_analyticsvu_panlpro);
router.get('/analytics/clicks_users_des', controller.vuscreen_analyticsvu_des);
router.get('/analytics/clicks_wifipro', controller.wifi_login_pro);
router.get('/analytics/clicks_wifiact', controller.wifi_login_act);



module.exports = router;