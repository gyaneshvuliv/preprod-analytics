'use strict';

var express = require('express');
var controller = require('./cron.controller');

var router = express.Router();
var auth = require('../../auth/auth.service');
var cronJob = require('cron').CronJob;


var gameEmailJob = new cronJob('00 10 06 * * *', function () {
    // var gameEmailJob = new cronJob('*/13 * * * * *', function () {
    controller.gameEmailCron()
});

var timeSpentJob = new cronJob('00 06 06 * * *', function () {
// var timeSpentJob = new cronJob('*/20 * * * * *', function () {
    controller.video_game_timespent_cron()
});

// runs every monday and friday
var countByHostJob = new cronJob('00 02 06 * * 1,5', function () {
    // var countByHostJob = new cronJob('*/10 * * * * *', function () {
    controller.countByHostCron()
});

var MTDJob = new cronJob('00 04 06 * * *', function () {
// var MTDJob = new cronJob('*/30 * * * * *', function () {
    controller.MTDCron()
});

var serverSessionnJob = new cronJob('00 05 06 * * *', function () {
//  var serverSessionnJob = new cronJob('*/45 * * * * *', function () {
    controller.serverSessionCron()
});

var morjob = new cronJob('00 05 12 * * *', function () {
    // var morjob = new cronJob('*/10 * * * * *', function(){
    // cron.play_views_hourwise_cron();
    controller.server_session_mor_cron()

});

var evejob = new cronJob('00 05 23 * * *', function () {
    // var evejob = new cronJob('*/15 * * * * *', function(){
    // cron.play_views_hourwise_cron();
    controller.server_session_eve_cron()

});

var zimindarajob = new cronJob('00 00 8,13,18,22 * * *', function () {
    // var zimindarajob = new cronJob('*/15 * * * * *', function(){
    controller.zimindara_cron()
});

var indocanadianjob = new cronJob('00 00 8,13,18,22 * * *', function () {
    // var indocanadianjob = new cronJob('*/15 * * * * *', function(){
    controller.indocanadian_cron()
});

var buswisecsvjob = new cronJob('00 45 11 * * *', function () {
    // var buswisecsvjob = new cronJob('*/15 * * * * *', function(){
    controller.buswisecsv_cron()
});

// var vehicleUpdateJob = new cronJob('00 45 11 * * *', function () {
var vehicleUpdateJob = new cronJob('00 05 01 * * *', function () {
    controller.vehicleUpdate_Cron()
});

var dauEmailJob = new cronJob('00 05 01 * * *', function () {
    // var dauEmailJob = new cronJob('*/15 * * * * *', function () {
    controller.dauEmailCron()
});

var playEmailJob = new cronJob('00 06 01 * * *', function () {
    // var playEmailJob = new cronJob('*/15 * * * * *', function () {
    controller.playEmailCron()
});


var fnbEmailJob = new cronJob('00 10 01 * * *', function () {
    // var fnbEmailJob = new cronJob('*/15 * * * * *', function () {
    controller.vuscreen_getFnBmail()
});

var topClick = new cronJob('00 10 01 * * *', function () {
    // var fnbEmailJob = new cronJob('*/15 * * * * *', function () {
    controller.vuscreen_getplaydtail()
});

var Analytics = new cronJob('00 10 01 * * *', function () {
    // var fnbEmailJob = new cronJob('*/15 * * * * *', function () {
    controller.vuscreen_analyticsReport()
});



var dauEmaiTemplJob = new cronJob('00 05 01 * * *', function () {
    // var dauEmailJob = new cronJob('*/15 * * * * *', function () {
    controller.dauEmailTempCron()
});

var dauEmaiwifiView = new cronJob('00 20 01 * * *', function () {
    // var dauEmaiwifiView = new cronJob('*/15 * * * * *', function () {
    controller.wifi_login_view()
});
var dauEmaiwifiSync = new cronJob('00 25 01 * * *', function () {
    // var dauEmaiwifiSync = new cronJob('*/15 * * * * *', function () {
    controller.wifi_login_sync()
});
var dauEmailSMS = new cronJob('00 05 02 * * *', function () {
    // var dauEmaiwifiSync = new cronJob('*/15 * * * * *', function () {
    controller.vuscreen_SmsReport()
});
var basestation = new cronJob('00 10 03 * * *', function () {
    //  var basestation = new cronJob('*/15 * * * * *', function () {
    controller.vuscreen_basestation()
});

var hostNotPlaced = new cronJob('00 10 03 * * *', function () {
    //  var basestation = new cronJob('*/15 * * * * *', function () {
    controller.test()
});

var eros = new cronJob('00 15 03 * * *', function () {
    //  var basestation = new cronJob('*/15 * * * * *', function () {
    controller.erosMovies()
});

// dauEmailJob.start()
// playEmailJob.start()
// fnbEmailJob.start()
// topClick.start()
// Analytics.start()
// dauEmaiTemplJob.start()
// dauEmaiwifiView.start()
// dauEmaiwifiSync.start()
// dauEmailSMS.start()
// basestation.start()
// hostNotPlaced.start()
// eros.start();
// vehicleUpdateJob.start()
// morjob.start()
// evejob.start()
// zimindarajob.start()
// indocanadianjob.start()
// buswisecsvjob.start()

// gameEmailJob.start()
// timeSpentJob.start()
// countByHostJob.start()
// MTDJob.start()
// serverSessionnJob.start()

module.exports = router;
