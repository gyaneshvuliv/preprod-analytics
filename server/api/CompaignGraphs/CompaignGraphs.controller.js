'use strict';

var _ = require('lodash');
var db = require('../../config/mysql')
// var db_pp = require('../../config/mysql_pp')
var Action = require('../vuscreen/vuscreen.model');
var moment = require('moment');
var EM = require('../../config/email-dispatcher');
var NodeCache = require("node-cache");
var cachedData = new NodeCache({ stdTTL: 0 });
var mongoose = require('mongoose')
var json2csv = require('json2csv');
var fs = require('fs')
var config = require('../../config/environment');
var request = require('request');
var cronController = require('../cron/cron.controller');
var async = require('async');
const { user } = require('../../config/email-settings');
const { count } = require('../vuscreen/vuscreen.model');



//  Get list of top10 genre by Clicks//////////
exports.top_genres = function (req, res) {
  // var top_genre = function (req, res) {
  var startDate, endDate;
  if (req.query.startDate) { startDate = moment(req.query.startDate).format('YYYY-MM-DD'); }
  if (req.query.endDate) { endDate = moment(req.query.endDate).format('YYYY-MM-DD'); }


var query1="select distinct mac from vuscreen_tracker where menu='TRAVEL' and  sync_date>='" + startDate + "' AND sync_date<='" + endDate + "' "
db.get().query(query1, function (err, doc1) {
  console.log(err);
  if (err) { return handleError(res, err); }
 else{
var mac="('";
for(let i=0;i<doc1.length;i++){

mac+=doc1[i].mac;
if(doc1.length!=i+1){
  
  mac += "','" 
}
if(doc1.length==i+1){
  mac += "')"
}
}


  var query = "select "
  + " b.genre, count(1) Clicks"
  + " from"
  + "  vuscreen_tracker as a Join  vuscreen_content_package as b ON a.view_id = b.content_id"
  + " where "
  + " a.menu='WATCH' and a.type='video' and"
  + " a.sync_date>='" + startDate + "' AND a.sync_date<='" + endDate + "' "
  +" and a.mac in "+mac
  + " group by b.genre order by count(1) desc limit 10"
db.get().query(query, function (err, doc) {
  console.log(err);
  if (err) { return handleError(res, err); }
  console.log(doc);
  return res.status(200).json(doc);
})
 }
})
};
//   top_genre();

//  Get list of top10 content by Clicks////////////

exports.top_contents = function (req, res) {
  // var top_content = function (req, res) {
  var startDate, endDate;
  if (req.query.startDate) { startDate = moment(req.query.startDate).format('YYYY-MM-DD'); }
  if (req.query.endDate) { endDate = moment(req.query.endDate).format('YYYY-MM-DD'); }

  var query1="select distinct mac from vuscreen_tracker where menu='TRAVEL' and  sync_date>='" + startDate + "' AND sync_date<='" + endDate + "' "
db.get().query(query1, function (err, doc1) {
  console.log(err);
  if (err) { return handleError(res, err); }
 else{
var mac="('";
for(let i=0;i<doc1.length;i++){

mac+=doc1[i].mac;
if(doc1.length!=i+1){
  
  mac += "','"
}
if(doc1.length==i+1){
  mac += "')"
}
}

  var query = "select "
    + " b.title, count(1) Clicks"
    + " from"
    + "  vuscreen_tracker as a Join  vuscreen_content_package as b ON a.view_id = b.content_id"
    + " where "
    + " a.menu='WATCH' and a.type='video' and"
    + " a.sync_date>='" + startDate + "' AND a.sync_date<='" + endDate + "' "
    +" and a.mac in "+mac
    + " group by b.title order by count(1) desc limit 10"
  db.get().query(query, function (err, doc) {
    if (err) { return handleError(res, err); }
    return res.status(200).json(doc);
  })
}
})
};
//   top_content();

//  Get list of top10 Food&Beverage by Clicks////////////
exports.top_foods = function (req, res) {
  // var top_food = function (req, res) {
  var startDate, endDate;
  if (req.query.startDate) { startDate = moment(req.query.startDate).format('YYYY-MM-DD'); }
  if (req.query.endDate) { endDate = moment(req.query.endDate).format('YYYY-MM-DD'); }

  var query1="select distinct mac from vuscreen_tracker where menu='TRAVEL' and  sync_date>='" + startDate + "' AND sync_date<='" + endDate + "' "
db.get().query(query1, function (err, doc1) {
  console.log(err);
  if (err) { return handleError(res, err); }
 else{
var mac="('";
for(let i=0;i<doc1.length;i++){

mac+=doc1[i].mac;
if(doc1.length!=i+1){
  
  mac += "','"
}
if(doc1.length==i+1){
  mac += "')"
}
}

  var query = "select "
    + " b.title, count(1) Clicks"
    + " from"
    + "  vuscreen_tracker as a Join  vuscreen_fnb_content as b ON a.view_id = b.content_id"
    + " where "
    + " a.menu='FNB' and"
    + " a.sync_date>='" + startDate + "' AND a.sync_date<='" + endDate + "' "
    +" and a.mac in "+mac
    + " group by b.title order by count(1) desc limit 10"
  db.get().query(query, function (err, doc) {
    if (err) { return handleError(res, err); }
    return res.status(200).json(doc);
  })
}
})
};
//   top_food();

// Get wifiogin in timezone/////
exports.timeZoneWiseWIFILogins = function (req, res) {
  // var timeZoneWiseWIFILogin = function () {
    var startDate, endDate;
    if (req.query.startDate) { startDate = moment(req.query.startDate).format('YYYY-MM-DD'); }
    if (req.query.endDate) { endDate = moment(req.query.endDate).format('YYYY-MM-DD'); }
      var query = "SELECT sync_datetime as time, COUNT(DISTINCT mac) AS user FROM  vuscreen_tracker WHERE menu = 'TRAVEL'AND sync_date>='"+startDate+"' and sync_date<='"+endDate+"'  group by  sync_datetime order by user desc limit 10"
    db.get().query(query, function (err, doc) {
    console.log(err);
      if (err) { return handleError(res, err); }
      console.log(doc);
      return res.status(200).json(doc);
    })
};
// timeZoneWiseWIFILogin()

 

////////Get Destination wise wifilogin/////////////////
exports.destinationWiseUsers = function (req, res) {
  // var destinationWiseWIFILogin = function () {
    var startDate, endDate;
  if (req.query.startDate) { startDate = moment(req.query.startDate).format('YYYY-MM-DD'); }
  if (req.query.endDate) { endDate = moment(req.query.endDate).format('YYYY-MM-DD'); }
    var query = "SELECT b.name as destination, COUNT(DISTINCT mac) AS user FROM  vuscreen_tracker as a join  vuscreen_city as b on a.destination=b.code WHERE sync_date >= '" + startDate + "' AND sync_date <= '"+ endDate +"' GROUP BY b.name ORDER BY user DESC LIMIT 10"
  db.get().query(query, function (err, doc) {
  console.log(err);
    if (err) { return handleError(res, err); }
    console.log(doc);
    return res.status(200).json(doc);
  })
};



exports.compaignswise_summarys = function (req, res) {
  // var deswise_summary = function (req, res) {
  var days = [35, 28, 21, 14, 7]
  var beforeOneWeek;
  var day;
  var diffToMonday;
  var dayofweeks = [];
  var filter;
  var startDate, endDate, title;
  var version;
  if (req.query.title != "undefined" && req.query.title != "") {
    title = "'" + req.query.title + "'"
  } else {
    title = 'null'
  }
  if (req.query.version != "undefined" && req.query.version != "") {
    version = "'" + req.query.version + "'"
  } else {
    version = 'null'
  }
  console.log(req.query.startDate)
  if (req.query.startDate) { startDate = moment(req.query.startDate).format('YYYY-MM-DD'); }
  if (req.query.endDate) { endDate = moment(req.query.endDate).format('YYYY-MM-DD'); }

  filter = " sync_date >= '" + startDate + "' AND sync_date <= '" + endDate + "' AND version = IFNULL(" + version + ",version) " + " AND b.title = IFNULL(" + title + ",b.title)"
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

    filter = " version = IFNULL(" + version + ",version) "
      + "   AND sync_date IN " + JSON.stringify(dayofweeks).replace('[', '(').replace(']', ')')

  }


  var query1 = "SELECT sync_date date, count(distinct mac) as users FROM  vuscreen_tracker AS a JOIN  vuscreen_travel_content AS b ON a.view_id = b.content_id where " + filter + " and a.menu='TRAVEL' GROUP BY date order by date"

  // console.log(query1)
  db.get().query(query1, function (err, doc) {
    console.log(err);
    if (err) { return handleError(res, err); }
    else {
      var query2 = "SELECT sync_date date, count(1) as clicks FROM  vuscreen_tracker AS a JOIN  vuscreen_travel_content AS b ON a.view_id = b.content_id where " + filter + " and a.menu='TRAVEL' GROUP BY date order by date"
      db.get().query(query2, function (err, doc1) {
        if (err) { return handleError(res, err); }
        else {
          var query3 = "SELECT sync_date date, count(1) as Totalpdfdownload FROM  vuscreen_tracker AS a JOIN  vuscreen_travel_content AS b ON a.view_id = b.content_id where " + filter + " and a.menu='PDFDOWNLOAD' GROUP BY date order by date"
          db.get().query(query3, function (err, doc2) {
            if (err) { return handleError(res, err); }

            else {
              var query4 = "SELECT a.sync_date date, count(distinct mac) AS Totalpdfuser FROM  vuscreen_tracker AS a JOIN  vuscreen_travel_content as b on a.view_id=b.content_id where " + filter + " and a.menu='PDFDOWNLOAD' GROUP BY date order by date "
              db.get().query(query4, function (err, doc3) {
                if (err) { return handleError(res, err); }

                let data = [doc, doc1, doc2, doc3]
                return res.status(200).json(data);
              })

              // return res.status(200).json(doc);
            }

          })
        }

      })
    }
  })
}

////////////////////////////////campaigns tracker///////////////////////
exports.top_genress = function (req, res) {
  // var top_genre = function (req, res) {
  var startDate= '2021-02-27';
  var endDate = '2021-04-05';
  // if (req.query.startDate) { startDate = moment(req.query.startDate).format('YYYY-MM-DD'); }
  // if (req.query.endDate) { endDate = moment(req.query.endDate).format('YYYY-MM-DD'); }


var query1="SELECT distinct mac FROM vuscreen_tracker as a join  vuscreen_travel_content as b on a.view_id=b.content_id WHERE a.menu = 'TRAVEL'and b.content_id in ('1604', '1729') AND a.sync_date >= '" + startDate + "' AND a.sync_date <= '" + endDate + "' "
db.get().query(query1, function (err, doc1) {
  console.log(err);
  if (err) { return handleError(res, err); }
 else{
var mac="('";
for(let i=0;i<doc1.length;i++){

mac+=doc1[i].mac;
if(doc1.length!=i+1){
  
  mac += "','"
}
if(doc1.length==i+1){
  mac += "')"
}
}


  var query = "select "
  + " b.genre, count(1) Clicks"
  + " from"
  + "  vuscreen_tracker as a Join  vuscreen_content_package as b ON a.view_id = b.content_id"
  + " where "
  + " a.menu='WATCH' and a.type='video' and"
  + " a.sync_date>='" + startDate + "' AND a.sync_date<='" + endDate + "' "
  +" and a.mac in "+mac
  + " group by b.genre order by count(1) desc limit 11"
db.get().query(query, function (err, doc) {
  console.log(err);
  if (err) { return handleError(res, err); }
  console.log(doc);
  // return res.status(200).json(doc);
})
 }
})
};

// top_genre();

exports.top_contentss = function (req, res) {
  // var top_content = function (req, res) {
    var startDate= '2021-02-27';
    var endDate = '2021-04-05';
  // if (req.query.startDate) { startDate = moment(req.query.startDate).format('YYYY-MM-DD'); }
  // if (req.query.endDate) { endDate = moment(req.query.endDate).format('YYYY-MM-DD'); }

  var query1="SELECT distinct mac FROM vuscreen_tracker as a join  vuscreen_travel_content as b on a.view_id=b.content_id WHERE a.menu = 'TRAVEL'and b.content_id in ('1604', '1729') AND a.sync_date >= '" + startDate + "' AND a.sync_date <= '" + endDate + "' "
db.get().query(query1, function (err, doc1) {
  console.log(err);
  if (err) { return handleError(res, err); }
 else{
  //  console.log(doc1);
var mac="('";
for(let i=0;i<doc1.length;i++){

mac+=doc1[i].mac;
if(doc1.length!=i+1){
  
  mac += "','"
}
if(doc1.length==i+1){
  mac += "')"
}
}

  var query = "select "
    + " b.title, count(1) Clicks"
    + " from"
    + "  vuscreen_tracker as a Join  vuscreen_content_package as b ON a.view_id = b.content_id"
    + " where "
    + " a.menu='WATCH' and a.type='video' and"
    + " a.sync_date>='" + startDate + "' AND a.sync_date<='" + endDate + "' "
    +" and a.mac in "+mac
    + " group by b.title order by count(1) desc limit 10"
  db.get().query(query, function (err, doc) {
    console.log(err)
    if (err) { return handleError(res, err); }
    
    console.log(doc);
    // return res.status(200).json(doc);
  })
}
})
};
// top_content();

exports.top_foodss = function (req, res) {
  // var top_food = function (req, res) {
    var startDate= '2021-02-27';
    var endDate = '2021-04-05';
  // if (req.query.startDate) { startDate = moment(req.query.startDate).format('YYYY-MM-DD'); }
  // if (req.query.endDate) { endDate = moment(req.query.endDate).format('YYYY-MM-DD'); }

  var query1="SELECT distinct mac FROM vuscreen_tracker as a join  vuscreen_travel_content as b on a.view_id=b.content_id WHERE a.menu = 'TRAVEL'and b.content_id in ('1604', '1729') AND a.sync_date >= '" + startDate + "' AND a.sync_date <= '" + endDate + "' "
db.get().query(query1, function (err, doc1) {
  console.log(err);
  if (err) { return handleError(res, err); }
 else{
var mac="('";
for(let i=0;i<doc1.length;i++){

mac+=doc1[i].mac;
if(doc1.length!=i+1){
  
  mac += "','"
}
if(doc1.length==i+1){
  mac += "')"
}
}

  var query = "select "
    + " b.title, count(1) Clicks"
    + " from"
    + "  vuscreen_tracker as a Join  vuscreen_fnb_content as b ON a.view_id = b.content_id"
    + " where "
    + " a.menu='FNB' and"
    + " a.sync_date>='" + startDate + "' AND a.sync_date<='" + endDate + "' "
    +" and a.mac in "+mac
    + " group by b.title order by count(1) desc limit 10"
  db.get().query(query, function (err, doc) {
    console.log(err)
    if (err) { return handleError(res, err); }
    console.log(doc)
    // return res.status(200).json(doc);
  })
}
})
};
// top_food();