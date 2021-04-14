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
const { count } = require('../vuscreen/vuscreen.model');



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

      
    
  


////////Get Destination wise wifilogin/////////////////
exports.destinationWiseWIFILogin = function (req, res) {
  // var destinationWiseWIFILogin = function () {
    var startDate, endDate;
    if (req.query.startDate) { startDate = moment(req.query.startDate).format('YYYY-MM-DD'); }
    if (req.query.endDate) { endDate = moment(req.query.endDate).format('YYYY-MM-DD'); }
  
    var query = "SELECT b.name as destination, COUNT(DISTINCT mac) AS user FROM spicescreen.vuscreen_wifilogin as a join spicescreen.vuscreen_city as b on a.destination=b.code WHERE sync_date >= '" + startDate + "' AND sync_date <= '"+ endDate +"' GROUP BY b.name ORDER BY user DESC LIMIT 10"
    db.get().query(query, function (err, doc) {
      if (err) { return handleError(res, err); }
      return res.status(200).json(doc);
    })
};



exports.daily_summary = function (req, res) {
  // var daily_summary = function (req, res) {
  var days = [35, 28, 21, 14, 7]
  var beforeOneWeek;
  var day;
  var diffToMonday;
  var dayofweeks = [];
  var filter;
  var startDate, endDate;
  // var version;

  // if (req.query.version != "undefined" && req.query.version != "") {
  //   version = "'" + req.query.version + "'"
  // } else {
  //   version = 'null'
  // }
  console.log(req.query.startDate)
  if (req.query.startDate) { startDate = moment(req.query.startDate).format('YYYY-MM-DD'); }
  if (req.query.endDate) { endDate = moment(req.query.endDate).format('YYYY-MM-DD'); }
  filter = " sync_date >= '" + startDate + "' AND sync_date <= '" + endDate + "' "
  if (req.query.daysfilter != "undefined" && req.query.daysfilter != "" && typeof (req.query.daysfilter) != "undefined") {
    for (var i = 0; i < days.length; i++) {
      beforeOneWeek = new Date(new Date().getTime() - 60 * 60 * 24 * days[i] * 1000)
      day = beforeOneWeek.getDay()
      diffToMonday = beforeOneWeek.getDate() - day + (day === 0 ? -6 : 1)
      dayofweeks.push(moment(new Date(beforeOneWeek.setDate(diffToMonday + parseInt(req.query.daysfilter)))).format('YYYY-MM-DD'))
    };
    if (req.query.daysfilter == new Date().getDay() - 1) {
      dayofweeks.push(moment(new Date()).format('YYYY-MM-DD'))
    }

    filter =  "sync_date IN" + JSON.stringify(dayofweeks).replace('[', '(').replace(']', ')')

  }

  var query1 = "select sync_date date, count(distinct mac) as TotalHomepagelogin FROM spicescreen.vuscreen_tracker where " + filter + " and menu='SS' GROUP BY date order by date "

  // console.log(query1)
  db.get().query(query1, function (err, doc) {
    if (err) { return handleError(res, err); }
    else {
      var query2 = "SELECT sync_date date, count(1) AS TotalAdclick  FROM spicescreen.vuscreen_tracker where " + filter + " and menu='AD' GROUP BY date order by date "
      db.get().query(query2, function (err, doc1) {
        if (err) { return handleError(res, err); }
        else {
          var query3 = "SELECT sync_date date, count(1) as Totalclicks  FROM spicescreen.vuscreen_tracker where " + filter + " GROUP BY date order by date "
          db.get().query(query3, function (err, doc2) {
            if (err) { return handleError(res, err); }

            else {
              var query4 = "SELECT a.sync_date date, COUNT(1) AS Totalpdfdownload FROM spicescreen.vuscreen_tracker AS a JOIN spicescreen.vuscreen_travel_content as b on a.view_id=b.content_id where " + filter + " and a.menu='PDFDOWNLOAD' GROUP BY date order by date "
              db.get().query(query4, function (err, doc3) {
                if (err) { return handleError(res, err); }
                else {
                  var query5 = "SELECT sync_date date, COUNT(DISTINCT mac) as wifiLogin FROM spicescreen.vuscreen_wifilogin WHERE " + filter + " GROUP BY date order by date "
              db.get().query(query5, function (err, doc4) {
                console.log(err);
                if (err) { return handleError(res, err); }
                else {
                        let data = [doc, doc1, doc2, doc3, doc4]
                        return res.status(200).json(data);
                      }

                      // return res.status(200).json(doc);
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

exports.deswise_summary = function (req, res) {
  // var deswise_summary = function (req, res) {
  var days = [35, 28, 21, 14, 7]
  var beforeOneWeek;
  var day;
  var diffToMonday;
  var dayofweeks = [];
  var filter;
  var startDate, endDate, destination;
  // var version;
  if (req.query.destination != "undefined" && req.query.destination != "") {
    destination = "'" + req.query.destination + "'"
  } else {
    destination = 'null'
  }
  // if (req.query.version != "undefined" && req.query.version != "") {
  //   version = "'" + req.query.version + "'"
  // } else {
  //   version = 'null'
  // }
  console.log(req.query.startDate)
  if (req.query.startDate) { startDate = moment(req.query.startDate).format('YYYY-MM-DD'); }
  if (req.query.endDate) { endDate = moment(req.query.endDate).format('YYYY-MM-DD'); }

  filter = " sync_date >= '" + startDate + "' AND sync_date <= '" + endDate + "' AND  destination = IFNULL(" + destination + ",destination)"
  if (req.query.daysfilter != "undefined" && req.query.daysfilter != "" && typeof (req.query.daysfilter) != "undefined") {
    for (var i = 0; i < days.length; i++) {
      beforeOneWeek = new Date(new Date().getTime() - 60 * 60 * 24 * days[i] * 1000)
      day = beforeOneWeek.getDay()
      diffToMonday = beforeOneWeek.getDate() - day + (day === 0 ? -6 : 1)
      dayofweeks.push(moment(new Date(beforeOneWeek.setDate(diffToMonday + parseInt(req.query.daysfilter)))).format('YYYY-MM-DD'))
    };
    if (req.query.daysfilter == new Date().getDay() - 1) {
      dayofweeks.push(moment(new Date()).format('YYYY-MM-DD'))
    }

    filter =  " sync_date IN " + JSON.stringify(dayofweeks).replace('[', '(').replace(']', ')')

  }


  var query1 = "select sync_date date, count(distinct mac) as TotalHomepagelogin FROM spicescreen.vuscreen_tracker where " + filter + " and menu='SS' GROUP BY date order by date "

  // console.log(query1)
  db.get().query(query1, function (err, doc) {
    console.log(err);
    if (err) { return handleError(res, err); }
    else {
      var query2 = "SELECT sync_date date, count(1) AS TotalAdclick  FROM spicescreen.vuscreen_tracker where " + filter + "  and menu='AD'  GROUP BY date order by date "
      db.get().query(query2, function (err, doc1) {
        if (err) { return handleError(res, err); }
        else {
          var query3 = "SELECT sync_date date, count(1) as Totalclicks  FROM spicescreen.vuscreen_tracker where " + filter + "   GROUP BY date order by date "
          db.get().query(query3, function (err, doc2) {
            if (err) { return handleError(res, err); }

            else {
              var query4 = "SELECT a.sync_date date, COUNT(1) AS Totalpdfdownload FROM spicescreen.vuscreen_tracker AS a JOIN spicescreen.vuscreen_travel_content as b on a.view_id=b.content_id where " + filter + " and a.menu='PDFDOWNLOAD' GROUP BY date order by date "
              db.get().query(query4, function (err, doc3) {
                if (err) { return handleError(res, err); }
                else {
                  var query5 = "SELECT sync_date date, COUNT(DISTINCT mac) as wifiLogin FROM spicescreen.vuscreen_wifilogin WHERE " + filter + " GROUP BY date order by date "
              db.get().query(query5, function (err, doc4) {
                console.log(err);
                if (err) { return handleError(res, err); }
                else {

                let data = [doc, doc1, doc2, doc3, doc4]
                return res.status(200).json(data);
              }

              // return res.status(200).json(doc);
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

exports.hostwise_summary = function (req, res) {
  // var deswise_summary = function (req, res) {
  var days = [35, 28, 21, 14, 7]
  var beforeOneWeek;
  var day;
  var diffToMonday;
  var dayofweeks = [];
  var filter;
  var filter1;

  var startDate, endDate, hostId;
  // var version;
  if (req.query.hostId != "undefined" && req.query.hostId != "") {
    hostId = "'" + req.query.hostId + "'"
  } else {
    hostId = 'null'
  }
  // if (req.query.version != "undefined" && req.query.version != "") {
  //   version = "'" + req.query.version + "'"
  // } else {
  //   version = 'null'
  // }
  console.log(req.query.startDate)
  if (req.query.startDate) { startDate = moment(req.query.startDate).format('YYYY-MM-DD'); }
  if (req.query.endDate) { endDate = moment(req.query.endDate).format('YYYY-MM-DD'); }

  filter = " sync_date >= '" + startDate + "' AND sync_date <= '" + endDate + "' AND hostId = IFNULL(" + hostId + ",hostId)"
  filter1 = " sync_date >= '" + startDate + "' AND sync_date <= '" + endDate + "' AND host = IFNULL(" + hostId + ",host)"


  if (req.query.daysfilter != "undefined" && req.query.daysfilter != "" && typeof (req.query.daysfilter) != "undefined") {
    for (var i = 0; i < days.length; i++) {
      beforeOneWeek = new Date(new Date().getTime() - 60 * 60 * 24 * days[i] * 1000)
      day = beforeOneWeek.getDay()
      diffToMonday = beforeOneWeek.getDate() - day + (day === 0 ? -6 : 1)
      dayofweeks.push(moment(new Date(beforeOneWeek.setDate(diffToMonday + parseInt(req.query.daysfilter)))).format('YYYY-MM-DD'))
    };
    if (req.query.daysfilter == new Date().getDay() - 1) {
      dayofweeks.push(moment(new Date()).format('YYYY-MM-DD'))
    }

    filter = " sync_date IN " + JSON.stringify(dayofweeks).replace('[', '(').replace(']', ')')
    filter1 = " sync_date IN " + JSON.stringify(dayofweeks).replace('[', '(').replace(']', ')')


  }


  var query1 = "select sync_date date, count(distinct mac) as TotalHomepagelogin FROM spicescreen.vuscreen_tracker where " + filter + " and menu='SS' GROUP BY date order by date "

  // console.log(query1)
  db.get().query(query1, function (err, doc) {
    console.log(err);
    if (err) { return handleError(res, err); }
    else {
      var query2 = "SELECT sync_date date, count(1) AS TotalAdclick  FROM spicescreen.vuscreen_tracker where " + filter + "  and menu='AD'  GROUP BY date order by date "
      db.get().query(query2, function (err, doc1) {
        if (err) { return handleError(res, err); }
        else {
          var query3 = "SELECT sync_date date, count(1) as Totalclicks  FROM spicescreen.vuscreen_tracker where " + filter + "   GROUP BY date order by date "
          db.get().query(query3, function (err, doc2) {
            if (err) { return handleError(res, err); }

            else {
              var query4 = "SELECT a.sync_date date, COUNT(1) AS Totalpdfdownload FROM spicescreen.vuscreen_tracker AS a JOIN spicescreen.vuscreen_travel_content as b on a.view_id=b.content_id where " + filter + " and a.menu='PDFDOWNLOAD' GROUP BY date order by date "
              db.get().query(query4, function (err, doc3) {
                if (err) { return handleError(res, err); }
                else {
                  var query5 = "SELECT sync_date date, COUNT(DISTINCT mac) as wifiLogin FROM spicescreen.vuscreen_wifilogin WHERE " + filter1 + " GROUP BY date order by date "
              db.get().query(query5, function (err, doc4) {
                console.log(err);
                if (err) { return handleError(res, err); }
                else {
                let data = [doc, doc1, doc2, doc3, doc4]
                return res.status(200).json(data);
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


