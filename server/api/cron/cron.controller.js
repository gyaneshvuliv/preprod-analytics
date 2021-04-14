'use strict';

var _ = require('lodash');
var db = require('../../config/mysql')
var moment = require('moment');
var EM = require('../../../server/config/email-dispatcher');
var NodeCache = require("node-cache");
var cachedData = new NodeCache({ stdTTL: 0 });
var json2csv = require('json2csv');
var zlib = require('zlib');
var fs = require('fs')
var config = require('../../../server/config/environment');
const AWS = require('aws-sdk');
const request = require('request')
const s3_details = {
  "accessKeyId": "AKIAQROCQCOGH7Y3RUEG",
  "secretAccessKey": "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",
  "region": "ap-southeast-1",
  "bucket": "mobisign-bucket/Automated_Reports",
}

const s3Client = new AWS.S3({
  accessKeyId: s3_details.accessKeyId,
  secretAccessKey: s3_details.secretAccessKey,
});


/*  Get Daily Email with last seven days game payed.
    @Authentication ----> by session key
    @Authorization ----> Access Controll Logic
    Author : Kedar Gadre
    Date : 16/09/2020
*/
exports.gameEmailCron = function () {
  let d = new Date();
  let d1 = d.setDate(d.getDate() - 1);
  let d2 = d.setDate(d.getDate() - 6);
  d1 = moment(d1).format('YYYY-MM-DD').toString();
  d2 = moment(d2).format('YYYY-MM-DD').toString();
  let query = "SELECT vc.title as vehicle_no, vst.sync_date, COUNT(1) COUNT"
    + " FROM vuscreen_tracker vst"
    + " LEFT JOIN vuscreen_registration vr ON vst.reg_id = vr.reg_id"
    + " LEFT JOIN vuscreen_store_content vc ON vst.view_id = vc.content_id"
    + " WHERE vst.sync_date>='" + d2 + "' AND vst.sync_date<='" + d1 + "' AND vr.vehicle_no NOT REGEXP '[A-Z ]' AND vst.type='zip'"
    + " GROUP BY vc.title, vst.sync_date"
    + " ORDER BY vst.sync_date, vc.title"
  db.get().query(query, function (err, dataArray) {
    if (err) {
      console.log(err)
    } else {
      let userMap = new Map();
      function formatDate(date) {
        let dd = date.getDate();
        let mm = date.getMonth() + 1;
        let yyyy = date.getFullYear();
        if (dd < 10) { dd = '0' + dd }
        if (mm < 10) { mm = '0' + mm }
        date = yyyy + '-' + mm + '-' + dd;
        return date
      }
      let Last7Days = [];
      let obj = {}
      for (let i = 0; i < 7; i++) {
        let d = new Date();
        d.setDate(d.getDate() - i - 1);
        Last7Days.push(formatDate(d))
        let da = formatDate(d)
        obj[da] = 0;
        obj["rowSum"] = 0;
      }

      Last7Days.reverse().join(',');
      let finalArr = []
      for (let i = 0; i < dataArray.length; i++) {
        const element = dataArray[i];
        if (!userMap.has(element.vehicle_no)) {
          let arr = []
          arr.push(element)
          let kg = Object.assign({ vehicle_no: element.vehicle_no }, obj)
          finalArr.push(kg)
          userMap.set(element.vehicle_no, arr)
          // if (i == 0) {
          //     let kg = Object.assign({ vehicle_no: "total" }, obj)
          //     finalArr.push(kg)
          // }

        } else {
          let arr = userMap.get(element.vehicle_no)
          arr.push(element)
          userMap.set(element.vehicle_no, arr)
        }
        if (dataArray.length == i + 1) {
          userMap.forEach((value, key, map, index) => {
            for (let d = 0; d < finalArr.length; d++) {
              const data = finalArr[d];
              let count = 0;
              for (let val = 0; val < value.length; val++) {
                const obj = value[val];
                if (obj["vehicle_no"] == data.vehicle_no) {
                  count = count + parseInt(obj.COUNT)
                  data[obj.sync_date] = obj.COUNT
                  data["rowSum"] = count;
                }
              }
            }
          });
        }
      }
      finalArr.sort((a, b) => b.rowSum - a.rowSum)
      var html = "<html><head>"
      html += "<style>"
      html += "table {font-family: arial, sans-serif;border-collapse: collapse;width: 100%;}"
      html += "td, th {border: 1px solid #dddddd;text-align: left;padding: 8px;}"
      html += "tr:nth-child(even) {background-color: #dddddd;}</style></head>"
      html += "<h4>Dear Recipients,</h4>"
      html += "<h4>Please find below table for game played.</h4><table>"
      html += "<thead><tr>"
      html += "<th>Title</th><th>" + Last7Days[0] + "</th><th>" + Last7Days[1] + "</th>"
      html += "<th>" + Last7Days[2] + "</th><th>" + Last7Days[3] + "</th>"
      html += "<th>" + Last7Days[4] + "</th><th>" + Last7Days[5] + "</th><th>" + Last7Days[6] + "</th><th>Total</th>"
      html += "</tr></thead><tbody>"
      let col0 = 0;
      let col1 = 0;
      let col2 = 0;
      let col3 = 0;
      let col4 = 0;
      let col5 = 0;
      let col6 = 0;
      let finalSum = 0;
      for (let index = 0; index < finalArr.length; index++) {
        const element = finalArr[index];
        col0 = col0 + element[Last7Days[0]];
        col1 = col1 + element[Last7Days[1]];
        col2 = col2 + element[Last7Days[2]];
        col3 = col3 + element[Last7Days[3]];
        col4 = col4 + element[Last7Days[4]];
        col5 = col5 + element[Last7Days[5]];
        col6 = col6 + element[Last7Days[6]];
        html += "<tr>"
        html += "<td><b>" + element.vehicle_no + "</b></td>"
        html += "<td>" + element[Last7Days[0]] + "</td>"
        html += "<td>" + element[Last7Days[1]] + "</td>"
        html += "<td>" + element[Last7Days[2]] + "</td>"
        html += "<td>" + element[Last7Days[3]] + "</td>"
        html += "<td>" + element[Last7Days[4]] + "</td>"
        html += "<td>" + element[Last7Days[5]] + "</td>"
        html += "<td>" + element[Last7Days[6]] + "</td>"
        html += "<td><b>" + element.rowSum + "</b></td>"
        html += "</tr>"
      }
      finalSum = col0 + col1 + col2 + col3 + col4 + col5 + col6;
      html += "<tr><td><b>Total</b></td><td><b>" + col0 + "</b></td><td><b>" + col1 + "</b></td><td><b>" + col2 + "</b></td>"
      html += "<td><b>" + col3 + "</b></td><td><b>" + col4 + "</b></td>"
      html += "<td><b>" + col5 + "</b></td><td><b>" + col6 + "</b></td><td><b>" + finalSum + "</b></td></tr>";
      html += "</tbody></table>";
      html += "<br><br><h5>Thanks & Regards</h5><h5>Mobi Sign Pvt Ltd.</h5></html>"
      let subject = "Games Content Ranking Report"
      let email = 'manoj.gupta@mojoboxx.com ,deepak.kumar@mojoboxx.com,product@mojoboxx.com,monali.monalisa@mojoboxx.com,ashyin.thakral@mojoboxx.com,kedargdr@gmail.com'
      // let email = 'kedargdr@gmail.com,deepak.kumar@mojoboxx.com'
      EM.dispatchEmail(email, subject, html, "play", function (e) {
        console.log(e)
      })
    }
  })
}

/*  Get Cron For Video & Games time spent csv.
    @Authentication ----> by session key
    @Authorization ----> Access Controll Logic
    Author : Kedar Gadre
    Date : 16/09/2020
*/
exports.video_game_timespent_cron = function () {
  let d = new Date();
  d.setDate(d.getDate() - 1);
  let Yesterday = moment(d).format('YYYY-MM-DD').toString();
  let query = "select "
    + " vc.title,"
    + " vc.thumbnail,"
    + " vst.type,"
    + " vc.genre,"
    + " vf.folder,"
    + " am.login_id,"
    + " vst.session_id,"
    + " vst.view_android_id,"
    + " vst.device_id,"
    + " vst.version,"
    + " vst.interface,"
    + " vst.model,"
    + " vst.mac,"
    + " vst.reg_id,"
    + " vst.sync_date,"
    + " vst.view_model,"
    + " vst.view_duration view_duration,"
    + " vst.view_datetime,"
    + " vr.source,"
    + " vr.destination,"
    + " vr.vehicle_no,"
    + " vst.sync_datetime,"
    + " vst.user_agent"
    + " from"
    + " vuscreen_tracker vst"
    + " LEFT JOIN"
    + " vuscreen_content_package vc ON vst.view_id = vc.content_id"
    + " LEFT JOIN "
    + " vuscreen_folders vf ON vf.id = vc.folder_id"
    + " LEFT JOIN"
    + " account_management am ON vst.partner = am.id"
    + " LEFT JOIN "
    + " vuscreen_registration vr ON vst.reg_id = vr.reg_id"
    + " where vst.type IN ('video','brand-video') AND vst.sync_date='" + Yesterday + "'"
    + " order by vst.view_datetime desc,vst.sync_datetime"
  db.get().query(query, function (err, result) {
    if (err) {
      console.log(err)
    } else {
      var query1 = "select "
        + " vc.title,"
        + " vc.thumbnail,"
        + " vst.type,"
        // + " vc.genre,"
        + " am.login_id,"
        + " vst.session_id,"
        + " vst.view_android_id,"
        + " vst.device_id,"
        + " vst.version,"
        + " vst.interface,"
        + " vst.model,"
        + " vst.mac,"
        + " vst.reg_id,"
        + " vst.sync_date,"
        + " vst.view_model,"
        + " vst.view_duration view_duration,"
        + " vst.view_datetime,"
        + " vr.source,"
        + " vr.destination,"
        + " vr.vehicle_no,"
        + " vst.sync_datetime,"
        + " vst.user_agent"
        + " from"
        + " vuscreen_tracker vst"
        + " LEFT JOIN"
        + " vuscreen_store_content vc ON vst.view_id = vc.content_id"
        + " LEFT JOIN"
        + " account_management am ON vst.partner = am.id"
        + " LEFT JOIN "
        + " vuscreen_registration vr ON vst.reg_id = vr.reg_id"
        + " where vst.type= 'zip' AND vst.sync_date='" + Yesterday + "'"
        + " order by vst.view_datetime desc,vst.sync_datetime"
      db.get().query(query1, function (err1, result1) {
        if (err1) {
          console.log(err1)
        } else {
          let playFields = ["reg_id", "source", "destination", "mac", "vehicle_no", "session_id", "device_id", "title", "genre", "type", "view_model", "view_duration", "model", "view_android_id", "interface", "version", "view_datetime", "sync_date", "user_agent"];
          let gamesFields = ["reg_id", "source", "destination", "mac", "vehicle_no", "session_id", "device_id", "title", "type", "view_model", "view_duration", "model", "view_android_id", "interface", "version", "view_datetime", "sync_date", "user_agent"];
          var csvPlay = json2csv({ data: result, fields: playFields });
          var csvGames = json2csv({ data: result1, fields: gamesFields });
          var array = []
          array.push({ key: 'playLogs', value: csvPlay }, { key: 'gameLogs', value: csvGames })
          let url = [];
          for (var i = 0; i < array.length; i++) {
            let key = array[i].key;
            fs.writeFile(config.root + '/server/api/cron/' + array[i].key + '.csv', array[i].value, function (err) {
              if (err) {
                throw err;
              } else {
                console.log('file saved');
                let destPath = key + '_' + moment(new Date()).format('YYYY-MM-DD') + ".csv"
                fs.readFile(config.root + '/server/api/cron/' + key + '.csv', function (err, data) {
                  if (err) throw err; // Something went wrong!
                  s3Client.putObject({
                    Bucket: s3_details.bucket,
                    Key: destPath,
                    ACL: 'public-read',
                    Body: data
                  }, function (err, data) {
                    if (err) {
                      console.log(err)
                    } else {
                      console.log("success")
                      url.push("https://mobisign-bucket.s3.ap-south-1.amazonaws.com/Automated_Reports" + '/' + destPath)
                    }
                  });
                });
              }
            });
          };
          setTimeout(function () {
            let html = "<html><head>"
            html += "<style>"
            html += "table {font-family: arial, sans-serif;border-collapse: collapse;width: 100%;}"
            html += "td, th {border: 1px solid #dddddd;text-align: left;padding: 8px;}"
            html += "tr:nth-child(even) {background-color: #dddddd;}</style></head>"
            html += "<h4>Dear Recipients,</h4>"
            html += "<h4>Please click below URL's to open the reports.</h4>"
            html += "<h4>" + url[0] + "</h4>"
            html += "<h4>" + url[1] + "</h4>"
            html += "<br><h5>Thanks & Regards</h5><h5>Mobi Sign Pvt Ltd.</h5></html>"
            let subject = Yesterday + " - Video & Game Time Spent Logs"
            let email = 'deepak.kumar@mojoboxx.com,product@mojoboxx.com,monali.monalisa@mojoboxx.com,ashyin.thakral@mojoboxx.com,kedargdr@gmail.com'
            // let email = 'kedargdr@gmail.com,deepak.kumar@mojoboxx.com'
            EM.dispatchEmail(email, subject, html, "timeSpent", function (e) {
              console.log(e)
            })
          }, 15000)
        }
      })
    }
  })
}

/*  Get Monday Friday Email with host ID view count user count.
    @Authentication ----> by session key
    @Authorization ----> Access Controll Logic
    Author : Kedar Gadre
    Date : 16/09/2020
*/
exports.countByHostCron = function () {
  let d = new Date();
  let d1 = d.setDate(d.getDate() - 1);
  let d2 = d.setDate(d.getDate() - 6);
  d1 = moment(d1).format('YYYY-MM-DD').toString();
  d2 = moment(d2).format('YYYY-MM-DD').toString();
  let query = "SELECT vr.vehicle_no AS HostID, COUNT(1) Count, COUNT(DISTINCT vst.mac) User"
    + " FROM vuscreen_tracker vst"
    + " LEFT JOIN vuscreen_registration vr ON vst.reg_id = vr.reg_id"
    + " WHERE "
    + " vr.vehicle_no != ''"
    + " GROUP BY vr.vehicle_no"
    + " ORDER BY COUNT desc"
  db.get().query(query, function (err, dataArray) {
    if (err) {
      console.log(err)
    } else {
      var html = "<html><head>"
      html += "<style>"
      html += "table {font-family: arial, sans-serif;border-collapse: collapse;width: 100%;}"
      html += "td, th {border: 1px solid #dddddd;text-align: left;padding: 8px;}"
      html += "tr:nth-child(even) {background-color: #dddddd;}</style></head>"
      html += "<h4>Dear Recipients,</h4>"
      html += "<h4>Please find below table by Host .</h4><table>"
      html += "<thead><tr>"
      html += "<th>Host Id</th><th>View Count</th><th>User Count</th>"
      html += "</tr></thead><tbody>"

      for (let index = 0; index < dataArray.length; index++) {
        const element = dataArray[index];
        html += "<tr>"
        html += "<td><b>" + element.HostID + "</b></td>"
        html += "<td>" + element.Count + "</td>"
        html += "<td><b>" + element.User + "</b></td>"
        html += "</tr>"
      }
      html += "</tbody></table>";
      html += "<br><br><h5>Thanks & Regards</h5><h5>Mobi Sign Pvt Ltd.</h5></html>"
      let subject = "Host Wise activity"
      let email = 'manoj.gupta@mojoboxx.com,deepak.kumar@mojoboxx.com,product@mojoboxx.com,monali.monalisa@mojoboxx.com,ashyin.thakral@mojoboxx.com,kedargdr@gmail.com'
      // let email = 'kedargdr@gmail.com,deepak.kumar@mojoboxx.com'
      EM.dispatchEmail(email, subject, html, "host", function (e) {
        console.log(e)
      })
    }
  })
}

/*  Get Daily Email with monthly date Host ID UU Video Played Game Played Video time spent Games time spent.
    @Authentication ----> by session key
    @Authorization ----> Access Controll Logic
    Author : Kedar Gadre
    Date : 19/09/2020
*/
const jsonexport = require('jsonexport');
const { title } = require('process');
exports.MTDCron = function () {
  let d = new Date();
  let d1 = d.setDate(d.getDate() - 1);
  let d2 = d.setDate(d.getDate() - 6);
  d1 = moment(d1).format('YYYY-MM-DD').toString();
  d2 = moment(d2).format('YYYY-MM-DD').toString();
  var firstDate = moment(new Date()).format('YYYY-MM') + '-01';
  let query = "SELECT vst.sync_date,vr.vehicle_no HostID,COUNT(DISTINCT mac) UU,"
    + " CASE"
    + "   WHEN vst.interface = 'IOS' THEN Round((COUNT(1) / 2))"
    + "   ELSE COUNT(1)"
    + " END AS Played,"
    + "  CASE"
    + "  WHEN vst.interface = 'IOS' THEN Round((SUM(view_duration) / 2))"
    + "  ELSE SUM(view_duration)"
    + " END AS TimeSpent,"
    + " vst.type Type,"
    + " vst.interface,SUBSTRING_INDEX(SUBSTRING_INDEX(user_agent, '(', 2), ')', 1) AS user_agent"
    + " FROM"
    + " vuscreen_tracker vst"
    + " LEFT JOIN"
    + " vuscreen_registration vr ON vst.reg_id = vr.reg_id"
    + " WHERE"
    + " vst.sync_date >='" + firstDate + "' AND vst.sync_date <= '" + d1 + "'"
    + "   AND vst.type = 'video'"
    + "  AND vr.vehicle_no NOT REGEXP '[A-Z ]'"
    + " GROUP BY vr.vehicle_no , vst.sync_date"
    + " ORDER BY vst.sync_date"
  let query1 = "SELECT vst.sync_date,vr.vehicle_no HostID,COUNT(DISTINCT mac) UU,"
    + " CASE"
    + "   WHEN vst.interface = 'IOS' THEN Round((COUNT(1) / 2))"
    + "   ELSE COUNT(1)"
    + " END AS Played,"
    + "  CASE"
    + "  WHEN vst.interface = 'IOS' THEN Round((SUM(view_duration) / 2))"
    + "  ELSE SUM(view_duration)"
    + " END AS TimeSpent,"
    + " vst.type Type,"
    + " vst.interface,SUBSTRING_INDEX(SUBSTRING_INDEX(user_agent, '(', 2), ')', 1) AS user_agent"
    + " FROM"
    + " vuscreen_tracker vst"
    + " LEFT JOIN"
    + " vuscreen_registration vr ON vst.reg_id = vr.reg_id"
    + " WHERE"
    + " vst.sync_date >='" + firstDate + "' AND vst.sync_date <= '" + d1 + "'"
    + "   AND vst.type ='zip'"
    + "  AND vr.vehicle_no NOT REGEXP '[A-Z ]'"
    + " GROUP BY vr.vehicle_no , vst.sync_date"
    + " ORDER BY vst.sync_date"
  db.get().query(query, function (err, result) {
    if (err) {
      console.log(err)
    } else {
      db.get().query(query1, function (err1, result1) {
        if (err1) {
          console.log(err1)
        } else {
          let fields = ["sync_date", "HostID", "UU", "Played", "TimeSpent", "Type", "interface", "user_agent"];
          var csvPlay = json2csv({ data: result, fields: fields });
          var csvGames = json2csv({ data: result1, fields: fields });
          var array = []
          array.push({ key: 'MTDplayLogs', value: csvPlay }, { key: 'MTDgameLogs', value: csvGames })
          let url = [];
          for (var i = 0; i < array.length; i++) {
            let key = array[i].key;
            fs.writeFile(config.root + '/server/api/cron/' + array[i].key + '.csv', array[i].value, function (err) {
              if (err) {
                throw err;
              } else {
                console.log('file saved');
                let destPath = key + '_' + moment(new Date()).format('YYYY-MM-DD') + ".csv"
                fs.readFile(config.root + '/server/api/cron/' + key + '.csv', function (err, data) {
                  if (err) throw err; // Something went wrong!
                  s3Client.putObject({
                    Bucket: s3_details.bucket,
                    Key: destPath,
                    ACL: 'public-read',
                    Body: data
                  }, function (err, data) {
                    if (err) {
                      console.log(err)
                    } else {
                      console.log("success")
                      url.push("https://mobisign-bucket.s3.ap-south-1.amazonaws.com/Automated_Reports" + '/' + destPath)
                    }
                  });
                });
              }
            });
          };
          setTimeout(function () {
            let html = "<html><head>"
            html += "<style>"
            html += "table {font-family: arial, sans-serif;border-collapse: collapse;width: 100%;}"
            html += "td, th {border: 1px solid #dddddd;text-align: left;padding: 8px;}"
            html += "tr:nth-child(even) {background-color: #dddddd;}</style></head>"
            html += "<h4>Dear Recipients,</h4>"
            html += "<h4>Please click below URL's to open the reports.</h4>"
            html += "<h4>" + url[0] + "</h4>"
            html += "<h4>" + url[1] + "</h4>"
            html += "<br><h5>Thanks & Regards</h5><h5>Mobi Sign Pvt Ltd.</h5></html>"
            let subject = "Videos & Game UU, Played, Time Spent Data"
            let email = 'deepak.kumar@mojoboxx.com,product@mojoboxx.com,monali.monalisa@mojoboxx.com,ashyin.thakral@mojoboxx.com,kedargdr@gmail.com'
            // let email = 'kedargdr@gmail.com,deepak.kumar@mojoboxx.com'
            EM.dispatchEmail(email, subject, html, "MTD", function (e) {
              console.log(e)
            })
          }, 10000)
        }
      })
    }
  })
}

/*  Get Daily Email with server session
    @Authentication ----> by session key
    @Authorization ----> Access Controll Logic
    Author : Kedar Gadre
    Date : 24/09/2020
*/
exports.serverSessionOldCron = async function (req, flag) {
  return new Promise(async function (resolve, reject) {
    // the function is executed automatically when the promise is constructed
    // after 1 second signal that the job is done with the result "done"
    var filter = '';
    let d1, d2;
    if (flag) {
      if (req.query.hostId != "undefined") { filter = " AND vr.vehicle_no ='" + req.query.hostId + "'" }
      d2 = moment(req.query.startDate).format('YYYY-MM-DD').toString();
      d1 = moment(req.query.endDate).format('YYYY-MM-DD').toString();
    } else {
      let d = new Date();
      d1 = d.setDate(d.getDate() - 1);
      d2 = d.setDate(d.getDate() - 6);
      d1 = moment(d1).format('YYYY-MM-DD').toString();
      d2 = moment(d2).format('YYYY-MM-DD').toString();
    }
    let query = "SELECT distinct (convert(ve.view_datetime,datetime)) as ts ,ve.view_date view_date,vr.vehicle_no as HostID,ve.event"
      + " FROM vuscreen_events ve"
      + " LEFT JOIN vuscreen_registration vr ON ve.device_id = vr.device_id"
      + " WHERE ve.sync_date >= '" + d2 + "' AND ve.sync_date <= '" + d1 + "' AND ve.user = 'server'"
      + " AND ve.event NOT IN ('start', 'download', 'stop', 'delete') AND (ve.event NOT LIKE 'charging%' AND  ve.event NOT LIKE 'App%' AND  ve.event NOT LIKE 'Before%' AND  ve.event NOT LIKE 'download%' AND  ve.event NOT LIKE 'Download%' AND  ve.event NOT LIKE 'Json%' and ve.event NOT LIKE '%VERIFY-IFE%')"
      + " AND vr.vehicle_no != '' " + filter
      + " GROUP BY ve.view_datetime, vr.vehicle_no, ve.event ORDER BY ve.sync_datetime,event"
    db.get().query(query, function (error, dataArray) {
      if (error) {
        console.log(error)
      } else {
        let finalArr = []
        let tHost = [];
        let dataObj = {
          view_date: null, HostID: null, cycle: null, wifiLogin: null, start_date: null, start_time: null, start_battery: null,
          stop_date: null, stop_time: null, stop_battery: null, start_stop_duration: null, battery_consumed: null
        }
        if (dataArray.length > 0) {
          let deviceMap = new Map();
          for (let i = 0; i < dataArray.length; i++) {
            const element = dataArray[i];
            try {
              let eventType = element.event.split("|")[0]
              let batteryPer = element.event.split(":")[1].split("%")[0]
              let wifiLogin = element.event.split("% |")[1]
              if (dataObj.view_date == null) {
                if (eventType.trim() == "start") {
                  dataObj.view_date = element.view_date
                  dataObj.HostID = element.HostID;
                  var startDate = element.ts
                  dataObj.start_date = element.ts.split(" ")[0]
                  dataObj.start_time = element.ts.split(" ")[1]
                  dataObj.start_battery = batteryPer + "%"
                  dataObj.wifiLogin = wifiLogin
                }
              } else {
                if (dataObj.HostID == element.HostID && eventType.trim() != "start") {
                  if (wifiLogin != 0) {
                    let endDate = element.ts
                    dataObj.stop_date = element.ts.split(" ")[0]
                    dataObj.stop_time = element.ts.split(" ")[1]
                    dataObj.stop_battery = batteryPer + "%"
                    dataObj.wifiLogin = wifiLogin
                    if (deviceMap.has(element.view_date + '_' + element.HostID)) {
                      let value = deviceMap.get(element.view_date + '_' + element.HostID)
                      dataObj.cycle = value + 1
                      deviceMap.set(element.view_date + '_' + element.HostID, value + 1)
                    } else {
                      deviceMap.set(element.view_date + '_' + element.HostID, 1)
                      dataObj.cycle = 1
                    }
                    tHost.push(element.HostID)
                    // need to cal time duration & battery consumed
                    let difference = diff_minutes(new Date(startDate), new Date(endDate))
                    dataObj.start_stop_duration = difference
                    let battery_consumed = dataObj.start_battery.replace("%", "") - dataObj.stop_battery.replace("%", "")
                    dataObj.battery_consumed = battery_consumed + "%"
                    finalArr.push(dataObj)
                    dataObj = {
                      view_date: null, HostID: null, cycle: null, wifiLogin: null, start_date: null, start_time: null, start_battery: null,
                      stop_date: null, stop_time: null, stop_battery: null, start_stop_duration: null, battery_consumed: null
                    }
                  }
                  else {
                    dataObj = {
                      view_date: null, HostID: null, cycle: null, wifiLogin: null, start_date: null, start_time: null, start_battery: null,
                      stop_date: null, stop_time: null, stop_battery: null, start_stop_duration: null, battery_consumed: null
                    }
                  }
                } else if (eventType.trim() == "start") {
                  // dataObj.stop_date = 0
                  // dataObj.stop_time = 0
                  // dataObj.stop_battery = 0 + "%"
                  // dataObj.wifiLogin = 0
                  // dataObj.start_stop_duration = 0
                  // dataObj.battery_consumed = 0 + "%"
                  // finalArr.push(dataObj)
                  // dataObj = {
                  //   view_date: null, HostID: null, cycle: null, wifiLogin: null, start_date: null, start_time: null, start_battery: null,
                  //   stop_date: null, stop_time: null, stop_battery: null, start_stop_duration: null, battery_consumed: null
                  // }
                  dataObj.view_date = element.view_date
                  dataObj.HostID = element.HostID;
                  var startDate = element.ts
                  dataObj.start_date = element.ts.split(" ")[0]
                  dataObj.start_time = element.ts.split(" ")[1]
                  dataObj.start_battery = batteryPer + "%"
                  dataObj.wifiLogin = wifiLogin
                  // if (deviceMap.has(element.view_date + '_' + element.HostID)) {
                  //   let value = deviceMap.get(element.view_date + '_' + element.HostID)
                  //   dataObj.cycle = value + 1
                  //   deviceMap.set(element.view_date + '_' + element.HostID, value + 1)
                  // } else {
                  //   deviceMap.set(element.view_date + '_' + element.HostID, 1)
                  //   dataObj.cycle = 1
                  // }
                }
              }
              if (i + 1 == dataArray.length) {
                let fields = ["view_date", "HostID", "cycle", "wifiLogin", "start_date", "start_time", "start_battery", "stop_date", "stop_time", "stop_battery", "start_stop_duration", "battery_consumed"];
                let csvDau = json2csv({ data: finalArr, fields: fields });
                var array = []
                array.push({ key: 'serversession', value: csvDau })
                if (flag) {
                  console.log("length of " + finalArr.length)
                  let uniqueHost = _.uniq(tHost);
                  resolve({ "data": finalArr, "Host": uniqueHost.length })
                } else {
                  for (let i = 0; i < array.length; i++) {
                    fs.writeFile(config.root + '/server/api/cron/' + array[i].key + '.csv', array[i].value, function (err) {
                      if (err) {
                        throw err;
                      } else {
                        console.log('file saved');
                      }
                    });
                  }
                  let destPath = "serversession_" + moment(new Date()).format('YYYY-MM-DD') + ".csv"
                  fs.readFile(config.root + '/server/api/cron/serversession.csv', function (err, data) {
                    if (err) throw err; // Something went wrong!
                    s3Client.putObject({
                      Bucket: s3_details.bucket,
                      Key: destPath,
                      ACL: 'public-read',
                      Body: data
                    }, function (err, data) {
                      if (err) {
                        console.log(err)
                      } else {
                        console.log("success")
                        let url = "https://mobisign-bucket.s3.ap-south-1.amazonaws.com/Automated_Reports" + '/' + destPath
                        setTimeout(function () {
                          var html = "<html><head>"
                          html += "<style>"
                          html += "table {font-family: arial, sans-serif;border-collapse: collapse;width: 100%;}"
                          html += "td, th {border: 1px solid #dddddd;text-align: left;padding: 8px;}"
                          html += "tr:nth-child(even) {background-color: #dddddd;}</style></head>"
                          html += "<h4>Dear Recipients,</h4>"
                          html += "<h4>Please click below URL to open the report.</h4>"
                          html += "<h4>" + url + "</h4>"
                          html += "<br><h5>Thanks & Regards</h5><h5>Mobi Sign Pvt Ltd.</h5></html>"
                          let subject = "Last 7 Server Sessions activity"
                          // var email = 'deepak.kumar@mojoboxx.com,product@mojoboxx.com,monali.monalisa@mojoboxx.com,ashyin.thakral@mojoboxx.com,kedargdr@gmail.com,vishal.garg@mojoboxx.com'
                          var email = 'kedargdr@gmail.com'
                          EM.dispatchEmail(email, subject, html, "serversession", function (e) {
                            console.log(e)
                          })
                        }, 10000)
                      }
                    });
                  });
                }
              }
            } catch (error) {
              console.log(error)
            }

          }
        } else {
          resolve([])
        }

      }
    })
  });

}


exports.serverSessionCron = async function (req, flag) {
  return new Promise(async function (resolve, reject) {
    // the function is executed automatically when the promise is constructed
    // after 1 second signal that the job is done with the result "done"
    var filter = '';
    let d1, d2;
    if (flag) {
      if (req.query.hostId != "undefined") { filter = " AND vr.vehicle_no ='" + req.query.hostId + "'" }
      d2 = moment(req.query.startDate).format('YYYY-MM-DD').toString();
      d1 = moment(req.query.endDate).format('YYYY-MM-DD').toString();
    } else {
      let d = new Date();
      d1 = d.setDate(d.getDate() - 1);
      d2 = d.setDate(d.getDate() - 6);
      d1 = moment(d1).format('YYYY-MM-DD').toString();
      d2 = moment(d2).format('YYYY-MM-DD').toString();
    }
    let query = "SELECT distinct (convert(ve.view_datetime,datetime)) as ts ,ve.view_date view_date,ve.hostId as HostID,ve.event,battery_level,number_of_unique_user,source,destination"
      + " FROM vuscreen_events ve"
      + " WHERE ve.sync_date >= '" + d2 + "' AND ve.sync_date <= '" + d1 + "' AND ve.user = 'server'"
      + " AND ve.event  IN ('start', 'stop') "
      + " AND ve.hostId != '' " + filter
      + " GROUP BY ve.view_datetime, ve.hostId ORDER BY hostId,ts"
    db.get().query(query, function (error, dataArray) {
      if (error) {
        console.log(error)
      } else {
        let finalArr = []
        let tHost = [];
        let dataObj = {
          view_date: null, HostID: null, source: null, destination: null, cycle: null, wifiLogin: null, start_date: null, start_time: null, start_battery: null,
          stop_date: null, stop_time: null, stop_battery: null, start_stop_duration: null, battery_consumed: null
        }
        if (dataArray.length > 0) {
          let deviceMap = new Map();
          for (let i = 0; i < dataArray.length; i++) {
            const element = dataArray[i];
            try {
              let source = element.source
              let destination = element.destination
              let eventType = element.event
              let batteryPer = element.battery_level
              let wifiLogin = element.number_of_unique_user
              if (dataObj.view_date == null) {
                if (eventType.trim() === "start") {

                  dataObj.view_date = moment(element.view_date).format('MM-DD')
                  dataObj.HostID = element.HostID;
                  dataObj.source = element.source;
                  dataObj.destination = element.destination;
                  var startDate = element.ts
                  dataObj.start_date = moment(element.ts.split(" ")[0]).format('MM-DD')
                  dataObj.start_time = element.ts.split(" ")[1]
                  dataObj.start_battery = batteryPer + "%"
                  dataObj.wifiLogin = wifiLogin
                }
              } else {
                if (dataObj.HostID == element.HostID && eventType.trim() != "start") {
                  if (wifiLogin > 0) {
                    let endDate = element.ts
                    dataObj.stop_date = moment(element.ts.split(" ")[0]).format('MM-DD')
                    dataObj.stop_time = element.ts.split(" ")[1]
                    dataObj.stop_battery = batteryPer + "%"
                    dataObj.wifiLogin = wifiLogin
                    dataObj.source = element.source;
                    dataObj.destination = element.destination;
                    if (deviceMap.has(element.view_date + '_' + element.HostID)) {
                      let value = deviceMap.get(element.view_date + '_' + element.HostID)
                      dataObj.cycle = value + 1
                      deviceMap.set(element.view_date + '_' + element.HostID, value + 1)
                    } else {
                      deviceMap.set(element.view_date + '_' + element.HostID, 1)
                      dataObj.cycle = 1
                    }
                    tHost.push(element.HostID)
                    // need to cal time duration & battery consumed
                    let difference = diff_minutes(new Date(startDate), new Date(endDate))
                    dataObj.start_stop_duration = difference
                    let battery_consumed = dataObj.start_battery.replace("%", "") - dataObj.stop_battery.replace("%", "")
                    dataObj.battery_consumed = battery_consumed + "%"
                    finalArr.push(dataObj)
                    dataObj = {
                      view_date: null, HostID: null, source: null, destination: null, cycle: null, wifiLogin: null, start_date: null, start_time: null, start_battery: null,
                      stop_date: null, stop_time: null, stop_battery: null, start_stop_duration: null, battery_consumed: null
                    }
                  }
                  else {
                    dataObj = {
                      view_date: null, HostID: null, source: null, destination: null, cycle: null, wifiLogin: null, start_date: null, start_time: null, start_battery: null,
                      stop_date: null, stop_time: null, stop_battery: null, start_stop_duration: null, battery_consumed: null
                    }
                  }
                } else if (eventType.trim() == "start") {
                  // dataObj.stop_date = 0
                  // dataObj.stop_time = 0
                  // dataObj.stop_battery = 0 + "%"
                  // dataObj.wifiLogin = 0
                  // dataObj.start_stop_duration = 0
                  // dataObj.battery_consumed = 0 + "%"
                  // finalArr.push(dataObj)
                  // dataObj = {
                  //   view_date: null, HostID: null, cycle: null, wifiLogin: null, start_date: null, start_time: null, start_battery: null,
                  //   stop_date: null, stop_time: null, stop_battery: null, start_stop_duration: null, battery_consumed: null
                  // }
                  dataObj.view_date = element.view_date
                  dataObj.HostID = element.HostID;
                  var startDate = element.ts
                  dataObj.start_date = element.ts.split(" ")[0]
                  dataObj.start_time = element.ts.split(" ")[1]
                  dataObj.start_battery = batteryPer + "%"
                  dataObj.wifiLogin = wifiLogin
                  // if (deviceMap.has(element.view_date + '_' + element.HostID)) {
                  //   let value = deviceMap.get(element.view_date + '_' + element.HostID)
                  //   dataObj.cycle = value + 1
                  //   deviceMap.set(element.view_date + '_' + element.HostID, value + 1)
                  // } else {
                  //   deviceMap.set(element.view_date + '_' + element.HostID, 1)
                  //   dataObj.cycle = 1
                  // }
                }
              }
              if (i + 1 == dataArray.length) {
                let fields = ["view_date", "HostID", "source", "destination", "cycle", "wifiLogin", "start_date", "start_time", "start_battery", "stop_date", "stop_time", "stop_battery", "start_stop_duration", "battery_consumed"];
                let csvDau = json2csv({ data: finalArr, fields: fields });
                var array = []
                array.push({ key: 'serversession', value: csvDau })
                if (flag) {
                  console.log("length of " + finalArr.length)
                  let uniqueHost = _.uniq(tHost);
                  resolve({ "data": finalArr, "Host": uniqueHost.length })
                } else {
                  for (let i = 0; i < array.length; i++) {
                    fs.writeFile(config.root + '/server/api/cron/' + array[i].key + '.csv', array[i].value, function (err) {
                      if (err) {
                        throw err;
                      } else {
                        console.log('file saved');
                      }
                    });
                  }
                  let destPath = "serversession_" + moment(new Date()).format('YYYY-MM-DD') + ".csv"
                  fs.readFile(config.root + '/server/api/cron/serversession.csv', function (err, data) {
                    if (err) throw err; // Something went wrong!
                    s3Client.putObject({
                      Bucket: s3_details.bucket,
                      Key: destPath,
                      ACL: 'public-read',
                      Body: data
                    }, function (err, data) {
                      if (err) {
                        console.log(err)
                      } else {
                        console.log("success")
                        let url = "https://mobisign-bucket.s3.ap-south-1.amazonaws.com/Automated_Reports" + '/' + destPath
                        setTimeout(function () {
                          var html = "<html><head>"
                          html += "<style>"
                          html += "table {font-family: arial, sans-serif;border-collapse: collapse;width: 100%;}"
                          html += "td, th {border: 1px solid #dddddd;text-align: left;padding: 8px;}"
                          html += "tr:nth-child(even) {background-color: #dddddd;}</style></head>"
                          html += "<h4>Dear Recipients,</h4>"
                          html += "<h4>Please click below URL to open the report.</h4>"
                          html += "<h4>" + url + "</h4>"
                          html += "<br><h5>Thanks & Regards</h5><h5>Mobi Sign Pvt Ltd.</h5></html>"
                          let subject = "Last 7 Server Sessions activity"
                          // var email = 'deepak.kumar@mojoboxx.com,product@mojoboxx.com,monali.monalisa@mojoboxx.com,ashyin.thakral@mojoboxx.com,kedargdr@gmail.com,vishal.garg@mojoboxx.com'
                          var email = 'kedargdr@gmail.com'
                          EM.dispatchEmail(email, subject, html, "serversession", function (e) {
                            console.log(e)
                          })
                        }, 10000)
                      }
                    });
                  });
                }
              }
            } catch (error) {
              console.log(error)
            }

          }
        } else {
          resolve([])
        }

      }
    })
  });

}




function diff_minutes(dt2, dt1) {
  var diff = (dt2.getTime() - dt1.getTime()) / 1000;
  diff /= 60;
  return Math.abs(Math.round(diff));

}

//Cron For shuttl morning
exports.server_session_mor_cron = function () {
  get_cached_data(['server_session_mor_cronStatus'], function (e, doc) {
    if (!e) {
      console.log(doc.server_session_mor_cronStatus)
      if (!doc.server_session_mor_cronStatus || doc.server_session_mor_cronStatus == 'closed') {
        set_key_value('server_session_mor_cronStatus', 'in progress', function (err, data) {
          if (!err) {
            var d = new Date();
            // d.setDate(d.getDate()-1);
            var Today = moment(d).format('YYYY-MM-DD').toString();
            var query = " select "
              + " B.server_started,B.downloaded, D.connected, D.videoPlayed, D.total_duration"
              + " from"
              + " (select "
              + " partner,"
              + " sum(case"
              + " when user = 'server' and event = 'start' then 1"
              + " else 0"
              + " end) server_started,"
              + " sum(case"
              + " when user = 'server' and event = 'download' then 1"
              + " else 0"
              + " end) downloaded"
              + " FROM"
              + " vuscreen_events"
              + " where"
              + " partner = 'bae7qdg69sg9qat28s83l7d203'"
              + " AND DATE_FORMAT(sync_datetime, '%Y-%m-%d %H:%i:%s') >= '" + Today + " 04:00:00'"
              + " AND DATE_FORMAT(sync_datetime, '%Y-%m-%d %H:%i:%s') <= '" + Today + " 12:00:00'"
              + " AND device_id  IN ('ad9984c046b9badc','fba31520cd0f5bdb','3e1d3aecab0ccbb6','7dcde8cac5e634cb','5046317ef5bfe6d3','a8d3ec420c6bbec2','d47f79d3ffb4c8ef','9b2622bc6a4da8cd','66f9446c0c87fe73')"
              + " GROUP BY partner) B"
              + " LEFT JOIN"
              + " (select "
              + " partner,"
              + " count(distinct mac) connected,"
              + " count(1) videoPlayed,"
              + " ROUND(SUM(view_duration /60000)) total_duration"
              + " FROM"
              + " vuscreen_tracker"
              + " where"
              + " partner = 'bae7qdg69sg9qat28s83l7d203'"
              + " AND DATE_FORMAT(sync_datetime, '%Y-%m-%d %H:%i:%s') >= '" + Today + " 04:00:00'"
              + " AND DATE_FORMAT(sync_datetime, '%Y-%m-%d %H:%i:%s') <= '" + Today + " 12:00:00'"
              + " AND view_android_id NOT IN ('9a0209e38d5bfedd','cfdd5506e2f58e4f','51462ef452fad10d','d10071453b632204','73d75427d424e798',"
              + " '18f7f09d5efee7e3','e317fde3d03d9389','662ad887625aa4ad','91a0eb36cf2aed0','2d4429fafd426a67','1291937e381c7ca0','4e1032c963a28618',"
              + " '8f52378ef5a2075a','8df0d1591807c4be','b6f80bd7ff557844','3e6e84b6bc66a243','7a81dc2424d0a90b','81e9bb95a7ee0dd7','9c7ca8a26d43834f',"
              + " '9ad5c97386dc17fd','a3f05ca36f4a34d2','61328ca45aebbf60','dabf02140f597ade','22ee29b339b968da','11c28a04727b02d8','b1c3c08db5c8144','9785b80b223ea559','cc9e62aae8c49aab')"
              + " GROUP BY partner) D ON D.partner = B.partner"
            db.get().query(query, function (err, result) {
              if (err) {
                set_key_value('server_session_mor_cronStatus', 'closed', function (err, data) {
                  if (err) {
                    console.error(err);
                  }
                  else {
                    console.log('server_session_mor_cronStatus ' + data)
                  }
                })
              } else {
                var d = new Date();
                d.setDate(d.getDate() - 1);
                var YesterdayHalf = moment(d).format('YYYY-MM-DD').toString();
                var query1 = " select "
                  + " B.server_started,B.downloaded, D.connected, D.videoPlayed, D.total_duration"
                  + " from"
                  + " (select "
                  + " partner,"
                  + " sum(case"
                  + " when user = 'server' and event = 'start' then 1"
                  + " else 0"
                  + " end) server_started,"
                  + " sum(case"
                  + " when user = 'server' and event = 'download' then 1"
                  + " else 0"
                  + " end) downloaded"
                  + " FROM"
                  + " vuscreen_events"
                  + " where"
                  + " partner = 'bae7qdg69sg9qat28s83l7d203'"
                  + " AND DATE_FORMAT(sync_datetime, '%Y-%m-%d %H:%i:%s') >= '" + YesterdayHalf + " 04:00:00'"
                  + " AND DATE_FORMAT(sync_datetime, '%Y-%m-%d %H:%i:%s') <= '" + YesterdayHalf + " 12:00:00'"
                  + " AND device_id  IN ('ad9984c046b9badc','fba31520cd0f5bdb','3e1d3aecab0ccbb6','7dcde8cac5e634cb','5046317ef5bfe6d3','a8d3ec420c6bbec2','d47f79d3ffb4c8ef','9b2622bc6a4da8cd','66f9446c0c87fe73')"
                  + " GROUP BY partner) B"
                  + " LEFT JOIN"
                  + " (select "
                  + " partner,"
                  + " count(distinct mac) connected,"
                  + " count(1) videoPlayed,"
                  + " ROUND(SUM(view_duration /60000)) total_duration"
                  + " FROM"
                  + " vuscreen_tracker"
                  + " where"
                  + " partner = 'bae7qdg69sg9qat28s83l7d203'"
                  + " AND DATE_FORMAT(sync_datetime, '%Y-%m-%d %H:%i:%s') >= '" + YesterdayHalf + " 04:00:00'"
                  + " AND DATE_FORMAT(sync_datetime, '%Y-%m-%d %H:%i:%s') <= '" + YesterdayHalf + " 12:00:00'"
                  + " AND view_android_id NOT IN ('9a0209e38d5bfedd','cfdd5506e2f58e4f','51462ef452fad10d','d10071453b632204','73d75427d424e798',"
                  + " '18f7f09d5efee7e3','e317fde3d03d9389','662ad887625aa4ad','91a0eb36cf2aed0','2d4429fafd426a67','1291937e381c7ca0','4e1032c963a28618',"
                  + " '8f52378ef5a2075a','8df0d1591807c4be','b6f80bd7ff557844','3e6e84b6bc66a243','7a81dc2424d0a90b','81e9bb95a7ee0dd7','9c7ca8a26d43834f',"
                  + " '9ad5c97386dc17fd','a3f05ca36f4a34d2','61328ca45aebbf60','dabf02140f597ade','22ee29b339b968da','11c28a04727b02d8','b1c3c08db5c8144','9785b80b223ea559','cc9e62aae8c49aab')"
                  + " GROUP BY partner) D ON D.partner = B.partner"
                db.get().query(query1, function (err1, result1) {
                  if (err1) {
                    console.log(err1)
                    set_key_value('server_session_mor_cronStatus', 'closed', function (err, data) {
                      if (err) {
                        console.error(err);
                      }
                      else {
                        console.log('server_session_mor_cronStatus ' + data)
                      }
                    })
                  } else {
                    var d = new Date();
                    d.setDate(d.getDate() - 1);
                    var Yesterday = moment(d).format('YYYY-MM-DD').toString();
                    var query2 = " select "
                      + " B.server_started,B.downloaded, D.connected, D.videoPlayed, D.total_duration"
                      + " from"
                      + " (select "
                      + " partner,"
                      + " sum(case"
                      + " when user = 'server' and event = 'start' then 1"
                      + " else 0"
                      + " end) server_started,"
                      + " sum(case"
                      + " when user = 'server' and event = 'download' then 1"
                      + " else 0"
                      + " end) downloaded"
                      + " FROM"
                      + " vuscreen_events"
                      + " where"
                      + " partner = 'bae7qdg69sg9qat28s83l7d203'"
                      + " AND DATE_FORMAT(sync_datetime, '%Y-%m-%d') >= '" + Yesterday + "'"
                      + " AND DATE_FORMAT(sync_datetime, '%Y-%m-%d') <= '" + Yesterday + "'"
                      + " AND device_id  IN ('ad9984c046b9badc','fba31520cd0f5bdb','3e1d3aecab0ccbb6','7dcde8cac5e634cb','5046317ef5bfe6d3','a8d3ec420c6bbec2','d47f79d3ffb4c8ef','9b2622bc6a4da8cd','66f9446c0c87fe73')"
                      + " GROUP BY partner) B"
                      + " LEFT JOIN"
                      + " (select "
                      + " partner,"
                      + " count(distinct mac) connected,"
                      + " count(1) videoPlayed,"
                      + " ROUND(SUM(view_duration /60000)) total_duration"
                      + " FROM"
                      + " vuscreen_tracker"
                      + " where"
                      + " partner = 'bae7qdg69sg9qat28s83l7d203'"
                      + " AND DATE_FORMAT(sync_datetime, '%Y-%m-%d') >= '" + Yesterday + "'"
                      + " AND DATE_FORMAT(sync_datetime, '%Y-%m-%d') <= '" + Yesterday + "'"
                      + " AND view_android_id NOT IN ('9a0209e38d5bfedd','cfdd5506e2f58e4f','51462ef452fad10d','d10071453b632204','73d75427d424e798',"
                      + " '18f7f09d5efee7e3','e317fde3d03d9389','662ad887625aa4ad','91a0eb36cf2aed0','2d4429fafd426a67','1291937e381c7ca0','4e1032c963a28618',"
                      + " '8f52378ef5a2075a','8df0d1591807c4be','b6f80bd7ff557844','3e6e84b6bc66a243','7a81dc2424d0a90b','81e9bb95a7ee0dd7','9c7ca8a26d43834f',"
                      + " '9ad5c97386dc17fd','a3f05ca36f4a34d2','61328ca45aebbf60','dabf02140f597ade','22ee29b339b968da','11c28a04727b02d8','b1c3c08db5c8144','9785b80b223ea559','cc9e62aae8c49aab')"
                      + " GROUP BY partner) D ON D.partner = B.partner"
                    db.get().query(query2, function (err2, result2) {
                      if (err2) {
                        set_key_value('server_session_mor_cronStatus', 'closed', function (err, data) {
                          if (err) {
                            console.error(err);
                          }
                          else {
                            console.log('server_session_mor_cronStatus ' + data)
                          }
                        })
                      } else {
                        var sms = ""
                        for (var i = 0; i < result.length; i++) {
                          if (result[i].server_started == null) {
                            result[i].server_started = 0
                          }
                          if (result[i].connected == null) {
                            result[i].connected = 0
                          }
                          if (result[i].videoPlayed == null) {
                            result[i].videoPlayed = 0
                          }
                          if (result[i].total_duration == null) {
                            result[i].total_duration = 0
                          }
                          if (result[i].downloaded == null) {
                            result[i].downloaded = 0
                          }
                          sms += "Date: " + Today + " M\n"
                          sms += "Srvr/Clnt: " + result[i].server_started + "/" + result[i].connected + "\n"
                          sms += "Vid: " + result[i].videoPlayed + "\n"
                          sms += "Dur: " + result[i].total_duration + "\n"
                          // sms += "DtaSync: "+result[i].downloaded+"\n"
                        }
                        for (var j = 0; j < result1.length; j++) {
                          if (result1[j].connected == null) {
                            result1[j].connected = 0
                          }
                          if (result1[j].videoPlayed == null) {
                            result1[j].videoPlayed = 0
                          }
                          if (result1[j].total_duration == null) {
                            result1[j].total_duration = 0
                          }
                          sms += "Ytdy M clnt/vid/dur: " + result1[j].connected + "/" + result1[j].videoPlayed + "/" + result1[j].total_duration + "\n"
                        }
                        for (var k = 0; k < result2.length; k++) {
                          if (result2[k].connected == null) {
                            result2[k].connected = 0
                          }
                          if (result2[k].videoPlayed == null) {
                            result2[k].videoPlayed = 0
                          }
                          if (result2[k].total_duration == null) {
                            result2[k].total_duration = 0
                          }
                          sms += "Ytdy C clnt/vid/dur: " + result2[k].connected + "/" + result2[k].videoPlayed + "/" + result2[k].total_duration
                        }
                        // var Numbers = [7042854343,9810772396,9717860113,9582340204,9873412238,9650379456,9811852125,9999878459]
                        var Numbers = [7042854343]
                        for (var i = 0; i < Numbers.length; i++) {
                          var message = 'http://www.myvaluefirst.com/smpp/sendsms?username=Mobiservehttp1&password=mobi1234&to=' + Numbers[i] + '&from=VUINFO&text=Dear Recipients,\n' + sms
                          request(message, function (error, response, body) {
                            if (!error && response.statusCode == 200) {
                              console.log("Alert has been " + body) // Show the HTML for the Google homepage. 
                            }
                          })
                        }
                      }
                    })
                  }
                })
              }
            })
          }
        })
      }
    }
  })
}

//Cron For shuttl evening
exports.server_session_eve_cron = function () {
  get_cached_data(['server_session_eve_cronStatus'], function (e, doc) {
    if (!e) {
      console.log(doc.server_session_eve_cronStatus)
      if (!doc.server_session_eve_cronStatus || doc.server_session_eve_cronStatus == 'closed') {
        set_key_value('server_session_eve_cronStatus', 'in progress', function (err, data) {
          if (!err) {
            var d = new Date();
            // d.setDate(d.getDate()-1);
            var Today = moment(d).format('YYYY-MM-DD').toString();
            var query = " select "
              + " B.server_started,B.downloaded, D.connected, D.videoPlayed, D.total_duration"
              + " from"
              + " (select "
              + " partner,"
              + " sum(case"
              + " when user = 'server' and event = 'start' then 1"
              + " else 0"
              + " end) server_started,"
              + " sum(case"
              + " when user = 'server' and event = 'download' then 1"
              + " else 0"
              + " end) downloaded"
              + " FROM"
              + " vuscreen_events"
              + " where"
              + " partner = 'bae7qdg69sg9qat28s83l7d203'"
              + " AND DATE_FORMAT(sync_datetime, '%Y-%m-%d %H:%i:%s') >= '" + Today + " 15:00:00'"
              + " AND DATE_FORMAT(sync_datetime, '%Y-%m-%d %H:%i:%s') <= '" + Today + " 23:55:00'"
              + " AND device_id  IN ('ad9984c046b9badc','fba31520cd0f5bdb','3e1d3aecab0ccbb6','7dcde8cac5e634cb','5046317ef5bfe6d3','a8d3ec420c6bbec2','d47f79d3ffb4c8ef','9b2622bc6a4da8cd','66f9446c0c87fe73')"
              + " GROUP BY partner) B"
              + " LEFT JOIN"
              + " (select "
              + " partner,"
              + " count(distinct mac) connected,"
              + " count(1) videoPlayed,"
              + " ROUND(SUM(view_duration /60000)) total_duration"
              + " FROM"
              + " vuscreen_tracker"
              + " where"
              + " partner = 'bae7qdg69sg9qat28s83l7d203'"
              + " AND DATE_FORMAT(sync_datetime, '%Y-%m-%d %H:%i:%s') >= '" + Today + " 15:00:00'"
              + " AND DATE_FORMAT(sync_datetime, '%Y-%m-%d %H:%i:%s') <= '" + Today + " 23:55:00'"
              + " AND view_android_id NOT IN ('9a0209e38d5bfedd','cfdd5506e2f58e4f','51462ef452fad10d','d10071453b632204','73d75427d424e798',"
              + " '18f7f09d5efee7e3','e317fde3d03d9389','662ad887625aa4ad','91a0eb36cf2aed0','2d4429fafd426a67','1291937e381c7ca0','4e1032c963a28618',"
              + " '8f52378ef5a2075a','8df0d1591807c4be','b6f80bd7ff557844','3e6e84b6bc66a243','7a81dc2424d0a90b','81e9bb95a7ee0dd7','9c7ca8a26d43834f',"
              + " '9ad5c97386dc17fd','a3f05ca36f4a34d2','61328ca45aebbf60','dabf02140f597ade','22ee29b339b968da','11c28a04727b02d8','b1c3c08db5c8144','9785b80b223ea559','cc9e62aae8c49aab')"
              + " GROUP BY partner) D ON D.partner = B.partner"
            db.get().query(query, function (err, result) {
              if (err) {
                set_key_value('server_session_eve_cronStatus', 'closed', function (err, data) {
                  if (err) {
                    console.error(err);
                  }
                  else {
                    console.log('server_session_eve_cronStatus ' + data)
                  }
                })
              } else {
                var d = new Date();
                d.setDate(d.getDate() - 1);
                var YesterdayHalf = moment(d).format('YYYY-MM-DD').toString();
                var query1 = " select "
                  + " B.server_started,B.downloaded, D.connected, D.videoPlayed, D.total_duration"
                  + " from"
                  + " (select "
                  + " partner,"
                  + " sum(case"
                  + " when user = 'server' and event = 'start' then 1"
                  + " else 0"
                  + " end) server_started,"
                  + " sum(case"
                  + " when user = 'server' and event = 'download' then 1"
                  + " else 0"
                  + " end) downloaded"
                  + " FROM"
                  + " vuscreen_events"
                  + " where"
                  + " partner = 'bae7qdg69sg9qat28s83l7d203'"
                  + " AND DATE_FORMAT(sync_datetime, '%Y-%m-%d %H:%i:%s') >= '" + YesterdayHalf + " 15:00:00'"
                  + " AND DATE_FORMAT(sync_datetime, '%Y-%m-%d %H:%i:%s') <= '" + YesterdayHalf + " 23:55:00'"
                  + " AND device_id  IN ('ad9984c046b9badc','fba31520cd0f5bdb','3e1d3aecab0ccbb6','7dcde8cac5e634cb','5046317ef5bfe6d3','a8d3ec420c6bbec2','d47f79d3ffb4c8ef','9b2622bc6a4da8cd','66f9446c0c87fe73')"
                  + " GROUP BY partner) B"
                  + " LEFT JOIN"
                  + " (select "
                  + " partner,"
                  + " count(distinct mac) connected,"
                  + " count(1) videoPlayed,"
                  + " ROUND(SUM(view_duration /60000)) total_duration"
                  + " FROM"
                  + " vuscreen_tracker"
                  + " where"
                  + " partner = 'bae7qdg69sg9qat28s83l7d203'"
                  + " AND DATE_FORMAT(sync_datetime, '%Y-%m-%d %H:%i:%s') >= '" + YesterdayHalf + " 15:00:00'"
                  + " AND DATE_FORMAT(sync_datetime, '%Y-%m-%d %H:%i:%s') <= '" + YesterdayHalf + " 23:55:00'"
                  + " AND view_android_id NOT IN ('9a0209e38d5bfedd','cfdd5506e2f58e4f','51462ef452fad10d','d10071453b632204','73d75427d424e798',"
                  + " '18f7f09d5efee7e3','e317fde3d03d9389','662ad887625aa4ad','91a0eb36cf2aed0','2d4429fafd426a67','1291937e381c7ca0','4e1032c963a28618',"
                  + " '8f52378ef5a2075a','8df0d1591807c4be','b6f80bd7ff557844','3e6e84b6bc66a243','7a81dc2424d0a90b','81e9bb95a7ee0dd7','9c7ca8a26d43834f',"
                  + " '9ad5c97386dc17fd','a3f05ca36f4a34d2','61328ca45aebbf60','dabf02140f597ade','22ee29b339b968da','11c28a04727b02d8','b1c3c08db5c8144','9785b80b223ea559','cc9e62aae8c49aab')"
                  + " GROUP BY partner) D ON D.partner = B.partner"
                db.get().query(query1, function (err1, result1) {
                  if (err1) {
                    console.log(err1)
                    set_key_value('server_session_eve_cronStatus', 'closed', function (err, data) {
                      if (err) {
                        console.error(err);
                      }
                      else {
                        console.log('server_session_eve_cronStatus ' + data)
                      }
                    })
                  } else {
                    var d = new Date();
                    d.setDate(d.getDate() - 1);
                    var Yesterday = moment(d).format('YYYY-MM-DD').toString();
                    var query2 = " select "
                      + " B.server_started,B.downloaded, D.connected, D.videoPlayed, D.total_duration"
                      + " from"
                      + " (select "
                      + " partner,"
                      + " sum(case"
                      + " when user = 'server' and event = 'start' then 1"
                      + " else 0"
                      + " end) server_started,"
                      + " sum(case"
                      + " when user = 'server' and event = 'download' then 1"
                      + " else 0"
                      + " end) downloaded"
                      + " FROM"
                      + " vuscreen_events"
                      + " where"
                      + " partner = 'bae7qdg69sg9qat28s83l7d203'"
                      + " AND DATE_FORMAT(sync_datetime, '%Y-%m-%d') >= '" + Yesterday + "'"
                      + " AND DATE_FORMAT(sync_datetime, '%Y-%m-%d') <= '" + Yesterday + "'"
                      + " AND device_id  IN ('ad9984c046b9badc','fba31520cd0f5bdb','3e1d3aecab0ccbb6','7dcde8cac5e634cb','5046317ef5bfe6d3','a8d3ec420c6bbec2','d47f79d3ffb4c8ef','9b2622bc6a4da8cd','66f9446c0c87fe73')"
                      + " GROUP BY partner) B"
                      + " LEFT JOIN"
                      + " (select "
                      + " partner,"
                      + " count(distinct mac) connected,"
                      + " count(1) videoPlayed,"
                      + " ROUND(SUM(view_duration /60000)) total_duration"
                      + " FROM"
                      + " vuscreen_tracker"
                      + " where"
                      + " partner = 'bae7qdg69sg9qat28s83l7d203'"
                      + " AND DATE_FORMAT(sync_datetime, '%Y-%m-%d') >= '" + Yesterday + "'"
                      + " AND DATE_FORMAT(sync_datetime, '%Y-%m-%d') <= '" + Yesterday + "'"
                      + " AND view_android_id NOT IN ('9a0209e38d5bfedd','cfdd5506e2f58e4f','51462ef452fad10d','d10071453b632204','73d75427d424e798',"
                      + " '18f7f09d5efee7e3','e317fde3d03d9389','662ad887625aa4ad','91a0eb36cf2aed0','2d4429fafd426a67','1291937e381c7ca0','4e1032c963a28618',"
                      + " '8f52378ef5a2075a','8df0d1591807c4be','b6f80bd7ff557844','3e6e84b6bc66a243','7a81dc2424d0a90b','81e9bb95a7ee0dd7','9c7ca8a26d43834f',"
                      + " '9ad5c97386dc17fd','a3f05ca36f4a34d2','61328ca45aebbf60','dabf02140f597ade','22ee29b339b968da','11c28a04727b02d8','b1c3c08db5c8144','9785b80b223ea559','cc9e62aae8c49aab')"
                      + " GROUP BY partner) D ON D.partner = B.partner"
                    db.get().query(query2, function (err2, result2) {
                      if (err2) {
                        set_key_value('server_session_eve_cronStatus', 'closed', function (err, data) {
                          if (err) {
                            console.error(err);
                          }
                          else {
                            console.log('server_session_eve_cronStatus ' + data)
                          }
                        })
                      } else {
                        var sms = ""
                        for (var i = 0; i < result.length; i++) {
                          if (result[i].server_started == null) {
                            result[i].server_started = 0
                          }
                          if (result[i].connected == null) {
                            result[i].connected = 0
                          }
                          if (result[i].videoPlayed == null) {
                            result[i].videoPlayed = 0
                          }
                          if (result[i].total_duration == null) {
                            result[i].total_duration = 0
                          }
                          if (result[i].downloaded == null) {
                            result[i].downloaded = 0
                          }
                          sms += "Date: " + Today + " E\n"
                          sms += "Srvr/Clnt: " + result[i].server_started + "/" + result[i].connected + "\n"
                          sms += "Vid: " + result[i].videoPlayed + "\n"
                          sms += "Dur: " + result[i].total_duration + "\n"
                          // sms += "DtaSync: "+result[i].downloaded+"\n"
                        }
                        for (var j = 0; j < result1.length; j++) {
                          if (result1[j].connected == null) {
                            result1[j].connected = 0
                          }
                          if (result1[j].videoPlayed == null) {
                            result1[j].videoPlayed = 0
                          }
                          if (result1[j].total_duration == null) {
                            result1[j].total_duration = 0
                          }
                          sms += "Ytdy E clnt/vid/dur: " + result1[j].connected + "/" + result1[j].videoPlayed + "/" + result1[j].total_duration + "\n"
                        }
                        for (var k = 0; k < result2.length; k++) {
                          if (result2[k].connected == null) {
                            result2[k].connected = 0
                          }
                          if (result2[k].videoPlayed == null) {
                            result2[k].videoPlayed = 0
                          }
                          if (result2[k].total_duration == null) {
                            result2[k].total_duration = 0
                          }
                          sms += "Ytdy C clnt/vid/dur: " + result2[k].connected + "/" + result2[k].videoPlayed + "/" + result2[k].total_duration
                        }
                        var Numbers = [7042854343]
                        // var Numbers = [7042854343,9810772396,9717860113,9582340204,9873412238,9650379456,9811852125,9999878459]
                        for (var i = 0; i < Numbers.length; i++) {
                          var message = 'http://www.myvaluefirst.com/smpp/sendsms?username=Mobiservehttp1&password=mobi1234&to=' + Numbers[i] + '&from=VUINFO&text=Dear Recipients,\n' + sms
                          request(message, function (error, response, body) {
                            if (!error && response.statusCode == 200) {
                              console.log("Alert has been " + body) // Show the HTML for the Google homepage. 
                            }
                          })
                        }
                      }
                    })
                  }
                })
              }
            })
          }
        })
      }
    }
  })
}


//Cron For zimindara
exports.zimindara_cron = function () {
  get_cached_data(['zimindara_cronStatus'], function (e, doc) {
    if (!e) {
      console.log(doc.zimindara_cronStatus)
      if (!doc.zimindara_cronStatus || doc.zimindara_cronStatus == 'closed') {
        set_key_value('zimindara_cronStatus', 'in progress', function (err, data) {
          if (!err) {
            var d = new Date();
            // d.setDate(d.getDate()-1);
            var Today = moment(d).format('YYYY-MM-DD').toString();
            var query = " select "
              + " B.server_started,D.connected, D.videoPlayed, D.total_duration"
              + " from"
              + " (select "
              + " partner,"
              + " count(distinct reg_id) server_started"
              + " FROM"
              + " vuscreen_events"
              + " where"
              + " partner = 'jvvqiose6ivd2ihmcsncf4od3b'"
              + " AND sync_date = '" + Today + "'"
              + " AND user = 'client' AND event = 'connected'"
              + " GROUP BY partner) B"
              + " LEFT JOIN"
              + " (select "
              + " partner,"
              + " count(distinct mac) connected,"
              + " count(1) videoPlayed,"
              + " ROUND(SUM(view_duration /60000)) total_duration"
              + " FROM"
              + " vuscreen_tracker"
              + " where"
              + " partner = 'jvvqiose6ivd2ihmcsncf4od3b'"
              + " AND sync_date = '" + Today + "'"
              + " GROUP BY partner) D ON D.partner = B.partner"
            db.get().query(query, function (err, result) {
              if (err) {
                set_key_value('zimindara_cronStatus', 'closed', function (err, data) {
                  if (err) {
                    console.error(err);
                  }
                  else {
                    console.log('zimindara_cronStatus ' + data)
                  }
                })
              } else {
                var d = new Date();
                d.setDate(d.getDate() - 1);
                var Yesterday = moment(d).format('YYYY-MM-DD').toString();
                var query1 = " select "
                  + " B.server_started, D.connected, D.videoPlayed, D.total_duration"
                  + " from"
                  + " (select "
                  + " partner,"
                  + " count(distinct reg_id) server_started"
                  + " FROM"
                  + " vuscreen_events"
                  + " where"
                  + " partner = 'jvvqiose6ivd2ihmcsncf4od3b'"
                  + " AND sync_date = '" + Yesterday + "'"
                  + " AND user = 'client' AND event = 'connected'"
                  + " GROUP BY partner) B"
                  + " LEFT JOIN"
                  + " (select "
                  + " partner,"
                  + " count(distinct mac) connected,"
                  + " count(1) videoPlayed,"
                  + " ROUND(SUM(view_duration /60000)) total_duration"
                  + " FROM"
                  + " vuscreen_tracker"
                  + " where"
                  + " partner = 'jvvqiose6ivd2ihmcsncf4od3b'"
                  + " AND sync_date= '" + Yesterday + "'"
                  + " GROUP BY partner) D ON D.partner = B.partner"
                db.get().query(query1, function (err1, result1) {
                  if (err1) {
                    console.log(err1)
                    set_key_value('zimindara_cronStatus', 'closed', function (err, data) {
                      if (err) {
                        console.error(err);
                      }
                      else {
                        console.log('zimindara_cronStatus ' + data)
                      }
                    })
                  } else {
                    var sms = ""
                    if (result.length > 0) {
                      for (var i = 0; i < result.length; i++) {
                        if (result[i].server_started == null) {
                          result[i].server_started = 0
                        }
                        if (result[i].connected == null) {
                          result[i].connected = 0
                        }
                        if (result[i].videoPlayed == null) {
                          result[i].videoPlayed = 0
                        }
                        if (result[i].total_duration == null) {
                          result[i].total_duration = 0
                        }
                        sms += "Zimindara - Date: " + Today + "\n"
                        sms += "Srvr/Clnt: " + result[i].server_started + "/" + result[i].connected + "\n"
                        sms += "Vid: " + result[i].videoPlayed + "\n"
                        sms += "Dur(M): " + result[i].total_duration + "\n"
                        // sms += "DtaSync: "+result[i].downloaded+"\n"
                      }
                    }
                    if (result1.length > 0) {
                      for (var j = 0; j < result1.length; j++) {
                        if (result1[j].connected == null) {
                          result1[j].connected = 0
                        }
                        if (result1[j].videoPlayed == null) {
                          result1[j].videoPlayed = 0
                        }
                        if (result1[j].total_duration == null) {
                          result1[j].total_duration = 0
                        }
                        sms += "Ytdy srvr/clnt/vid/dur: " + result1[j].server_started + "/" + result1[j].connected + "/" + result1[j].videoPlayed + "/" + result1[j].total_duration + "\n"
                      }
                    }
                    if (sms) {
                      // var Numbers =       owner ,      driver              sahil,     deepak   varun goyal   manoj gupta    gunjan    subodh   kedar
                      var Numbers = [req.body.owner_no, req.body.driver_no, 9582340204, 9650379456, 9818436189, 9810772396, 9899116084, 8826614109, 7042854343]
                      // var Numbers = [7042854343]
                      for (var i = 0; i < Numbers.length; i++) {
                        var message = 'http://www.myvaluefirst.com/smpp/sendsms?username=Mobiservehttp1&password=mobi1234&to=' + Numbers[i] + '&from=VUINFO&text=Dear Recipients,\n' + sms
                        request(message, function (error, response, body) {
                          if (!error && response.statusCode == 200) {
                            console.log("Alert has been " + body) // Show the HTML for the Google homepage. 
                          }
                        })
                      }
                    } else {
                      console.log("No sms Found.")
                      set_key_value('zimindara_cronStatus', 'closed', function (err, data) {
                        if (err) {
                          console.error(err);
                        }
                        else {
                          console.log('zimindara_cronStatus ' + data)
                        }
                      })
                    }
                  }
                })
              }
            })
          }
        })
      }
    }
  })
}


//Cron For indocanadian
exports.indocanadian_cron = function () {
  get_cached_data(['indocanadian_cronStatus'], function (e, doc) {
    if (!e) {
      console.log(doc.indocanadian_cronStatus)
      if (!doc.indocanadian_cronStatus || doc.indocanadian_cronStatus == 'closed') {
        set_key_value('indocanadian_cronStatus', 'in progress', function (err, data) {
          if (!err) {
            var d = new Date();
            // d.setDate(d.getDate()-1);
            var Today = moment(d).format('YYYY-MM-DD').toString();
            var query = " select "
              + " B.server_started,D.connected, D.videoPlayed, D.total_duration"
              + " from"
              + " (select "
              + " partner,"
              + " count(distinct reg_id) server_started"
              + " FROM"
              + " vuscreen_events"
              + " where"
              + " partner = 'l83gpm7eh9o4lsmqj1s6cvbvnd'"
              + " AND sync_date = '" + Today + "'"
              + " AND user = 'client' AND event = 'connected'"
              + " GROUP BY partner) B"
              + " LEFT JOIN"
              + " (select "
              + " partner,"
              + " count(distinct mac) connected,"
              + " count(1) videoPlayed,"
              + " ROUND(SUM(view_duration /60000)) total_duration"
              + " FROM"
              + " vuscreen_tracker"
              + " where"
              + " partner = 'l83gpm7eh9o4lsmqj1s6cvbvnd'"
              + " AND sync_date = '" + Today + "'"
              + " GROUP BY partner) D ON D.partner = B.partner"
            db.get().query(query, function (err, result) {
              if (err) {
                set_key_value('indocanadian_cronStatus', 'closed', function (err, data) {
                  if (err) {
                    console.error(err);
                  }
                  else {
                    console.log('indocanadian_cronStatus ' + data)
                  }
                })
              } else {
                var d = new Date();
                d.setDate(d.getDate() - 1);
                var Yesterday = moment(d).format('YYYY-MM-DD').toString();
                var query1 = " select "
                  + " B.server_started, D.connected, D.videoPlayed, D.total_duration"
                  + " from"
                  + " (select "
                  + " partner,"
                  + " count(distinct reg_id) server_started"
                  + " FROM"
                  + " vuscreen_events"
                  + " where"
                  + " partner = 'l83gpm7eh9o4lsmqj1s6cvbvnd'"
                  + " AND sync_date = '" + Yesterday + "'"
                  + " AND user = 'client' AND event = 'connected'"
                  + " GROUP BY partner) B"
                  + " LEFT JOIN"
                  + " (select "
                  + " partner,"
                  + " count(distinct mac) connected,"
                  + " count(1) videoPlayed,"
                  + " ROUND(SUM(view_duration /60000)) total_duration"
                  + " FROM"
                  + " vuscreen_tracker"
                  + " where"
                  + " partner = 'l83gpm7eh9o4lsmqj1s6cvbvnd'"
                  + " AND sync_date= '" + Yesterday + "'"
                  + " GROUP BY partner) D ON D.partner = B.partner"
                db.get().query(query1, function (err1, result1) {
                  if (err1) {
                    console.log(err1)
                    set_key_value('indocanadian_cronStatus', 'closed', function (err, data) {
                      if (err) {
                        console.error(err);
                      }
                      else {
                        console.log('indocanadian_cronStatus ' + data)
                      }
                    })
                  } else {
                    var sms = ""
                    if (result.length > 0) {
                      for (var i = 0; i < result.length; i++) {
                        if (result[i].server_started == null) {
                          result[i].server_started = 0
                        }
                        if (result[i].connected == null) {
                          result[i].connected = 0
                        }
                        if (result[i].videoPlayed == null) {
                          result[i].videoPlayed = 0
                        }
                        if (result[i].total_duration == null) {
                          result[i].total_duration = 0
                        }
                        sms += "Indo Canadian - Date: " + Today + "\n"
                        sms += "Srvr/Clnt: " + result[i].server_started + "/" + result[i].connected + "\n"
                        sms += "Vid: " + result[i].videoPlayed + "\n"
                        sms += "Dur(M): " + result[i].total_duration + "\n"
                        // sms += "DtaSync: "+result[i].downloaded+"\n"
                      }
                    }
                    if (result1.length > 0) {
                      for (var j = 0; j < result1.length; j++) {
                        if (result1[j].connected == null) {
                          result1[j].connected = 0
                        }
                        if (result1[j].videoPlayed == null) {
                          result1[j].videoPlayed = 0
                        }
                        if (result1[j].total_duration == null) {
                          result1[j].total_duration = 0
                        }
                        sms += "Ytdy srvr/clnt/vid/dur: " + result1[j].server_started + "/" + result1[j].connected + "/" + result1[j].videoPlayed + "/" + result1[j].total_duration + "\n"
                      }
                    }
                    if (sms) {
                      // var Numbers =       owner ,      driver              sahil,     deepak   varun goyal   manoj gupta    gunjan    subodh   kedar
                      var Numbers = [req.body.owner_no, req.body.driver_no, 9582340204, 9650379456, 9818436189, 9810772396, 9899116084, 8826614109, 7042854343]
                      // var Numbers = [7042854343]
                      for (var i = 0; i < Numbers.length; i++) {
                        var message = 'http://www.myvaluefirst.com/smpp/sendsms?username=Mobiservehttp1&password=mobi1234&to=' + Numbers[i] + '&from=VUINFO&text=Dear Recipients,\n' + sms
                        request(message, function (error, response, body) {
                          if (!error && response.statusCode == 200) {
                            console.log("Alert has been " + body) // Show the HTML for the Google homepage. 
                          }
                        })
                      }
                    } else {
                      console.log("No sms Found.")
                      set_key_value('indocanadian_cronStatus', 'closed', function (err, data) {
                        if (err) {
                          console.error(err);
                        }
                        else {
                          console.log('indocanadian_cronStatus ' + data)
                        }
                      })
                    }
                  }
                })
              }
            })
          }
        })
      }
    }
  })
}



//Cron For bus wise usage  csv
exports.buswisecsv_cron = function () {
  get_cached_data(['buswisecsv_cronStatus'], function (e, doc) {
    if (!e) {
      console.log(doc.buswisecsv_cronStatus)
      if (!doc.buswisecsv_cronStatus || doc.buswisecsv_cronStatus == 'closed') {
        set_key_value('buswisecsv_cronStatus', 'in progress', function (err, data) {
          if (!err) {
            var d = new Date();
            d.setDate(d.getDate() - 1);
            var Yesterday = moment(d).format('YYYY-MM-DD').toString();
            var query = " SELECT"
              + "   vr.reg_id,"
              + "   vr.vehicle_no,"
              + "   vr.source,"
              + "   vr.destination,"
              + "   COUNT(1) total_played,"
              + "   COUNT(DISTINCT vst.mac) total_uesr,"
              + "   ROUND(SUM(vst.view_duration / 60000), 2) total_duration,"
              + "   ROUND(SUM(vst.view_duration / 60000)/COUNT(DISTINCT vst.mac), 2) avg_content_dur,"
              + "   ROUND(COUNT(1)/COUNT(DISTINCT vst.mac)) avg_content_played,"
              + "   vr.owner_name,"
              + "   vr.driver_name,"
              + "   vr.driver_no,"
              + "   vr.helper_name,"
              + "   vr.helper_no,"
              + " vr.location installed_location"
              + " FROM"
              + " vuscreen_tracker vst"
              + " JOIN"
              + " vuscreen_registration vr ON vst.reg_id = vr.reg_id"
              + " WHERE"
              + " vst.sync_date = '" + Yesterday + "' group by vst.reg_id"
            db.get().query(query, function (err, result) {
              if (err) {
                set_key_value('buswisecsv_cronStatus', 'closed', function (err, data) {
                  if (err) {
                    console.error(err);
                  }
                  else {
                    console.log('buswisecsv_cronStatus ' + data)
                  }
                })
              } else {
                var d = new Date();
                d.setDate(d.getDate() - 2);
                var DBYesterday = moment(d).format('YYYY-MM-DD').toString();
                var query1 = " SELECT"
                  + " vr.reg_id,"
                  + " vr.vehicle_no,"
                  + "   vr.source,"
                  + "   vr.destination,"
                  + "   COUNT(1) total_played,"
                  + "   COUNT(DISTINCT vst.mac) total_uesr,"
                  + "   ROUND(SUM(vst.view_duration / 60000), 2) total_duration,"
                  + "   ROUND(SUM(vst.view_duration / 60000)/COUNT(DISTINCT vst.mac), 2) avg_content_dur,"
                  + "   ROUND(COUNT(1)/COUNT(DISTINCT vst.mac)) avg_content_played,"
                  + "   vr.owner_name,"
                  + "   vr.driver_name,"
                  + "   vr.driver_no,"
                  + "   vr.helper_name,"
                  + "   vr.helper_no,"
                  + " vr.location installed_location"
                  + " FROM"
                  + " vuscreen_tracker vst"
                  + " JOIN"
                  + " vuscreen_registration vr ON vst.reg_id = vr.reg_id"
                  + " WHERE"
                  + " vst.sync_date = '" + DBYesterday + "' group by vst.reg_id"
                db.get().query(query1, function (err1, result1) {
                  if (err1) {
                    console.log(err1)
                    set_key_value('buswisecsv_cronStatus', 'closed', function (err, data) {
                      if (err) {
                        console.error(err);
                      }
                      else {
                        console.log('buswisecsv_cronStatus ' + data)
                      }
                    })
                  } else {
                    var fields = ['reg_id', 'vehicle_no', 'source', 'destination', 'total_played', 'total_uesr', 'total_duration', 'avg_content_dur', 'avg_content_played', 'owner_name', 'driver_name', 'helper_name', 'installed_location'];
                    var csvyesterday = json2csv({ data: result, fields: fields });
                    // var fields1 = ['title', 'count'];
                    var csvdbyesterday = json2csv({ data: result1, fields: fields });
                    var array = []
                    array.push({ key: 'yesterday', value: csvyesterday }, { key: 'dbyesterday', value: csvdbyesterday })
                    for (var i = 0; i < array.length; i++) {
                      // fs.writeFile('/home/kedar/VuLiv-Analytics-NewDB-2017-10-10/server/api/views/banner/'+array[i].key+'.csv' , array[i].value, function(err) {
                      fs.writeFile(config.root + '/server/api/vuscreen/' + array[i].key + '.csv', array[i].value, function (err) {
                        if (err) {
                          set_key_value('buswisecsv_cronStatus', 'closed', function (err, data) {
                            if (err) {
                              console.error(err);
                            }
                            else {
                              console.log('buswisecsv_cronStatus ' + data)
                            }
                          })
                        } else {
                          console.log('file saved');
                        }
                      });
                    }
                    var email = 'manoj.gupta@vuliv.com,gunjan.jain@vuliv.com,kedar.gadre@vuliv.com,varun.goyal@vuliv.com,deepak.kumar@vuliv.com,sahil.sachdeva@vuliv.com,subodh.sharma@vuliv.com,barun.kundu@vuliv.com,indu.sharma@vuliv.com'
                    // var email = 'kedar.gadre@vuliv.com'
                    EM.dispatchEmail(email, 'Bus Report - ' + DBYesterday + '-' + Yesterday, function (e) {
                      set_key_value('buswisecsv_cronStatus', 'closed', function (err, data) {
                        if (err) {
                          console.error(err);
                        }
                        else {
                          console.log('buswisecsv_cronStatus ' + data)
                          console.log(e)
                        }
                      })
                    })
                  }
                })
              }
            })
          }
        })
      }
    }
  })
}

/*  Get Daily Email with last seven days file payed.
    @Authentication ----> by session key
    @Authorization ----> Access Controll Logic
    Author : Kedar Gadre
    Date : 20/07/2020
*/
exports.vehicleUpdate_Cron = function () {
  // var d = new Date();
  // d.setDate(d.getDate()-1);
  // var Yesterday = moment(d).format('YYYY-MM-DD').toString();
  // console.log(Yesterday)
  for (let i = 0; i < ids.length; i++) {
    const element = ids[i];
    let query = "Update "
      + " vuscreen_registration SET "
      + "    vehicle_no = '" + element.vehicle_no + "'"
      + " where "
      + " device_id='" + element.device_id + "'"
    db.get().query(query, function (err, result) {
      if (err) {
        console.log(err)
      } else {
        console.log(result)
      }
    })
  }
}

/*  Get Daily Email with last seven days DAU, file payed.
    @Authentication ----> by session key
    @Authorization ----> Access Controll Logic
    Author : Kedar Gadre
    Date : 28/07/2020
    Modified_by : Kedar Gadre
    Modification Date : 30/07/2020
*/
exports.dauEmailCron = function () {
  let d = new Date();
  let d1 = d.setDate(d.getDate() - 1);
  let d2 = d.setDate(d.getDate() - 6);
  d1 = moment(d1).format('YYYY-MM-DD').toString();
  d2 = moment(d2).format('YYYY-MM-DD').toString();
  d1 = d1 + " 06:10:00";
  d2 = d2 + " 06:10:00";
  var firstDate = moment(new Date()).format('YYYY-MM') + '-01';
  let query = "SELECT vr.vehicle_no as HostID, vst.view_date, COUNT(DISTINCT vst.mac) COUNT"
    + " FROM vuscreen_tracker vst"
    + " LEFT JOIN vuscreen_registration vr ON vst.reg_id = vr.reg_id"
    + " WHERE vst.view_date >= '" + d2 + "' AND vst.view_date <= '" + d1 + "'"
    + " AND vr.vehicle_no In (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 16, 17, 18, 21, 22, 23, 24, 26, 27, 28, 29, 30, 31, 33, 32, 34, 35, 36, 37, "
    + " 38,39,43,44,48,55,59,65,69,70,74,75,83,85,87,89,94,95,96,97,98,100,102,103,104,105,106,"
    + " 108,110,111,112,113,114,115,116,117,118,119,120,121,"
    + " 122,125,126,127,128,129,130,131,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,158,159,160,"
    + " 161,162,163,164,165,166,167,168,169,170,171,172,173,174,175,176,177,178,179,180,181,182,183,184,185,186,187,188,"
    + " 201,202,203,204,205,206,207,208,209,210,211,212,213,214,215,216,220,14,15,40,41,45,46,47,49,51,52,53,54,56,57,60,61,62,63,64,66,67,68,71,72,76,78,79,90,91,92,93,190,191,192,193,194,195,196,197,198,199,88,99,82,84,217,218,219,221,132,189,200,301,302,303,304,305,124,123,306,58,20)"
    // + " AND vr.vehicle_no NOT REGEXP '[A-Z ]'"
    + " GROUP BY vr.vehicle_no, vst.view_date"
    + " ORDER BY vst.view_date, vr.vehicle_no"
  let query1 = "SELECT vr.vehicle_no as HostID, vst.view_date, COUNT(1) COUNT"
    + " FROM vuscreen_tracker vst"
    + " LEFT JOIN vuscreen_registration vr ON vst.reg_id = vr.reg_id"
    + " WHERE vst.view_date >= '" + d2 + "' AND vst.view_date <= '" + d1 + "'"
    + " AND vr.vehicle_no In (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 16, 17, 18, 21, 22, 23, 24, 26, 27, 28, 29, 30, 31, 33, 32, 34, 35, 36, 37, "
    + " 38,39,43,44,48,55,59,65,69,70,74,75,83,85,87,89,94,95,96,97,98,100,102,103,104,105,106,"
    + " 108,110,111,112,113,114,115,116,117,118,119,120,121,"
    + " 122,125,126,127,128,129,130,131,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,158,159,160,"
    + " 161,162,163,164,165,166,167,168,169,170,171,172,173,174,175,176,177,178,179,180,181,182,183,184,185,186,187,188,"
    + " 201,202,203,204,205,206,207,208,209,210,211,212,213,214,215,216,220,14,15,40,41,45,46,47,49,51,52,53,54,56,57,60,61,62,63,64,66,67,68,71,72,76,78,79,90,91,92,93,190,191,192,193,194,195,196,197,198,199,88,99,82,84,217,218,219,221,132,189,200,301,302,303,304,305,124,123,306,58,20)"
    + " AND vst.type = 'video'"
    + " GROUP BY vr.vehicle_no, vst.view_date"
    + " ORDER BY vst.view_date, vr.vehicle_no"
  let query4 = "SELECT vr.vehicle_no as HostID, vst.view_date, COUNT(1) COUNT"
    + " FROM vuscreen_tracker vst"
    + " LEFT JOIN vuscreen_registration vr ON vst.reg_id = vr.reg_id"
    + " WHERE vst.view_date >= '" + d2 + "' AND vst.view_date <= '" + d1 + "'"
    + " AND vr.vehicle_no In (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 16, 17, 18, 21, 22, 23, 24, 26, 27, 28, 29, 30, 31, 33, 32, 34, 35, 36, 37, "
    + " 38,39,43,44,48,55,59,65,69,70,74,75,83,85,87,89,94,95,96,97,98,100,102,103,104,105,106,"
    + " 108,110,111,112,113,114,115,116,117,118,119,120,121,"
    + " 122,125,126,127,128,129,130,131,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,158,159,160,"
    + " 161,162,163,164,165,166,167,168,169,170,171,172,173,174,175,176,177,178,179,180,181,182,183,184,185,186,187,188,"
    + " 201,202,203,204,205,206,207,208,209,210,211,212,213,214,215,216,220,14,15,40,41,45,46,47,49,51,52,53,54,56,57,60,61,62,63,64,66,67,68,71,72,76,78,79,90,91,92,93,190,191,192,193,194,195,196,197,198,199,88,99,82,84,217,218,219,221,132,189,200,301,302,303,304,305,124,123,306,58,20)"
    + " AND vst.type = 'zip'"
    + " GROUP BY vr.vehicle_no, vst.view_date"
    + " ORDER BY vst.view_date, vr.vehicle_no"
  let query2 = "SELECT vst.view_date, COUNT(1) Views, COUNT(DISTINCT vst.mac) Sessions, ROUND(COUNT(DISTINCT vst.device_id)/ 72 * 100) AS 'percentage',"
    + " COUNT(DISTINCT vst.device_id) Hubs"
    + " FROM vuscreen_tracker vst"
    + " LEFT JOIN vuscreen_registration vr ON vst.reg_id = "
    + " vr.reg_id"
    + " WHERE vst.type IN ('video','brand-video') AND vst.view_date >= '" + firstDate + "' AND vst.view_date <= '" + d1 + "'"
    + " AND vr.vehicle_no In (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 16, 17, 18, 21, 22, 23, 24, 26, 27, 28, 29, 30, 31, 33, 32, 34, 35, 36, 37, "
    + " 38,39,43,44,48,55,59,65,69,70,74,75,83,85,87,89,94,95,96,97,98,100,102,103,104,105,106,"
    + " 108,110,111,112,113,114,115,116,117,118,119,120,121,"
    + " 122,125,126,127,128,129,130,131,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,158,159,160,"
    + " 161,162,163,164,165,166,167,168,169,170,171,172,173,174,175,176,177,178,179,180,181,182,183,184,185,186,187,188,"
    + " 201,202,203,204,205,206,207,208,209,210,211,212,213,214,215,216,220,14,15,40,41,45,46,47,49,51,52,53,54,56,57,60,61,62,63,64,66,67,68,71,72,76,78,79,90,91,92,93,190,191,192,193,194,195,196,197,198,199,88,99,82,84,217,218,219,221,132,189,200,301,302,303,304,305,124,123,306,58,20)"
    // + " AND vr.vehicle_no NOT REGEXP '[A-Z ]'"
    + " GROUP BY vst.view_date"
  let query3 = "SELECT DATE_FORMAT(vst.view_date, '%Y-%m') YEAR , DATE_FORMAT(vst.view_date, '%M-%y') Month,"
    + " COUNT(1) Views, COUNT(DISTINCT vst.mac) Sessions, ROUND(COUNT(DISTINCT vst.device_id)/ 72 * 100) AS percentage,"
    + " COUNT(DISTINCT vst.device_id) Hubs"
    + " FROM vuscreen_tracker vst"
    + " LEFT JOIN vuscreen_registration vr ON vst.reg_id = "
    + "  vr.reg_id"
    + " WHERE "
    + " vr.vehicle_no In (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 16, 17, 18, 21, 22, 23, 24, 26, 27, 28, 29, 30, 31, 33, 32, 34, 35, 36, 37, "
    + " 38,39,43,44,48,55,59,65,69,70,74,75,83,85,87,89,94,95,96,97,98,100,102,103,104,105,106,"
    + " 108,110,111,112,113,114,115,116,117,118,119,120,121,"
    + " 122,125,126,127,128,129,130,131,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,158,159,160,"
    + " 161,162,163,164,165,166,167,168,169,170,171,172,173,174,175,176,177,178,179,180,181,182,183,184,185,186,187,188,"
    + " 201,202,203,204,205,206,207,208,209,210,211,212,213,214,215,216,220,14,15,40,41,45,46,47,49,51,52,53,54,56,57,60,61,62,63,64,66,67,68,71,72,76,78,79,90,91,92,93,190,191,192,193,194,195,196,197,198,199,88,99,82,84,217,218,219,221,132,189,200,301,302,303,304,305,124,123,306,58,20)"
    // + " vr.vehicle_no NOT REGEXP '[A-Z ]'"
    + " GROUP BY MONTH ORDER BY YEAR DESC LIMIT 2"
  let query5 = "SELECT vst.view_date, COUNT(DISTINCT vst.device_id) wifi_started, ROUND(COUNT(DISTINCT vst.device_id)/ 144 * 100) AS 'percentage'"
    + " FROM vuscreen_events vst"
    + " LEFT JOIN vuscreen_registration vr ON vst.reg_id = "
    + " vr.reg_id"
    + " WHERE vst.view_date >= '" + firstDate + "' AND vst.view_date <= '" + d1 + "'"
    + " AND vr.vehicle_no In (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 16, 17, 18, 21, 22, 23, 24, 26, 27, 28, 29, 30, 31, 33, 32, 34, 35, 36, 37, "
    + " 38,39,43,44,48,55,59,65,69,70,74,75,83,85,87,89,94,95,96,97,98,100,102,103,104,105,106,"
    + " 108,110,111,112,113,114,115,116,117,118,119,120,121,"
    + " 122,125,126,127,128,129,130,131,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,158,159,160,"
    + " 161,162,163,164,165,166,167,168,169,170,171,172,173,174,175,176,177,178,179,180,181,182,183,184,185,186,187,188,"
    + " 201,202,203,204,205,206,207,208,209,210,211,212,213,214,215,216,220,14,15,40,41,45,46,47,49,51,52,53,54,56,57,60,61,62,63,64,66,67,68,71,72,76,78,79,90,91,92,93,190,191,192,193,194,195,196,197,198,199,88,99,82,84,217,218,219,221,132,189,200,301,302,303,304,305,124,123,306,58,20)"
    + " GROUP BY vst.view_date"
  db.get().query(query, function (error, dataArray) {
    if (error) {
      console.log(error)
    } else {
      db.get().query(query1, function (err, doc) {
        if (err) { console.log(err); }
        else {
          db.get().query(query2, function (err2, doc2) {
            if (err2) { console.log(err2); }
            else {
              db.get().query(query4, function (err4, doc4) {
                if (err4) { console.log(err4); }
                else {
                  db.get().query(query3, function (err3, doc3) {
                    if (err3) { console.log(err3); }
                    else {
                      db.get().query(query5, function (err5, doc5) {
                        if (err5) { console.log(err5); }
                        else {
                          let userMap = new Map();
                          let usageMap = new Map();
                          let gameMap = new Map();
                          function formatDate(date) {
                            let dd = date.getDate();
                            let mm = date.getMonth() + 1;
                            let yyyy = date.getFullYear();
                            if (dd < 10) { dd = '0' + dd }
                            if (mm < 10) { mm = '0' + mm }
                            date = yyyy + '-' + mm + '-' + dd;
                            return date
                          }
                          let Last7Days = [];
                          let obj = {}
                          let usageobj = {}
                          let gameobj = {}
                          for (let i = 0; i < 7; i++) {
                            let d = new Date();
                            d.setDate(d.getDate() - i - 1);
                            Last7Days.push(formatDate(d))
                            let da = formatDate(d)
                            obj[da] = 0;
                            obj["rowSum"] = 0;
                            usageobj[da] = 0;
                            usageobj["rowSum"] = 0;
                            gameobj[da] = 0;
                            gameobj["rowSum"] = 0;

                          }

                          Last7Days.reverse().join(',');
                          let finalArr = []
                          let usageArr = []
                          let gameArr = []
                          for (let i = 0; i < dataArray.length; i++) {
                            const element = dataArray[i];
                            if (!userMap.has(element.HostID)) {
                              let arr = []
                              arr.push(element)
                              let kg = Object.assign({ HostID: element.HostID }, obj)
                              finalArr.push(kg)
                              userMap.set(element.HostID, arr)
                              // if (i == 0) {
                              //     let kg = Object.assign({ vehicle_no: "total" }, obj)
                              //     finalArr.push(kg)
                              // }

                            } else {
                              let arr = userMap.get(element.HostID)
                              arr.push(element)
                              userMap.set(element.HostID, arr)
                            }
                            if (dataArray.length == i + 1) {
                              userMap.forEach((value, key, map, index) => {
                                for (let d = 0; d < finalArr.length; d++) {
                                  const data = finalArr[d];
                                  let count = 0;
                                  for (let val = 0; val < value.length; val++) {
                                    const obj = value[val];
                                    if (obj["HostID"] == data.HostID) {
                                      count = count + parseInt(obj.COUNT)
                                      data[obj.view_date] = obj.COUNT
                                      data["rowSum"] = count;
                                    }
                                  }
                                }
                              });
                            }
                          }

                          for (let i = 0; i < doc.length; i++) {
                            const element = doc[i];
                            if (!usageMap.has(element.HostID)) {
                              let arr = []
                              arr.push(element)
                              let kg = Object.assign({ HostID: element.HostID }, usageobj)
                              usageArr.push(kg)
                              usageMap.set(element.HostID, arr)
                              // if (i == 0) {
                              //     let kg = Object.assign({ vehicle_no: "total" }, obj)
                              //     finalArr.push(kg)
                              // }

                            } else {
                              let arr = usageMap.get(element.HostID)
                              arr.push(element)
                              usageMap.set(element.HostID, arr)
                            }
                            if (doc.length == i + 1) {
                              usageMap.forEach((value, key, map, index) => {
                                for (let d = 0; d < usageArr.length; d++) {
                                  const data = usageArr[d];
                                  let count = 0;
                                  for (let val = 0; val < value.length; val++) {
                                    const obj = value[val];
                                    if (obj["HostID"] == data.HostID) {
                                      count = count + parseInt(obj.COUNT)
                                      data[obj.view_date] = obj.COUNT
                                      data["rowSum"] = count;
                                    }
                                  }
                                }
                              });
                            }
                          }
                          for (let i = 0; i < doc4.length; i++) {
                            const element = doc4[i];
                            if (!gameMap.has(element.HostID)) {
                              let arr = []
                              arr.push(element)
                              let kg = Object.assign({ HostID: element.HostID }, gameobj)
                              gameArr.push(kg)
                              gameMap.set(element.HostID, arr)
                              // if (i == 0) {
                              //     let kg = Object.assign({ vehicle_no: "total" }, obj)
                              //     finalArr.push(kg)
                              // }

                            } else {
                              let arr = gameMap.get(element.HostID)
                              arr.push(element)
                              gameMap.set(element.HostID, arr)
                            }
                            if (doc4.length == i + 1) {
                              gameMap.forEach((value, key, map, index) => {
                                for (let d = 0; d < gameArr.length; d++) {
                                  const data = gameArr[d];
                                  let count = 0;
                                  for (let val = 0; val < value.length; val++) {
                                    const obj = value[val];
                                    if (obj["HostID"] == data.HostID) {
                                      count = count + parseInt(obj.COUNT)
                                      data[obj.view_date] = obj.COUNT
                                      data["rowSum"] = count;
                                    }
                                  }
                                }
                              });
                            }
                          }
                          finalArr.sort((a, b) => b.rowSum - a.rowSum)
                          usageArr.sort((a, b) => b.rowSum - a.rowSum)
                          gameArr.sort((a, b) => b.rowSum - a.rowSum)
                          var fields = ["HostID", Last7Days[0], Last7Days[1], Last7Days[2], Last7Days[3], Last7Days[4], Last7Days[5], Last7Days[6], 'rowSum'];
                          var csvDau = json2csv({ data: finalArr, fields: fields });
                          var csvPlay = json2csv({ data: usageArr, fields: fields });
                          var csvGame = json2csv({ data: gameArr, fields: fields });
                          var array = []
                          array.push({ key: 'Last7DaysDau', value: csvDau }, { key: 'Last7DaysPlay', value: csvPlay }, { key: 'Last7DaysGame', value: csvGame })
                          for (var i = 0; i < array.length; i++) {
                            fs.writeFile(config.root + '/server/api/vuscreen/' + array[i].key + '.csv', array[i].value, function (err) {
                              if (err) {
                                throw err;
                              } else {
                                console.log('file saved');
                              }
                            });
                          }
                          var html = "<html><head>"
                          html += "<style>"
                          html += "table {font-family: arial, sans-serif;border-collapse: collapse;width: 100%;}"
                          html += "td, th {border: 1px solid #dddddd;text-align: left;padding: 8px;}"
                          html += "tr:nth-child(even) {background-color: #dddddd;}</style></head>"
                          html += "<h4>Dear Recipients,</h4>"
                          html += "<h4>Please find below report.</h4><table>"
                          html += "<thead><tr>"
                          html += "<th>Date</th><th>Video Views</th><th>Viewers</th>"
                          html += "<th>% of Sync VS Total Hub</th>"
                          html += "<th>Wi-Fi Hub Started</th>"
                          html += "<th>Wi-Fi Hub Used</th>"
                          html += "<th>Wi-Fi Hub Provided</th>"
                          html += "</tr></thead><tbody>"
                          let monthTotal = 0;
                          let monthAvg = 0;
                          let hub_array = JSON.parse(JSON.stringify(doc2))
                          let synced_array = JSON.parse(JSON.stringify(doc5))
                          for (let i = 0; i < hub_array.length; i++) {
                            const element = hub_array[i];
                            synced_array.map(item => {
                              if (element.view_date == item.view_date) {
                                element.percentage = item.percentage;
                                element.wifi_started = item.wifi_started;
                              }
                            });
                          }
                          for (let i = 0; i < hub_array.length; i++) {
                            const element = hub_array[i];
                            monthTotal += element.Views;
                            monthAvg += element.Hubs;
                            html += "<tr>"
                            html += "<td>" + element.view_date + "</td>"
                            html += "<td>" + element.Views + "</td>"
                            html += "<td>" + element.Sessions + "</td>"
                            html += "<td>" + element.percentage + "%</td>"
                            html += "<td>" + element.wifi_started + "</td>"
                            html += "<td>" + element.Hubs + "</td>"
                            html += "<td>144</td>"
                            html += "</tr>"
                          }
                          monthAvg = Math.round(monthAvg / doc2.length)
                          for (let i = 0; i < doc3.length; i++) {
                            const element = doc3[i];
                            html += "<tr>"
                            html += "<td><b>" + element.Month + "</b></td>"
                            if (i == 0) {
                              html += "<td><b>" + monthTotal + "</b></td>"
                            } else {
                              html += "<td><b>" + element.Views + "</b></td>"
                            }
                            html += "<td><b>" + element.Sessions + "</b></td>"
                            html += "<td></td>"
                            html += "<td></td>"
                            html += "<td><b>" + element.Hubs + "</b></td>"
                            html += "<td>144</td>"
                            html += "</tr>"
                          }
                          // var html = "<html><head>"
                          // html += "<style>"
                          // html += "table {font-family: arial, sans-serif;border-collapse: collapse;width: 100%;}"
                          // html += "td, th {border: 1px solid #dddddd;text-align: left;padding: 8px;}"
                          // html += "tr:nth-child(even) {background-color: #dddddd;}</style></head>"
                          // html += "<h4>Dear Recipients,</h4>"
                          // html += "<h4>Please find below table for DAU.</h4><table>"
                          // html += "<thead><tr>"
                          // html += "<th>Box No</th><th>" + Last7Days[0] + "</th><th>" + Last7Days[1] + "</th>"
                          // html += "<th>" + Last7Days[2] + "</th><th>" + Last7Days[3] + "</th>"
                          // html += "<th>" + Last7Days[4] + "</th><th>" + Last7Days[5] + "</th><th>" + Last7Days[6] + "</th><th>Total</th>"
                          // html += "</tr></thead><tbody>"
                          // let col0 = 0;
                          // let col1 = 0;
                          // let col2 = 0;
                          // let col3 = 0;
                          // let col4 = 0;
                          // let col5 = 0;
                          // let col6 = 0;
                          // let finalSum = 0;
                          // for (let index = 0; index < finalArr.length; index++) {
                          //   const element = finalArr[index];
                          //   col0 = col0 + element[Last7Days[0]];
                          //   col1 = col1 + element[Last7Days[1]];
                          //   col2 = col2 + element[Last7Days[2]];
                          //   col3 = col3 + element[Last7Days[3]];
                          //   col4 = col4 + element[Last7Days[4]];
                          //   col5 = col5 + element[Last7Days[5]];
                          //   col6 = col6 + element[Last7Days[6]];
                          //   html += "<tr>"
                          //   html += "<td><b>" + element.vehicle_no + "</b></td>"
                          //   html += "<td>" + element[Last7Days[0]] + "</td>"
                          //   html += "<td>" + element[Last7Days[1]] + "</td>"
                          //   html += "<td>" + element[Last7Days[2]] + "</td>"
                          //   html += "<td>" + element[Last7Days[3]] + "</td>"
                          //   html += "<td>" + element[Last7Days[4]] + "</td>"
                          //   html += "<td>" + element[Last7Days[5]] + "</td>"
                          //   html += "<td>" + element[Last7Days[6]] + "</td>"
                          //   html += "<td><b>" + element.rowSum + "</b></td>"
                          //   html += "</tr>"
                          // }
                          // finalSum = col0 + col1 + col2 + col3 + col4 + col5 + col6;
                          // html += "<tr><td><b>Total</b></td><td><b>" + col0 + "</b></td><td><b>" + col1 + "</b></td><td><b>" + col2 + "</b></td>"
                          // html += "<td><b>" + col3 + "</b></td><td><b>" + col4 + "</b></td>"
                          // html += "<td><b>" + col5 + "</b></td><td><b>" + col6 + "</b></td><td><b>" + finalSum + "</b></td></tr>";
                          // html += "</tbody></table>";
                          // html += "<h4>Please find below table for file played.</h4><table>"
                          // html += "<thead><tr>"
                          // html += "<th>Box No</th><th>" + Last7Days[0] + "</th><th>" + Last7Days[1] + "</th>"
                          // html += "<th>" + Last7Days[2] + "</th><th>" + Last7Days[3] + "</th>"
                          // html += "<th>" + Last7Days[4] + "</th><th>" + Last7Days[5] + "</th><th>" + Last7Days[6] + "</th><th>Total</th>"
                          // html += "</tr></thead><tbody>"
                          // let col7 = 0;
                          // let col8 = 0;
                          // let col9 = 0;
                          // let col10 = 0;
                          // let col11 = 0;
                          // let col12 = 0;
                          // let col13 = 0;
                          // let usageSum = 0;
                          // for (let index = 0; index < usageArr.length; index++) {
                          //   const element = usageArr[index];
                          //   col7 = col7 + element[Last7Days[0]];
                          //   col8 = col8 + element[Last7Days[1]];
                          //   col9 = col9 + element[Last7Days[2]];
                          //   col10 = col10 + element[Last7Days[3]];
                          //   col11 = col11 + element[Last7Days[4]];
                          //   col12 = col12 + element[Last7Days[5]];
                          //   col13 = col13 + element[Last7Days[6]];
                          //   html += "<tr>"
                          //   html += "<td><b>" + element.vehicle_no + "</b></td>"
                          //   html += "<td>" + element[Last7Days[0]] + "</td>"
                          //   html += "<td>" + element[Last7Days[1]] + "</td>"
                          //   html += "<td>" + element[Last7Days[2]] + "</td>"
                          //   html += "<td>" + element[Last7Days[3]] + "</td>"
                          //   html += "<td>" + element[Last7Days[4]] + "</td>"
                          //   html += "<td>" + element[Last7Days[5]] + "</td>"
                          //   html += "<td>" + element[Last7Days[6]] + "</td>"
                          //   html += "<td><b>" + element.rowSum + "</b></td>"
                          //   html += "</tr>"
                          // }
                          // usageSum = col7 + col8 + col9 + col10 + col11 + col12 + col13;
                          // html += "<tr><td><b>Total</b></td><td><b>" + col7 + "</b></td><td><b>" + col8 + "</b></td><td><b>" + col9 + "</b></td>"
                          // html += "<td><b>" + col10 + "</b></td><td><b>" + col11 + "</b></td>"
                          // html += "<td><b>" + col12 + "</b></td><td><b>" + col13 + "</b></td><td><b>" + usageSum + "</b></td></tr>";
                          html += "</tbody></table>";
                          html += "<br><br><h5>Thanks & Regards</h5><h5>Mobi Sign Pvt Ltd.</h5></html>"
                          let subject = "Spicescreen Usage Report"
                          // var email = 'manoj.gupta@mojoboxx.com,deepak.kumar@mojoboxx.com,monali.monalisa@mojoboxx.com,product@mojoboxx.com,ashyin.thakral@mojoboxx.com,kedargdr@gmail.com'
                          //var email = 'anurag.kumar@spicejet.com,puneet.angrish@spicejet.com,sapna.kumar@spicejet.com,jitendra.gautam@spicejet.com,prashant.mishra4@spicejet.com,sushant.madhab@spicejet.com,manoj.gupta@mojoboxx.com,deepak.kumar@mojoboxx.com,monali.monalisa@mojoboxx.com,product@mojoboxx.com,ashyin.thakral@mojoboxx.com,kedargdr@gmail.com,amajit.das@spicejet.com,nidhi.sinha@spicejet.com,vishal.garg@mojoboxx.com,tushar.mehta@mojoboxx.com'
                          var email = 'vishal.garg@mojoboxx.com'
                          EM.dispatchEmail(email, subject, html, "count", function (e) {
                            console.log(e)
                          })
                        }
                      })
                    }
                  })
                }
              })
            }
          })
        }
      })
    }
  })
}

/*  Get Daily Email with last seven days file payed.
    @Authentication ----> by session key
    @Authorization ----> Access Controll Logic
    Author : Kedar Gadre
    Date : 03/08/2020
    Modified_by : Kedar Gadre
    Modification Date : 03/08/2020
*/
exports.playEmailCron = function () {
  let d = new Date();
  let d1 = d.setDate(d.getDate() - 1);
  let d2 = d.setDate(d.getDate() - 6);
  d1 = moment(d1).format('YYYY-MM-DD').toString();
  d2 = moment(d2).format('YYYY-MM-DD').toString();
  let query = "SELECT vc.title as vehicle_no, vst.sync_date, COUNT(1) COUNT"
    + " FROM vuscreen_tracker vst"
    + " LEFT JOIN vuscreen_registration vr ON vst.reg_id = vr.reg_id"
    + " LEFT JOIN vuscreen_content_package vc ON vst.view_id = vc.content_id"
    + " WHERE vst.sync_date>='" + d2 + "' AND vst.sync_date<='" + d1 + "' AND vr.vehicle_no NOT REGEXP '[A-Z ]' AND vst.type='video'"
    + " GROUP BY vc.title, vst.sync_date"
    + " ORDER BY vst.sync_date, vc.title"
  db.get().query(query, function (err, dataArray) {
    if (err) {
      console.log(err)
    } else {
      let userMap = new Map();
      function formatDate(date) {
        let dd = date.getDate();
        let mm = date.getMonth() + 1;
        let yyyy = date.getFullYear();
        if (dd < 10) { dd = '0' + dd }
        if (mm < 10) { mm = '0' + mm }
        date = yyyy + '-' + mm + '-' + dd;
        return date
      }
      let Last7Days = [];
      let obj = {}
      for (let i = 0; i < 7; i++) {
        let d = new Date();
        d.setDate(d.getDate() - i - 1);
        Last7Days.push(formatDate(d))
        let da = formatDate(d)
        obj[da] = 0;
        obj["rowSum"] = 0;
      }

      Last7Days.reverse().join(',');
      let finalArr = []
      for (let i = 0; i < dataArray.length; i++) {
        const element = dataArray[i];
        if (!userMap.has(element.vehicle_no)) {
          let arr = []
          arr.push(element)
          let kg = Object.assign({ vehicle_no: element.vehicle_no }, obj)
          finalArr.push(kg)
          userMap.set(element.vehicle_no, arr)
          // if (i == 0) {
          //     let kg = Object.assign({ vehicle_no: "total" }, obj)
          //     finalArr.push(kg)
          // }

        } else {
          let arr = userMap.get(element.vehicle_no)
          arr.push(element)
          userMap.set(element.vehicle_no, arr)
        }
        if (dataArray.length == i + 1) {
          userMap.forEach((value, key, map, index) => {
            for (let d = 0; d < finalArr.length; d++) {
              const data = finalArr[d];
              let count = 0;
              for (let val = 0; val < value.length; val++) {
                const obj = value[val];
                if (obj["vehicle_no"] == data.vehicle_no) {
                  count = count + parseInt(obj.COUNT)
                  data[obj.sync_date] = obj.COUNT
                  data["rowSum"] = count;
                }
              }
            }
          });
        }
      }
      finalArr.sort((a, b) => b.rowSum - a.rowSum)
      var html = "<html><head>"
      html += "<style>"
      html += "table {font-family: arial, sans-serif;border-collapse: collapse;width: 100%;}"
      html += "td, th {border: 1px solid #dddddd;text-align: left;padding: 8px;}"
      html += "tr:nth-child(even) {background-color: #dddddd;}</style></head>"
      html += "<h4>Dear Recipients,</h4>"
      html += "<h4>Please find below table for file played.</h4><table>"
      html += "<thead><tr>"
      html += "<th>Title</th><th>" + Last7Days[0] + "</th><th>" + Last7Days[1] + "</th>"
      html += "<th>" + Last7Days[2] + "</th><th>" + Last7Days[3] + "</th>"
      html += "<th>" + Last7Days[4] + "</th><th>" + Last7Days[5] + "</th><th>" + Last7Days[6] + "</th><th>Total</th>"
      html += "</tr></thead><tbody>"
      let col0 = 0;
      let col1 = 0;
      let col2 = 0;
      let col3 = 0;
      let col4 = 0;
      let col5 = 0;
      let col6 = 0;
      let finalSum = 0;
      for (let index = 0; index < finalArr.length; index++) {
        const element = finalArr[index];
        col0 = col0 + element[Last7Days[0]];
        col1 = col1 + element[Last7Days[1]];
        col2 = col2 + element[Last7Days[2]];
        col3 = col3 + element[Last7Days[3]];
        col4 = col4 + element[Last7Days[4]];
        col5 = col5 + element[Last7Days[5]];
        col6 = col6 + element[Last7Days[6]];
        html += "<tr>"
        html += "<td><b>" + element.vehicle_no + "</b></td>"
        html += "<td>" + element[Last7Days[0]] + "</td>"
        html += "<td>" + element[Last7Days[1]] + "</td>"
        html += "<td>" + element[Last7Days[2]] + "</td>"
        html += "<td>" + element[Last7Days[3]] + "</td>"
        html += "<td>" + element[Last7Days[4]] + "</td>"
        html += "<td>" + element[Last7Days[5]] + "</td>"
        html += "<td>" + element[Last7Days[6]] + "</td>"
        html += "<td><b>" + element.rowSum + "</b></td>"
        html += "</tr>"
      }
      finalSum = col0 + col1 + col2 + col3 + col4 + col5 + col6;
      html += "<tr><td><b>Total</b></td><td><b>" + col0 + "</b></td><td><b>" + col1 + "</b></td><td><b>" + col2 + "</b></td>"
      html += "<td><b>" + col3 + "</b></td><td><b>" + col4 + "</b></td>"
      html += "<td><b>" + col5 + "</b></td><td><b>" + col6 + "</b></td><td><b>" + finalSum + "</b></td></tr>";
      html += "</tbody></table>";
      html += "<br><br><h5>Thanks & Regards</h5><h5>Mobi Sign Pvt Ltd.</h5></html>"
      let subject = "Video Content Ranking Report"
      let email = 'kedargdr@gmail.com,manoj.gupta@mojoboxx.com,monali.monalisa@mojoboxx.com,ashyin.thakral@mojoboxx.com,product@mojoboxx.com,vishal.garg@mojoboxx.com,tushar.mehta@mojoboxx.com'
      // let email = 'kedargdr@gmail.com,deepak.kumar@mojoboxx.com'monali.monalisa@mojoboxx.com,
      EM.dispatchEmail(email, subject, html, "play", function (e) {
        console.log(e)
      })
    }
  })
}

exports.vuscreen_getFnBmail = function (req, cb) {
  //  var vuscreen_getFnBmail = function (req, cb) {
  console.log("vishal");
  var currentDate = moment(new Date()).format('YYYY-MM-DD');
  var d = new Date();
  d.setDate(d.getDate() - 1);
  var Yesterday = moment(d).format('YYYY-MM-DD').toString()
  var query = "SELECT "
    + "(SELECT COUNT(1) FROM  vuscreen_tracker a LEFT JOIN vuscreen_fnb_content b ON a.view_id = b.content_id JOIN vuscreen_registration c ON a.device_id = c.device_id LEFT JOIN vuscreen_fnb_folders AS d ON b.folder_id = d.id WHERE a.view_date = '" + Yesterday + "' AND a.menu LIKE '%f&b%' ORDER BY a.id DESC) total_clicks,"
    + " (SELECT COUNT(DISTINCT a.mac) FROM  vuscreen_tracker a LEFT JOIN vuscreen_fnb_content b ON a.view_id = b.content_id JOIN vuscreen_registration c ON a.device_id = c.device_id LEFT JOIN vuscreen_fnb_folders AS d ON b.folder_id = d.id WHERE a.view_date = '" + Yesterday + "' AND a.menu LIKE '%f&b%' ORDER BY a.id DESC) total_unique_user,"
    + " (SELECT COUNT(1) FROM  vuscreen_tracker a LEFT JOIN vuscreen_fnb_content b ON a.view_id = b.content_id JOIN vuscreen_registration c ON a.device_id = c.device_id LEFT JOIN vuscreen_fnb_folders AS d ON b.folder_id = d.id WHERE a.view_date = '" + Yesterday + "' AND a.menu LIKE '%FNB - DemoesticBOB%' ORDER BY a.id DESC) tc_domestic_bob,"
    + " (SELECT COUNT(1) FROM  vuscreen_tracker a LEFT JOIN vuscreen_fnb_content b ON a.view_id = b.content_id JOIN vuscreen_registration c ON a.device_id = c.device_id LEFT JOIN vuscreen_fnb_folders AS d ON b.folder_id = d.id WHERE a.view_date = '" + Yesterday + "' AND a.menu LIKE '%FNB - PreBook%' ORDER BY a.id DESC) tc_prebooking,"
    + " (SELECT COUNT(1) FROM  vuscreen_tracker a LEFT JOIN vuscreen_fnb_content b ON a.view_id = b.content_id JOIN vuscreen_registration c ON a.device_id = c.device_id LEFT JOIN vuscreen_fnb_folders AS d ON b.folder_id = d.id WHERE a.view_date = '" + Yesterday + "' AND a.menu LIKE '%FNB - Service Guildlines%' ORDER BY a.id DESC) tc_service_Guidlines,"
    + " (SELECT COUNT(1) FROM  vuscreen_tracker a LEFT JOIN vuscreen_fnb_content b ON a.view_id = b.content_id JOIN vuscreen_registration c ON a.device_id = c.device_id LEFT JOIN vuscreen_fnb_folders AS d ON b.folder_id = d.id WHERE a.view_date = '" + Yesterday + "' AND a.menu LIKE '%FNB - InternationlBOB%' ORDER BY a.id DESC) tc_Inter_BOB,"
    + " (SELECT COUNT(1) FROM  vuscreen_tracker a LEFT JOIN vuscreen_fnb_content b ON a.view_id = b.content_id JOIN vuscreen_registration c ON a.device_id = c.device_id LEFT JOIN vuscreen_fnb_folders AS d ON b.folder_id = d.id WHERE a.view_date = '" + Yesterday + "' AND a.menu LIKE '%FNB - SpiceMax%' ORDER BY a.id DESC) tc_spice,"
    + " (SELECT COUNT(1) FROM  vuscreen_tracker a LEFT JOIN vuscreen_fnb_content b ON a.view_id = b.content_id JOIN vuscreen_registration c ON a.device_id = c.device_id LEFT JOIN vuscreen_fnb_folders AS d ON b.folder_id = d.id WHERE a.view_date = '" + Yesterday + "' AND a.menu LIKE '%FNB - Buy On Board%' ORDER BY a.id DESC)  tc_BOB,"
    + " (SELECT COUNT(Distinct mac) FROM  vuscreen_tracker a LEFT JOIN vuscreen_fnb_content b ON a.view_id = b.content_id JOIN vuscreen_registration c ON a.device_id = c.device_id LEFT JOIN vuscreen_fnb_folders AS d ON b.folder_id = d.id WHERE a.view_date = '" + Yesterday + "' AND a.menu LIKE '%FNB - DemoesticBOB%' ORDER BY a.id DESC) tc_domestic_bob,"
    + " (SELECT COUNT(Distinct mac) FROM  vuscreen_tracker a LEFT JOIN vuscreen_fnb_content b ON a.view_id = b.content_id JOIN vuscreen_registration c ON a.device_id = c.device_id LEFT JOIN vuscreen_fnb_folders AS d ON b.folder_id = d.id WHERE a.view_date = '" + Yesterday + "' AND a.menu LIKE '%FNB - PreBook%' ORDER BY a.id DESC) tuu_prebooking,"
    + " (SELECT COUNT(Distinct mac) FROM  vuscreen_tracker a LEFT JOIN vuscreen_fnb_content b ON a.view_id = b.content_id JOIN vuscreen_registration c ON a.device_id = c.device_id LEFT JOIN vuscreen_fnb_folders AS d ON b.folder_id = d.id WHERE a.view_date = '" + Yesterday + "' AND a.menu LIKE '%FNB - Service Guildlines%' ORDER BY a.id DESC) tuu_service_Guidlines,"
    + " (SELECT COUNT(Distinct mac) FROM  vuscreen_tracker a LEFT JOIN vuscreen_fnb_content b ON a.view_id = b.content_id JOIN vuscreen_registration c ON a.device_id = c.device_id LEFT JOIN vuscreen_fnb_folders AS d ON b.folder_id = d.id WHERE a.view_date = '" + Yesterday + "' AND a.menu LIKE '%FNB - InternationlBOB%' ORDER BY a.id DESC) tuu_Inter_BOB,"
    + " (SELECT COUNT(Distinct mac) FROM  vuscreen_tracker a LEFT JOIN vuscreen_fnb_content b ON a.view_id = b.content_id JOIN vuscreen_registration c ON a.device_id = c.device_id LEFT JOIN vuscreen_fnb_folders AS d ON b.folder_id = d.id WHERE a.view_date = '" + Yesterday + "' AND a.menu LIKE '%FNB - SpiceMax%' ORDER BY a.id DESC) tuu_spice,"
    + " (SELECT COUNT(Distinct mac) FROM  vuscreen_tracker a LEFT JOIN vuscreen_fnb_content b ON a.view_id = b.content_id JOIN vuscreen_registration c ON a.device_id = c.device_id LEFT JOIN vuscreen_fnb_folders AS d ON b.folder_id = d.id WHERE a.view_date = '" + Yesterday + "' AND a.menu LIKE '%FNB - Buy On Board%' ORDER BY a.id DESC)  tuu_BOB,"
    + " (SELECT COUNT(Distinct mac) FROM  vuscreen_tracker a LEFT JOIN vuscreen_fnb_content b ON a.view_id = b.content_id JOIN vuscreen_registration c ON a.device_id = c.device_id LEFT JOIN vuscreen_fnb_folders AS d ON b.folder_id = d.id WHERE a.view_date = '" + Yesterday + "' AND a.menu LIKE '%FNB - DemoesticBOB%' ORDER BY a.id DESC) tuu_domestic_BOB";
  var query1 = "SELECT b.title, count(1) count, count(distinct mac) users, a.view_date FROM  vuscreen_tracker a LEFT JOIN vuscreen_fnb_content b ON a.view_id = b.content_id JOIN vuscreen_registration c ON a.device_id = c.device_id LEFT JOIN vuscreen_fnb_folders AS d ON b.folder_id = d.id WHERE a.view_date='" + Yesterday + "' AND a.menu LIKE '%f&b%' ANd b.ftype='domestic' group by b.title ORDER BY count(1) DESC limit 5";
  var query2 = "SELECT b.title, count(1) count, count(distinct mac) users, a.view_date FROM  vuscreen_tracker a LEFT JOIN vuscreen_fnb_content b ON a.view_id = b.content_id JOIN vuscreen_registration c ON a.device_id = c.device_id LEFT JOIN vuscreen_fnb_folders AS d ON b.folder_id = d.id WHERE a.view_date='" + Yesterday + "' AND a.menu LIKE '%f&b%' ANd b.ftype='INTERNATIONAL' group by b.title ORDER BY count(1) DESC limit 5";
  var query3 = "SELECT b.title, count(1) count, count(distinct mac) users, a.view_date FROM  vuscreen_tracker a LEFT JOIN vuscreen_fnb_content b ON a.view_id = b.content_id JOIN vuscreen_registration c ON a.device_id = c.device_id LEFT JOIN vuscreen_fnb_folders AS d ON b.folder_id = d.id WHERE a.view_date='" + Yesterday + "' AND a.menu LIKE '%f&b%' ANd b.ftype='Prebooking' group by b.title ORDER BY count(1) DESC limit 5";
  var query4 = "SELECT b.title, COUNT(*) count, count(DISTINCT a.mac) users ,d.folder FROM  vuscreen_tracker a LEFT JOIN vuscreen_fnb_content b ON a.view_id = b.content_id LEFT JOIN vuscreen_fnb_folders AS d ON b.folder_id = d.id WHERE a.view_date='" + Yesterday + "'  ANd d.status=1 group by d.folder,b.title ORDER BY folder";
  //var option = { draw: req.query.draw, start: 0, length: 500 };
  db.get().query(query, function (error, doc) {
    if (error) {
      console.log(error)
    } else {
      db.get().query(query1, function (err, doc1) {
        if (err) { console.log(err); }
        else {
          db.get().query(query2, function (err2, doc2) {
            if (err2) { console.log(err2); }
            else {
              db.get().query(query3, function (err3, doc3) {
                if (err3) { console.log(err3); }
                else {
                  db.get().query(query4, function (err4, doc4) {
                    if (err4) { console.log(err4); }
                    else {

                      var html = "<html><head>"
                      html += "<style>"
                      html += "table {font-family: arial, sans-serif;border-collapse: collapse;width: 100%;}"
                      html += "td, th {border: 2px solid black;text-align: center;padding: 8px;}"
                      html += "tr:nth-child(even) {background-color: #dddddd;}</style></head>"
                      html += "<h4>Dear Recipients,</h4>"
                      html += "<h4>Please find below reports.</h4>"
                      html += "<table>"
                      html += "<thead><tr>"
                      html += "<th colspan='2' >FNB Section</th>"
                      html += "</tr></thead><tbody>"
                      html += "<tr>"
                      html += "<td><b>Total Unique Users</b></td>"
                      html += "<td>" + doc[0].total_unique_user + "</td>"
                      html += "</tr>"
                      html += "<tr>"
                      html += "<td><b>Total Clicks</b></td>"
                      html += "<td>" + doc[0].total_clicks + "</td>"
                      html += "</tr>"
                      html += "<tr>"
                      html += "<td><b>Avg click/user</b></td>"
                      html += "<td>" + (doc[0].total_clicks / doc[0].total_unique_user).toFixed(1); + "</td>"
                      html += "</tr>"
                      html += "</tbody></table>";
                      html += "<br>"
                      html += "<table>"
                      html += "<thead><tr>"
                      html += "<th colspan='4' > Summary</th>"
                      html += "</tr></thead><tbody>"
                      html += "<tr>"
                      html += "<td><b></b></td>"
                      html += "<td>Total Unique Users</td>"
                      html += "<td>Total Clicks </td>"
                      html += "<td>Avg Clicks/User</td>"
                      html += "</tr>"
                      html += "<tr>"
                      html += "<td><b>BuyonBoard</b></td>"
                      html += "<td>" + doc[0].tuu_BOB + "</td>"
                      html += "<td>" + doc[0].tc_BOB + "</td>"
                      html += "<td>" + (doc[0].tc_BOB / doc[0].tuu_BOB).toFixed(1); + "</td>"
                      html += "</tr>"
                      html += "<tr>"
                      html += "<td><b>PreBooking</b></td>"
                      html += "<td>" + doc[0].tuu_prebooking + "</td>"
                      html += "<td>" + doc[0].tc_prebooking + "</td>"
                      html += "<td>" + (doc[0].tc_prebooking / doc[0].tuu_prebooking).toFixed(1); + "</td>"
                      html += "</tr>"
                      html += "<tr>"
                      html += "<td><b>BuyonBoard(Domestic)</b></td>"
                      html += "<td>" + doc[0].tuu_domestic_BOB + "</td>"
                      html += "<td>" + doc[0].tc_domestic_bob + "</td>"
                      html += "<td>" + (doc[0].tc_domestic_bob / doc[0].tuu_domestic_BOB).toFixed(1); + "</td>"
                      html += "</tr>"
                      html += "<tr>"
                      html += "<td><b>BuyonBoard(International)</b></td>"
                      html += "<td>" + doc[0].tuu_Inter_BOB + "</td>"
                      html += "<td>" + doc[0].tc_Inter_BOB + "</td>"
                      html += "<td>" + (doc[0].tc_Inter_BOB / doc[0].tuu_Inter_BOB).toFixed(1); + "</td>"
                      html += "</tr>"
                      html += "<tr>"
                      html += "<td><b>SpiceMax</b></td>"
                      html += "<td>" + doc[0].tuu_spice + "</td>"
                      html += "<td>" + doc[0].tc_spice + "</td>"
                      html += "<td>" + (doc[0].tc_spice / doc[0].tuu_spice).toFixed(1); + "</td>"
                      html += "</tr>"
                      html += "<tr>"
                      html += "<td><b>Guidelines</b></td>"
                      html += "<td>" + doc[0].tuu_service_Guidlines + "</td>"
                      html += "<td>" + doc[0].tc_service_Guidlines + "</td>"
                      html += "<td>" + (doc[0].tc_service_Guidlines / doc[0].tuu_service_Guidlines).toFixed(1); + "</td>"
                      html += "</tr>"
                      html += "</tbody></table>";
                      html += "<br>"
                      html += "<table>"
                      html += "<thead><tr>"
                      html += "<th colspan='4' > BuyOnBoard (Domestic)</th>"
                      html += "</tr></thead><tbody>"
                      html += "<tr>"
                      html += "<th>Item</th>"
                      html += "<th>Unique Users</th>"
                      html += "<th>Total Clicks</th>"
                      html += "<th>Avg Clicks/User</th>"
                      html += "</tr></thead><tbody>"
                      for (let indexs = 0; indexs < doc1.length; indexs++) {
                        const elements = doc1[indexs];
                        html += "<tr>"

                        html += "<td><b>" + elements.title + "</b></td>"
                        html += "<td>" + elements.users + "</td>"
                        html += "<td>" + elements.count + "</td>"
                        html += "<td>" + (elements.count / elements.users).toFixed(1) + "</td>"
                        html += "</tr>"
                      }
                      html += "</tbody></table>";
                      html += "<br>"
                      html += "<table>"
                      html += "<thead><tr>"
                      html += "<th colspan='4' > BuyOnBoard (International)</th>"
                      html += "</tr></thead><tbody>"
                      html += "<tr>"
                      html += "<th>Item</th>"
                      html += "<th>Unique Users</th>"
                      html += "<th>Total Clicks</th>"
                      html += "<th>Avg Clicks/User</th>"
                      html += "</tr></thead><tbody>"
                      for (let index = 0; index < doc2.length; index++) {
                        const element = doc2[index];
                        html += "<tr>"
                        html += "<td><b>" + element.title + "</b></td>"
                        html += "<td>" + element.users + "</td>"
                        html += "<td>" + element.count + "</td>"
                        html += "<td>" + (element.count / element.users).toFixed(1) + "</td>"
                        html += "</tr>"
                      }
                      html += "</tbody></table>";
                      html += "<br>"
                      html += "<table>"
                      html += "<thead><tr>"
                      html += "<th colspan='4' > PreBooking</th>"
                      html += "</tr></thead><tbody>"
                      html += "<tr>"
                      html += "<th>Item</th>"
                      html += "<th>Unique Users</th>"
                      html += "<th>Total Clicks</th>"
                      html += "<th>Avg Clicks/User</th>"
                      html += "</tr></thead><tbody>"
                      for (let index = 0; index < doc3.length; index++) {
                        const element = doc3[index];
                        html += "<tr>"
                        html += "<td><b>" + element.title + "</b></td>"
                        html += "<td>" + element.users + "</td>"
                        html += "<td>" + element.count + "</td>"
                        html += "<td>" + (element.count / element.users).toFixed(1) + "</td>"
                        html += "</tr>"
                      }
                      html += "</tbody></table>";
                      html += "<br>"
                      const finalArray = [];
                      let menuMap = new Map()
                      for (let index = 0; index < doc4.length; index++) {
                        const element = doc4[index];
                        if (!menuMap.has(element.folder)) {
                          let obj = {
                            "category": element.folder,
                            "title": element.title,
                            "users": element.users,
                            "clicks": element.count

                          }
                          menuMap.set(element.folder, obj)
                        }
                        if (doc4.length == index + 1) {
                          function logMapElements(value, key, map) {
                            finalArray.push(value)
                          }
                          menuMap.forEach(logMapElements);
                        }
                      }
                      html += "<table>"
                      html += "<thead><tr>"
                      html += "<th colspan='5' >Category Wise Summary</th>"
                      html += "</tr></thead><tbody>"
                      html += "<tr>"
                      html += "<th>Category</th>"
                      html += "<th>Most Clicked Item</th>"
                      html += "<th>Total Unique Users</th>"
                      html += "<th>Total Clicks</th>"
                      html += "<th>Avg Clicks/User</th>"
                      html += "</tr></thead><tbody>"
                      for (let index = 0; index < finalArray.length; index++) {
                        const element = finalArray[index];
                        html += "<tr>"
                        html += "<td><b>" + element.category + "</b></td>"
                        html += "<td>" + element.title + "</td>"
                        html += "<td>" + element.users + "</td>"
                        html += "<td>" + element.clicks + "</td>"
                        html += "<td>" + (element.clicks / element.users).toFixed(1) + "</td>"
                        html += "</tr>"
                      }
                      html += "</tbody></table>";
                      html += "<br>"
                      html += "<br><br><h5>Thanks & Regards</h5><h5>Mobi Sign Pvt Ltd.</h5></html>"
                      let subject = "Spicescreen FNB Usage Report"
                      var email = 'manoj.gupta@mojoboxx.com,monali.monalisa@mojoboxx.com,product@mojoboxx.com,ashyin.thakral@mojoboxx.com,kedargdr@gmail.com,vishal.garg@mojoboxx.com,tushar.mehta@mojoboxx.com'
                      //  var email = 'anurag.kumar@spicejet.com,puneet.angrish@spicejet.com,sapna.kumar@spicejet.com,jitendra.gautam@spicejet.com,prashant.mishra4@spicejet.com,sushant.madhab@spicejet.com,manoj.gupta@mojoboxx.com,deepak.kumar@mojoboxx.com,monali.monalisa@mojoboxx.com,product@mojoboxx.com,ashyin.thakral@mojoboxx.com,kedargdr@gmail.com,amajit.das@spicejet.com,nidhi.sinha@spicejet.com'
                      //  var email = 'kedargdr@gmail.com,vishal.garg@mojoboxx.com'
                      EM.dispatchEmail(email, subject, html, "timeSpent", function (e) {
                        console.log(e)
                      })
                    }

                  })
                }
              })
            }
          })
        }
      })
    }
  })
};

// vuscreen_getFnBmail();


exports.vuscreen_getplaydtail = function (req, cb) {
  // var vuscreen_getplaydtmail = function (req, cb) {

  var currentDate = moment(new Date()).format('YYYY-MM-DD');
  var d = new Date();
  d.setDate(d.getDate() - 1);
  var Yesterday = moment(d).format('YYYY-MM-DD').toString()
  var query = "SELECT menu, COUNT(1) count, vehicle_no,count(distinct mac) as mac FROM vuscreen_tracker  as a join vuscreen_registration as b on a.device_id=b.device_id WHERE trackingDetails = 'click' and a.sync_date='" + Yesterday + "' AND menu IN ('WATCH','F&B','STORE') GROUP BY a.menu,b.vehicle_no order by vehicle_no";
  var query1 = "SELECT event,c.vehicle_no from  vuscreen_events a join vuscreen_registration  c on a.device_id=c.device_id where event like '%stop%'and a.sync_date='" + Yesterday + "' order by a.id desc";
  var query2 = "SELECT c.vehicle_no, COUNT(DISTINCT a.view_date) AS dats FROM  vuscreen_events a JOIN vuscreen_registration c ON a.device_id=c.device_id WHERE a.event LIKE '%stop%' AND a.sync_date='" + Yesterday + "' GROUP BY c.vehicle_no ORDER BY a.id DESC";

  db.get().query(query, function (error, doc) {
    if (error) {
      console.log(error)
    } else {
      db.get().query(query1, function (err, doc1) {
        if (err) { console.log(err); }
        else {
          db.get().query(query2, function (err, doc2) {
            if (err) { console.log(err); }
            else {

              var html = "<html><head>"
              html += "<style>"
              html += "table {font-family: arial, sans-serif;border-collapse: collapse;width: 100%;}"
              html += "td, th {border: 2px solid black;text-align: center;padding: 8px;}"
              html += "tr:nth-child(even) {background-color: #dddddd;}</style></head>"
              html += "<h4>Dear Recipients,</h4>"
              html += "<h4>Please find below reports.</h4>"

              html += "<br>"

              var wifidata = []
              var temp = {}
              for (let i in doc1) {
                temp = {}
                let sp = doc1[i].event.split("|");

                if (sp.length == 3) {
                  if (sp[2] != NaN) {
                    temp.HostID = doc1[i].vehicle_no;
                    temp.conn = sp[2];
                  }

                  wifidata.push(temp);
                }

              }

              const finalArray = [];
              let menuMap = new Map()
              for (let index = 0; index < wifidata.length; index++) {
                const element = wifidata[index];
                if (!menuMap.has(element.HostID)) {

                  let obj = {
                    "host": element.HostID,
                    "WIFI_Connected": element.conn,
                    "daysc": 0
                  }
                  menuMap.set(element.HostID, obj)
                }
                else {
                  let arr = menuMap.get(element.HostID)
                  // console.log(arr);

                  arr.WIFI_Connected = parseInt(arr.WIFI_Connected) + parseInt(element.conn)
                  // finalArray.push(element);
                  // menuMap.set(arr.WIFI_Connected, arr)
                }
                if (wifidata.length == index + 1) {
                  function logMapElements(value, key, map) {
                    finalArray.push(value)
                  }
                  menuMap.forEach(logMapElements);
                }
              }



              for (let dt in doc2) {
                for (let hst in finalArray) {
                  if (doc2[dt].vehicle_no == finalArray[hst].host) {
                    finalArray[hst].daysc = doc2[dt].dats;
                    break;
                  }
                }

              }
              console.log(finalArray);

              finalArray.sort((a, b) => b.WIFI_Connected - a.WIFI_Connected)
              console.log(finalArray);
              html += "<table>"
              html += "<thead><tr>"
              html += "<th colspan='6' >User Report</th>"
              html += "</tr></thead><tbody>"
              html += "<tr>"
              html += "<th>Host NO</th>"
              html += "<th>Wi-Fi Connected</th>"
              html += "<th> Count Of Days</th>"
              html += "<th>Login</th>"
              html += "<th>Game Played</th>"
              html += "<th>FNB List</th>"
              html += "</tr></thead><tbody>"
              var total = {
                wifi: 0,
                day: 0,
                log: 0,
                game: 0,
                fnb: 0
              }
              for (let index = 0; index < finalArray.length; index++) {
                var finalData = { fnb: 0, game: 0, login: 0 };
                const element = finalArray[index];
                for (let key in doc) {


                  if (element.host == doc[key].vehicle_no && doc[key].menu == "F&B") {
                    finalData.fnb = doc[key].mac
                  }
                  else if (element.host == doc[key].vehicle_no && doc[key].menu == "STORE") {
                    finalData.game = doc[key].mac
                  }
                  else if (element.host == doc[key].vehicle_no && doc[key].menu == "WATCH") {
                    finalData.login = doc[key].mac
                  }

                }
                html += "<tr>"
                html += "<td><b>" + element.host + "</b></td>"
                html += "<td>" + element.WIFI_Connected + "</td>"
                html += "<td>" + element.daysc + "</td>"
                html += "<td>" + finalData.login + "</td>"
                html += "<td>" + finalData.game + "</td>"
                html += "<td>" + finalData.fnb + "</td>"
                html += "</tr>"
                if (element.WIFI_Connected != NaN) {
                  total.wifi = parseInt(total.wifi) + parseInt(element.WIFI_Connected);

                  total.log = parseInt(total.log) + parseInt(finalData.login);
                  total.game = parseInt(total.game) + parseInt(finalData.game);
                  total.fnb = parseInt(total.fnb) + parseInt(finalData.fnb);

                  if (total.day < element.daysc) {
                    total.day = element.daysc;
                  }

                }

              }
              html += "<tr>"
              html += "<td><b> Total </b></td>"
              html += "<td>" + total.wifi + "</td>"
              html += "<td>" + total.day + "</td>"
              html += "<td>" + total.log + "</td>"
              html += "<td>" + total.game + "</td>"
              html += "<td>" + total.fnb + "</td>"
              html += "</tr>"
              html += "</tbody></table>";
              /////////
              html += "<br>"
              html += "<br><br><h5>Thanks & Regards</h5><h5>Mobi Sign Pvt Ltd.</h5></html>"
              let subject = "Spicescreen User Report"
              var email = 'manoj.gupta@mojoboxx.com,monali.monalisa@mojoboxx.com,product@mojoboxx.com,ashyin.thakral@mojoboxx.com,kedargdr@gmail.com,vishal.garg@mojoboxx.com,tushar.mehta@mojoboxx.com'
              //  var email = 'anurag.kumar@spicejet.com,puneet.angrish@spicejet.com,sapna.kumar@spicejet.com,jitendra.gautam@spicejet.com,prashant.mishra4@spicejet.com,sushant.madhab@spicejet.com,manoj.gupta@mojoboxx.com,deepak.kumar@mojoboxx.com,monali.monalisa@mojoboxx.com,product@mojoboxx.com,ashyin.thakral@mojoboxx.com,kedargdr@gmail.com,amajit.das@spicejet.com,nidhi.sinha@spicejet.com'
              // var email = 'vishal.garg@mojoboxx.com,deepak.kumar@mojoboxx.com,kedargdr@gmail.com'
              EM.dispatchEmail(email, subject, html, "timeSpent", function (e) {
                console.log(e)
              })

            }
          })
        }
      })
    }
  })
};

// vuscreen_getplaydtmail();

exports.vuscreen_analyticsReport = function (req, cb) {
  //  var vuscreen_analyticsReport = function (req, cb) {
  console.log("vishal");
  var currentDate = moment(new Date()).format('YYYY-MM-DD');
  var d = new Date();

  d.setDate(d.getDate() - 1);
  var Yesterday = moment(d).format('YYYY-MM-DD').toString()
  var query = "SELECT "
    + " (SELECT count(distinct mac) FROM  vuscreen_tracker where sync_date='" + Yesterday + "') unique_users,"
    + "(SELECT COUNT(DISTINCT a.mac) AS uniqueUser FROM vuscreen_tracker AS a JOIN vuscreen_registration AS b ON a.device_id = b.device_id WHERE a.sync_date = '" + Yesterday + "')homePage_login"
  var query1 = "SELECT distinct b.vehicle_no, a.event, a.view_datetime, a.journey_id,unique_mac_address FROM  vuscreen_events a JOIN vuscreen_registration b ON a.device_id = b.device_id WHERE a.sync_date = '" + Yesterday + "' AND a.event != 'download' AND a.event != 'charging' ORDER BY a.id DESC ";
  var query2 = "SELECT menu, COUNT(1) count, COUNT(DISTINCT mac) AS mac FROM vuscreen_tracker AS a JOIN vuscreen_registration AS b ON a.device_id = b.device_id WHERE  a.sync_date = '" + Yesterday + "' AND menu IN ('WATCH' , 'FnB', 'STORE' ,'AD','TRAVEL') GROUP BY a.menu order by menu";
  //var option = { draw: req.query.draw, start: 0, length: 500 };
  db.get().query(query, function (error, doc) {
    if (error) {
      console.log(error)
    } else {
      db.get().query(query1, function (err, doc1) {
        if (err) { console.log(err); }
        else {
          db.get().query(query2, function (err2, doc2) {
            if (err2) { console.log(err2); }
            else {
              console.log(doc);
              console.log(doc1);
              console.log(doc2);
              var html = "<html><head>"
              html += "<style>"
              html += "table {font-family: arial, sans-serif;border-collapse: collapse;width: 100%;}"
              html += "td, th {border: 2px solid black;text-align: center;padding: 8px;}"
              html += "tr:nth-child(even) {background-color: #dddddd;}</style></head>"
              html += "<h4>Dear Recipients,</h4>"
              html += "<h4>Please find below reports.</h4>"



              var temp = 0
              var startBattery = 0;
              var startEvent = 0;
              var stopBattery = 0;
              var stopEvent = 0;
              var bat = 0;
              for (let i in doc1) {

                let sp = doc1[i].event.split("|");

                if (sp.length == 2) {
                  let bt = sp[1].split(":");
                  let bts = bt[1].split("%");
                  // console.log(bts)
                  stopBattery += parseInt(bts[0]);
                  stopEvent += 1;
                }

                else if (sp.length == 3) {
                  if (sp[2] != NaN) {

                    temp += parseInt(sp[2]);
                    let bt = sp[1].split(":");
                    let bts = bt[1].split("%");
                    // console.log(bts)
                    startBattery += parseInt(bts[0]);
                    startEvent += 1;
                  }


                }

              }
              var data = ""
              let wifiMap = new Map();
              // let a =  []
              var count = 0;
              for (let i = 0; i < doc1.length; i++) {
                data += doc1[i].unique_mac_address + ",";
                // console.log(doc[i].unique_mac_address)

                if (doc1.length == i + 1) {
                  var data1 = data.split(',');
                  console.log(data1.length);

                  for (let j = 0; j < data1.length; j++) {
                    const element = data1[j];

                    wifiMap.set(element, element)



                  }
                  // console.log(wifiMap);
                  console.log(wifiMap.size)
                  count = wifiMap.size
                }
              }
              console.log(count);



              html += "<table>"
              html += "<tbody>"

              html += "<tr>"
              html += "<td  colspan='2'><b> Actual </b></td>"
              html += "<td colspan='2'><b> Monthly</b></td>"
              html += "<td colspan='2'><b> Yearly</b></td>"
              html += "</tr>"
              html += "</tr>"

              html += "<tr>"
              html += "<td><b>Wifi Login  </b></td>"
              html += "<td>" + count + "</td>"
              let mwpage = ((parseInt(count) * 30) / 100000).toFixed("2");
              html += "<td><b>Wifi Login </b></td>"
              html += "<td>" + mwpage + ' L' + "</td>"
              let ywpage = (parseFloat(mwpage) * 12).toFixed("2");
              html += "<td><b> WifiLogin</b></td>"
              html += "<td>" + ywpage + ' L' + "</td>"
              html += "</tr>"
              html += "</tr>"



              html += "<tr>"
              html += "<td><b> Platform Login </b></td>"
              html += "<td>" + doc[0].homePage_login + "</td>"
              let mHpage = (parseInt(doc[0].homePage_login) * 30 / 100000).toFixed("2");
              html += "<td><b> Platform Login </b></td>"
              html += "<td>" + mHpage + ' L' + "</td>"
              let yhpage = (parseFloat(mHpage) * 12).toFixed('2');
              html += "<td><b> Platform Login </b></td>"
              html += "<td>" + yhpage + 'L' + "</td>"
              html += "</tr>"

              
              html += "<tr>"
              html += "<td><b>Total Watch Users</b></td>"
              html += "<td>" + doc2[2].mac + "</td>"
              let Twud = (parseInt(doc2[2].mac) * 30 / 100000).toFixed("2");
              html += "<td><b>Total Watch Users</b></td>"
              html += "<td>" + Twud + ' L' + "</td>"
              let TwuY = (parseFloat(Twud) * 12).toFixed('2');
              html += "<td><b>Total Watch Users</</b></td>"
              html += "<td>" + TwuY + ' L' + "</td>"
              html += "</tr>"


              html += "<tr>"
              html += "<td><b>Total Watch Click</b></td>"
              html += "<td>" + doc2[2].count + "</td>"
              let Twcd = (parseInt(doc2[2].count) * 30 / 100000).toFixed("2");
              html += "<td><b>Total Watch Click</b></td>"
              html += "<td>" + Twcd + ' L' + "</td>"
              let TwcY = (parseFloat(Twcd) * 12).toFixed('2');
              html += "<td><b>Total Watch Click</b></td>"
              html += "<td>" + TwcY + ' L' + "</td>"
              html += "</tr>"


              html += "<tr>"
              html += "<td><b>Total Travel Users</b></td>"
              html += "<td>" + doc2[4].mac + "</td>"
              let TwTd = (parseInt(doc2[4].mac) * 30 / 100000).toFixed("2");
              html += "<td><b>Total Travel Users</b></td>"
              html += "<td>" + TwTd + ' L' + "</td>"
              let TwTY = (parseFloat(TwTd) * 12).toFixed('2');
              html += "<td><b>Total Travel Users</</b></td>"
              html += "<td>" + TwTY + ' L' + "</td>"
              html += "</tr>"


              html += "<tr>"
              html += "<td><b>Total Travel Click</b></td>"
              html += "<td>" + doc2[4].count + "</td>"
              let TTcd = (parseInt(doc2[4].count) * 30 / 100000).toFixed("2");
              html += "<td><b>Total Travel Click</b></td>"
              html += "<td>" + TTcd + ' L' + "</td>"
              let TTcY = (parseFloat(TTcd) * 12).toFixed('2');
              html += "<td><b>Total Travel Click</b></td>"
              html += "<td>" + TTcY + ' L' + "</td>"
              html += "</tr>"


              
              html += "<tr>"
              html += "<td><b>Total Game Users</b></td>"
              html += "<td>" + doc2[1].mac + "</td>"
              let TgU = (parseInt(doc2[1].mac) * 30 / 100000).toFixed("2");
              html += "<td><b>Total Game Users</b></td>"
              html += "<td>" + TgU + ' L' + "</td>"
              let TguY = (parseFloat(TgU) * 12).toFixed('2');
              html += "<td><b>Total Game Users</b></td>"
              html += "<td>" + TguY + ' L' + "</td>"
              html += "</tr>"



              html += "<tr>"
              html += "<td><b>Total Game Click</b></td>"
              html += "<td>" + doc2[1].count + "</td>"
              let Tgc = (parseInt(doc2[1].count) * 30 / 100000).toFixed("2");
              html += "<td><b>Total Game Click</b></td>"
              html += "<td>" + Tgc + ' L' + "</td>"
              let TgcY = (parseFloat(Tgc) * 12).toFixed('2');
              html += "<td><b>Total Game Click</b></td>"
              html += "<td>" + TgcY + ' L' + "</td>"
              html += "</tr>"



              html += "<tr>"

              html += "<td><b>Total FNB  Users</b></td>"
              html += "<td>" + doc2[0].mac + "</td>"
              let TFu = (parseInt(doc2[0].mac) * 30 / 100000).toFixed("2");
              html += "<td><b>Total FNB  Users</b></td>"
              html += "<td>" + TFu + ' L' + "</td>"
              let TFuY = (parseFloat(TFu) * 12).toFixed('2');
              html += "<td><b>Total FNB  Users</b></td>"
              html += "<td>" + TFuY + ' L' + "</td>"
              html += "</tr>"

              html += "<tr>"
              html += "<td><b>Total FNB Click</b></td>"
              html += "<td>" + doc2[0].count + "</td>"
              let TFC = (parseInt(doc2[0].count) * 30 / 100000).toFixed("2");
              html += "<td><b>Total FNB Click</b></td>"
              html += "<td>" + TFC + ' L' + "</td>"
              let TFCY = (parseFloat(TFC) * 12).toFixed('2');
              html += "<td><b>Total FNB Click</b></td>"
              html += "<td>" + TFCY + ' L' + "</td>"
              html += "</tr>"



              html += "<tr>"

              html += "<td><b>Total Ad  Users</b></td>"
              html += "<td>" + doc2[3].mac + "</td>"
              let TAu = (parseInt(doc2[3].mac) * 30 / 100000).toFixed("2");
              html += "<td><b>Total Ad  Users</b></td>"
              html += "<td>" + TAu + ' L' + "</td>"
              let TAuY = (parseFloat(TAu) * 12).toFixed('2');
              html += "<td><b>Total Ad  Users</b></td>"
              html += "<td>" + TAuY + ' L' + "</td>"
              html += "</tr>"

              html += "<tr>"
              html += "<td><b>Total Ad Click</b></td>"
              html += "<td>" + doc2[3].count + "</td>"
              let TAC = (parseInt(doc2[3].count) * 30 / 100000).toFixed("2");
              html += "<td><b>Total Ad Click</b></td>"
              html += "<td>" + TAC + ' L' + "</td>"
              let TACY = (parseFloat(TAC) * 12).toFixed('2');
              html += "<td><b>Total Ad Click</b></td>"
              html += "<td>" + TACY + ' L' + "</td>"
              html += "</tr>"

            

              html += "</tbody></table>";
              html += "<br>"
   

              html += "<br><br><h5>Thanks & Regards</h5><h5>Mobi Sign Pvt Ltd.</h5></html>"
              let subject = "Spicescreen Analytics Report"
              // var email = 'manoj.gupta@mojoboxx.com,monali.monalisa@mojoboxx.com,product@mojoboxx.com,ashyin.thakral@mojoboxx.com,kedargdr@gmail.com,vishal.garg@mojoboxx.com,tushar.mehta@mojoboxx.com'
              //  var email = 'anurag.kumar@spicejet.com,puneet.angrish@spicejet.com,sapna.kumar@spicejet.com,jitendra.gautam@spicejet.com,prashant.mishra4@spicejet.com,sushant.madhab@spicejet.com,manoj.gupta@mojoboxx.com,deepak.kumar@mojoboxx.com,monali.monalisa@mojoboxx.com,product@mojoboxx.com,ashyin.thakral@mojoboxx.com,kedargdr@gmail.com,amajit.das@spicejet.com,nidhi.sinha@spicejet.com,'
              // var email = 'vishal.garg@mojoboxx.com,deepak.kumar@mojoboxx.com,monali.monalisa@mojoboxx.com,kedargdr@gmail.com,tushar.mehta@mojoboxx.com'
               var email = 'vishal.garg@mojoboxx.com,tushar.mehta@mojoboxx.com'
              EM.dispatchEmail(email, subject, html, "timeSpent", function (e) {
                console.log(e)
              })
            }

          })
        }
      })
    }
  })
};
// vuscreen_analyticsReport();



///////////////////////////////////////////////////////////////////////////
exports.wifi_login_view = function (req, res) {
  // var wifi_login_view = function (req, res) {
  // var startDate = 'null', endDate = 'null';
  // if (req.query.startDate) { startDate = moment(req.query.startDate).format('YYYY-MM-DD'); }
  // if (req.query.endDate) { endDate = moment(req.query.endDate).format('YYYY-MM-DD'); }
  var currentDate = moment(new Date()).format('YYYY-MM-DD');
  var d = new Date();

  d.setDate(d.getDate() - 1);
  var Yesterday = moment(d).format('YYYY-MM-DD').toString()
  var query = "SELECT distinct b.vehicle_no, a.event, a.view_datetime, a.journey_id,unique_mac_address FROM  vuscreen_events a JOIN vuscreen_registration b ON a.device_id = b.device_id WHERE a.view_date = '" + Yesterday + "' AND a.event != 'download' AND a.event != 'charging' ORDER BY a.id DESC";
  db.get().query(query, function (err, doc) {
    console.log(err);
    if (err) { return handleError(res, err); }
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
          console.log(data1.length);

          for (let j = 0; j < data1.length; j++) {
            const element = data1[j];

            wifiMap.set(element, element)

            if (data1.length == j + 1) {
              console.log(wifiMap.size)
              count = wifiMap.size
              function logMapElements(value, key, map) {

                a.push({ "macaddress": value })
                // console.log(`m[${key}] = ${value}`);
              }
              wifiMap.forEach(logMapElements);
            }

          }
          // console.log(wifiMap);
          // console.log(wifiMap.size)
        }
      }

      var fields = ["macaddress"];
      var csvDau = json2csv({ data: a, fields: fields });
      // console.log(csvDau);
      fs.writeFile(config.root + '/server/api/vuscreen/' + 'wifiloginview.csv', csvDau, function (err) {
        if (err) {
          throw err;
        } else {
          console.log('file saved');
        }
      });
      var html = "Total WiFi Login:" + count;
      html += " According To View Date"
      let subject = "WiFI Login Report (View Date)"
      var email = 'vishal.garg@mojoboxx.com,tushar.mehta@mojoboxx.com'
      //var email = 'anurag.kumar@spicejet.com,puneet.angrish@spicejet.com,sapna.kumar@spicejet.com,jitendra.gautam@spicejet.com,prashant.mishra4@spicejet.com,sushant.madhab@spicejet.com,manoj.gupta@mojoboxx.com,deepak.kumar@mojoboxx.com,monali.monalisa@mojoboxx.com,product@mojoboxx.com,ashyin.thakral@mojoboxx.com,kedargdr@gmail.com,amajit.das@spicejet.com,nidhi.sinha@spicejet.com,vishal.garg@mojoboxx.com,tushar.mehta@mojoboxx.com'
      //  var email = 'vishal.garg@mojoboxx.com,deepak.kumar@mojoboxx.com,tushar.mehta@mojoboxx.com'
      EM.dispatchEmail(email, subject, html, "wifiview", function (e) {
        console.log(e)
      })
      // return res.status(200).json(doc);
    }
  })
};

exports.wifi_login_sync = function (req, res) {
  // var wifi_login_sync = function (req, res) {
  // var startDate = 'null', endDate = 'null';
  // if (req.query.startDate) { startDate = moment(req.query.startDate).format('YYYY-MM-DD'); }
  // if (req.query.endDate) { endDate = moment(req.query.endDate).format('YYYY-MM-DD'); }
  var currentDate = moment(new Date()).format('YYYY-MM-DD');
  var d = new Date();
  // var Yesterday = '2021-01-31';
  // var Yesterdays='2021-01-01';


  d.setDate(d.getDate() - 1);
  var Yesterday = moment(d).format('YYYY-MM-DD').toString()
  var query = "SELECT distinct b.vehicle_no, a.event, a.view_datetime, a.journey_id,unique_mac_address FROM  vuscreen_events a JOIN vuscreen_registration b ON a.device_id = b.device_id WHERE a.sync_date= '" + Yesterday + "' AND a.event != 'download' AND a.event != 'charging' ORDER BY a.id DESC";


  db.get().query(query, function (err, doc) {
    if (err) {
      console.log(err);
      return handleError(res, err);
    }
    else {


      var data = ""
      let wifiMap = new Map();
      let a = []
      var count = 0;
      //  console.log(doc.length);
      for (let i = 0; i < doc.length; i++) {
        data += doc[i].unique_mac_address + ",";
        //  console.log(doc[i].unique_mac_address)

        if (doc.length == i + 1) {


          var data1 = data.split(',');
          // console.log(data1.length);

          for (let j = 0; j < data1.length; j++) {
            const element = data1[j];

            wifiMap.set(element, element)

            if (data1.length == j + 1) {
              // console.log(j);
              // console.log(wifiMap.size)
              // console.log( wifiMap);
              count = wifiMap.size
              function logMapElements(value, key, map) {

                a.push({ "macaddress": value })
                // console.log(`m[${key}] = ${value}`);
              }
              wifiMap.forEach(logMapElements);
            }

          }
          // console.log(wifiMap);
          console.log(wifiMap.size)
        }
      }

      var fields = ["macaddress"];
      var csvDau = json2csv({ data: a, fields: fields });
      // console.log(csvDau);
      fs.writeFile(config.root + '/server/api/vuscreen/' + 'wifiloginsync.csv', csvDau, function (err) {
        if (err) {
          throw err;
        } else {
          console.log('file saved');
        }
      });
      var html = "Total WiFi Login:" + count;
      html += " According To Sync Date"
      let subject = "WiFI Login Report (Sync Date)"
      var email = 'vishal.garg@mojoboxx.com,tushar.mehta@mojoboxx.com'
      //var email = 'anurag.kumar@spicejet.com,puneet.angrish@spicejet.com,sapna.kumar@spicejet.com,jitendra.gautam@spicejet.com,prashant.mishra4@spicejet.com,sushant.madhab@spicejet.com,manoj.gupta@mojoboxx.com,deepak.kumar@mojoboxx.com,monali.monalisa@mojoboxx.com,product@mojoboxx.com,ashyin.thakral@mojoboxx.com,kedargdr@gmail.com,amajit.das@spicejet.com,nidhi.sinha@spicejet.com,vishal.garg@mojoboxx.com,tushar.mehta@mojoboxx.com'
      //  var email = 'vishal.garg@mojoboxx.com,deepak.kumar@mojoboxx.com,tushar.mehta@mojoboxx.com'
      EM.dispatchEmail(email, subject, html, "wifisync", function (e) {
        console.log(e)
      })
      // return res.status(200).json(doc);
    }
  })
};
// wifi_login_sync();

exports.vuscreen_SmsReport = function (req, cb) {
  // var vuscreen_SmsReport = function (req, cb) { 
  console.log("vishal");
  var currentDate = moment(new Date()).format('YYYY-MM-DD');
  var d = new Date();

  d.setDate(d.getDate() - 1);
  var Yesterday = moment(d).format('YYYY-MM-DD').toString()

  var query = "select"
    + "(SELECT count(distinct mac) FROM  vuscreen_tracker where menu='SS' and sync_date='" + Yesterday + "') TotalHomepagelogin,"
    + "(SELECT count(1) FROM  vuscreen_tracker where menu='AD' and sync_date='" + Yesterday + "') TotalAdclick,"
    + "(SELECT count(1) FROM  vuscreen_tracker where menu='WATCH' and sync_date='" + Yesterday + "') Watchclick,"
    + "(SELECT count(distinct mac) FROM  vuscreen_tracker where menu='WATCH' and sync_date='" + Yesterday + "') Watchuser,"
    + "(SELECT count(distinct device_id) FROM  vuscreen_tracker where menu='WATCH' and sync_date='" + Yesterday + "') Watchdevice,"
    + "(SELECT count(1) FROM  vuscreen_tracker where menu='fnb' and sync_date='" + Yesterday + "') Fnbclick,"
    + "(SELECT count(distinct mac) FROM  vuscreen_tracker where menu='fnb' and sync_date='" + Yesterday + "') Fnbuser,"
    + "(SELECT count(distinct device_id) FROM  vuscreen_tracker where menu='fnb' and sync_date='" + Yesterday + "') Fnbdevice,"
    + "(SELECT count(1) FROM  vuscreen_tracker where type='video' and sync_date='" + Yesterday + "') Videoclick,"
    + "(SELECT count(distinct mac) FROM  vuscreen_tracker where type='video' and sync_date='" + Yesterday + "') Videouser,"
    + "(SELECT count(distinct device_id) FROM  vuscreen_tracker where type='video' and sync_date='" + Yesterday + "') Videodevice,"
    + "(SELECT count(1) FROM  vuscreen_tracker where menu='STORE' and sync_date='" + Yesterday + "') Gameclick,"
    + "(SELECT count(distinct mac) FROM  vuscreen_tracker where menu='STORE' and sync_date='" + Yesterday + "') Gameuser,"
    + "(SELECT count(distinct device_id) FROM  vuscreen_tracker where menu='STORE' and sync_date='" + Yesterday + "') Gamedevice,"
    + "(SELECT count(1) FROM  vuscreen_tracker where type='pdf' and sync_date='" + Yesterday + "') Magzineclick,"
    + "(SELECT count(distinct mac) FROM  vuscreen_tracker where type='pdf' and sync_date='" + Yesterday + "') Magzineuser,"
    + "(SELECT count(distinct device_id) FROM  vuscreen_tracker where type='pdf' and sync_date='" + Yesterday + "') Magzinedevice,"
    + "(SELECT count(1) FROM  vuscreen_tracker where type='audio' and sync_date='" + Yesterday + "') Audioclick,"
    + "(SELECT count(distinct mac) FROM  vuscreen_tracker where type='audio' and sync_date='" + Yesterday + "') Audiouser,"
    + "(SELECT count(distinct device_id) FROM  vuscreen_tracker where type='audio' and sync_date='" + Yesterday + "') Audiodevice,"
    + "(SELECT count(1) FROM  vuscreen_tracker where menu='travel' and sync_date='" + Yesterday + "') Classifiedclick,"
    + "(SELECT count(distinct mac) FROM  vuscreen_tracker where menu='travel' and sync_date='" + Yesterday + "') Classifieduser,"
    + "(SELECT count(distinct device_id) FROM  vuscreen_tracker where menu='travel' and sync_date='" + Yesterday + "') Classifieddevice,"
    + "(SELECT count(1) FROM  vuscreen_tracker where type='interstitial' and sync_date='" + Yesterday + "') Interstitialclick,"
    + "(SELECT count(distinct mac) FROM  vuscreen_tracker where type='interstitial' and sync_date='" + Yesterday + "') Interstitialuser,"
    + "(SELECT count(distinct device_id) FROM  vuscreen_tracker where type='interstitial' and sync_date='" + Yesterday + "') Interstitialdevice,"
    + "(SELECT count(distinct device_id) FROM  vuscreen_events where sync_date='" + Yesterday + "') Wifihubstarted,"
    + "(SELECT count(distinct device_id) FROM  vuscreen_tracker where sync_date='" + Yesterday + "') Wifihubused,"
    + "(SELECT count(distinct device_id) FROM  vuscreen_tracker where sync_date='" + Yesterday + "') Totalhostsync,"
    + "(SELECT count(1) FROM  vuscreen_tracker where sync_date='" + Yesterday + "') Totalclicks"
  //var option = { draw: req.query.draw, start: 0, length: 500 };
  db.get().query(query, function (error, doc) {
    if (error) {
      console.log(error)
    } else {
      console.log(doc)
      var y = new Date();
      y.setDate(y.getDate() - 2);
      var Yesterdays = moment(y).format('YYYY-MM-DD').toString()
      var query1 = "select"
        + "(SELECT count(1) FROM  vuscreen_tracker where menu='WATCH' and sync_date='" + Yesterdays + "') Watchclick,"
        + "(SELECT count(distinct mac) FROM  vuscreen_tracker where menu='WATCH' and sync_date='" + Yesterdays + "') Watchuser,"
        // + "(SELECT count(distinct device_id) FROM  vuscreen_tracker where menu='WATCH' and sync_date='" + Yesterdays + "') Watchdevice,"
        + "(SELECT count(1) FROM  vuscreen_tracker where menu='fnb' and sync_date='" + Yesterdays + "') Fnbclick,"
        + "(SELECT count(distinct mac) FROM  vuscreen_tracker where menu='fnb' and sync_date='" + Yesterdays + "') Fnbuser,"
        // + "(SELECT count(distinct device_id) FROM  vuscreen_tracker where menu='fnb' and sync_date='" + Yesterdays + "') Fnbdevice,"
        + "(SELECT count(1) FROM  vuscreen_tracker where type='video' and sync_date='" + Yesterdays + "') Videoclick,"
        + "(SELECT count(distinct mac) FROM  vuscreen_tracker where type='video' and sync_date='" + Yesterdays + "') Videouser,"
        // + "(SELECT count(distinct device_id) FROM  vuscreen_tracker where type='video' and sync_date='" + Yesterdays + "') Videodevice,"
        + "(SELECT count(1) FROM  vuscreen_tracker where menu='STORE' and sync_date='" + Yesterdays + "') Gameclick,"
        + "(SELECT count(distinct mac) FROM  vuscreen_tracker where menu='STORE' and sync_date='" + Yesterdays + "') Gameuser,"
        // + "(SELECT count(distinct device_id) FROM  vuscreen_tracker where menu='STORE' and sync_date='" + Yesterdays + "') Gamedevice,"
        + "(SELECT count(1) FROM  vuscreen_tracker where type='pdf' and sync_date='" + Yesterdays + "') Magzineclick,"
        + "(SELECT count(distinct mac) FROM  vuscreen_tracker where type='pdf' and sync_date='" + Yesterdays + "') Magzineuser,"
        // + "(SELECT count(distinct device_id) FROM  vuscreen_tracker where type='pdf' and sync_date='" + Yesterdays + "') Magzinedevice,"
        + "(SELECT count(1) FROM  vuscreen_tracker where type='audio' and sync_date='" + Yesterdays + "') Audioclick,"
        + "(SELECT count(distinct mac) FROM  vuscreen_tracker where type='audio' and sync_date='" + Yesterdays + "') Audiouser,"
        // + "(SELECT count(distinct device_id) FROM  vuscreen_tracker where type='audio' and sync_date='" + Yesterdays + "') Audiodevice,"
        + "(SELECT count(1) FROM  vuscreen_tracker where menu='travel' and sync_date='" + Yesterdays + "') Classifiedclick,"
        + "(SELECT count(distinct mac) FROM  vuscreen_tracker where menu='travel' and sync_date='" + Yesterdays + "') Classifieduser,"
        // + "(SELECT count(distinct device_id) FROM  vuscreen_tracker where menu='travel' and sync_date='" + Yesterdays + "') Classifieddevice,"
        + "(SELECT count(1) FROM  vuscreen_tracker where type='interstitial' and sync_date='" + Yesterdays + "') Interstitialclick,"
        + "(SELECT count(distinct mac) FROM  vuscreen_tracker where type='interstitial' and sync_date='" + Yesterdays + "') Interstitialuser,"
        // + "(SELECT count(distinct device_id) FROM  vuscreen_tracker where type='interstitial' and sync_date='" + Yesterdays + "') Interstitialdevice,"
        + "(SELECT count(distinct device_id) FROM  vuscreen_events where sync_date='" + Yesterdays + "') Wifihubstarted,"
        + "(SELECT count(distinct device_id) FROM  vuscreen_tracker where sync_date='" + Yesterdays + "') Wifihubused"

      //var option = { draw: req.query.draw, start: 0, length: 500 };
      db.get().query(query1, function (error, doc1) {
        if (error) {
          console.log(error)

        }
        else {
          console.log(doc1);
          var total_device = 152;
          var days = 31;
          var html = "<html><head>"
          html += "<style>"
          html += "table {font-family: arial, sans-serif;border-collapse: collapse;width: 100%;}"
          html += "td, th {border: 2px solid black;text-align: center;padding: 8px;}"
          html += "tr:nth-child(even) {background-color: #dddddd;}</style></head>"
          html += "<h4>Dear Recipients,</h4>"
          html += "<h4>Please find below reports.</h4>"
          html += "<h4><b> Actual analytics report on Sync date </b></h4>"
          var today = moment(Yesterday).format("Do MMM");
          var yday = moment(Yesterdays).format("Do MMM");
          html += "<h4><b>" + today + " / " + yday + "</b></h4>"
          html += "<h4><b> Totalwifilogin: </b></h4>"
          html += "<h4><b> Totalhostsync:" + doc[0].Totalhostsync + "</b></h4>"
          html += "<h4><b> TotalHomepagelogin:" + doc[0].TotalHomepagelogin + "</b></h4> "
          html += "<h4><b> Totalclicks:" + doc[0].Totalclicks + "<b></b></h4>"
          html += "<h4><b> TotalAdclick:" + doc[0].TotalAdclick + "</b></h4>"
          html += "<h4> Wifihubstarted(T/Y):" + doc[0].Wifihubstarted + "/" + doc1[0].Wifihubstarted + "</h4>"
          html += "<h4> Wifihubused(T/Y):" + doc[0].Wifihubused + "/" + doc1[0].Wifihubused + "</h4>"
          html += "<h4> Watchclick(T/Y):" + doc[0].Watchclick + "/" + doc1[0].Watchclick + "</h4>"
          html += "<h4> Watchuser(T/Y):" + doc[0].Watchuser + "/" + doc1[0].Watchuser + "</h4>"
          //  html += "<h4> Watchdevice:-" + doc[0].Watchdevice + "/" + doc1[0].Watchdevice + "</h4>"
          html += "<h4> Fnbclick(T/Y):" + doc[0].Fnbclick + "/" + doc1[0].Fnbclick + "</h4>"
          html += "<h4> Fnbuser(T/Y):" + doc[0].Fnbuser + "/" + doc1[0].Fnbuser + "</h4>"
          //  html += "<h4> Fnbdevice:-" + doc[0].Fnbdevice + "/" + doc1[0].Fnbdevice + "</h4>"
          html += "<h4> Videoclick(T/Y):" + doc[0].Videoclick + "/" + doc1[0].Videoclick + "</h4>"
          html += "<h4> Videouser(T/Y):" + doc[0].Videouser + "/" + doc1[0].Videouser + "</h4>"
          //  html += "<h4> Videodevice:-" + doc[0].Videodevice + "/" + doc1[0].Videodevice + "</h4>"
          html += "<h4> Gameclick(T/Y):" + doc[0].Gameclick + "/" + doc1[0].Gameclick + "</h4>"
          html += "<h4> Gameuser(T/Y):" + doc[0].Gameuser + "/" + doc1[0].Gameuser + "</h4>"
          //  html += "<h4> Gamedevice:-" + doc[0].Gamedevice + "/" + doc1[0].Gamedevice + "</h4>"
          html += "<h4> Magzineclick(T/Y):" + doc[0].Magzineclick + "/" + doc1[0].Magzineclick + "</h4>"
          html += "<h4> Magzineuser(T/Y):" + doc[0].Magzineuser + "/" + doc1[0].Magzineuser + "</h4>"
          //  html += "<h4> Magzinedevice:-" + doc[0].Magzinedevice + "/" + doc1[0].Magzinedevice + "</h4>"
          html += "<h4> Audioclick(T/Y):" + doc[0].Audioclick + "/" + doc1[0].Audioclick + "</h4>"
          html += "<h4> Audiouser(T/Y):" + doc[0].Audiouser + "/" + doc1[0].Audiouser + "</h4>"
          //  html += "<h4> Audiodevice:-" + doc[0].Audiodevice + "/" + doc1[0].Audiodevice + "</h4>"
          html += "<h4> Classifiedclick(T/Y):" + doc[0].Classifiedclick + "/" + doc1[0].Classifiedclick + "</h4>"
          html += "<h4> Classifieduser(T/Y):" + doc[0].Classifieduser + "/" + doc1[0].Classifieduser + "</h4>"
          //  html += "<h4> Classifieddevice:-" + doc[0].Classifieddevice + "/" + doc1[0].Classifieddevice + "</h4>"
          html += "<h4> Interstitialclick(T/Y):" + doc[0].Interstitialclick + "/" + doc1[0].Interstitialclick + "</h4>"
          html += "<h4> Interstitialuser(T/Y):" + doc[0].Interstitialuser + "/" + doc1[0].Interstitialuser + "</h4>"
          //  html += "<h4> Interstitialdevice:-" + doc[0].Interstitialdevice + "/" + doc1[0].Interstitialdevice + "</h4>"

          html += "<br>"
          html += "<br>"
          html += "<br>"
          html += "<br>"
          html += "<h4><b> Projected Data of Feb month with 152 devices. </b></h4>"

          html += "<h4> Wifilogin: </h4>"

          var wc = ((doc[0].Watchclick / doc[0].Watchdevice) * total_device) * days;
          var wu = ((doc[0].Watchuser / doc[0].Watchdevice) * total_device) * days;

          html += "<h4> Watchclick:" + Math.round(wc) + "</h4>"
          html += "<h4> Watchuser:" + Math.round(wu) + "</h4>"

          var fc = ((doc[0].Fnbclick / doc[0].Fnbdevice) * total_device) * days;
          var fu = ((doc[0].Fnbuser / doc[0].Fnbdevice) * total_device) * days;

          html += "<h4> Fnbclick:" + Math.round(fc) + "</h4>"
          html += "<h4> Fnbuser:" + Math.round(fu) + "</h4>"

          var vc = ((doc[0].Videoclick / doc[0].Videodevice) * total_device) * days;
          var vu = ((doc[0].Videouser / doc[0].Videodevice) * total_device) * days;

          html += "<h4> Videoclick:" + Math.round(vc) + "</h4>"
          html += "<h4> Videouser:" + Math.round(vu) + "</h4>"

          var gc = ((doc[0].Gameclick / doc[0].Gamedevice) * total_device) * days;
          var gu = ((doc[0].Gameuser / doc[0].Gamedevice) * total_device) * days;

          html += "<h4> Gameclick:" + Math.round(gc) + "</h4>"
          html += "<h4> Gameuser:" + Math.round(gu) + "</h4>"

          var mc = ((doc[0].Magzineclick / doc[0].Magzinedevice) * total_device) * days;
          var mu = ((doc[0].Magzineuser / doc[0].Magzinedevice) * total_device) * days;

          html += "<h4> Magzineclick:" + Math.round(mc) + "</h4>"
          html += "<h4> Magzineuser:" + Math.round(mu) + "</h4>"

          var ac = ((doc[0].Audioclick / doc[0].Audiodevice) * total_device) * days;
          var au = ((doc[0].Audiouser / doc[0].Audiodevice) * total_device) * days;

          html += "<h4> Audioclick:" + Math.round(ac) + "</h4>"
          html += "<h4> Audiouser:" + Math.round(au) + "</h4>"

          var cc = ((doc[0].Classifiedclick / doc[0].Classifieddevice) * total_device) * days;
          var cu = ((doc[0].Classifieduser / doc[0].Classifieddevice) * total_device) * days;

          html += "<h4> Classifiedclick:" + Math.round(cc) + "</h4>"
          html += "<h4> Classifieduser:" + Math.round(cu) + "</h4>"

          var ic = ((doc[0].Interstitialclick / doc[0].Interstitialdevice) * total_device) * days;
          var iu = ((doc[0].Interstitialuser / doc[0].Interstitialdevice) * total_device) * days;


          html += "<h4> Interstitialclick:" + Math.round(ic) + "</h4>"
          html += "<h4> Interstitialuser:" + Math.round(iu) + "</h4>"
          console.log(html);


          html += "<br><br><h5>Thanks & Regards</h5><h5>Mobi Sign Pvt Ltd.</h5></html>"
          let subject = "Spicescreen SmsReport"
          //  var email = 'manoj.gupta@mojoboxx.com,deepak.kumar'
          // var email = 'vishal.garg@mojoboxx.com,deepak.kumar'
          var email = 'vishal.garg@mojoboxx.com,tushar.mehta@mojoboxx.com'
          EM.dispatchEmail(email, subject, html, "timeSpent", function (e) {
            console.log(e)
          })

        }

      })
    }
  });
}
// vuscreen_SmsReport();



exports.test = function (req, res, next) {
  // var test = function (req, res, next) {
  async function app() {
    var currentDate = moment(new Date()).format('YYYY-MM-DD');
    var d = new Date();
    d.setDate(d.getDate() - 1);
    var Yesterday = moment(d).format('YYYY-MM-DD').toString()
    let doc = await test1(Yesterday);
    let doc1 = await test2(Yesterday, doc);
    // let doc2 = await test2(currentDate);
    // let doc3 = await insertSignup1(currentDate);
    // let doc4 = await insertSignup2(doc2,doc3);
    // let doc5 = await insertSignup3(doc,doc1);

    // let dataa=
    // {
    //     ysday:doc5.ysday,
    //     tsday:doc4.tsday
    // };
    //  return res.status(200).json(dataa);

    //   res.status("200").json(insert);

  }
  app();

};

function test1(currentDate) {
  return new Promise(function (myResolve, myReject) {
    var data1 = "('";
    var data2 = [];
    var data3 = [];
    var hubused = 0;
    var host1count = 0;
    var host2count = 0;
    let query = "SELECT  host1, host2 FROM  vuscreen_ife_data WHERE date <= '" + currentDate + "'";
    db.get().query(query, function (err, dataArrays) {
      if (err) { myResolve(err) }
      else {

        data2 = dataArrays;
        // console.log(data2);

        for (let index = 0; index < data2.length; index++) {
          var element = data2[index];
          host1count = 0;
          host2count = 0;
          // console.log(element);
          for (let i = 0; i < data3.length; i++) {
            // console.log(element.host1);
            // console.log(data3[i]);
            if (element.host1 == data3[i]) {
              // console.log("dfadh");
              // console.log(element.host1);
              // console.log(data3[i]);
              // console.log("dfahkf");
              host1count = 1;
            }
            if (element.host2 == data3[i]) {
              host2count = 1;
            }
          }

          if (host1count == 0) {

            data1 += (element.host1.toString());

            data1 += "','";
            data3.push(element.host1);
          }
          if (host2count == 0) {
            data1 += (element.host2.toString());
            if (index != data2.length - 1) {
              data1 += "','";
              data3.push(element.host2);
            }

          }
          // console.log(data3);
          if (index == data2.length - 1) {
            let abc = data1.length - 1;
            // console.log(data1[abc]);
            if (data1[abc - 1] == ",") {
              let data4 = data1.slice(0, -2) + ')';
              data1 = data4;
            }
            else
              data1 += ')';

          }
        }
        // console.log(data1);

        myResolve(data1);
      }
    })

  });

}
function test2(currentDate, host) {
  return new Promise(function (myResolve, myReject) {

    // var hostss = " ('01', '02', '3', '4', '5', '6', '8', '10', '11', '13', '14', '15', '17', '18', '20', '22', '23', '26', '29', '32', '33', '35', '36', '37', '39', '40', '41', '42', '43', '44', '45', '46', '47', '48', '49', '51', '52', '53', '54', '55', '56', '57', '58', '59', '60', '61', '62', '63', '64', '65', '66', '67', '68', '69', '70', '71', '72', '73', '74', '75', '76', '78', '79', '81', '82', '83', '84', '85', '86', '88', '89', '90', '91', '92', '93', '94', '95', '96', '97', '98', '99', '100', '101', '102', '103', '106', '107', '108', '110', '111', '112', '113', '114', '115', '116', '117', '118', '123', '124', '125', '127', '128', '130', '132', '134', '142', '146', '148', '149', '150', '151', '152', '153', '154', '155', '156', '157', '158', '159', '160', '161', '163', '164', '169', '171', '172', '173', '174', '175', '177', '180', '181', '184', '185', '186', '188', '190', '191', '192', '193', '194', '195', '196', '197', '198', '199', '200', '201', '203', '205', '206', '207', '208', '211', '212', '213', '214', '215', '216', '217', '218', '219', '220', '221', '301', '302', '303', '304', '305', '306')"
    let query = "select  distinct b.vehicle_no from vuscreen_tracker as a join vuscreen_registration as b on a.device_id=b.device_id where a.sync_date='" + currentDate + "' and b.vehicle_no not in " + host + " ";
    db.get().query(query, function (err, dataArrays) {
      console.log(err);
      if (err) { myResolve(err) }
      else {
        var hostss = ['1', '2', '3', '4', '5', '6', '8', '10', '11', '13', '14', '15', '17', '18', '20', '22', '23', '26', '29', '32', '33', '35', '36', '37', '39', '40', '41', '42', '43', '44', '45', '46', '47', '48', '49', '51', '52', '53', '54', '55', '56', '57', '58', '59', '60', '61', '62', '63', '64', '65', '66', '67', '68', '69', '70', '71', '72', '73', '74', '75', '76', '78', '79', '81', '82', '83', '84', '85', '86', '88', '89', '90', '91', '92', '93', '94', '95', '96', '97', '98', '99', '100', '201', '203', '205', '206', '207', '208', '211', '212', '213', '214', '215', '216', '217', '218', '219', '220', '221', '401', '402', '7', '12', '403', '404', '405', '406', '407', '16', '24', '28', '30', '34', '408', '409', '410', '65', '77', '80', '411', '412', '413', '414', '415', '87', '91', '97', '202', '416', '417', '418', '419', '420', '421', '447', '448', '449', '450', '451', '422', '423', '424', '425', '426', '427', '428', '209', '201', '215', '219', '452', '453', '454', '429', '430', '431', '432', '433', '434', '455', '456', '457', '458', '459', '460', '435', '436', '461', '462']

        console.log(dataArrays);
        var finaldata = []
        for (let ij in dataArrays) {
          for (host in hostss) {
            if (dataArrays[ij].vehicle_no == hostss[host]) {
              finaldata.push(dataArrays[ij]);
              break;
            }
          }
        }

        console.log(finaldata);

        var html = "<html><head>"
        html += "<style>"
        html += "table {font-family: arial, sans-serif;border-collapse: collapse;width: 100%;}"
        html += "td, th {border: 1px solid #dddddd;text-align: left;padding: 8px;}"
        html += "tr:nth-child(even) {background-color: #dddddd;}</style></head>"
        html += "<h4>Dear Recipients,</h4>"
        html += "<h4>Please find below report.</h4><table>"
        html += "<h4>Date: " + currentDate + "</h4><table>"
        html += "<thead><tr>"
        html += "<th>Host </th>"
        html += "</tr></thead><tbody>"

        for (let i = 0; i < finaldata.length; i++) {
          const element = finaldata[i];
          html += "<tr>"
          html += "<td>" + element.vehicle_no + "</td>"
          html += "</tr>"
        }

        html += "</tbody></table>";
        html += "<br><br><h5>Thanks & Regards</h5><h5>Mobi Sign Pvt Ltd.</h5></html>"
        let subject = "Spicescreen Not Placed Device Report"
        //  var email = 'manoj.gupta@mojoboxx.com,deepak.kumar@mojoboxx.com,monali.monalisa@mojoboxx.com,product@mojoboxx.com,ashyin.thakral@mojoboxx.com,kedargdr@gmail.com,vishal.garg@mojoboxx.com,tushar.mehta@mojoboxx.com'
        // var email = 'anurag.kumar@spicejet.com,puneet.angrish@spicejet.com,sapna.kumar@spicejet.com,jitendra.gautam@spicejet.com,prashant.mishra4@spicejet.com,sushant.madhab@spicejet.com,manoj.gupta@mojoboxx.com,deepak.kumar@mojoboxx.com,monali.monalisa@mojoboxx.com,product@mojoboxx.com,ashyin.thakral@mojoboxx.com,kedargdr@gmail.com,amajit.das@spicejet.com,nidhi.sinha@spicejet.com,vishal.garg@mojoboxx.com,tushar.mehta@mojoboxx.com'
        var email = 'vishal.garg@mojoboxx.com,tushar.mehta@mojoboxx.com,deepak.kumar@mojoboxx.com'
        EM.dispatchEmail(email, subject, html, "timeSpent", function (e) {
          console.log(e)
          // myResolve(hubused);
        })
      }

    });

  })
}

exports.vuscreen_basestation = function (req, cb) {
  // var vuscreen_basestation = function (req, cb) {
  // console.log("Tushar");
  let d = new Date();
  let d1 = d.setDate(d.getDate() - 1);
  let d2 = d.setDate(d.getDate() - 7);
  d1 = moment(d1).format('YYYY-MM-DD').toString();
  d2 = moment(d2).format('YYYY-MM-DD').toString();
  var firstDate = moment(new Date()).format('YYYY-MM') + '-01';
  var query = "SELECT DISTINCT base_station, COUNT(host1) * 2 AS THP ,date FROM  vuscreen_ife_data WHERE date>= '" + firstDate + "' and date<= '" + d1 + "' GROUP BY date asc, base_station"
  db.get().query(query, function (error, doc) {
    if (error) {
      console.log(error)
    } else {
      var query1 = "SELECT DISTINCT base_station FROM  vuscreen_ife_data "
      db.get().query(query1, function (error, doc1) {
        if (error) {
          console.log(error)
        } else {
          // console.log(doc);
          let dates = d1
          var finalArr = []
          var date = d1.split('-')
          date = date[2]
          console.log(date)
          for (let jk = date; jk > 0; jk--) {
            let d = new Date();
            let d1 = d.setDate(d.getDate() - jk);
            d1 = moment(d1).format('YYYY-MM-DD').toString();
            // console.log(d1);
            var fdate = []
            for (let i = 0; i < doc1.length; i++) {
              var finaldata = {}
              var count = 0;
              for (let j = 0; j < doc.length; j++) {
                if (d1 == doc[j].date && doc1[i].base_station == doc[j].base_station) {
                  // console.log("mkihjub");
                  finaldata.date = d1;

                  finaldata.THP = doc[j].THP
                  count = 1;

                }
              }
              // console.log(finaldata.length);
              if (count == 0) {

                finaldata.THP = count;

              }
              // console.log(finaldata)
              fdate.push(finaldata);
              // console.log(finaldata);
              // fdate.push(finaldata);

            }

            finalArr.push(fdate);


          }

          // console.log(finalArr);








          var html = "<html><head>"
          html += "<style>"
          html += "table {font-family: arial, sans-serif;border-collapse: collapse;width: 100%;}"
          html += "td, th {border: 2px solid black;text-align: center;padding: 8px;}"
          html += "tr:nth-child(even) {background-color: #dddddd;}</style></head>"
          html += "<h4>Dear Recipients,</h4>"
          html += "<h4>Please find below reports.</h4>"

          html += "</tbody></table>";
          html += "<br>"
          html += "<table>"
          html += "<thead>"
          html += "</thead><tbody>"
          html += "<tr>"
          html += "<th><b>Date</b></th>"
          for (let o in doc1) {
            html += "<th><b>" + doc1[o].base_station + "</b></th>"
          }
          html += "<th><b>Total</b></th>"

          html += "</tr></thead></tbody>"
          html += "<tbody>"
          for (let dtt in finalArr) {

            html += "<tr>"
            var dt = '';
            var datetotal = 0;
            for (let ind = 0; ind < finalArr[dtt].length; ind++) {

              // console.log(finalArr[dtt][ind])
              if (finalArr[dtt][ind].THP != 0) {
                // console.log(finalArr[dtt][ind].date);
                dt = finalArr[dtt][ind].date


              }


            }
            html += "<td>" + dt + "</td>"
            for (let indexs = 0; indexs < finalArr[dtt].length; indexs++) {


              datetotal += finalArr[dtt][indexs].THP;
              html += "<td>" + finalArr[dtt][indexs].THP + "</td>"

            }
            html += "<td><b>" + datetotal + "</b></td>"
            html += "</tr>"
          }
          html += "</tbody></table>";







          html += "<br><br><h5>Thanks & Regards</h5><h5>Mobi Sign Pvt Ltd.</h5></html>"
          let subject = "IFE Device Placement Report "
          //  var email = 'manoj.gupta@mojoboxx.com,deepak.kumar'
          //  var email = 'anurag.kumar@spicejet.com,puneet.angrish'
          // var email = 'vishal.garg@mojoboxx.com,deepak.kumar'
          var email = 'anurag.kumar@spicejet.com,puneet.angrish@spicejet.com,sapna.kumar@spicejet.com,jitendra.gautam@spicejet.com,prashant.mishra4@spicejet.com,sushant.madhab@spicejet.com,manoj.gupta@mojoboxx.com,deepak.kumar@mojoboxx.com,monali.monalisa@mojoboxx.com,product@mojoboxx.com,ashyin.thakral@mojoboxx.com,kedargdr@gmail.com,amajit.das@spicejet.com,nidhi.sinha@spicejet.com,vishal.garg@mojoboxx.com,tushar.mehta@mojoboxx.com,sachin.suri@spicejet.com,jagjyot.bindra@spicejet.com,sameer.sirdeshmukh@mojoboxx.com'
          //  var email = 'tushar.mehta@mojoboxx.com,vishal.garg@mojoboxx.com,deepak.kumar@mojoboxx.com'
          EM.dispatchEmail(email, subject, html, "timeSpent", function (e) {
            console.log(e)
          })

        }
      })
    }
  })
};
// vuscreen_basestation();

///////////////////////////////
//////////////   /
exports.dauEmailTempCron = function () {
  // var daussEmailCron = function () { 
  let d = new Date();
  let d1 = d.setDate(d.getDate() - 1);
  let d2 = d.setDate(d.getDate() - 7);
  // let d1 = '2021-01-31';
  d1 = moment(d1).format('YYYY-MM-DD').toString();
  d2 = moment(d2).format('YYYY-MM-DD').toString();
  // d1 = d1 + " 06:10:00";
  // d2 = d2 + " 06:10:00";
  // var firstDate = '2021-01-01';
  var firstDate = moment(new Date()).format('YYYY-MM') + '-01';
  var data1 = "(";
  var data2 = [];
  var data3 = [];
  var hubused = 0;
  var host1count = 0;
  var host2count = 0;
  // var hostss = " ('1', '2', '3', '4', '5', '6', '8', '10', '11', '13', '14', '15', '17', '18', '20', '22', '23', '26', '29', '32', '33', '35', '36', '37', '39', '40', '41', '42', '43', '44', '45', '46', '47', '48', '49', '51', '52', '53', '54', '55', '56', '57', '58', '59', '60', '61', '62', '63', '64', '65', '66', '67', '68', '69', '70', '71', '72', '73', '74', '75', '76', '78', '79', '81', '82', '83', '84', '85', '86', '88', '89', '90', '91', '92', '93', '94', '95', '96', '97', '98', '99', '100', '201', '203', '205', '206', '207', '208', '211', '212', '213', '214', '215', '216', '217', '218', '219', '220', '221', '401', '402', '7', '12', '403', '404', '405', '406', '407', '16', '24', '28', '30', '34', '408', '409', '410', '65', '77', '80', '411', '412', '413', '414', '415', '87', '91', '97', '202', '416', '417', '418', '419', '420', '421', '447', '448', '449', '450', '451', '422', '423', '424', '425', '426', '427', '428', '209', '201', '215', '219', '452', '453', '454', '429', '430', '431', '432', '433', '434', '455', '456', '457', '458', '459', '460', '435', '436', '461', '462')"
  var hostss = " ('1','2','3','4','7','8','10','12','13','15','16','17','18','23','24','28','29','30','32','34','39','40','42','47','48','53','55','56','59','60','62','66','68','70','73','74','75','76','77','80','81','82','85','86','87','88','89','95','96','97','100','201','202','205','206','207','208','209','214','216','220','401','402','403','404','405','406','407','408','409','410','411','412','413','414','415','416','417','418','419','420','421','422','423','424','425','426','427','428','429','430','431','432','433','434','435','436','437','438','439','440','441','442','443','444','445','446','447','448','449','450','451','452','453','454','455','456','457','458','459','460','461','462','463','464','465','466','467','468','469','470','471','472','473','474','475','476','477','478','479','480','481','482','483','484','485','486','487','488','489','490','491','492','493','494','495','496','497','498','499','500','501','502')"
  // console.log(d1);
  // console.log(firstDate);
  let queryy = "SELECT  host1, host2 FROM  vuscreen_ife_data WHERE date <= '" + d1 + "' AND date >= '" + firstDate + "'";
  db.get().query(queryy, function (error, dataArrays) {
    if (error) {
      console.log(error)
    } else {

      data2 = dataArrays;
      // console.log(data2);

      for (let index = 0; index < data2.length; index++) {
        var element = data2[index];
        host1count = 0;
        host2count = 0;
        // console.log(element);
        for (let i = 0; i < data3.length; i++) {
          // console.log(element.host1);
          // console.log(data3[i]);
          if (element.host1 == data3[i]) {
            // console.log("dfadh");
            // console.log(element.host1);
            // console.log(data3[i]);
            // console.log("dfahkf");
            host1count = 1;
          }
          if (element.host2 == data3[i]) {
            host2count = 1;
          }
        }

        if (host1count == 0) {

          data1 += (element.host1.toString());

          data1 += ',';
          data3.push(element.host1);
        }
        if (host2count == 0) {
          data1 += (element.host2.toString());
          if (index != data2.length - 1) {
            data1 += ',';
            data3.push(element.host2);
          }

        }
        // console.log(data3);
        if (index == data2.length - 1) {
          let abc = data1.length - 1;
          // console.log(data1[abc]);
          if (data1[abc] == ',') {
            let data4 = data1.slice(0, -1) + ')';
            data1 = data4;
          }
          else
            data1 += ')';

        }
      }
      // console.log(data1);
      let val = data1.split(',');
      hubused = val.length;
      var hubpro = 163;
      let querys = "SELECT  count(distinct host1) as host1, count(distinct host2)as host2,date FROM  vuscreen_ife_data WHERE date <= '" + d1 + "' AND date >= '" + firstDate + "' group by date";
      db.get().query(querys, function (error, dataArr) {
        if (error) {
          console.log(error)
        } else {
          // console.log(dataArr);
          let query = "SELECT vr.vehicle_no as HostID, vst.view_date, COUNT(DISTINCT vst.mac) COUNT"
            + " FROM vuscreen_tracker vst"
            + " LEFT JOIN vuscreen_registration vr ON vst.reg_id = vr.reg_id"
            + " WHERE vst.view_date >= '" + firstDate + "' AND vst.view_date <= '" + d1 + "'"
            + " AND vr.vehicle_no In " + hostss + " "
            // + " AND vr.vehicle_no NOT REGEXP '[A-Z ]'"
            + " GROUP BY vr.vehicle_no, vst.view_date"
            + " ORDER BY vst.view_date, vr.vehicle_no";
          db.get().query(query, function (error, dataArray) {
            if (error) {
              console.log(error)
            } else {
              // console.log(query)
              // console.log(dataArray);
              let query1 = "SELECT vr.vehicle_no as HostID, vst.view_date, COUNT(1) COUNT"
                + " FROM vuscreen_tracker vst"
                + " LEFT JOIN vuscreen_registration vr ON vst.reg_id = vr.reg_id"
                + " WHERE vst.view_date >= '" + firstDate + "' AND vst.view_date <= '" + d1 + "'"

                + " AND vr.vehicle_no In " + hostss + " "
                + " GROUP BY vr.vehicle_no, vst.view_date"
                + " ORDER BY vst.view_date, vr.vehicle_no"
              db.get().query(query1, function (err, doc) {
                if (err) { console.log(err); }
                else {

                  // console.log(doc);
                  let query2 = "SELECT vst.view_date, COUNT(1) Views, COUNT(DISTINCT vst.mac) Sessions, ROUND(COUNT(DISTINCT vst.device_id)/ '" + hubpro + "' * 100) AS 'percentage',"
                    + " COUNT(DISTINCT vst.device_id) Hubs"
                    + " FROM vuscreen_tracker vst"
                    + " LEFT JOIN vuscreen_registration vr ON vst.reg_id = "
                    + " vr.reg_id"
                    + " WHERE  vst.view_date >= '" + firstDate + "' AND vst.view_date <= '" + d1 + "'"
                    + " AND vr.vehicle_no In " + hostss + " "
                    + " AND vst.menu ='SS' "
                    // + " AND vr.vehicle_no NOT REGEXP '[A-Z ]'"
                    + " GROUP BY vst.view_date"
                  db.get().query(query2, function (err2, doc2) {
                    if (err2) { console.log(err2); }
                    else {
                      let query4 = "SELECT vr.vehicle_no as HostID, vst.view_date, COUNT(1) COUNT"
                        + " FROM vuscreen_tracker vst"
                        + " LEFT JOIN vuscreen_registration vr ON vst.reg_id = vr.reg_id"
                        + " WHERE vst.view_date >= '" + firstDate + "' AND vst.view_date <= '" + d1 + "'"
                        + " AND vr.vehicle_no In " + hostss + " "
                        + " GROUP BY vr.vehicle_no, vst.view_date"
                        + " ORDER BY vst.view_date, vr.vehicle_no"
                      db.get().query(query4, function (err4, doc4) {
                        if (err4) { console.log(err4); }
                        let query8 = "SELECT count( distinct b.vehicle_no) as count,view_date"
                          + " from vuscreen_events  as a"
                          + " join vuscreen_registration as b on a.device_id=b.device_id"
                          + " WHERE a.view_date >= '" + firstDate + "' AND a.view_date <= '" + d1 + "'"
                          + " AND b.vehicle_no In " + hostss + " "
                          + " AND a.event='App Icon Click'"
                          + " GROUP BY  a.view_date"
                          + " ORDER BY a.view_date asc"
                        db.get().query(query8, function (err4, doc8) {
                          console.log(doc8);
                          if (err4) { console.log(err4); }
                          else {
                            let query3 = "SELECT DATE_FORMAT(vst.view_date, '%Y-%m') YEAR , DATE_FORMAT(vst.view_date, '%M-%y') Month,"
                              + " COUNT(1) Views, COUNT(DISTINCT vst.mac) Sessions, ROUND(COUNT(DISTINCT vst.device_id)/'" + hubpro + "' * 100) AS percentage,"
                              + " COUNT(DISTINCT vst.device_id) Hubs"
                              + " FROM vuscreen_tracker vst"
                              + " LEFT JOIN vuscreen_registration vr ON vst.reg_id = "
                              + "  vr.reg_id"
                              + " WHERE "
                              + " vr.vehicle_no In " + hostss + " "
                              // + " vr.vehicle_no NOT REGEXP '[A-Z ]'"
                              + " GROUP BY MONTH ORDER BY YEAR DESC LIMIT 2"
                            db.get().query(query3, function (err3, doc3) {
                              if (err3) { console.log(err3); }
                              else {
                                let query5 = "SELECT vst.view_date, COUNT(DISTINCT vst.device_id) wifi_started, ROUND(COUNT(DISTINCT vst.device_id)/'" + hubpro + "' * 100) AS 'percentage'"
                                  + " FROM vuscreen_events vst"
                                  + " LEFT JOIN vuscreen_registration vr ON vst.reg_id = "
                                  + " vr.reg_id"
                                  + " WHERE vst.view_date >= '" + firstDate + "' AND vst.view_date <= '" + d1 + "'"
                                  + " AND vr.vehicle_no In " + hostss + " "
                                  + " GROUP BY vst.view_date"
                                db.get().query(query5, function (err5, doc5) {
                                  if (err5) { console.log(err5); }
                                  else {
                                    let userMap = new Map();
                                    let usageMap = new Map();
                                    let gameMap = new Map();

                                    function formatDate(date) {
                                      let dd = date.getDate();
                                      let mm = date.getMonth() + 1;
                                      let yyyy = date.getFullYear();
                                      if (dd < 10) { dd = '0' + dd }
                                      if (mm < 10) { mm = '0' + mm }
                                      date = yyyy + '-' + mm + '-' + dd;
                                      return date
                                    }
                                    let Last7Days = [];
                                    let obj = {}
                                    let usageobj = {}
                                    let gameobj = {}
                                    // console.log(d1);
                                    let dt = d1.split('-');
                                    // console.log(dt);
                                    let lt = dt[2].split(' ');
                                    // console.log(lt);
                                    lt = parseInt(lt[0]);
                                    // console.log(lt);
                                    for (let i = 0; i < lt; i++) {
                                      let d = new Date();
                                      d.setDate(d.getDate() - i - 1);
                                      Last7Days.push(formatDate(d))
                                      let da = formatDate(d)
                                      obj[da] = 0;
                                      obj["Total"] = 0;
                                      usageobj[da] = 0;
                                      usageobj["Total"] = 0;
                                      gameobj[da] = 0;
                                      gameobj["Total"] = 0;


                                    }

                                    Last7Days.reverse().join(',');
                                    let finalArr = []
                                    let usageArr = []
                                    let gameArr = []

                                    for (let i = 0; i < dataArray.length; i++) {
                                      const element = dataArray[i];
                                      if (!userMap.has(element.HostID)) {
                                        let arr = []
                                        arr.push(element)
                                        let kg = Object.assign({ HostID: element.HostID }, obj)
                                        finalArr.push(kg)
                                        userMap.set(element.HostID, arr)
                                        // if (i == 0) {
                                        //     let kg = Object.assign({ vehicle_no: "total" }, obj)
                                        //     finalArr.push(kg)
                                        // }

                                      } else {
                                        let arr = userMap.get(element.HostID)
                                        arr.push(element)
                                        userMap.set(element.HostID, arr)
                                      }
                                      if (dataArray.length == i + 1) {
                                        userMap.forEach((value, key, map, index) => {
                                          for (let d = 0; d < finalArr.length; d++) {
                                            const data = finalArr[d];
                                            let count = 0;
                                            for (let val = 0; val < value.length; val++) {
                                              const obj = value[val];
                                              if (obj["HostID"] == data.HostID) {
                                                count = count + parseInt(obj.COUNT)
                                                data[obj.view_date] = obj.COUNT
                                                data["Total"] = count;
                                              }
                                            }
                                          }
                                        });
                                      }
                                    }

                                    for (let i = 0; i < doc.length; i++) {
                                      const element = doc[i];
                                      if (!usageMap.has(element.HostID)) {
                                        let arr = []
                                        arr.push(element)
                                        let kg = Object.assign({ HostID: element.HostID }, usageobj)
                                        usageArr.push(kg)
                                        usageMap.set(element.HostID, arr)
                                        // if (i == 0) {
                                        //     let kg = Object.assign({ vehicle_no: "total" }, obj)
                                        //     finalArr.push(kg)
                                        // }

                                      } else {
                                        let arr = usageMap.get(element.HostID)
                                        arr.push(element)
                                        usageMap.set(element.HostID, arr)
                                      }
                                      if (doc.length == i + 1) {
                                        usageMap.forEach((value, key, map, index) => {
                                          for (let d = 0; d < usageArr.length; d++) {
                                            const data = usageArr[d];
                                            let count = 0;
                                            for (let val = 0; val < value.length; val++) {
                                              const obj = value[val];
                                              if (obj["HostID"] == data.HostID) {
                                                count = count + parseInt(obj.COUNT)
                                                data[obj.view_date] = obj.COUNT
                                                data["Total"] = count;
                                              }
                                            }
                                          }
                                        });
                                      }
                                    }


                                    var field = ["HostID"]
                                    // console.log(Last7Days);
                                    for (let m = 0; m < Last7Days.length; m++) {
                                      let dts = Last7Days[m];
                                      // console.log(dts);
                                      field[m + 1] = dts;
                                      if (m + 1 == Last7Days.length) {
                                        field[m + 2] = "Total";
                                      }
                                      // field+=','
                                    }
                                    // console.log(field);

                                    finalArr.sort((a, b) => b.Total - a.Total)
                                    usageArr.sort((a, b) => b.Total - a.Total)

                                    var csvDau = json2csv({ data: finalArr, fields: field });
                                    var csvPlay = json2csv({ data: usageArr, fields: field });
                                    var array = []
                                    array.push({ key: 'HostWiseUser', value: csvDau }, { key: 'HostWiseClicks', value: csvPlay })
                                    for (var i = 0; i < array.length; i++) {
                                      fs.writeFile(config.root + '/server/api/vuscreen/' + array[i].key + '.csv', array[i].value, function (err) {
                                        if (err) {
                                          throw err;
                                        } else {
                                          console.log('file saved');
                                        }
                                      });
                                    }
                                    var html = "<html><head>"
                                    html += "<style>"
                                    html += "table {font-family: arial, sans-serif;border-collapse: collapse;width: 100%;}"
                                    html += "td, th {border: 1px solid #dddddd;text-align: left;padding: 8px;}"
                                    html += "tr:nth-child(even) {background-color: #dddddd;}</style></head>"
                                    html += "<h4>Dear Recipients,</h4>"
                                    html += "<h4>Please find below report.</h4><table>"
                                    html += "<thead><tr>"
                                    html += "<th>Date</th>"

                                    html += "<th>Wi-Fi Hub Provided (A)</th>"
                                    html += "<th>Wi-Fi Hub Placed BY EFB Team (B)</th>"
                                    // html += "<th>Wi-Fi Hub Started (C)</th>"
                                    html += "<th>Wi-Fi Hub Sync</th>"
                                    // html += "<th>Wi-Fi Hub Used</th>"
                                    html += " <th>Users</th>"
                                    html += "<th>Clicks</th>"
                                    html += "<th>% of Sync Vs Provided (C/A)</th>"
                                    html += "<th>% of Placed VS Provided(B/A)</th>"
                                    html += "</tr></thead><tbody>"
                                    let monthTotal = 0;
                                    let monthClicks = 0;
                                    let monthAvg = 0;
                                    let hub_array = JSON.parse(JSON.stringify(doc2))
                                    let synced_array = JSON.parse(JSON.stringify(doc5))
                                    for (let i = 0; i < hub_array.length; i++) {
                                      const element = hub_array[i];
                                      synced_array.map(item => {
                                        if (element.view_date == item.view_date) {
                                          // element.percentage = item.percentage;
                                          element.wifi_started = item.wifi_started;
                                        }

                                      });
                                      for (let jk = 0; jk < dataArr.length; jk++) {
                                        if (element.view_date == dataArr[jk].date) {
                                          console.log(dataArr[jk].host1);
                                          element.wifiplaced = parseInt(dataArr[jk].host1 + parseInt(dataArr[jk].host2));
                                          element.sync = Math.round((parseInt(dataArr[jk].host1 + parseInt(dataArr[jk].host2)) / hubpro * 100));
                                        }

                                      }
                                      for (let jkl = 0; jkl < doc8.length; jkl++) {
                                        if (element.view_date == doc8[jkl].view_date) {
                                          element.wifisync = doc8[jkl].count;
                                          element.percentage = Math.round(doc8[jkl].count / hubpro * 100)
                                          // element.sync = Math.round( parseInt(doc8[jkl].count) / hubpro * 100);
                                        }
                                      }

                                    }
                                    console.log(hub_array);
                                    var syncavg = 0;
                                    var proavg = 0;
                                    var month = '';
                                    for (let i = 0; i < hub_array.length; i++) {
                                      const element = hub_array[i];
                                      monthTotal += element.Views;
                                      monthClicks += element.Sessions
                                      monthAvg += element.Hubs;
                                      syncavg += element.percentage;
                                      proavg += element.sync;
                                      month = element.view_date;

                                      html += "<tr>"
                                      html += "<td>" + element.view_date + "</td>"
                                      html += "<td>" + hubpro + "</td>"
                                      html += "<td>" + element.wifiplaced + "</td>"
                                      // html += "<td>" + element.wifi_started + "</td>"
                                      html += "<td>" + element.wifisync + "</td>"
                                      // html += "<td>" + element.Hubs + "</td>"
                                      html += "<td>" + element.Sessions + "</td>"
                                      html += "<td>" + element.Views + "</td>"
                                      html += "<td>" + element.percentage + "%</td>"
                                      html += "<td>" + element.sync + "%</td>"
                                      html += "</tr>"
                                    }
                                    // console.log(month);
                                    month = month.slice(0, 7);
                                    // console.log(sm);
                                    monthAvg = Math.round(monthAvg / doc2.length)
                                    var counts = hub_array.length;
                                    syncavg = Math.round(syncavg / counts);
                                    proavg = Math.round(proavg / counts);
                                    for (let i = 0; i < doc3.length; i++) {
                                      const element = doc3[i];
                                      console.log(month);
                                      console.log(element.YEAR)
                                      if (month == element.YEAR) {
                                        html += "<tr>"
                                        html += "<td><b>" + element.Month + "</b></td>"
                                        html += "<td><b>" + hubpro + "</b></td>"
                                        // html += "<td><b>"+hubused+"</b></td>"
                                        html += "<td></td>"

                                        html += "<td><b>" + element.Hubs + "</b></td>"
                                        // if (i == 0) {
                                        // } else {
                                        //   html += "<td><b>" + element.Views + "</b></td>"
                                        // }
                                        html += "<td><b>" + monthClicks + "</b></td>"
                                        html += "<td><b>" + monthTotal + "</b></td>"
                                        html += "<td><b>" + syncavg + "%</b></td>"
                                        html += "<td><b>" + proavg + "%</b></td>"


                                        html += "</tr>"
                                      }
                                    }
                                    html += "</tbody></table>";
                                    html += "<br><br><h5>Thanks & Regards</h5><h5>Mobi Sign Pvt Ltd.</h5></html>"
                                    let subject = "Spicescreen Usage Report"
                                    //  var email = 'manoj.gupta@mojoboxx.com,deepak.kumar@mojoboxx.com,monali.monalisa@mojoboxx.com,product@mojoboxx.com,ashyin.thakral@mojoboxx.com,kedargdr@gmail.com,vishal.garg@mojoboxx.com,tushar.mehta@mojoboxx.com'
                                    var email = 'anurag.kumar@spicejet.com,puneet.angrish@spicejet.com,sapna.kumar@spicejet.com,jitendra.gautam@spicejet.com,prashant.mishra4@spicejet.com,sushant.madhab@spicejet.com,manoj.gupta@mojoboxx.com,deepak.kumar@mojoboxx.com,monali.monalisa@mojoboxx.com,product@mojoboxx.com,ashyin.thakral@mojoboxx.com,kedargdr@gmail.com,amajit.das@spicejet.com,nidhi.sinha@spicejet.com,vishal.garg@mojoboxx.com,tushar.mehta@mojoboxx.com,sachin.suri@spicejet.com,jagjyot.bindra@spicejet.com,sameer.sirdeshmukh@mojoboxx.com'
                                    // var email = 'vishal.garg@mojoboxx.com,tushar.mehta@mojoboxx.com,deepak.kumar@mojoboxx.com'
                                    EM.dispatchEmail(email, subject, html, "count", function (e) {
                                      console.log(e)
                                    })
                                  }
                                })
                              }
                            })
                          }
                        })
                      })
                    }
                  })
                }
              })
            }
          })
        }

      })

    }
  })
}
//  daussEmailCron(); 


// vuscreen_basestation();

///////////////////////////////
//////////////   /
exports.dauEmailTempCron = function () {
  // var daussEmailCron = function () { 
  let d = new Date();
  let d1 = d.setDate(d.getDate() - 1);
  let d2 = d.setDate(d.getDate() - 7);
  // let d1 = '2021-01-31';
  d1 = moment(d1).format('YYYY-MM-DD').toString();
  d2 = moment(d2).format('YYYY-MM-DD').toString();
  // d1 = d1 + " 06:10:00";
  // d2 = d2 + " 06:10:00";
  // var firstDate = '2021-01-01';
  var firstDate = moment(new Date()).format('YYYY-MM') + '-01';
  var data1 = "(";
  var data2 = [];
  var data3 = [];
  var hubused = 0;
  var host1count = 0;
  var host2count = 0;
  // var hostss = " ('1', '2', '3', '4', '5', '6', '8', '10', '11', '13', '14', '15', '17', '18', '20', '22', '23', '26', '29', '32', '33', '35', '36', '37', '39', '40', '41', '42', '43', '44', '45', '46', '47', '48', '49', '51', '52', '53', '54', '55', '56', '57', '58', '59', '60', '61', '62', '63', '64', '65', '66', '67', '68', '69', '70', '71', '72', '73', '74', '75', '76', '78', '79', '81', '82', '83', '84', '85', '86', '88', '89', '90', '91', '92', '93', '94', '95', '96', '97', '98', '99', '100', '201', '203', '205', '206', '207', '208', '211', '212', '213', '214', '215', '216', '217', '218', '219', '220', '221', '401', '402', '7', '12', '403', '404', '405', '406', '407', '16', '24', '28', '30', '34', '408', '409', '410', '65', '77', '80', '411', '412', '413', '414', '415', '87', '91', '97', '202', '416', '417', '418', '419', '420', '421', '447', '448', '449', '450', '451', '422', '423', '424', '425', '426', '427', '428', '209', '201', '215', '219', '452', '453', '454', '429', '430', '431', '432', '433', '434', '455', '456', '457', '458', '459', '460', '435', '436', '461', '462')"
  // var hostss = " ('1','2','3','4','7','8','10','12','13','15','16','17','18','23','24','28','29','30','32','34','39','40','42','47','48','53','55','56','59','60','62','66','68','70','73','74','75','76','77','80','81','82','85','86','87','88','89','95','96','97','100','201','202','205','206','207','208','209','214','216','220','401','402','403','404','405','406','407','408','409','410','411','412','413','414','415','416','417','418','419','420','421','422','423','424','425','426','427','428','429','430','431','432','433','434','435','436','437','438','439','440','441','442','443','444','445','446','447','448','449','450','451','452','453','454','455','456','457','458','459','460','461','462','463','464','465','466','467','468','469','470','471','472','473','474','475','476','477','478','479','480','481','482','483','484','485','486','487','488','489','490','491','492','493','494','495','496','497','498','499','500','501','502')"
  // console.log(d1);
  // console.log(firstDate);
  let queryy = "SELECT count(1) , count(distinct mac),sync_date FROM  vuscreen_tracker WHERE date <= '" + d1 + "' AND date >= '" + firstDate + "' group by sync_date order by sync_date";
  db.get().query(queryy, function (error, dataArrays) {
    if (error) {
      console.log(error)
    } else {

      let querys = "SELECT  count(distinct host1) as host1, count(distinct host2)as host2,date FROM  vuscreen_ife_data WHERE date <= '" + d1 + "' AND date >= '" + firstDate + "' group by date";
      db.get().query(querys, function (error, dataArr) {
        if (error) {
          console.log(error)
        } else {
          // console.log(dataArr);
          let query = "SELECT count(1) ,sync_date FROM  vuscreen_tracker"
            + " WHERE vst.sync_date >= '" + firstDate + "' AND vst.sync_date <= '" + d1 + "'"
            + " AND menu='AD' "
            + " GROUP BY sync_date"
            + " ORDER BY sync_date";
          db.get().query(query, function (error, dataArray) {
            if (error) {
              console.log(error)
            } else {
              // console.log(query)
              // console.log(dataArray);
              let query1 = "SELECT count(1) ,sync_date FROM  vuscreen_tracker"
              + " WHERE vst.sync_date >= '" + firstDate + "' AND vst.sync_date <= '" + d1 + "'"
              + " AND menu='PDFDOWNLOAD' "
              + " GROUP BY sync_date"
              + " ORDER BY sync_date";
              db.get().query(query1, function (err, doc) {
                if (err) { console.log(err); }
                else {

                  // console.log(doc);
                  let query2 = "SELECT vst.view_date, COUNT(1) Views, COUNT(DISTINCT vst.mac) Sessions, ROUND(COUNT(DISTINCT vst.device_id)/ '" + hubpro + "' * 100) AS 'percentage',"
                    + " COUNT(DISTINCT vst.device_id) Hubs"
                    + " FROM vuscreen_tracker vst"
                    + " LEFT JOIN vuscreen_registration vr ON vst.reg_id = "
                    + " vr.reg_id"
                    + " WHERE  vst.view_date >= '" + firstDate + "' AND vst.view_date <= '" + d1 + "'"
                    + " AND vr.vehicle_no In " + hostss + " "
                    + " AND vst.menu ='SS' "
                    // + " AND vr.vehicle_no NOT REGEXP '[A-Z ]'"
                    + " GROUP BY vst.view_date"
                  db.get().query(query2, function (err2, doc2) {
                    if (err2) { console.log(err2); }
                    else {
                      let query4 = "SELECT vr.vehicle_no as HostID, vst.view_date, COUNT(1) COUNT"
                        + " FROM vuscreen_tracker vst"
                        + " LEFT JOIN vuscreen_registration vr ON vst.reg_id = vr.reg_id"
                        + " WHERE vst.view_date >= '" + firstDate + "' AND vst.view_date <= '" + d1 + "'"
                        + " AND vr.vehicle_no In " + hostss + " "
                        + " GROUP BY vr.vehicle_no, vst.view_date"
                        + " ORDER BY vst.view_date, vr.vehicle_no"
                      db.get().query(query4, function (err4, doc4) {
                        if (err4) { console.log(err4); }
                        let query8 = "SELECT count( distinct b.vehicle_no) as count,view_date"
                          + " from vuscreen_events  as a"
                          + " join vuscreen_registration as b on a.device_id=b.device_id"
                          + " WHERE a.view_date >= '" + firstDate + "' AND a.view_date <= '" + d1 + "'"
                          + " AND b.vehicle_no In " + hostss + " "
                          + " AND a.event='App Icon Click'"
                          + " GROUP BY  a.view_date"
                          + " ORDER BY a.view_date asc"
                        db.get().query(query8, function (err4, doc8) {
                          console.log(doc8);
                          if (err4) { console.log(err4); }
                          else {
                            let query3 = "SELECT DATE_FORMAT(vst.view_date, '%Y-%m') YEAR , DATE_FORMAT(vst.view_date, '%M-%y') Month,"
                              + " COUNT(1) Views, COUNT(DISTINCT vst.mac) Sessions, ROUND(COUNT(DISTINCT vst.device_id)/'" + hubpro + "' * 100) AS percentage,"
                              + " COUNT(DISTINCT vst.device_id) Hubs"
                              + " FROM vuscreen_tracker vst"
                              + " LEFT JOIN vuscreen_registration vr ON vst.reg_id = "
                              + "  vr.reg_id"
                              + " WHERE "
                              + " vr.vehicle_no In " + hostss + " "
                              // + " vr.vehicle_no NOT REGEXP '[A-Z ]'"
                              + " GROUP BY MONTH ORDER BY YEAR DESC LIMIT 2"
                            db.get().query(query3, function (err3, doc3) {
                              if (err3) { console.log(err3); }
                              else {
                                let query5 = "SELECT vst.view_date, COUNT(DISTINCT vst.device_id) wifi_started, ROUND(COUNT(DISTINCT vst.device_id)/'" + hubpro + "' * 100) AS 'percentage'"
                                  + " FROM vuscreen_events vst"
                                  + " LEFT JOIN vuscreen_registration vr ON vst.reg_id = "
                                  + " vr.reg_id"
                                  + " WHERE vst.view_date >= '" + firstDate + "' AND vst.view_date <= '" + d1 + "'"
                                  + " AND vr.vehicle_no In " + hostss + " "
                                  + " GROUP BY vst.view_date"
                                db.get().query(query5, function (err5, doc5) {
                                  if (err5) { console.log(err5); }
                                  else {
                                    let userMap = new Map();
                                    let usageMap = new Map();
                                    let gameMap = new Map();

                                    function formatDate(date) {
                                      let dd = date.getDate();
                                      let mm = date.getMonth() + 1;
                                      let yyyy = date.getFullYear();
                                      if (dd < 10) { dd = '0' + dd }
                                      if (mm < 10) { mm = '0' + mm }
                                      date = yyyy + '-' + mm + '-' + dd;
                                      return date
                                    }
                                    let Last7Days = [];
                                    let obj = {}
                                    let usageobj = {}
                                    let gameobj = {}
                                    // console.log(d1);
                                    let dt = d1.split('-');
                                    // console.log(dt);
                                    let lt = dt[2].split(' ');
                                    // console.log(lt);
                                    lt = parseInt(lt[0]);
                                    // console.log(lt);
                                    for (let i = 0; i < lt; i++) {
                                      let d = new Date();
                                      d.setDate(d.getDate() - i - 1);
                                      Last7Days.push(formatDate(d))
                                      let da = formatDate(d)
                                      obj[da] = 0;
                                      obj["Total"] = 0;
                                      usageobj[da] = 0;
                                      usageobj["Total"] = 0;
                                      gameobj[da] = 0;
                                      gameobj["Total"] = 0;


                                    }

                                    Last7Days.reverse().join(',');
                                    let finalArr = []
                                    let usageArr = []
                                    let gameArr = []

                                    for (let i = 0; i < dataArray.length; i++) {
                                      const element = dataArray[i];
                                      if (!userMap.has(element.HostID)) {
                                        let arr = []
                                        arr.push(element)
                                        let kg = Object.assign({ HostID: element.HostID }, obj)
                                        finalArr.push(kg)
                                        userMap.set(element.HostID, arr)
                                        // if (i == 0) {
                                        //     let kg = Object.assign({ vehicle_no: "total" }, obj)
                                        //     finalArr.push(kg)
                                        // }

                                      } else {
                                        let arr = userMap.get(element.HostID)
                                        arr.push(element)
                                        userMap.set(element.HostID, arr)
                                      }
                                      if (dataArray.length == i + 1) {
                                        userMap.forEach((value, key, map, index) => {
                                          for (let d = 0; d < finalArr.length; d++) {
                                            const data = finalArr[d];
                                            let count = 0;
                                            for (let val = 0; val < value.length; val++) {
                                              const obj = value[val];
                                              if (obj["HostID"] == data.HostID) {
                                                count = count + parseInt(obj.COUNT)
                                                data[obj.view_date] = obj.COUNT
                                                data["Total"] = count;
                                              }
                                            }
                                          }
                                        });
                                      }
                                    }

                                    for (let i = 0; i < doc.length; i++) {
                                      const element = doc[i];
                                      if (!usageMap.has(element.HostID)) {
                                        let arr = []
                                        arr.push(element)
                                        let kg = Object.assign({ HostID: element.HostID }, usageobj)
                                        usageArr.push(kg)
                                        usageMap.set(element.HostID, arr)
                                        // if (i == 0) {
                                        //     let kg = Object.assign({ vehicle_no: "total" }, obj)
                                        //     finalArr.push(kg)
                                        // }

                                      } else {
                                        let arr = usageMap.get(element.HostID)
                                        arr.push(element)
                                        usageMap.set(element.HostID, arr)
                                      }
                                      if (doc.length == i + 1) {
                                        usageMap.forEach((value, key, map, index) => {
                                          for (let d = 0; d < usageArr.length; d++) {
                                            const data = usageArr[d];
                                            let count = 0;
                                            for (let val = 0; val < value.length; val++) {
                                              const obj = value[val];
                                              if (obj["HostID"] == data.HostID) {
                                                count = count + parseInt(obj.COUNT)
                                                data[obj.view_date] = obj.COUNT
                                                data["Total"] = count;
                                              }
                                            }
                                          }
                                        });
                                      }
                                    }


                                    var field = ["HostID"]
                                    // console.log(Last7Days);
                                    for (let m = 0; m < Last7Days.length; m++) {
                                      let dts = Last7Days[m];
                                      // console.log(dts);
                                      field[m + 1] = dts;
                                      if (m + 1 == Last7Days.length) {
                                        field[m + 2] = "Total";
                                      }
                                      // field+=','
                                    }
                                    // console.log(field);

                                    finalArr.sort((a, b) => b.Total - a.Total)
                                    usageArr.sort((a, b) => b.Total - a.Total)

                                    var csvDau = json2csv({ data: finalArr, fields: field });
                                    var csvPlay = json2csv({ data: usageArr, fields: field });
                                    var array = []
                                    array.push({ key: 'HostWiseUser', value: csvDau }, { key: 'HostWiseClicks', value: csvPlay })
                                    for (var i = 0; i < array.length; i++) {
                                      fs.writeFile(config.root + '/server/api/vuscreen/' + array[i].key + '.csv', array[i].value, function (err) {
                                        if (err) {
                                          throw err;
                                        } else {
                                          console.log('file saved');
                                        }
                                      });
                                    }
                                    var html = "<html><head>"
                                    html += "<style>"
                                    html += "table {font-family: arial, sans-serif;border-collapse: collapse;width: 100%;}"
                                    html += "td, th {border: 1px solid #dddddd;text-align: left;padding: 8px;}"
                                    html += "tr:nth-child(even) {background-color: #dddddd;}</style></head>"
                                    html += "<h4>Dear Recipients,</h4>"
                                    html += "<h4>Please find below report.</h4><table>"
                                    html += "<thead><tr>"
                                    html += "<th>Date</th>"

                                    html += "<th>Wi-Fi Hub Provided (A)</th>"
                                    html += "<th>Wi-Fi Hub Placed BY EFB Team (B)</th>"
                                    // html += "<th>Wi-Fi Hub Started (C)</th>"
                                    html += "<th>Wi-Fi Hub Sync</th>"
                                    // html += "<th>Wi-Fi Hub Used</th>"
                                    html += " <th>Users</th>"
                                    html += "<th>Clicks</th>"
                                    html += "<th>% of Sync Vs Provided (C/A)</th>"
                                    html += "<th>% of Placed VS Provided(B/A)</th>"
                                    html += "</tr></thead><tbody>"
                                    let monthTotal = 0;
                                    let monthClicks = 0;
                                    let monthAvg = 0;
                                    let hub_array = JSON.parse(JSON.stringify(doc2))
                                    let synced_array = JSON.parse(JSON.stringify(doc5))
                                    for (let i = 0; i < hub_array.length; i++) {
                                      const element = hub_array[i];
                                      synced_array.map(item => {
                                        if (element.view_date == item.view_date) {
                                          // element.percentage = item.percentage;
                                          element.wifi_started = item.wifi_started;
                                        }

                                      });
                                      for (let jk = 0; jk < dataArr.length; jk++) {
                                        if (element.view_date == dataArr[jk].date) {
                                          console.log(dataArr[jk].host1);
                                          element.wifiplaced = parseInt(dataArr[jk].host1 + parseInt(dataArr[jk].host2));
                                          element.sync = Math.round((parseInt(dataArr[jk].host1 + parseInt(dataArr[jk].host2)) / hubpro * 100));
                                        }

                                      }
                                      for (let jkl = 0; jkl < doc8.length; jkl++) {
                                        if (element.view_date == doc8[jkl].view_date) {
                                          element.wifisync = doc8[jkl].count;
                                          element.percentage = Math.round(doc8[jkl].count / hubpro * 100)
                                          // element.sync = Math.round( parseInt(doc8[jkl].count) / hubpro * 100);
                                        }
                                      }

                                    }
                                    console.log(hub_array);
                                    var syncavg = 0;
                                    var proavg = 0;
                                    var month = '';
                                    for (let i = 0; i < hub_array.length; i++) {
                                      const element = hub_array[i];
                                      monthTotal += element.Views;
                                      monthClicks += element.Sessions
                                      monthAvg += element.Hubs;
                                      syncavg += element.percentage;
                                      proavg += element.sync;
                                      month = element.view_date;

                                      html += "<tr>"
                                      html += "<td>" + element.view_date + "</td>"
                                      html += "<td>" + hubpro + "</td>"
                                      html += "<td>" + element.wifiplaced + "</td>"
                                      // html += "<td>" + element.wifi_started + "</td>"
                                      html += "<td>" + element.wifisync + "</td>"
                                      // html += "<td>" + element.Hubs + "</td>"
                                      html += "<td>" + element.Sessions + "</td>"
                                      html += "<td>" + element.Views + "</td>"
                                      html += "<td>" + element.percentage + "%</td>"
                                      html += "<td>" + element.sync + "%</td>"
                                      html += "</tr>"
                                    }
                                    // console.log(month);
                                    month = month.slice(0, 7);
                                    // console.log(sm);
                                    monthAvg = Math.round(monthAvg / doc2.length)
                                    var counts = hub_array.length;
                                    syncavg = Math.round(syncavg / counts);
                                    proavg = Math.round(proavg / counts);
                                    for (let i = 0; i < doc3.length; i++) {
                                      const element = doc3[i];
                                      console.log(month);
                                      console.log(element.YEAR)
                                      if (month == element.YEAR) {
                                        html += "<tr>"
                                        html += "<td><b>" + element.Month + "</b></td>"
                                        html += "<td><b>" + hubpro + "</b></td>"
                                        // html += "<td><b>"+hubused+"</b></td>"
                                        html += "<td></td>"

                                        html += "<td><b>" + element.Hubs + "</b></td>"
                                        // if (i == 0) {
                                        // } else {
                                        //   html += "<td><b>" + element.Views + "</b></td>"
                                        // }
                                        html += "<td><b>" + monthClicks + "</b></td>"
                                        html += "<td><b>" + monthTotal + "</b></td>"
                                        html += "<td><b>" + syncavg + "%</b></td>"
                                        html += "<td><b>" + proavg + "%</b></td>"


                                        html += "</tr>"
                                      }
                                    }
                                    html += "</tbody></table>";
                                    html += "<br><br><h5>Thanks & Regards</h5><h5>Mobi Sign Pvt Ltd.</h5></html>"
                                    let subject = "Spicescreen Usage Report"
                                    //  var email = 'manoj.gupta@mojoboxx.com,deepak.kumar@mojoboxx.com,monali.monalisa@mojoboxx.com,product@mojoboxx.com,ashyin.thakral@mojoboxx.com,kedargdr@gmail.com,vishal.garg@mojoboxx.com,tushar.mehta@mojoboxx.com'
                                    var email = 'anurag.kumar@spicejet.com,puneet.angrish@spicejet.com,sapna.kumar@spicejet.com,jitendra.gautam@spicejet.com,prashant.mishra4@spicejet.com,sushant.madhab@spicejet.com,manoj.gupta@mojoboxx.com,deepak.kumar@mojoboxx.com,monali.monalisa@mojoboxx.com,product@mojoboxx.com,ashyin.thakral@mojoboxx.com,kedargdr@gmail.com,amajit.das@spicejet.com,nidhi.sinha@spicejet.com,vishal.garg@mojoboxx.com,tushar.mehta@mojoboxx.com,sachin.suri@spicejet.com,jagjyot.bindra@spicejet.com,sameer.sirdeshmukh@mojoboxx.com'
                                    // var email = 'vishal.garg@mojoboxx.com,tushar.mehta@mojoboxx.com,deepak.kumar@mojoboxx.com'
                                    EM.dispatchEmail(email, subject, html, "count", function (e) {
                                      console.log(e)
                                    })
                                  }
                                })
                              }
                            })
                          }
                        })
                      })
                    }
                  })
                }
              })
            }
          })
        }

      })

    }
  })
}


var get_des = function (req, res, next) {
  async function app() {
    // var currentDate = moment(new Date()).format('YYYY-MM-DD');
    // var d = new Date();
    // d.setDate(d.getDate() - 1);
    // var Yesterday = moment(d).format('YYYY-MM-DD').toString()
    var finaldata = []
    let doc = await getSource();
    console.log(doc);
    for (let src in doc) {
      let doc2 = await getDestination(doc[src].source);

      for (let dest in doc2) {
        let midData = {
          source: doc[src].source,
          destination: doc2[dest].destination
        }
        finaldata.push(midData);
      }
    }
    let doc2 = await email(finaldata);
    // console.log(finaldata);


  }
  app();

};

// get_des();
function getSource(currentDate) {
  return new Promise(function (myResolve, myReject) {
    let query = "SELECT  distinct source  FROM  vuscreen_ife_data ;";
    db.get().query(query, function (err, doc) {
      if (err) { myResolve(err) }
      else {
        myResolve(doc);
      }
    })

  });

}
function getDestination(currentDate) {
  return new Promise(function (myResolve, myReject) {
    let query = "SELECT  distinct destination  FROM  vuscreen_ife_data where source = '" + currentDate + "' ";
    db.get().query(query, function (err, doc) {
      if (err) { myResolve(err) }
      else {
        myResolve(doc);
      }
    })

  });

}
function email(a) {
  return new Promise(function (myResolve, myReject) {


    // console.log(a);
    var fields = ["source", "destination"];
    var csvDau = json2csv({ data: a, fields: fields });
    // console.log(csvDau);
    fs.writeFile(config.root + '/server/api/vuscreen/' + 'wifiloginsync.csv', csvDau, function (err) {
      if (err) {
        throw err;
      } else {
        console.log('file saved');
      }
    });
    // var html = "destination:" + coun;
    // html += " According To Sync Date"
    let subject = "destinations"
    // var email = 'manoj.gupta@mojoboxx.com,deepak.kumar@mojoboxx.com,vishal.garg@mojoboxx.com,tushar.mehta@mojoboxx.com'
    //var email = 'anurag.kumar@spicejet.com,puneet.angrish@spicejet.com,sapna.kumar@spicejet.com,jitendra.gautam@spicejet.com,prashant.mishra4@spicejet.com,sushant.madhab@spicejet.com,manoj.gupta@mojoboxx.com,deepak.kumar@mojoboxx.com,monali.monalisa@mojoboxx.com,product@mojoboxx.com,ashyin.thakral@mojoboxx.com,kedargdr@gmail.com,amajit.das@spicejet.com,nidhi.sinha@spicejet.com,vishal.garg@mojoboxx.com,tushar.mehta@mojoboxx.com'
    var email = 'vishal.garg@mojoboxx.com,tushar.mehta@mojoboxx.com'
    EM.dispatchEmail(email, subject, html, "wifisync", function (e) {
      console.log(e)
    })
  });

}
function insertSignup3(doc2, doc3) {
  return new Promise(function (myResolve, myReject) {

    var data = 0
    var yday = 0
    for (let j = 0; j < doc3.length; j++) {
      var count = 0;
      var data = "";
      for (let l = 0; l < doc2.length; l++) {
        if (doc3[j].mac == doc2[l].mac) {
          if (doc2[l].platform_duration != "" && doc2[l].platform_duration != NaN && doc2[l].platform_duration != "undefined" && doc2[l].platform_duration != null) {
            data = doc2[l].platform_duration;
            count = 1;
            break;
          }
        }
      }
      if (count == 1) {
        yday += parseInt(data);
      }
    }
    // console.log(tday / 3600);
    // console.log("today");
    let dt = (yday / 3600).toFixed(2);
    let dataa =
    {
      ysday: dt
    };

    console.log(dataa);
    myResolve(dataa);

  });

}
//////////////////////////////////

var destinationWiseHostWiseWIFILogin = function () {
  async function app() {
    var finalData = [];
    for (let p = 6; p < 8; p++) {
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
        let doc = await insertSignup(Yesterday, dest[i]);
        // console.log(doc.length);
        // console.log("doc.length");

        for (let j in doc) {
          // console.log(j);
          let jrny = await getjrny(doc[j].vehicle_no, Yesterday, dest[i]);
          // console.log(jrny);

          let host = await getHosts(doc[j].vehicle_no, Yesterday, jrny);
          // console.log(host);
          // console.log("host");

          let doc1 = await wifi_login_viewss(doc[j].vehicle_no, Yesterday, jrny);
          // console.log(host);
          let midData = {
            date: Yesterday,
            des: dest[i],
            host: doc[j].vehicle_no,
            stop: host[0].stop,
            user: doc1
          }
          console.log(midData);
          finalData.push(midData);
        }
      }
    }
    // console.log("abc");
    console.log(finalData);
    let doc2 = await email_DWHW(finalData);


    //   res.status("200").json(insert);

  }
  app();

};
// destinationWiseHostWiseWIFILogin()
function email_DWHW(a) {
  return new Promise(function (myResolve, myReject) {


    // console.log(a);
    var fields = ["date", "des", "host", "stop", "user"];
    var csvDau = json2csv({ data: a, fields: fields });
    // console.log(csvDau);
    fs.writeFile(config.root + '/server/api/vuscreen/' + 'wifiloginsync.csv', csvDau, function (err) {
      if (err) {
        throw err;
      } else {
        console.log('file saved');
      }
    });
    // var html = "destination:" + coun;
    // html += " According To Sync Date"
    let subject = "Destination Wise Host Wise WIFI Login"
    // var email = 'manoj.gupta@mojoboxx.com,deepak.kumar@mojoboxx.com,vishal.garg@mojoboxx.com,tushar.mehta@mojoboxx.com'
    //var email = 'anurag.kumar@spicejet.com,puneet.angrish@spicejet.com,sapna.kumar@spicejet.com,jitendra.gautam@spicejet.com,prashant.mishra4@spicejet.com,sushant.madhab@spicejet.com,manoj.gupta@mojoboxx.com,deepak.kumar@mojoboxx.com,monali.monalisa@mojoboxx.com,product@mojoboxx.com,ashyin.thakral@mojoboxx.com,kedargdr@gmail.com,amajit.das@spicejet.com,nidhi.sinha@spicejet.com,vishal.garg@mojoboxx.com,tushar.mehta@mojoboxx.com'
    var email = 'vishal.garg@mojoboxx.com,tushar.mehta@mojoboxx.com'
    EM.dispatchEmail(email, subject, html, "wifisync", function (e) {
      console.log(e)
    })
  });

}

var destinationWiseWIFILogin = function () {
  async function app() {
    var finalData = [];
    for (let p = 1; p < 3; p++) {
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
          date: Yesterday,
          des: dest[i],
          user: doc1
        }
        console.log(midData);
        finalData.push(midData);

      }
    }
    // console.log("abc");
    console.log(finalData);
    let doc2 = await email_DW(finalData);


    //   res.status("200").json(insert);

  }
  app();

};
// destinationWiseWIFILogin()
function email_DW(a) {
  return new Promise(function (myResolve, myReject) {


    // console.log(a);
    var fields = ["date", "des", "user"];
    var csvDau = json2csv({ data: a, fields: fields });
    // console.log(csvDau);
    fs.writeFile(config.root + '/server/api/vuscreen/' + 'wifiloginsync.csv', csvDau, function (err) {
      if (err) {
        throw err;
      } else {
        console.log('file saved');
      }
    });
    // var html = "destination:" + coun;
    // html += " According To Sync Date"
    let subject = "Destination Wise Host Wise WIFI Login"
    // var email = 'manoj.gupta@mojoboxx.com,deepak.kumar@mojoboxx.com,vishal.garg@mojoboxx.com,tushar.mehta@mojoboxx.com'
    //var email = 'anurag.kumar@spicejet.com,puneet.angrish@spicejet.com,sapna.kumar@spicejet.com,jitendra.gautam@spicejet.com,prashant.mishra4@spicejet.com,sushant.madhab@spicejet.com,manoj.gupta@mojoboxx.com,deepak.kumar@mojoboxx.com,monali.monalisa@mojoboxx.com,product@mojoboxx.com,ashyin.thakral@mojoboxx.com,kedargdr@gmail.com,amajit.das@spicejet.com,nidhi.sinha@spicejet.com,vishal.garg@mojoboxx.com,tushar.mehta@mojoboxx.com'
    var email = 'vishal.garg@mojoboxx.com,tushar.mehta@mojoboxx.com'
    EM.dispatchEmail(email, subject, html, "wifisync", function (e) {
      console.log(e)
    })
  });

}

var timeZoneWiseWIFILogin = function () {
  async function app() {
    var finalData = [];
    for (let p = 1; p < 3; p++) {
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
        console.log(midData);
        finalData.push(midData);

      }
    }
    // console.log("abc");
    console.log(finalData);
    let doc2 = await email_TZW(finalData);


    //   res.status("200").json(insert);

  }
  app();

};
// timeZoneWiseWIFILogin()

function email_TZW(a) {
  return new Promise(function (myResolve, myReject) {


    // console.log(a);
    var fields = ["date", "start", "end", "user"];
    var csvDau = json2csv({ data: a, fields: fields });
    // console.log(csvDau);
    fs.writeFile(config.root + '/server/api/vuscreen/' + 'wifiloginsync.csv', csvDau, function (err) {
      if (err) {
        throw err;
      } else {
        console.log('file saved');
      }
    });
    // var html = "destination:" + coun;
    // html += " According To Sync Date"
    let subject = "Destination Wise Host Wise WIFI Login"
    // var email = 'manoj.gupta@mojoboxx.com,deepak.kumar@mojoboxx.com,vishal.garg@mojoboxx.com,tushar.mehta@mojoboxx.com'
    //var email = 'anurag.kumar@spicejet.com,puneet.angrish@spicejet.com,sapna.kumar@spicejet.com,jitendra.gautam@spicejet.com,prashant.mishra4@spicejet.com,sushant.madhab@spicejet.com,manoj.gupta@mojoboxx.com,deepak.kumar@mojoboxx.com,monali.monalisa@mojoboxx.com,product@mojoboxx.com,ashyin.thakral@mojoboxx.com,kedargdr@gmail.com,amajit.das@spicejet.com,nidhi.sinha@spicejet.com,vishal.garg@mojoboxx.com,tushar.mehta@mojoboxx.com'
    var email = 'vishal.garg@mojoboxx.com,tushar.mehta@mojoboxx.com'
    EM.dispatchEmail(email, subject, html, "wifisync", function (e) {
      console.log(e)
    })
  });

}


var destinationWiseWIFILogin = function () {
  async function app() {
    var finalData = [];
      // var currentDate = moment(new Date()).format('YYYY-MM-DD');
      var d = new Date();
      // console.log(p);
      // d.setDate(d.getDate() - p);
      // var Yesterday = moment(d).format('YYYY-MM-DD').toString()

      // console.log(Yesterday);
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
        let doc1 = await wifi_login_des_wise_month(dest[i]);
        // console.log(host);
        let midData = {
          date: "mar",
          des: dest[i],
          user: doc1
        }
        console.log(midData);
        finalData.push(midData);

      }
    
    // console.log("abc");
    console.log(finalData);
    let doc2 = await email_DW(finalData);


    //   res.status("200").json(insert);

  }
  app();

};
// destinationWiseWIFILogin()




function insertSignup(date, host) {
  return new Promise(function (myResolve, myReject) {
    console.log("lkjh");
    let query = "SELECT distinct  b.vehicle_no FROM  vuscreen_tracker AS a inner JOIN  vuscreen_registration AS b ON a.device_id = b.device_id   Where a.view_date='" + date + "' and a.destination='" + host + "'";
    db.get().query(query, function (err, doc) {
      console.log(err);
      console.log(doc);
      if (err) { myResolve(err) }
      else {
        // console.log(query);
        // console.log(doc.length);
        myResolve(doc);
      }
    })

  });

}
function getHosts(vno, currentDate, dest) {
  return new Promise(function (myResolve, myReject) {
    let query = `SELECT  count(1) as stop FROM  vuscreen_registration AS a JOIN  vuscreen_events AS b ON a.device_id = b.device_id   WHERE a.vehicle_no ='${vno}' and b.view_date='${currentDate}' and b.journey_id in ${dest} and b.event like '%stop%'`;
    db.get().query(query, function (err, doc) {
      // console.log(err);
      if (err) { myResolve(err) }
      else {
        // console.log(query);
        // console.log(doc.length);
        // console.log(doc)
        myResolve(doc);
      }
    })

  });

}
function getjrny(vno, currentDate, dest) {
  return new Promise(function (myResolve, myReject) {
    let query = `SELECT distinct c.journey_id FROM  vuscreen_registration AS a JOIN  vuscreen_tracker as c on a.device_id=c.device_id  WHERE a.vehicle_no ='${vno}' and c.view_date='${currentDate}' and c.destination='${dest}' `;
    db.get().query(query, function (err, doc) {
      if (err) { myResolve(err) }
      else {
        // console.log(query);
        // console.log(doc.length);
        // console.log(doc);
        let dta = '(';
        for (let i = 0; i < doc.length; i++) {
          // console.log(doc[i]);
          dta += "'";

          dta += doc[i].journey_id;
          dta += "'";
          // console.log(i + 1);
          if (i + 1 == doc.length) {
            let abc = dta.length - 1;
            if (dta[abc] == ',') {
              dta = dta.slice(0, -1);
              dta += ')';
            }
            else {
              dta += ')';
            }

          }
          else {
            dta += ',';
          }
        }
        myResolve(dta);
      }
    })

  });

}
function email(a) {
  return new Promise(function (myResolve, myReject) {


    // console.log(a);
    var fields = ["date", "des", "host", "stop", "user"];
    var csvDau = json2csv({ data: a, fields: fields });
    // console.log(csvDau);
    fs.writeFile(config.root + '/server/api/vuscreen/' + 'wifiloginsync.csv', csvDau, function (err) {
      if (err) {
        throw err;
      } else {
        console.log('file saved');
      }
    });
    // var html = "destination:" + coun;
    html += " According To Sync Date"
    let subject = "destinations"
    // var email = 'manoj.gupta@mojoboxx.com,deepak.kumar@mojoboxx.com,vishal.garg@mojoboxx.com,tushar.mehta@mojoboxx.com'
    //var email = 'anurag.kumar@spicejet.com,puneet.angrish@spicejet.com,sapna.kumar@spicejet.com,jitendra.gautam@spicejet.com,prashant.mishra4@spicejet.com,sushant.madhab@spicejet.com,manoj.gupta@mojoboxx.com,deepak.kumar@mojoboxx.com,monali.monalisa@mojoboxx.com,product@mojoboxx.com,ashyin.thakral@mojoboxx.com,kedargdr@gmail.com,amajit.das@spicejet.com,nidhi.sinha@spicejet.com,vishal.garg@mojoboxx.com,tushar.mehta@mojoboxx.com'
    var email = 'vishal.garg@mojoboxx.com,tushar.mehta@mojoboxx.com'
    EM.dispatchEmail(email, subject, html, "wifisync", function (e) {
      console.log(e)
    })
  });

}

function wifi_login_viewss(host, Yesterday, dest) {
  return new Promise(function (myResolve, myReject) {
    // console.log("vish");
    var query = `SELECT  a.event, a.view_datetime, a.journey_id,unique_mac_address FROM  vuscreen_events a JOIN vuscreen_registration b ON a.device_id = b.device_id    WHERE b.vehicle_no= '${host}' and a.view_date =  '${Yesterday}'  and a.journey_id in ${dest} AND a.event != 'download' AND a.event != 'charging' ORDER BY a.id DESC`;
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

function wifi_login_des_wise(dest, Yesterday) {
  return new Promise(function (myResolve, myReject) {
    // console.log("vish");
    var query = `SELECT  a.event, a.view_datetime, a.journey_id,unique_mac_address FROM  vuscreen_events a JOIN vuscreen_registration b ON a.device_id = b.device_id    WHERE  a.view_date =  '${Yesterday}'  and a.destination= '${dest}' AND a.event != 'download' AND a.event != 'charging' ORDER BY a.id DESC`;
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

function wifi_login_des_wise_month(dest) {
  return new Promise(function (myResolve, myReject) {
    // console.log("vish");
    var query = `SELECT  a.event, a.view_datetime, a.journey_id,unique_mac_address FROM  vuscreen_events a JOIN vuscreen_registration b ON a.device_id = b.device_id    WHERE  a.sync_date <=  '2021-01-31' and a.sync_date >= '2021-01-01'  and a.destination= '${dest}' AND a.event != 'download' AND a.event != 'charging' ORDER BY a.id DESC`;
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


function wifi_login_timeZone_wise(start, end) {
  return new Promise(function (myResolve, myReject) {
    // console.log("vish");
    var query = `SELECT  a.event, a.view_datetime, a.journey_id,unique_mac_address FROM  vuscreen_events a JOIN vuscreen_registration b ON a.device_id = b.device_id    WHERE  a.view_datetime <= '${end}'  and a.view_datetime >= '${start}' AND a.event != 'download' AND a.event != 'charging' ORDER BY a.id DESC`;
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
/////////////////////////////////////////

exports.erosMovies = function () {
  // var erosMovies = function () {
  let d = new Date();
  let d1 = d.setDate(d.getDate() - 1);
  let d2 = d.setDate(d.getDate() - 7);
  d1 = moment(d1).format('YYYY-MM-DD').toString();
  d2 = moment(d2).format('YYYY-MM-DD').toString();
  // d1 = d1 + " 06:10:00";
  // d2 = d2 + " 06:10:00";
  var firstDate = moment(new Date()).format('YYYY-MM') + '-01';


  let query5 = "SELECT a.sync_date, COUNT(1) as click ,count(distinct mac)as user,Round(sum(a.view_duration)/60  ) as duration FROM  vuscreen_tracker AS a JOIN vuscreen_content_package AS b ON a.view_id = b.content_id WHERE a.sync_date<='" + d1 + "' and a.sync_date>='" + firstDate + "' and b.content_id IN ('2050' , '9000', '2043', '2051', '3012', '3005', '728', '2064', '998', '9001', '9002', '4028', '1268', '9003', '1001', '2058', '9004', '9005', '2045', '4024', '2054', '9006', '9007', '1006', '9008', '9009', '9010', '1007', '1282', '9011', '9012', '2046', '9013', '9014', '1011', '1012', '9015', '1252', '1253', '9016', '2060', '1016', '1017', '1018', '1019', '9018', '1020', '9017', '1021', '1254', '1023', '1024', '9019', '1025') GROUP BY a.sync_date order by a.sync_date asc"
  db.get().query(query5, function (err5, doc5) {
    if (err5) { console.log(err5); }
    else {

      var html = "<html><head>"
      html += "<style>"
      html += "table {font-family: arial, sans-serif;border-collapse: collapse;width: 100%;}"
      html += "td, th {border: 1px solid #dddddd;text-align: left;padding: 8px;}"
      html += "tr:nth-child(even) {background-color: #dddddd;}</style></head>"
      html += "<h4>Dear Recipients,</h4>"
      html += "<h4>Please find below report.</h4><table>"
      html += "<thead><tr>"
      html += "<th>Date</th>"
      html += "<th>Users </th>"
      html += "<th>File Played </th>"
      html += "<th>Play Durations(Min)</th>"
      html += "</tr></thead><tbody>"

      for (let i = 0; i < doc5.length; i++) {
        const element = doc5[i];
        html += "<tr>"
        html += "<td><b>" + element.sync_date + "</b></td>"
        html += "<td><b>" + element.user + "</b></td>"
        html += "<td><b>" + element.click + "</b></td>"
        html += "<td><b>" + element.duration + "</b></td>"
        html += "</tr>"
      }
      html += "</tbody></table>";
      html += "<br><br><h5>Thanks & Regards</h5><h5>Mobi Sign Pvt Ltd.</h5></html>"
      let subject = "EROS Movies Report"
      //  var email = 'manoj.gupta@mojoboxx.com,deepak.kumar@mojoboxx.com,monali.monalisa@mojoboxx.com,product@mojoboxx.com,ashyin.thakral@mojoboxx.com,kedargdr@gmail.com,vishal.garg@mojoboxx.com,tushar.mehta@mojoboxx.com'
      // var email = 'anurag.kumar@spicejet.com,puneet.angrish@spicejet.com,sapna.kumar@spicejet.com,jitendra.gautam@spicejet.com,prashant.mishra4@spicejet.com,sushant.madhab@spicejet.com,manoj.gupta@mojoboxx.com,deepak.kumar@mojoboxx.com,monali.monalisa@mojoboxx.com,product@mojoboxx.com,ashyin.thakral@mojoboxx.com,kedargdr@gmail.com,amajit.das@spicejet.com,nidhi.sinha@spicejet.com,vishal.garg@mojoboxx.com,tushar.mehta@mojoboxx.com'
      var email = 'vishal.garg@mojoboxx.com,tushar.mehta@mojoboxx.com,deepak.kumar@mojoboxx.com'
      EM.dispatchEmail(email, subject, html, "timeSpent", function (e) {
        console.log(e)
      })
    }
  })


}
// erosMovies();


///////////////////////////



var dtsd = function () {
  async function app() {
    var finalData = [];
    for (let p = 1; p < 8; p++) {
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
        let doc = await insertSignup(Yesterday, dest[i]);
        // console.log(doc.length);
        // console.log("doc.length");
        let doc2 = 0;
        for (let j in doc) {
          // console.log(j);
          let jrny = await getjrny(doc[j].vehicle_no, Yesterday, dest[i]);
          // console.log(jrny);

          // let host = await getHosts(doc[j].vehicle_no, Yesterday, jrny);
          // console.log(host);
          // console.log("host");

          let doc1 = await wifi_login_viewss(doc[j].vehicle_no, Yesterday, jrny);
          // console.log(host);
          doc2 += doc1;
          //  midData = {
          //   user: doc2
          // }


        }
        let midData = {
          date: Yesterday,
          des: dest[i],
          user: doc2
        }
        finalData.push(midData);
      }
    }
    // console.log("abc");
    console.log(finalData);
    // let doc2 = await email(finalData);


    //   res.status("200").json(insert);

  }
  app();

};

// dtsd();    


///////////////////////////New analytics SMS Api's////////////////////////
// exports.vuscreen_SmsSummary = function (req, cb) {
var vuscreen_SmsSummary = function (req, cb) {
  console.log("Tushar");
  var currentDate = moment(new Date()).format('YYYY-MM-DD');
  var d = new Date();

  d.setDate(d.getDate() - 1);
  var Yesterday = moment(d).format('YYYY-MM-DD').toString()

  var query = "select"
    + "(SELECT count(distinct device_id) FROM  vuscreen_tracker where sync_date='" + Yesterday + "') Totalhostsync,"
    + "(SELECT count(distinct mac) FROM  vuscreen_tracker where menu='SS' and sync_date='" + Yesterday + "') TotalHomepagelogin,"
    + "(SELECT count(1) FROM  vuscreen_tracker where sync_date='" + Yesterday + "') Totalclicks,"
    + "(SELECT count(1) FROM  vuscreen_tracker where menu='AD' and sync_date='" + Yesterday + "') TotalAdclick"

  //var option = { draw: req.query.draw, start: 0, length: 500 };
  db.get().query(query, function (error, doc) {
    if (error) {
      console.log(error)
    } else {
      console.log(doc)
      var y = new Date();
      y.setDate(y.getDate() - 2);
      var Yesterdays = moment(y).format('YYYY-MM-DD').toString()
      var query1 = "select"
        + "(SELECT count(distinct device_id) FROM  vuscreen_tracker where sync_date='" + Yesterdays + "') Totalhostsync,"
        + "(SELECT count(distinct mac) FROM  vuscreen_tracker where menu='SS' and sync_date='" + Yesterdays + "') TotalHomepagelogin,"
        + "(SELECT count(1) FROM  vuscreen_tracker where sync_date='" + Yesterdays + "') Totalclicks,"
        + "(SELECT count(1) FROM  vuscreen_tracker where menu='AD' and sync_date='" + Yesterdays + "') TotalAdclick"


      //var option = { draw: req.query.draw, start: 0, length: 500 };
      db.get().query(query1, function (error, doc1) {
        if (error) {
          console.log(error)

        }
        else {
          console.log(doc1);
          var total_device = 152;
          var days = 31;
          var html = "<html><head>"
          html += "<style>"
          html += "table {font-family: arial, sans-serif;border-collapse: collapse;width: 100%;}"
          html += "td, th {border: 2px solid black;text-align: center;padding: 8px;}"
          html += "tr:nth-child(even) {background-color: #dddddd;}</style></head>"
          html += "<h4>Dear Recipients,</h4>"
          html += "<h4>Please find below reports.</h4>"
          html += "<h4><b> Actual Summary report </b></h4>"
          var today = moment(Yesterday).format("Do MMM");
          var yday = moment(Yesterdays).format("Do MMM");
          html += "<h4><b>" + today + " / " + yday + "</b></h4>"
          html += "<h4><b> Totalwifilogin: </b></h4>"
          html += "<h4><b>T- Totalhostsync/TotalHomepagelogin/Totalclicks/TotalAdclick:" + doc[0].Totalhostsync + "/" + doc[0].TotalHomepagelogin + "/" + doc[0].Totalclicks + "/" + doc[0].TotalAdclick + "</b></h4>"
          html += "<h4><b>Y- Totalhostsync/TotalHomepagelogin/Totalclicks/TotalAdclick:" + doc1[0].Totalhostsync + "/" + doc1[0].TotalHomepagelogin + "/" + doc1[0].Totalclicks + "/" + doc1[0].TotalAdclick + "</b></h4>"

          html += "<br><br><h5>Thanks & Regards</h5><h5>Mobi Sign Pvt Ltd.</h5></html>"
          let subject = "Spicescreen SmsSummary"
          //  var email = 'manoj.gupta@mojoboxx.com,deepak.kumar'
          // var email = 'vishal.garg@mojoboxx.com,deepak.kumar'
          var email = 'vishal.garg@mojoboxx.com,tushar.mehta@mojoboxx.com'
          EM.dispatchEmail(email, subject, html, "timeSpent", function (e) {
            console.log(e)
          })

        }

      })
    }
  });
}
// vuscreen_SmsSummary();

// exports.vuscreen_WatchAnalytics = function (req, cb) {
var vuscreen_WatchAnalytics = function (req, cb) {
  console.log("Tushar");
  var currentDate = moment(new Date()).format('YYYY-MM-DD');
  var d = new Date();

  d.setDate(d.getDate() - 1);
  var Yesterday = moment(d).format('YYYY-MM-DD').toString()

  var query = "select"
    + "(SELECT count(distinct device_id) FROM  vuscreen_tracker where sync_date='" + Yesterday + "') Totalhostsync,"
    + "(SELECT count(distinct mac) FROM  vuscreen_tracker where menu='SS' and sync_date='" + Yesterday + "') TotalHomepagelogin,"
    + "(SELECT count(distinct mac) FROM  vuscreen_tracker where menu='WATCH' and sync_date='" + Yesterday + "') Watchuser,"
    + "(SELECT count(1) FROM  vuscreen_tracker where menu='WATCH' and sync_date='" + Yesterday + "') Watchclick"
  //var option = { draw: req.query.draw, start: 0, length: 500 };
  db.get().query(query, function (error, doc) {
    if (error) {
      console.log(error)
    } else {
      console.log(doc)
      var y = new Date();
      y.setDate(y.getDate() - 2);
      var Yesterdays = moment(y).format('YYYY-MM-DD').toString()
      var query1 = "select"
        + "(SELECT count(distinct device_id) FROM  vuscreen_tracker where sync_date='" + Yesterdays + "') Totalhostsync,"
        + "(SELECT count(distinct mac) FROM  vuscreen_tracker where menu='SS' and sync_date='" + Yesterdays + "') TotalHomepagelogin,"
        + "(SELECT count(distinct mac) FROM  vuscreen_tracker where menu='WATCH' and sync_date='" + Yesterdays + "') Watchuser,"
        + "(SELECT count(1) FROM  vuscreen_tracker where menu='WATCH' and sync_date='" + Yesterdays + "') Watchclick"


      //var option = { draw: req.query.draw, start: 0, length: 500 };
      db.get().query(query1, function (error, doc1) {
        if (error) {
          console.log(error)

        }
        else {
          console.log(doc1);
          var total_device = 152;
          var days = 31;
          var html = "<html><head>"
          html += "<style>"
          html += "table {font-family: arial, sans-serif;border-collapse: collapse;width: 100%;}"
          html += "td, th {border: 2px solid black;text-align: center;padding: 8px;}"
          html += "tr:nth-child(even) {background-color: #dddddd;}</style></head>"
          html += "<h4>Dear Recipients,</h4>"
          html += "<h4>Please find below reports.</h4>"
          html += "<h4><b> Actual Watch analytics report </b></h4>"
          var today = moment(Yesterday).format("Do MMM");
          var yday = moment(Yesterdays).format("Do MMM");
          html += "<h4><b>" + today + " / " + yday + "</b></h4>"
          html += "<h4><b> Totalwifilogin: </b></h4>"
          html += "<h4><b>T- Totalhostsync/TotalHomepagelogin/Watchuser/Watchclick:" + doc[0].Totalhostsync + "/" + doc[0].TotalHomepagelogin + "/" + doc[0].Watchuser + "/" + doc[0].Watchclick + "</b></h4>"
          html += "<h4><b>Y- Totalhostsync/TotalHomepagelogin/Watchuser/Watchclick:" + doc1[0].Totalhostsync + "/" + doc1[0].TotalHomepagelogin + "/" + doc1[0].Watchuser + "/" + doc1[0].Watchclick + "</b></h4>"

          html += "<br><br><h5>Thanks & Regards</h5><h5>Mobi Sign Pvt Ltd.</h5></html>"
          let subject = "Spicescreen Watch Analytics"
          //  var email = 'manoj.gupta@mojoboxx.com,deepak.kumar'
          // var email = 'vishal.garg@mojoboxx.com,deepak.kumar'
          var email = 'vishal.garg@mojoboxx.com,tushar.mehta@mojoboxx.com'
          EM.dispatchEmail(email, subject, html, "timeSpent", function (e) {
            console.log(e)
          })

        }

      })
    }
  });
}
// vuscreen_WatchAnalytics();

// exports.vuscreen_TravelAnalytics = function (req, cb) {
var vuscreen_TravelAnalytics = function (req, cb) {
  console.log("Tushar");
  var currentDate = moment(new Date()).format('YYYY-MM-DD');
  var d = new Date();

  d.setDate(d.getDate() - 1);
  var Yesterday = moment(d).format('YYYY-MM-DD').toString()

  var query = "select"
    + "(SELECT count(distinct device_id) FROM  vuscreen_tracker where sync_date='" + Yesterday + "') Totalhostsync,"
    + "(SELECT count(distinct mac) FROM  vuscreen_tracker where menu='SS' and sync_date='" + Yesterday + "') TotalHomepagelogin,"
    + "(SELECT COUNT(1) FROM  vuscreen_tracker AS a JOIN  vuscreen_travel_content AS b ON a.view_id = b.content_id WHERE a.menu = 'TRAVEL' AND a.type = 'NULL' AND a.sync_date='" + Yesterday + "') Travelclick,"
    + "(SELECT COUNT(distinct mac) FROM  vuscreen_tracker AS a JOIN  vuscreen_travel_content AS b ON a.view_id = b.content_id WHERE a.menu = 'TRAVEL' AND a.type = 'NULL' AND a.sync_date='" + Yesterday + "') Traveluser,"
    + "(SELECT COUNT(1) FROM  vuscreen_tracker AS a JOIN  vuscreen_travel_content AS b ON a.view_id = b.content_id WHERE a.menu = 'PDFDOWNLOAD' AND a.type = 'Travel' AND a.sync_date='" + Yesterday + "') PdfDownload,"
    + "(SELECT COUNT(distinct mac) FROM  vuscreen_tracker AS a JOIN  vuscreen_travel_content AS b ON a.view_id = b.content_id WHERE a.menu = 'PDFDOWNLOAD' AND a.type = 'Travel' AND a.sync_date='" + Yesterday + "') PdfUser"
  //var option = { draw: req.query.draw, start: 0, length: 500 };
  db.get().query(query, function (error, doc) {
    if (error) {
      console.log(error)
    } else {
      console.log(doc)
      var y = new Date();
      y.setDate(y.getDate() - 2);
      var Yesterdays = moment(y).format('YYYY-MM-DD').toString()
      var query1 = "select"
        + "(SELECT count(distinct device_id) FROM  vuscreen_tracker where sync_date='" + Yesterdays + "') Totalhostsync,"
        + "(SELECT count(distinct mac) FROM  vuscreen_tracker where menu='SS' and sync_date='" + Yesterdays + "') TotalHomepagelogin,"
        + "(SELECT COUNT(1) FROM  vuscreen_tracker AS a JOIN  vuscreen_travel_content AS b ON a.view_id = b.content_id WHERE a.menu = 'TRAVEL' AND a.type = 'NULL' AND a.sync_date='" + Yesterdays + "') Travelclick,"
        + "(SELECT COUNT(distinct mac) FROM  vuscreen_tracker AS a JOIN  vuscreen_travel_content AS b ON a.view_id = b.content_id WHERE a.menu = 'TRAVEL' AND a.type = 'NULL' AND a.sync_date='" + Yesterdays + "') Traveluser,"
        + "(SELECT COUNT(1) FROM  vuscreen_tracker AS a JOIN  vuscreen_travel_content AS b ON a.view_id = b.content_id WHERE a.menu = 'PDFDOWNLOAD' AND a.type = 'Travel' AND a.sync_date='" + Yesterdays + "') PdfDownload,"
        + "(SELECT COUNT(distinct mac) FROM  vuscreen_tracker AS a JOIN  vuscreen_travel_content AS b ON a.view_id = b.content_id WHERE a.menu = 'PDFDOWNLOAD' AND a.type = 'Travel' AND a.sync_date='" + Yesterdays + "') PdfUser"





      //var option = { draw: req.query.draw, start: 0, length: 500 };
      db.get().query(query1, function (error, doc1) {
        if (error) {
          console.log(error)

        }
        else {
          console.log(doc1);
          var html = "<html><head>"
          html += "<style>"
          html += "table {font-family: arial, sans-serif;border-collapse: collapse;width: 100%;}"
          html += "td, th {border: 2px solid black;text-align: center;padding: 8px;}"
          html += "tr:nth-child(even) {background-color: #dddddd;}</style></head>"
          html += "<h4>Dear Recipients,</h4>"
          html += "<h4>Please find below reports.</h4>"
          html += "<h4><b> Actual Travel analytics report </b></h4>"
          var today = moment(Yesterday).format("Do MMM");
          var yday = moment(Yesterdays).format("Do MMM");
          html += "<h4><b>" + today + " / " + yday + "</b></h4>"
          html += "<h4><b> Totalwifilogin: </b></h4>"
          html += "<h4><b>T- Totalhostsync/TotalHomepagelogin/Traveluser/Travelclick/PdfUser/PdfDownload:" + doc[0].Totalhostsync + "/" + doc[0].TotalHomepagelogin + "/" + doc[0].Traveluser + "/" + doc[0].Travelclick + "/" + doc[0].PdfUser + "/" + doc[0].PdfDownload + "</b></h4>"
          html += "<h4><b>Y- Totalhostsync/TotalHomepagelogin/Traveluser/Travelclick/PdfUser/PdfDownload:" + doc1[0].Totalhostsync + "/" + doc1[0].TotalHomepagelogin + "/" + doc1[0].Traveluser + "/" + doc1[0].Travelclick + "/" + doc1[0].PdfUser + "/" + doc1[0].PdfDownload + "</b></h4>"

          html += "<br><br><h5>Thanks & Regards</h5><h5>Mobi Sign Pvt Ltd.</h5></html>"
          let subject = "Spicescreen Watch Analytics"
          //  var email = 'manoj.gupta@mojoboxx.com,deepak.kumar'
          // var email = 'vishal.garg@mojoboxx.com,deepak.kumar'
          var email = 'vishal.garg@mojoboxx.com,tushar.mehta@mojoboxx.com'
          EM.dispatchEmail(email, subject, html, "timeSpent", function (e) {
            console.log(e)
          })

        }

      })
    }
  });
}
// vuscreen_TravelAnalytics();

// exports.vuscreen_GameAnalytics = function (req, cb) {
var vuscreen_GameAnalytics = function (req, cb) {
  console.log("Tushar");
  var currentDate = moment(new Date()).format('YYYY-MM-DD');
  var d = new Date();

  d.setDate(d.getDate() - 1);
  var Yesterday = moment(d).format('YYYY-MM-DD').toString()

  var query = "select"
    + "(SELECT count(distinct device_id) FROM  vuscreen_tracker where sync_date='" + Yesterday + "') Totalhostsync,"
    + "(SELECT count(distinct mac) FROM  vuscreen_tracker where menu='SS' and sync_date='" + Yesterday + "') TotalHomepagelogin,"
    + "(SELECT count(distinct mac) FROM  vuscreen_tracker where menu='STORE' and sync_date='" + Yesterday + "') Gameuser,"
    + "(SELECT count(1) FROM  vuscreen_tracker where menu='STORE' and sync_date='" + Yesterday + "') Gameclick"
  //var option = { draw: req.query.draw, start: 0, length: 500 };
  db.get().query(query, function (error, doc) {
    if (error) {
      console.log(error)
    } else {
      console.log(doc)
      var y = new Date();
      y.setDate(y.getDate() - 2);
      var Yesterdays = moment(y).format('YYYY-MM-DD').toString()
      var query1 = "select"
        + "(SELECT count(distinct device_id) FROM  vuscreen_tracker where sync_date='" + Yesterdays + "') Totalhostsync,"
        + "(SELECT count(distinct mac) FROM  vuscreen_tracker where menu='SS' and sync_date='" + Yesterdays + "') TotalHomepagelogin,"
        + "(SELECT count(distinct mac) FROM  vuscreen_tracker where menu='STORE' and sync_date='" + Yesterdays + "') Gameuser,"
        + "(SELECT count(1) FROM  vuscreen_tracker where menu='STORE' and sync_date='" + Yesterdays + "') Gameclick"


      //var option = { draw: req.query.draw, start: 0, length: 500 };
      db.get().query(query1, function (error, doc1) {
        if (error) {
          console.log(error)

        }
        else {
          console.log(doc1);
          var html = "<html><head>"
          html += "<style>"
          html += "table {font-family: arial, sans-serif;border-collapse: collapse;width: 100%;}"
          html += "td, th {border: 2px solid black;text-align: center;padding: 8px;}"
          html += "tr:nth-child(even) {background-color: #dddddd;}</style></head>"
          html += "<h4>Dear Recipients,</h4>"
          html += "<h4>Please find below reports.</h4>"
          html += "<h4><b> Actual Game analytics report </b></h4>"
          var today = moment(Yesterday).format("Do MMM");
          var yday = moment(Yesterdays).format("Do MMM");
          html += "<h4><b>" + today + " / " + yday + "</b></h4>"
          html += "<h4><b> Totalwifilogin: </b></h4>"
          html += "<h4><b>T- Totalhostsync/TotalHomepagelogin/Watchuser/Watchclick:" + doc[0].Totalhostsync + "/" + doc[0].TotalHomepagelogin + "/" + doc[0].Gameuser + "/" + doc[0].Gameclick + "</b></h4>"
          html += "<h4><b>Y- Totalhostsync/TotalHomepagelogin/Watchuser/Watchclick:" + doc1[0].Totalhostsync + "/" + doc1[0].TotalHomepagelogin + "/" + doc1[0].Gameuser + "/" + doc1[0].Gameclick + "</b></h4>"

          html += "<br><br><h5>Thanks & Regards</h5><h5>Mobi Sign Pvt Ltd.</h5></html>"
          let subject = "Spicescreen Game Analytics"
          //  var email = 'manoj.gupta@mojoboxx.com,deepak.kumar'
          // var email = 'vishal.garg@mojoboxx.com,deepak.kumar'
          var email = 'vishal.garg@mojoboxx.com,tushar.mehta@mojoboxx.com'
          EM.dispatchEmail(email, subject, html, "timeSpent", function (e) {
            console.log(e)
          })

        }

      })
    }
  });
}
// vuscreen_GameAnalytics();

// exports.vuscreen_FnbAnalytics = function (req, cb) {
var vuscreen_FnbAnalytics = function (req, cb) {
  console.log("Tushar");
  var currentDate = moment(new Date()).format('YYYY-MM-DD');
  var d = new Date();

  d.setDate(d.getDate() - 1);
  var Yesterday = moment(d).format('YYYY-MM-DD').toString()

  var query = "select"
    + "(SELECT count(distinct device_id) FROM  vuscreen_tracker where sync_date='" + Yesterday + "') Totalhostsync,"
    + "(SELECT count(distinct mac) FROM  vuscreen_tracker where menu='SS' and sync_date='" + Yesterday + "') TotalHomepagelogin,"
    + "(SELECT count(distinct mac) FROM  vuscreen_tracker where menu='fnb' and sync_date='" + Yesterday + "') Fnbuser,"
    + "(SELECT count(1) FROM  vuscreen_tracker where menu='fnb' and sync_date='" + Yesterday + "') Fnbclick"
  //var option = { draw: req.query.draw, start: 0, length: 500 };
  db.get().query(query, function (error, doc) {
    if (error) {
      console.log(error)
    } else {
      console.log(doc)
      var y = new Date();
      y.setDate(y.getDate() - 2);
      var Yesterdays = moment(y).format('YYYY-MM-DD').toString()
      var query1 = "select"
        + "(SELECT count(distinct device_id) FROM  vuscreen_tracker where sync_date='" + Yesterdays + "') Totalhostsync,"
        + "(SELECT count(distinct mac) FROM  vuscreen_tracker where menu='SS' and sync_date='" + Yesterdays + "') TotalHomepagelogin,"
        + "(SELECT count(distinct mac) FROM  vuscreen_tracker where menu='fnb' and sync_date='" + Yesterdays + "') Fnbuser,"
        + "(SELECT count(1) FROM  vuscreen_tracker where menu='fnb' and sync_date='" + Yesterdays + "') Fnbclick"


      //var option = { draw: req.query.draw, start: 0, length: 500 };
      db.get().query(query1, function (error, doc1) {
        if (error) {
          console.log(error)

        }
        else {
          console.log(doc1);
          var html = "<html><head>"
          html += "<style>"
          html += "table {font-family: arial, sans-serif;border-collapse: collapse;width: 100%;}"
          html += "td, th {border: 2px solid black;text-align: center;padding: 8px;}"
          html += "tr:nth-child(even) {background-color: #dddddd;}</style></head>"
          html += "<h4>Dear Recipients,</h4>"
          html += "<h4>Please find below reports.</h4>"
          html += "<h4><b> Actual Game analytics report </b></h4>"
          var today = moment(Yesterday).format("Do MMM");
          var yday = moment(Yesterdays).format("Do MMM");
          html += "<h4><b>" + today + " / " + yday + "</b></h4>"
          html += "<h4><b> Totalwifilogin: </b></h4>"
          html += "<h4><b>T- Totalhostsync/TotalHomepagelogin/Watchuser/Watchclick:" + doc[0].Totalhostsync + "/" + doc[0].TotalHomepagelogin + "/" + doc[0].Fnbuser + "/" + doc[0].Fnbclick + "</b></h4>"
          html += "<h4><b>Y- Totalhostsync/TotalHomepagelogin/Watchuser/Watchclick:" + doc1[0].Totalhostsync + "/" + doc1[0].TotalHomepagelogin + "/" + doc1[0].Fnbuser + "/" + doc1[0].Fnbclick + "</b></h4>"

          html += "<br><br><h5>Thanks & Regards</h5><h5>Mobi Sign Pvt Ltd.</h5></html>"
          let subject = "Spicescreen Fnb Analytics"
          //  var email = 'manoj.gupta@mojoboxx.com,deepak.kumar'
          // var email = 'vishal.garg@mojoboxx.com,deepak.kumar'
          var email = 'vishal.garg@mojoboxx.com,tushar.mehta@mojoboxx.com'
          EM.dispatchEmail(email, subject, html, "timeSpent", function (e) {
            console.log(e)
          })

        }

      })
    }
  });
}
// vuscreen_FnbAnalytics();

// exports.vuscreen_projectedReport = function (req, cb) {
var vuscreen_projectedReport = function (req, cb) {
  console.log("Tushar");
  var currentDate = moment(new Date()).format('YYYY-MM-DD');
  var d = new Date();

  d.setDate(d.getDate() - 1);
  var Yesterday = moment(d).format('YYYY-MM-DD').toString()

  var query = "select"
    + "(SELECT count(distinct mac) FROM  vuscreen_tracker where menu='SS' and sync_date='" + Yesterday + "') TotalHomepagelogin,"
    + "(SELECT count(1) FROM  vuscreen_tracker where menu='AD' and sync_date='" + Yesterday + "') TotalAdclick,"
    + "(SELECT count(1) FROM  vuscreen_tracker where menu='WATCH' and sync_date='" + Yesterday + "') Watchclick,"
    + "(SELECT count(distinct mac) FROM  vuscreen_tracker where menu='WATCH' and sync_date='" + Yesterday + "') Watchuser,"
    + "(SELECT count(distinct device_id) FROM  vuscreen_tracker where menu='WATCH' and sync_date='" + Yesterday + "') Watchdevice,"
    + "(SELECT count(1) FROM  vuscreen_tracker where menu='fnb' and sync_date='" + Yesterday + "') Fnbclick,"
    + "(SELECT count(distinct mac) FROM  vuscreen_tracker where menu='fnb' and sync_date='" + Yesterday + "') Fnbuser,"
    + "(SELECT count(distinct device_id) FROM  vuscreen_tracker where menu='fnb' and sync_date='" + Yesterday + "') Fnbdevice,"
    + "(SELECT count(1) FROM  vuscreen_tracker where type='video' and sync_date='" + Yesterday + "') Videoclick,"
    + "(SELECT count(distinct mac) FROM  vuscreen_tracker where type='video' and sync_date='" + Yesterday + "') Videouser,"
    + "(SELECT count(distinct device_id) FROM  vuscreen_tracker where type='video' and sync_date='" + Yesterday + "') Videodevice,"
    + "(SELECT count(1) FROM  vuscreen_tracker where menu='STORE' and sync_date='" + Yesterday + "') Gameclick,"
    + "(SELECT count(distinct mac) FROM  vuscreen_tracker where menu='STORE' and sync_date='" + Yesterday + "') Gameuser,"
    + "(SELECT count(distinct device_id) FROM  vuscreen_tracker where menu='STORE' and sync_date='" + Yesterday + "') Gamedevice,"
    + "(SELECT count(1) FROM  vuscreen_tracker where type='pdf' and sync_date='" + Yesterday + "') Magzineclick,"
    + "(SELECT count(distinct mac) FROM  vuscreen_tracker where type='pdf' and sync_date='" + Yesterday + "') Magzineuser,"
    + "(SELECT count(distinct device_id) FROM  vuscreen_tracker where type='pdf' and sync_date='" + Yesterday + "') Magzinedevice,"
    + "(SELECT count(1) FROM  vuscreen_tracker where type='audio' and sync_date='" + Yesterday + "') Audioclick,"
    + "(SELECT count(distinct mac) FROM  vuscreen_tracker where type='audio' and sync_date='" + Yesterday + "') Audiouser,"
    + "(SELECT count(distinct device_id) FROM  vuscreen_tracker where type='audio' and sync_date='" + Yesterday + "') Audiodevice,"
    + "(SELECT count(1) FROM  vuscreen_tracker where menu='travel' and sync_date='" + Yesterday + "') Classifiedclick,"
    + "(SELECT count(distinct mac) FROM  vuscreen_tracker where menu='travel' and sync_date='" + Yesterday + "') Classifieduser,"
    + "(SELECT count(distinct device_id) FROM  vuscreen_tracker where menu='travel' and sync_date='" + Yesterday + "') Classifieddevice,"
    + "(SELECT count(1) FROM  vuscreen_tracker where type='interstitial' and sync_date='" + Yesterday + "') Interstitialclick,"
    + "(SELECT count(distinct mac) FROM  vuscreen_tracker where type='interstitial' and sync_date='" + Yesterday + "') Interstitialuser,"
    + "(SELECT count(distinct device_id) FROM  vuscreen_tracker where type='interstitial' and sync_date='" + Yesterday + "') Interstitialdevice,"
    + "(SELECT count(distinct device_id) FROM  vuscreen_events where sync_date='" + Yesterday + "') Wifihubstarted,"
    + "(SELECT count(distinct device_id) FROM  vuscreen_tracker where sync_date='" + Yesterday + "') Wifihubused,"
    + "(SELECT count(distinct device_id) FROM  vuscreen_tracker where sync_date='" + Yesterday + "') Totalhostsync,"
    + "(SELECT count(1) FROM  vuscreen_tracker where sync_date='" + Yesterday + "') Totalclicks"
  //var option = { draw: req.query.draw, start: 0, length: 500 };
  db.get().query(query, function (error, doc) {
    if (error) {
      console.log(error)
    } else {
      console.log(doc)
      var y = new Date();
      y.setDate(y.getDate() - 2);
      var Yesterdays = moment(y).format('YYYY-MM-DD').toString()
      var query1 = "select"
        + "(SELECT count(1) FROM  vuscreen_tracker where menu='WATCH' and sync_date='" + Yesterdays + "') Watchclick,"
        + "(SELECT count(distinct mac) FROM  vuscreen_tracker where menu='WATCH' and sync_date='" + Yesterdays + "') Watchuser,"
        // + "(SELECT count(distinct device_id) FROM  vuscreen_tracker where menu='WATCH' and sync_date='" + Yesterdays + "') Watchdevice,"
        + "(SELECT count(1) FROM  vuscreen_tracker where menu='fnb' and sync_date='" + Yesterdays + "') Fnbclick,"
        + "(SELECT count(distinct mac) FROM  vuscreen_tracker where menu='fnb' and sync_date='" + Yesterdays + "') Fnbuser,"
        // + "(SELECT count(distinct device_id) FROM  vuscreen_tracker where menu='fnb' and sync_date='" + Yesterdays + "') Fnbdevice,"
        + "(SELECT count(1) FROM  vuscreen_tracker where type='video' and sync_date='" + Yesterdays + "') Videoclick,"
        + "(SELECT count(distinct mac) FROM  vuscreen_tracker where type='video' and sync_date='" + Yesterdays + "') Videouser,"
        // + "(SELECT count(distinct device_id) FROM  vuscreen_tracker where type='video' and sync_date='" + Yesterdays + "') Videodevice,"
        + "(SELECT count(1) FROM  vuscreen_tracker where menu='STORE' and sync_date='" + Yesterdays + "') Gameclick,"
        + "(SELECT count(distinct mac) FROM  vuscreen_tracker where menu='STORE' and sync_date='" + Yesterdays + "') Gameuser,"
        // + "(SELECT count(distinct device_id) FROM  vuscreen_tracker where menu='STORE' and sync_date='" + Yesterdays + "') Gamedevice,"
        + "(SELECT count(1) FROM  vuscreen_tracker where type='pdf' and sync_date='" + Yesterdays + "') Magzineclick,"
        + "(SELECT count(distinct mac) FROM  vuscreen_tracker where type='pdf' and sync_date='" + Yesterdays + "') Magzineuser,"
        // + "(SELECT count(distinct device_id) FROM  vuscreen_tracker where type='pdf' and sync_date='" + Yesterdays + "') Magzinedevice,"
        + "(SELECT count(1) FROM  vuscreen_tracker where type='audio' and sync_date='" + Yesterdays + "') Audioclick,"
        + "(SELECT count(distinct mac) FROM  vuscreen_tracker where type='audio' and sync_date='" + Yesterdays + "') Audiouser,"
        // + "(SELECT count(distinct device_id) FROM  vuscreen_tracker where type='audio' and sync_date='" + Yesterdays + "') Audiodevice,"
        + "(SELECT count(1) FROM  vuscreen_tracker where menu='travel' and sync_date='" + Yesterdays + "') Classifiedclick,"
        + "(SELECT count(distinct mac) FROM  vuscreen_tracker where menu='travel' and sync_date='" + Yesterdays + "') Classifieduser,"
        // + "(SELECT count(distinct device_id) FROM  vuscreen_tracker where menu='travel' and sync_date='" + Yesterdays + "') Classifieddevice,"
        + "(SELECT count(1) FROM  vuscreen_tracker where type='interstitial' and sync_date='" + Yesterdays + "') Interstitialclick,"
        + "(SELECT count(distinct mac) FROM  vuscreen_tracker where type='interstitial' and sync_date='" + Yesterdays + "') Interstitialuser,"
        // + "(SELECT count(distinct device_id) FROM  vuscreen_tracker where type='interstitial' and sync_date='" + Yesterdays + "') Interstitialdevice,"
        + "(SELECT count(distinct device_id) FROM  vuscreen_events where sync_date='" + Yesterdays + "') Wifihubstarted,"
        + "(SELECT count(distinct device_id) FROM  vuscreen_tracker where sync_date='" + Yesterdays + "') Wifihubused"

      //var option = { draw: req.query.draw, start: 0, length: 500 };
      db.get().query(query1, function (error, doc1) {
        if (error) {
          console.log(error)

        }
        else {
          console.log(doc1);
          var total_device = 152;
          var days = 31;
          var html = "<html><head>"
          html += "<style>"
          html += "table {font-family: arial, sans-serif;border-collapse: collapse;width: 100%;}"
          html += "td, th {border: 2px solid black;text-align: center;padding: 8px;}"
          html += "tr:nth-child(even) {background-color: #dddddd;}</style></head>"
          html += "<h4>Dear Recipients,</h4>"
          html += "<h4>Please find below reports.</h4>"
          // html += "<h4><b> Actual analytics report on Sync date </b></h4>"
          // var today=moment(Yesterday).format("Do MMM");  
          // var yday=moment(Yesterdays).format("Do MMM");  
          // html += "<h4><b>" + today + " / " + yday + "</b></h4>"
          // html += "<h4><b> Totalwifilogin: </b></h4>"
          // html += "<h4><b> Totalhostsync:" + doc[0].Totalhostsync + "</b></h4>"
          // html += "<h4><b> TotalHomepagelogin:" + doc[0].TotalHomepagelogin + "</b></h4> "
          // html += "<h4><b> Totalclicks:" + doc[0].Totalclicks + "<b></b></h4>"
          // html += "<h4><b> TotalAdclick:" + doc[0].TotalAdclick + "</b></h4>"
          // html += "<h4> Wifihubstarted(T/Y):" + doc[0].Wifihubstarted + "/" + doc1[0].Wifihubstarted + "</h4>"
          // html += "<h4> Wifihubused(T/Y):" + doc[0].Wifihubused + "/" + doc1[0].Wifihubused + "</h4>"
          // html += "<h4> Watchclick(T/Y):" + doc[0].Watchclick + "/" + doc1[0].Watchclick + "</h4>"
          // html += "<h4> Watchuser(T/Y):" + doc[0].Watchuser + "/" + doc1[0].Watchuser + "</h4>"
          // //  html += "<h4> Watchdevice:-" + doc[0].Watchdevice + "/" + doc1[0].Watchdevice + "</h4>"
          // html += "<h4> Fnbclick(T/Y):" + doc[0].Fnbclick + "/" + doc1[0].Fnbclick + "</h4>"
          // html += "<h4> Fnbuser(T/Y):" + doc[0].Fnbuser + "/" + doc1[0].Fnbuser + "</h4>"
          // //  html += "<h4> Fnbdevice:-" + doc[0].Fnbdevice + "/" + doc1[0].Fnbdevice + "</h4>"
          // html += "<h4> Videoclick(T/Y):" + doc[0].Videoclick + "/" + doc1[0].Videoclick + "</h4>"
          // html += "<h4> Videouser(T/Y):" + doc[0].Videouser +  "/" + doc1[0].Videouser + "</h4>"
          // //  html += "<h4> Videodevice:-" + doc[0].Videodevice + "/" + doc1[0].Videodevice + "</h4>"
          // html += "<h4> Gameclick(T/Y):" + doc[0].Gameclick +  "/" + doc1[0].Gameclick + "</h4>"
          // html += "<h4> Gameuser(T/Y):" + doc[0].Gameuser + "/" + doc1[0].Gameuser + "</h4>"
          // //  html += "<h4> Gamedevice:-" + doc[0].Gamedevice + "/" + doc1[0].Gamedevice + "</h4>"
          // html += "<h4> Magzineclick(T/Y):" + doc[0].Magzineclick +  "/" + doc1[0].Magzineclick + "</h4>"
          // html += "<h4> Magzineuser(T/Y):" + doc[0].Magzineuser + "/" + doc1[0].Magzineuser + "</h4>"
          // //  html += "<h4> Magzinedevice:-" + doc[0].Magzinedevice + "/" + doc1[0].Magzinedevice + "</h4>"
          // html += "<h4> Audioclick(T/Y):" + doc[0].Audioclick + "/" + doc1[0].Audioclick + "</h4>"
          // html += "<h4> Audiouser(T/Y):" + doc[0].Audiouser + "/" + doc1[0].Audiouser + "</h4>"
          // //  html += "<h4> Audiodevice:-" + doc[0].Audiodevice + "/" + doc1[0].Audiodevice + "</h4>"
          // html += "<h4> Classifiedclick(T/Y):" + doc[0].Classifiedclick + "/" + doc1[0].Classifiedclick + "</h4>"
          // html += "<h4> Classifieduser(T/Y):" + doc[0].Classifieduser + "/" + doc1[0].Classifieduser + "</h4>"
          // //  html += "<h4> Classifieddevice:-" + doc[0].Classifieddevice + "/" + doc1[0].Classifieddevice + "</h4>"
          // html += "<h4> Interstitialclick(T/Y):" + doc[0].Interstitialclick + "/" + doc1[0].Interstitialclick + "</h4>"
          // html += "<h4> Interstitialuser(T/Y):" + doc[0].Interstitialuser +  "/" + doc1[0].Interstitialuser + "</h4>"
          // //  html += "<h4> Interstitialdevice:-" + doc[0].Interstitialdevice + "/" + doc1[0].Interstitialdevice + "</h4>"

          html += "<br>"
          html += "<br>"
          html += "<br>"
          html += "<br>"
          html += "<h4><b> Projected Data of Mar month with 152 devices. </b></h4>"

          html += "<h4> Wifilogin: </h4>"

          var wc = ((doc[0].Watchclick / doc[0].Watchdevice) * total_device) * days;
          var wu = ((doc[0].Watchuser / doc[0].Watchdevice) * total_device) * days;

          html += "<h4> Watchclick:" + Math.round(wc) + "</h4>"
          html += "<h4> Watchuser:" + Math.round(wu) + "</h4>"

          var fc = ((doc[0].Fnbclick / doc[0].Fnbdevice) * total_device) * days;
          var fu = ((doc[0].Fnbuser / doc[0].Fnbdevice) * total_device) * days;

          html += "<h4> Fnbclick:" + Math.round(fc) + "</h4>"
          html += "<h4> Fnbuser:" + Math.round(fu) + "</h4>"

          var vc = ((doc[0].Videoclick / doc[0].Videodevice) * total_device) * days;
          var vu = ((doc[0].Videouser / doc[0].Videodevice) * total_device) * days;

          html += "<h4> Videoclick:" + Math.round(vc) + "</h4>"
          html += "<h4> Videouser:" + Math.round(vu) + "</h4>"

          var gc = ((doc[0].Gameclick / doc[0].Gamedevice) * total_device) * days;
          var gu = ((doc[0].Gameuser / doc[0].Gamedevice) * total_device) * days;

          html += "<h4> Gameclick:" + Math.round(gc) + "</h4>"
          html += "<h4> Gameuser:" + Math.round(gu) + "</h4>"

          var mc = ((doc[0].Magzineclick / doc[0].Magzinedevice) * total_device) * days;
          var mu = ((doc[0].Magzineuser / doc[0].Magzinedevice) * total_device) * days;

          html += "<h4> Magzineclick:" + Math.round(mc) + "</h4>"
          html += "<h4> Magzineuser:" + Math.round(mu) + "</h4>"

          var ac = ((doc[0].Audioclick / doc[0].Audiodevice) * total_device) * days;
          var au = ((doc[0].Audiouser / doc[0].Audiodevice) * total_device) * days;

          html += "<h4> Audioclick:" + Math.round(ac) + "</h4>"
          html += "<h4> Audiouser:" + Math.round(au) + "</h4>"

          var cc = ((doc[0].Classifiedclick / doc[0].Classifieddevice) * total_device) * days;
          var cu = ((doc[0].Classifieduser / doc[0].Classifieddevice) * total_device) * days;

          html += "<h4> Classifiedclick:" + Math.round(cc) + "</h4>"
          html += "<h4> Classifieduser:" + Math.round(cu) + "</h4>"

          var ic = ((doc[0].Interstitialclick / doc[0].Interstitialdevice) * total_device) * days;
          var iu = ((doc[0].Interstitialuser / doc[0].Interstitialdevice) * total_device) * days;


          html += "<h4> Interstitialclick:" + Math.round(ic) + "</h4>"
          html += "<h4> Interstitialuser:" + Math.round(iu) + "</h4>"



          html += "<br><br><h5>Thanks & Regards</h5><h5>Mobi Sign Pvt Ltd.</h5></html>"
          let subject = "Spicescreen SmsReport"
          //  var email = 'manoj.gupta@mojoboxx.com,deepak.kumar'
          // var email = 'vishal.garg@mojoboxx.com,deepak.kumar'
          var email = 'vishal.garg@mojoboxx.com,tushar.mehta@mojoboxx.com'
          EM.dispatchEmail(email, subject, html, "timeSpent", function (e) {
            console.log(e)
          })

        }

      })
    }
  });
}
// vuscreen_projectedReport();


exports.compaign_live = function (req, res) {
  // var compaign_live = function (req, res) {
  // var startDate = 'null', endDate = 'null';
  // if (req.query.startDate) { startDate = moment(req.query.startDate).format('YYYY-MM-DD'); }
  // if (req.query.endDate) { endDate = moment(req.query.endDate).format('YYYY-MM-DD'); }
  var currentDate = moment(new Date()).format('YYYY-MM-DD');
  var d = new Date();
  // var Yesterday = '2021-01-31';
  // var Yesterdays='2021-01-01';


  d.setDate(d.getDate());
  var today = moment(d).format('YYYY-MM-DD').toString()

  var query = "SELECT title, start_date, end_date FROM  vuscreen_travel_content where status='1' and  start_date<='" + today + "' and end_date>='" + today + "' "
  // console.log(query);
  db.get().query(query, function (err, doc) {
    if (err) {
      console.log(err);
      return handleError(res, err);
    }
    else {
      // console.log(doc);
      // console.log(err);
      var html = "<html><head>"
      html += "<style>"
      html += "table {font-family: arial, sans-serif;border-collapse: collapse;width: 100%;}"
      html += "td, th {border: 2px solid black;text-align: center;padding: 8px;}"
      html += "tr:nth-child(even) {background-color: #dddddd;}</style></head>"
      html += "<h4>Dear Recipients,</h4>"
      html += "<h4>Please find below reports.</h4>"
      html += "<thead><tr>"
      html += "<th><b>Title</b></th>"
      html += "<th><b>Start Date</b></th>"
      html += "<th><b>End Date</b></th>"
      html += "</thead></tr>"
      for (let i = 0; i < doc.length; i++) {
        const element = doc[i];

        html += "<tr>"
        html += "<td><b>" + element.title + "</b></td>"
        html += "<td><b>" + element.start_date + "</b></td>"
        html += "<td><b>" + element.end_date + "</b></td>"
        html += "</tr>"
      }

      html += "</tbody></table>";;
      html += "<br><br><h5>Thanks & Regards</h5><h5>Mobi Sign Pvt Ltd.</h5></html>"
      let subject = "Spicescreen Campaign Live Report"
      //  var email = 'manoj.gupta@mojoboxx.com,deepak.kumar@mojoboxx.com,monali.monalisa@mojoboxx.com,product@mojoboxx.com,ashyin.thakral@mojoboxx.com,kedargdr@gmail.com,vishal.garg@mojoboxx.com,tushar.mehta@mojoboxx.com'
      // var email = 'anurag.kumar@spicejet.com,puneet.angrish@spicejet.com,sapna.kumar@spicejet.com,jitendra.gautam@spicejet.com,prashant.mishra4@spicejet.com,sushant.madhab@spicejet.com,manoj.gupta@mojoboxx.com,deepak.kumar@mojoboxx.com,monali.monalisa@mojoboxx.com,product@mojoboxx.com,ashyin.thakral@mojoboxx.com,kedargdr@gmail.com,amajit.das@spicejet.com,nidhi.sinha@spicejet.com,vishal.garg@mojoboxx.com,tushar.mehta@mojoboxx.com,sachin.suri@spicejet.com,jagjyot.bindra@spicejet.com,sameer.sirdeshmukh@mojoboxx.com'
      var email = 'vishal.garg@mojoboxx.com,tushar.mehta@mojoboxx.com,deepak.kumar@mojoboxx.com'
      EM.dispatchEmail(email, subject, html, "timeSpent", function (e) {
        console.log(e)

      })
    }
  })
}

// compaign_live();


exports.hostUpdate = function () {
  // var hostUpdate = function () {
  let d = new Date();
  let d1 = d.setDate(d.getDate());
  let d2 = d.setDate(d.getDate() - 7);
  d1 = moment(d1).format('YYYY-MM-DD').toString();
  d2 = moment(d2).format('YYYY-MM-DD').toString();
  // d1 = d1 + " 06:10:00";
  // d2 = d2 + " 06:10:00";
  var firstDate = moment(new Date()).format('YYYY-MM') + '-01';
  var host = "('1','2','3','4','7','8','10','12','13','15','16','17','18','23','24','28','29','30','32','34','39','40','42','47','48','53','55','56','59','60','62','66','68','70','73','74','75','76','77','80','81','82','85','86','87','88','89','95','96','97','100','201','202','205','206','207','208','209','214','216','220','401','402','403','404','405','406','407','408','409','410','411','412','413','414','415','416','417','418','419','420','421','422','423','424','425','426','427','428','429','430','431','432','433','434','435','436','437','438','439','440','441','442','443','444','445','446','447','448','449','450','451','452','453','454','455','456','457','458','459','460','461','462','463','464','465','466','467','468','469','470','471','472','473','474','475','476','477','478','479','480','481','482','483','484','485','486','487','488','489','490','491','492','493','494','495','496','497','498','499','500','501','502','5','211','505','551','600','6','213','506','553','601','11','215','507','555','602','14','403','508','556','603','32','413','509','557','604','34','416','512','559','605','36','417','513','560','607','42','425','514','561','608','45','433','515','562','609','46','434','517','563','610','49','435','518','564','611','52','437','519','565','612','54','441','520','567','613','56','454','521','569','614','64','455','522','570','615','72','456','523','571','616','76','459','524','572','617','78','463','526','573','618','81','464','527','574','619','84','466','528','575','620','94','467','529','576','99','469','530','577','473','531','578','479','532','579','480','533','580','481','536','582','487','537','583','492','538','584','495','539','585','540','586','544','587','588','589','590','591','592','593','594','595','596','597','598','599')";
  var version = '2.4';
  let query5 = `SELECT count(distinct hostId) as host,version FROM vuscreen_events where version='${version}' and  hostId in ${host} group by version `
  db.get().query(query5, function (err5, doc5) {
    if (err5) { console.log(err5); }
    else {

      var html = "<html><head>"
      html += "<style>"
      html += "table {font-family: arial, sans-serif;border-collapse: collapse;width: 100%;}"
      html += "td, th {border: 1px solid #dddddd;text-align: left;padding: 8px;}"
      html += "tr:nth-child(even) {background-color: #dddddd;}</style></head>"
      html += "<h4>Dear Recipients,</h4>"
      html += "<h4>Please find below report.</h4><table>"
      html += "<thead><tr>"
      html += "<th>Version </th>"
      html += "<th> Total Host </th>"
      html += "</tr></thead><tbody>"
      console.log(doc5);
      for (let i = 0; i < doc5.length; i++) {
        const element = doc5[i];
        html += "<tr>"
        html += "<td><b>" + element.version + "</b></td>"
        html += "<td><b>" + element.host + "</b></td></tr>"


      }
      html += "</tbody></table>";
      html += "<br><br><h5>Thanks & Regards</h5><h5>Mobi Sign Pvt Ltd.</h5></html>"
      let subject = "Host Version Report"
      //  var email = 'manoj.gupta@mojoboxx.com,deepak.kumar@mojoboxx.com,monali.monalisa@mojoboxx.com,product@mojoboxx.com,ashyin.thakral@mojoboxx.com,kedargdr@gmail.com,vishal.garg@mojoboxx.com,tushar.mehta@mojoboxx.com'
      // var email = 'anurag.kumar@spicejet.com,puneet.angrish@spicejet.com,sapna.kumar@spicejet.com,jitendra.gautam@spicejet.com,prashant.mishra4@spicejet.com,sushant.madhab@spicejet.com,manoj.gupta@mojoboxx.com,deepak.kumar@mojoboxx.com,monali.monalisa@mojoboxx.com,product@mojoboxx.com,ashyin.thakral@mojoboxx.com,kedargdr@gmail.com,amajit.das@spicejet.com,nidhi.sinha@spicejet.com,vishal.garg@mojoboxx.com,tushar.mehta@mojoboxx.com'
      var email = 'vishal.garg@mojoboxx.com,mad@mojoboxx.com,tushar.mehta@mojoboxx.com'
      EM.dispatchEmail(email, subject, html, "timeSpent", function (e) {
        console.log(e)
      })
    }
  })


}


exports.hostUpdate = async function () {
  // var hostUpdate = function () {
  let d = new Date();
  let d1 = d.setDate(d.getDate());
  let d2 = d.setDate(d.getDate() - 7);
  d1 = moment(d1).format('YYYY-MM-DD').toString();
  d2 = moment(d2).format('YYYY-MM-DD').toString();
  // d1 = d1 + " 06:10:00";
  // d2 = d2 + " 06:10:00";
  var firstDate = moment(new Date()).format('YYYY-MM') + '-01';

  let HVC = await higestViewedContent();


  var host = "('1','2','3','4','7','8','10','12','13','15','16','17','18','23','24','28','29','30','32','34','39','40','42','47','48','53','55','56','59','60','62','66','68','70','73','74','75','76','77','80','81','82','85','86','87','88','89','95','96','97','100','201','202','205','206','207','208','209','214','216','220','401','402','403','404','405','406','407','408','409','410','411','412','413','414','415','416','417','418','419','420','421','422','423','424','425','426','427','428','429','430','431','432','433','434','435','436','437','438','439','440','441','442','443','444','445','446','447','448','449','450','451','452','453','454','455','456','457','458','459','460','461','462','463','464','465','466','467','468','469','470','471','472','473','474','475','476','477','478','479','480','481','482','483','484','485','486','487','488','489','490','491','492','493','494','495','496','497','498','499','500','501','502','5','211','505','551','600','6','213','506','553','601','11','215','507','555','602','14','403','508','556','603','32','413','509','557','604','34','416','512','559','605','36','417','513','560','607','42','425','514','561','608','45','433','515','562','609','46','434','517','563','610','49','435','518','564','611','52','437','519','565','612','54','441','520','567','613','56','454','521','569','614','64','455','522','570','615','72','456','523','571','616','76','459','524','572','617','78','463','526','573','618','81','464','527','574','619','84','466','528','575','620','94','467','529','576','99','469','530','577','473','531','578','479','532','579','480','533','580','481','536','582','487','537','583','492','538','584','495','539','585','540','586','544','587','588','589','590','591','592','593','594','595','596','597','598','599')";
  var version = '2.4';
  let query5 = `SELECT count(distinct hostId) as host,version FROM vuscreen_events where version='${version}' and  hostId in ${host} group by version `
  db.get().query(query5, function (err5, doc5) {
    if (err5) { console.log(err5); }
    else {

      var html = "<html><head>"
      html += "<style>"
      html += "table {font-family: arial, sans-serif;border-collapse: collapse;width: 100%;}"
      html += "td, th {border: 1px solid #dddddd;text-align: left;padding: 8px;}"
      html += "tr:nth-child(even) {background-color: #dddddd;}</style></head>"
      html += "<h4>Dear Recipients,</h4>"
      html += "<h4>Please find below report.</h4><table>"
      html += "<thead><tr>"
      html += "<th>Version </th>"
      html += "<th> Total Host </th>"
      html += "</tr></thead><tbody>"
      console.log(doc5);
      for (let i = 0; i < doc5.length; i++) {
        const element = doc5[i];
        html += "<tr>"
        html += "<td><b>" + element.version + "</b></td>"
        html += "<td><b>" + element.host + "</b></td></tr>"


      }
      html += "</tbody></table>";
      html += "<br><br><h5>Thanks & Regards</h5><h5>Mobi Sign Pvt Ltd.</h5></html>"
      let subject = "Host Version Report"
      //  var email = 'manoj.gupta@mojoboxx.com,deepak.kumar@mojoboxx.com,monali.monalisa@mojoboxx.com,product@mojoboxx.com,ashyin.thakral@mojoboxx.com,kedargdr@gmail.com,vishal.garg@mojoboxx.com,tushar.mehta@mojoboxx.com'
      // var email = 'anurag.kumar@spicejet.com,puneet.angrish@spicejet.com,sapna.kumar@spicejet.com,jitendra.gautam@spicejet.com,prashant.mishra4@spicejet.com,sushant.madhab@spicejet.com,manoj.gupta@mojoboxx.com,deepak.kumar@mojoboxx.com,monali.monalisa@mojoboxx.com,product@mojoboxx.com,ashyin.thakral@mojoboxx.com,kedargdr@gmail.com,amajit.das@spicejet.com,nidhi.sinha@spicejet.com,vishal.garg@mojoboxx.com,tushar.mehta@mojoboxx.com'
      var email = 'vishal.garg@mojoboxx.com,mad@mojoboxx.com,tushar.mehta@mojoboxx.com'
      EM.dispatchEmail(email, subject, html, "timeSpent", function (e) {
        console.log(e)
      })
    }
  })


}

// hostUpdate()

exports.insertTailNo = async function insertTailNo(req, res) {
// var insertTailNo = async function insertTailNo(req, res) {

  // let startTime = now();

  try {
console.log("a");
    let sync_date = null, sync_timestamp = null, sync_datetime = null
    let d = new Date();
    let d1 = d.setDate(d.getDate() - 1);
    sync_date = moment(d1).format("YYYY-MM-DD");

    let result = await getTailData(sync_date)
    // let insert = await insertTailData(result);
    console.log("insert");
    let getdata = await getIFEData(sync_date);
    let sortdata = await getFlightNO(result, getdata);
    let email = await email_tailNo(sortdata);





    // console.log(result);




  } catch (error) {
    console.log(error)
  }

  // res.status(200).send({ status: 101, timestamp: new Date().getTime() });

  // logger.detach("info", logEntry);


}


function getTailData(date) {
  return new Promise(function (myResolve, myReject) {
    try {
      // var date="2021-04-05"
      // let MOBILE_NUMBER = element.sender;
      var start_date = date + " 00:00";
      var end_date = date + " 23:59"
      const options = {
        method: "POST",
        json: true,
        url: 'http://testsupport.spicejet.com:8080/FlightType/flightType/getflightInfo',
        headers: {
          'Content-Type': 'application/json'
        },
        body: {
          "key": "%#Flight#@Details&*A",
          "FromDateTime": start_date,
          "ToDateTime": end_date,
          "FlightNumber": "",
          "Origin": "",
          "Destination": "",
          "ServiceType": "",
          "TailNo": ""

        }
      };

      // let SMS = await mysql.sequelize.query("SELECT conf_value FROM server_configurations where conf_key='ROUTE_SMS'", { type: QueryTypes.SELECT })
      // let url = await mysql.sequelize.query("SELECT conf_value FROM server_configurations where conf_key='ROUTE_URL'", { type: QueryTypes.SELECT })
      // url = url[0].conf_value.replace("{SMS}", SMS[0].conf_value)
      // url = url.replace("{MOBILE_NUMBER}", MOBILE_NUMBER);
      request(options, function (error, response, body) {
        if (!error) {
          // console.log(response);
          myResolve(response.body)
        } else {
          console.log(error)
        }
      })
    } catch (error) {
      console.log(error)
    }
    // let result2 = JSON.parse(dbCat[0].conf_value);
    // res.status("200").json(result2);
  })
}


function insertTailData(result) {
  return new Promise(function (myResolve, myReject) {
    try {
      // console.log(result.length);
      // console.log(result[380]);

      for (let i = 0; i < result.length; i++) {

        var element = result[i];
        // console.log(element) ;

        let id = element.id ? element.id : ""
        let flightId = element.flightId ? element.flightId : ""
        let std = element.std ? element.std : ""
        let sta = element.sta ? element.sta : ""
        let atd = element.atd ? element.atd : ""
        let ata = element.ata ? element.ata : ""
        let etd = element.etd ? element.etd : ""
        let eta = element.eta ? element.eta : ""
        let createDateTime = element.createDateTime ? element.createDateTime : ""
        let updateDateTime = element.updateDateTime ? element.updateDateTime : ""
        let registrationNo = element.registrationNo ? element.registrationNo : ""
        let operationalstatus = element.operationalstatus ? element.operationalstatus : ""
        let arrBayNo = element.arrBayNo ? element.arrBayNo : ""
        let manufacturer = element.manufacturer ? element.manufacturer : ""
        let serviceType = element.serviceType ? element.serviceType : ""

        let flightType = element.flightType ? element.flightType : ""
        let deptBayNo = element.deptBayNo ? element.deptBayNo : ""
        let flightNo = element.flightNo ? element.flightNo.replace(" ", "-") : ""
        let departureDate = element.departureDate ? element.departureDate : ""
        let depStation = element.depStation ? element.depStation : ""
        let arrStation = element.arrStation ? element.arrStation : ""
        let aircraftType = element.aircraftType ? element.aircraftType : ""



        let getQuery = "insert into spicejet_tailNo (id,flightId, std,sta,atd,ata,etd,eta,createDateTime, updateDateTime,registrationNo, operationalstatus,arrBayNo,manufacturer,serviceType,flightType,deptBayNo,flightNo,departureDate,depStation,arrStation,aircraftType)  VALUES('" + id
          + "', '" + flightId + "','" + std + "', '" + sta + "','" + atd + "', '" + ata + "','" + etd + "', '" + eta + "','" + createDateTime
          + "', '" + updateDateTime + "','" + registrationNo + "', '" + operationalstatus + "','" + arrBayNo + "', '" + manufacturer
          + "','" + serviceType + "', '" + flightType
          + "', '" + deptBayNo + "','" + flightNo + "', '" + departureDate + "','" + depStation + "', '" + arrStation
          + "','" + aircraftType + "');"

        db.get().query(getQuery, function (err5, doc5) {
          if (err5) { console.log(err5); }
          else {
            // console.log(i);
            // console.log(result[i+1].flightNo);
            // console.log("dddddddddd");


            if (i + 1 == result.length) {
              console.log("success");
              myResolve("success");
            }

          }

        })
      }

    } catch (error) {
      console.log(error)
    }
    // let result2 = JSON.parse(dbCat[0].conf_value);
    // res.status("200").json(result2);
  })
}


function getIFEData(currentDate) {
  return new Promise(function (myResolve, myReject) {

    let query = "SELECT  f_no FROM  vuscreen_ife_data WHERE date <= '" + currentDate + "'";
    db.get().query(query, function (err, dataArrays) {
      if (err) { myResolve(err) }
      else {
        myResolve(dataArrays);
      }
    })

  });

}

function getFlightNO(insert, getdata) {
  return new Promise(function (myResolve, myReject) {
    console.log(getdata);
    var fdata = [];
    var ffdata=[]
    var count=0;
    for (let i = 0; i < insert.length; i++) {
      for(let j =0;j <getdata.length;j++){
        let element = insert[i].flightNo.replace(" ", "-")

        
        if(element==getdata[j].f_no){
          count +=1;
          break;
        }
        if(j+1==getdata.length){
          let dta= ffdata.indexOf(insert[i].registrationNo);
          console.log(dta);
          if(dta==-1){

          
          ffdata.push(insert[i].registrationNo);
          let data = {
            flightNo: insert[i].flightNo,
            depStation:insert[i].depStation,
            arrStation:insert[i].arrStation,
            registrationNo:insert[i].registrationNo
         
          }

          fdata.push(data);

        }
        }
      }
if(i+1==insert.length){
  myResolve(fdata);
}

    }
    // console.log(count);
    // console.log(fdata.length);


  });

}

function email_tailNo(a) {
  return new Promise(function (myResolve, myReject) {

let count=a.length;
    // console.log(a);
    var fields = ["registrationNo", "depStation", "arrStation","flightNo"];
    var csvDau = json2csv({ data: a, fields: fields });
    // console.log(csvDau);
    fs.writeFile(config.root + '/server/api/vuscreen/' + 'tailNo.csv', csvDau, function (err) {
      if (err) {
        throw err;
      } else {
        console.log('file saved');
      }
    });
    var html = "<html><head>"
    html += "<style>"
    html += "table {font-family: arial, sans-serif;border-collapse: collapse;width: 100%;}"
    html += "td, th {border: 1px solid #dddddd;text-align: left;padding: 8px;}"
    html += "tr:nth-child(even) {background-color: #dddddd;}</style></head>"
    html += "<h4>Dear Recipients,</h4>"
    html += "<h4>Please find below report.</h4><table>"
    html += "<thead><tr>"
    html += "<th>Tail No.</th>"
    html += "<th>Department Station </th>"
    html += "<th>Arrival Station </th>"
    html += "<th>Flight No.</th>"
    html += "</tr></thead><tbody>"

    for (let i = 0; i < a.length; i++) {
      const element = a[i];
      html += "<tr>"
      html += "<td><b>" + element.registrationNo + "</b></td>"
      html += "<td><b>" + element.depStation + "</b></td>"
      html += "<td><b>" + element.arrStation + "</b></td>"
      html += "<td><b>" + element.flightNo + "</b></td>"

      html += "</tr>"
    }
    html += "</tbody></table>";
    html += "<br><br><h5>Thanks & Regards</h5><h5>Mobi Sign Pvt Ltd.</h5></html>"
    // var email = 'manoj.gupta@mojoboxx.com,deepak.kumar@mojoboxx.com,vishal.garg@mojoboxx.com,tushar.mehta@mojoboxx.com'
    //var email = 'anurag.kumar@spicejet.com,puneet.angrish@spicejet.com,sapna.kumar@spicejet.com,jitendra.gautam@spicejet.com,prashant.mishra4@spicejet.com,sushant.madhab@spicejet.com,manoj.gupta@mojoboxx.com,deepak.kumar@mojoboxx.com,monali.monalisa@mojoboxx.com,product@mojoboxx.com,ashyin.thakral@mojoboxx.com,kedargdr@gmail.com,amajit.das@spicejet.com,nidhi.sinha@spicejet.com,vishal.garg@mojoboxx.com,tushar.mehta@mojoboxx.com'
    var subject="IFE Not Uplifted Flights "
    var email = 'vishal.garg@mojoboxx.com,tushar.mehta@mojoboxx.com,deepak.kumar@mojoboxx.com'
    EM.dispatchEmail(email, subject, html, "tailNO", function (e) {
      console.log(e)
    })
  });

}

// insertTailNo();

function higestViewedContent(date, host) {
  return new Promise(function (myResolve, myReject) {
    console.log("lkjh");
    let query = "SELECT distinct  b.vehicle_no FROM  vuscreen_tracker AS a inner JOIN  vuscreen_registration AS b ON a.device_id = b.device_id   Where a.view_date='" + date + "' and a.destination='" + host + "'";
    db.get().query(query, function (err, doc) {
      console.log(err);
      console.log(doc);
      if (err) { myResolve(err) }
      else {
        // console.log(query);
        // console.log(doc.length);
        myResolve(doc);
      }
    })

  });

}
///////////////////

exports.byjus_analytics = function (req, res) {
  // var byjus_analytics = function (req, res) {
  // var startDate = 'null', endDate = 'null';
  // if (req.query.startDate) { startDate = moment(req.query.startDate).format('YYYY-MM-DD'); }
  // if (req.query.endDate) { endDate = moment(req.query.endDate).format('YYYY-MM-DD'); }
  var currentDate = moment(new Date()).format('YYYY-MM-DD');
  var d = new Date();
  // var Yesterday = '2021-01-31';
  // var Yesterdays='2021-01-01';


  d.setDate(d.getDate() - 1);
  var Yesterday = moment(d).format('YYYY-MM-DD').toString()
  var query = "SELECT user_name, student_class, school_name, father_name, mother_name, state, city, mobile, pincode, school_board, performance, tutions, studies  FROM  club_registration where sync_date = '" + Yesterday + "' order by id desc "
  db.get().query(query, function (err, doc) {
    if (err) {
      console.log(err);
      return handleError(res, err);
    }
    else {
  var query1 = "SELECT count(1) as clicks FROM  club_registration "
  db.get().query(query1, function (err, doc1) {
    // console.log(doc1);
    if (err) {
      console.log(err);
      return handleError(res, err);
    }
    else {
      var fields = ["user_name", "student_class", "school_name", "father_name", "mother_name", "state", "city", "mobile", "pincode", "school_board", "performance", "tutions", "studies"];
      var csvByjus = json2csv({ data: doc, fields: fields });
      // console.log(csvDau);
      fs.writeFile(config.root + '/server/api/vuscreen/' + 'byjusanalytics.csv', csvByjus, function (err) {
        if (err) {
          throw err;
        } else {
          console.log('file saved');
        }
      });
      var html = "Total Byjus Analytics:" + doc1[0].clicks;
      html += " According To Sync Date"
      let subject = "Byjus Analytics Report (Sync Date)"
      var email = 'vishal.garg@mojoboxx.com,tushar.mehta@mojoboxx.com'
      //var email = 'anurag.kumar@spicejet.com,puneet.angrish@spicejet.com,sapna.kumar@spicejet.com,jitendra.gautam@spicejet.com,prashant.mishra4@spicejet.com,sushant.madhab@spicejet.com,manoj.gupta@mojoboxx.com,deepak.kumar@mojoboxx.com,monali.monalisa@mojoboxx.com,product@mojoboxx.com,ashyin.thakral@mojoboxx.com,kedargdr@gmail.com,amajit.das@spicejet.com,nidhi.sinha@spicejet.com,vishal.garg@mojoboxx.com,tushar.mehta@mojoboxx.com'
      //  var email = 'vishal.garg@mojoboxx.com,deepak.kumar@mojoboxx.com,tushar.mehta@mojoboxx.com'
      EM.dispatchEmail(email, subject, html, "byjusanalytics", function (e) {
        console.log(e)
      })
      // return res.status(200).json(doc);
    }
  })
}
  })
};

// byjus_analytics();