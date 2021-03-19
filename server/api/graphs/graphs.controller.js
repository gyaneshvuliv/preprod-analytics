'use strict';

var _ = require('lodash');
var db = require('../../config/mysql')
// var db_pp = require('../../config/mysql_pp')
var Action = require('../vuscreen/vuscreen.model');
var moment = require('moment');
var EM = require('../../../server/config/email-dispatcher');
var NodeCache = require("node-cache");
var cachedData = new NodeCache({ stdTTL: 0 });
var mongoose = require('mongoose')
var json2csv = require('json2csv');
var fs = require('fs')
var config = require('../../../server/config/environment');
var request = require('request');
var cronController = require('../cron/cron.controller');
var async = require('async');
const { user } = require('../../config/email-settings');



//  Get list of top10 genre by Clicks//////////
exports.top_genre = function (req, res) {
  // var top_genre = function (req, res) {
  var startDate, endDate;
  if (req.query.startDate) { startDate = moment(req.query.startDate).format('YYYY-MM-DD'); }
  if (req.query.endDate) { endDate = moment(req.query.endDate).format('YYYY-MM-DD'); }

  var query = "select "
    + " b.genre, count(1) Clicks"
    + " from"
    + " spicescreen.vuscreen_tracker as a Join spicescreen.vuscreen_content_package as b ON a.view_id = b.content_id"
    + " where "
    + " a.menu='WATCH' and a.type='video' and"
    + " a.sync_date>='" + startDate + "' AND a.sync_date<='" + endDate + "' "
    + " group by b.genre order by count(1) desc limit 10"
  db.get().query(query, function (err, doc) {
    if (err) { return handleError(res, err); }
    return res.status(200).json(doc);
  })
};
//   top_genre();

//  Get list of top10 content by Clicks////////////

exports.top_content = function (req, res) {
  // var top_content = function (req, res) {
  var startDate, endDate;
  if (req.query.startDate) { startDate = moment(req.query.startDate).format('YYYY-MM-DD'); }
  if (req.query.endDate) { endDate = moment(req.query.endDate).format('YYYY-MM-DD'); }

  var query = "select "
    + " b.title, count(1) Clicks"
    + " from"
    + " spicescreen.vuscreen_tracker as a Join spicescreen.vuscreen_content_package as b ON a.view_id = b.content_id"
    + " where "
    + " a.menu='WATCH' and a.type='video' and"
    + " a.sync_date>='" + startDate + "' AND a.sync_date<='" + endDate + "' "
    + " group by b.title order by count(1) desc limit 10"
  db.get().query(query, function (err, doc) {
    if (err) { return handleError(res, err); }
    return res.status(200).json(doc);
  })
};
//   top_content();

//  Get list of top10 Food&Beverage by Clicks////////////
exports.top_food = function (req, res) {
  // var top_food = function (req, res) {
  var startDate, endDate;
  if (req.query.startDate) { startDate = moment(req.query.startDate).format('YYYY-MM-DD'); }
  if (req.query.endDate) { endDate = moment(req.query.endDate).format('YYYY-MM-DD'); }

  var query = "select "
    + " b.title, count(1) Clicks"
    + " from"
    + " spicescreen.vuscreen_tracker as a Join spicescreen.vuscreen_fnb_content as b ON a.view_id = b.content_id"
    + " where "
    + " a.menu='FNB' and"
    + " a.sync_date>='" + startDate + "' AND a.sync_date<='" + endDate + "' "
    + " group by b.title order by count(1) desc limit 10"
  db.get().query(query, function (err, doc) {
    if (err) { return handleError(res, err); }
    return res.status(200).json(doc);
  })
};
//   top_food();

// Get wifiogin in timezone/////
exports.timeZoneWiseWIFILogin = function (req, res) {
  // var timeZoneWiseWIFILogin = function () {
  async function app() {
    var finalData = [];
    for (let p = 1; p < 2; p++) {
      // var currentDate = moment(new Date()).format('YYYY-MM-DD');
      var d = new Date();
      // console.log(p);
      d.setDate(d.getDate() - p);
      var Yesterday = moment(d).format('YYYY-MM-DD').toString()
      console.log(Yesterday);
      var timezoneone = [
        {
          start: '00:01',
          end: '04:00'
        },
        {
          start: '04:01',
          end: '08:00'
        },
        {
          start: '08:01',
          end: '12:00'
        },
        {
          start: '12:01',
          end: '16:00'
        },
        {
          start: '16:01',
          end: '20:00'
        },
        {
          start: '20:01',
          end: '23:59'
        },


      ]
      for (let i in timezoneone) {
        // console.log(i);
        timezoneone[i].start = Yesterday + ' ' + timezoneone[i].start;
        timezoneone[i].end = Yesterday + ' ' + timezoneone[i].end;
        let doc1 = await wifi_login_timeZone_wise(timezoneone[i].start, timezoneone[i].end);
        // console.log(host);
        let midData = {
          date: Yesterday,
          // cycle:i,
          start: timezoneone[i].start,
          end: timezoneone[i].end,
          user: doc1
        }
        // console.log(midData);
        finalData.push(midData);

      }
    }
    // console.log("abc");
    console.log(finalData);
    res.json(finalData);
    // let doc2 = await email_TZW(finalData);


    //   res.status("200").json(insert);

  }
  app();

};
// timeZoneWiseWIFILogin()
function wifi_login_timeZone_wise(start, end) {
  return new Promise(function (myResolve, myReject) {
    // console.log("vish");
    var query = `SELECT  a.event, a.view_datetime, a.journey_id,unique_mac_address FROM spicescreen.vuscreen_events a JOIN vuscreen_registration b ON a.device_id = b.device_id    WHERE  a.view_datetime <= '${end}'  and a.view_datetime >= '${start}' AND a.event != 'download' AND a.event != 'charging' ORDER BY a.id DESC`;
    db.get().query(query, function (err, doc) {
      console.log(err);
      if (err) { return handleError(res, err); }
      else {
        // console.log(query);
        // console.log(doc.length);
        if (doc.length == 0) {
          myResolve(0);
        }
        else {
          var data = ""
          let wifiMap = new Map();
          let a = []
          var count = 0;
          for (let i = 0; i < doc.length; i++) {
            data += doc[i].unique_mac_address + ",";
            // console.log(doc[i].unique_mac_address)

            if (doc.length == i + 1) {
              var data1 = data.split(',');
              // console.log(data1.length);

              for (let j = 0; j < data1.length; j++) {
                const element = data1[j];

                wifiMap.set(element, element)

                if (data1.length == j + 1) {
                  // console.log(wifiMap.size)
                  count = wifiMap.size
                  // myResolve(count);
                  // // function logMapElements(value, key, map) {

                  // //   a.push({ "macaddress": value })
                  // //   // console.log(`m[${key}] = ${value}`);
                  // // }
                  // // wifiMap.forEach(logMapElements);
                }

              }
              // console.log(wifiMap);
              // console.log(wifiMap.size);
              myResolve(count);

            }
          }
        }
      }
    })
  });
};

////////Get Destination wise wifilogin/////////////////
exports.destinationWiseWIFILogin = function (req, res) {
  // var destinationWiseWIFILogin = function () {
  async function app() {
    var finalData = [];
    for (let p = 1; p < 2; p++) {
      // var currentDate = moment(new Date()).format('YYYY-MM-DD');
      var d = new Date();
      // console.log(p);
      d.setDate(d.getDate() - p);
      var Yesterday = moment(d).format('YYYY-MM-DD').toString()
      console.log(Yesterday);
      var dest = ['AGR',
        'AMD',
        'AJL',
        'KQH',
        'ATQ',
        'IXU',
        'IXB',
        'IXG',
        'BLR',
        'BUP',
        'BHO',
        'MAA',
        'CJB',
        'DBR',
        'DED',
        'DEL',
        'DHM',
        'DIB',
        'RDP',
        'GAY',
        'GOI',
        'GOP',
        'GAU',
        'GWL',
        'HBX',
        'HYD',
        'IDR',
        'JLR',
        'JAI',
        'JSA',
        'AIP',
        'IXJ',
        'JRG',
        'JDH',
        'IXY',
        'KNU',
        'HJR',
        'COK',
        'CCU',
        'CCJ',
        'IXL',
        'LKO',
        'IXM',
        'IXE',
        'BOM',
        'ISK',
        'PYG',
        'PAT',
        'PNY',
        'PBD',
        'IXZ',
        'PNQ',
        'RAJ',
        'IXR',
        'SAG',
        'IXS',
        'SXR',
        'STV',
        'TRV',
        'TRZ',
        'TIR',
        'TCR',
        'UDR',
        'VNS',
        'VGA',
        'VTZ',
        'ALA',
        'BKK',
        'FRU',
        'CEB',
        'CGP',
        'CMB',
        'DAC',
        'DXB',
        'HKG',
        'JED',
        'KBL',
        'DMM',
        'LHR',
        'MNL',
        'DME',
        'MLE',
        'MCT',
        'RKT',
        'RUH',
        'TAS',
        'YYZ'
      ];
      for (let i in dest) {
        // console.log(i);
        let doc1 = await wifi_login_des_wise(dest[i], Yesterday);
        // console.log(host);
        let midData = {
          user: doc1,
          date: Yesterday,
          des: dest[i]
        }
        // console.log(midData);
        finalData.push(midData);

      }
    }
    // console.log("abc");
    // console.log(finalData);
    finalData.sort(function(a, b){return b.user-a.user});
//  console.log(finalData);
    res.json(finalData);
    // let doc2 = await email_DW(finalData);


    //   res.status("200").json(insert);

  }
  app();

};

function wifi_login_des_wise(dest, Yesterday) {
  return new Promise(function (myResolve, myReject) {
    // console.log("vish");
    var query = `SELECT  a.event, a.view_datetime, a.journey_id,unique_mac_address FROM spicescreen.vuscreen_events a JOIN vuscreen_registration b ON a.device_id = b.device_id    WHERE  a.view_date =  '${Yesterday}'  and a.destination= '${dest}' AND a.event != 'download' AND a.event != 'charging' ORDER BY a.id DESC`;
    db.get().query(query, function (err, doc) {
      // console.log(err);
      if (err) { return handleError(res, err); }
      else {
        // console.log(query);
        // console.log(doc.length);
        if (doc.length == 0) {
          myResolve(0);
        }
        else {
          var data = ""
          let wifiMap = new Map();
          let a = []
          var count = 0;
          for (let i = 0; i < doc.length; i++) {
            data += doc[i].unique_mac_address + ",";
            // console.log(doc[i].unique_mac_address)

            if (doc.length == i + 1) {
              var data1 = data.split(',');
              // console.log(data1.length);

              for (let j = 0; j < data1.length; j++) {
                const element = data1[j];

                wifiMap.set(element, element)

                if (data1.length == j + 1) {
                  // console.log(wifiMap.size)
                  count = wifiMap.size
                  // myResolve(count);
                  // // function logMapElements(value, key, map) {

                  // //   a.push({ "macaddress": value })
                  // //   // console.log(`m[${key}] = ${value}`);
                  // // }
                  // // wifiMap.forEach(logMapElements);
                }

              }
              // console.log(wifiMap);
              // console.log(wifiMap.size);
              myResolve(count);

            }
          }
        }
      }
    })
  });
};