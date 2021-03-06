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



/*  
    @Authentication ----> by session key
    @Authorization ----> Access Controll Logic
    Author : Kedar Gadre
    Date : 15/08/2018
    Modified_by : Kedar Gadre
    Modification Date : 15/08/2018
*/
exports.get_serverclient_datewise = function (req, res) {

  var days = [35, 28, 21, 14, 7]
  var beforeOneWeek;
  var day;
  var diffToMonday;
  var dayofweeks = [];
  var filter;
  var startDate, endDate;
  var version;

  if (req.query.version != "undefined" && req.query.version != "") {
    version = "'" + req.query.version + "'"
  } else {
    version = 'null'
  }

  if (req.query.startDate) { startDate = moment(req.query.startDate).format('YYYY-MM-DD'); }
  if (req.query.endDate) { endDate = moment(req.query.endDate).format('YYYY-MM-DD'); }
  filter = " sync_date >= '" + startDate + "' AND sync_date <= '" + endDate + "' AND version = IFNULL(" + version + ",version) "
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
  var query = "SELECT sync_date date,"
    + "      count(1) server"
    + " FROM vuscreen_events "
    + " where " + filter + " AND partner = '" + req.user.partner_id + "' AND user = 'server' AND event = 'start'"
    + " GROUP BY date order by date";

  db.get().query(query, function (err, doc) {
    if (err) { return handleError(res, err); }
    else {
      var query1 = "SELECT sync_date date,"
        + "      count(distinct mac) client"
        + " FROM vuscreen_tracker "
        + " where " + filter + " AND partner = '" + req.user.partner_id + "'"
        + " GROUP BY date order by date";
      db.get().query(query1, function (err, doc1) {
        if (err) { return handleError(res, err); }
        var data = [doc, doc1]
        return res.status(200).json(data);
      })
    };
  })
};

/*  
    @Authentication ----> by session key
    @Authorization ----> Access Controll Logic
    Author : Kedar Gadre
    Date : 15/08/2018
    Modified_by : Kedar Gadre
    Modification Date : 15/08/2018
*/
exports.get_serverclient_hourwise = function (req, res) {
  var days = [35, 28, 21, 14, 7]
  var beforeOneWeek;
  var day;
  var diffToMonday;
  var dayofweeks = [];
  var filter;
  var version;
  if (req.query.version != "undefined" && req.query.version != "") {
    version = "'" + req.query.version + "'"
  } else {
    version = 'null'
  }
  var startDate, endDate;
  if (req.query.startDate) { startDate = moment(req.query.startDate).format('YYYY-MM-DD'); }
  if (req.query.endDate) { endDate = moment(req.query.endDate).format('YYYY-MM-DD'); }
  filter = " sync_date >= '" + startDate + "' AND sync_date <= '" + endDate + "' AND version = IFNULL(" + version + ",version) "
  if (req.query.daysfilter != "undefined" && req.query.daysfilter != "") {
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
      + "  sync_date IN " + JSON.stringify(dayofweeks).replace('[', '(').replace(']', ')')


  }


  var query = "SELECT DATE_FORMAT(sync_datetime, '%Y-%m-%d') date,"
    + "      DATE_FORMAT(sync_datetime,'%H') hourRange,"
    + "      count(1) server"
    + " FROM vuscreen_events "
    + " where " + filter + " AND partner = '" + req.user.partner_id + "'  AND user = 'server' AND event = 'start'"
    + " GROUP BY hourRange,date order by date , hourRange";
  db.get().query(query, function (err, doc) {
    if (err) { return handleError(res, err); }
    else {
      var query1 = "SELECT DATE_FORMAT(sync_datetime, '%Y-%m-%d') date,"
        + "      DATE_FORMAT(sync_datetime,'%H') hourRange,"
        + "      count(distinct mac) client"
        + " FROM vuscreen_tracker "
        + " where " + filter + " AND partner = '" + req.user.partner_id + "'"
        + " GROUP BY hourRange,date order by date , hourRange";
      db.get().query(query1, function (err, doc1) {
        if (err) { return handleError(res, err); }
        var data = [doc, doc1]
        return res.status(200).json(data);
      })
    }
  })
};


/*  
    @Authentication ----> by session key
    @Authorization ----> Access Controll Logic
    Author : Kedar Gadre
    Date : 15/08/2018
    Modified_by : Kedar Gadre
    Modification Date : 15/08/2018
*/
exports.get_fileplayshare_hourwise = function (req, res) {
  var days = [35, 28, 21, 14, 7]
  var beforeOneWeek;
  var day;
  var diffToMonday;
  var dayofweeks = [];
  var filter;
  var version;
  if (req.query.version != "undefined" && req.query.version != "") {
    version = "'" + req.query.version + "'"
  } else {
    version = 'null'
  }
  var startDate, endDate;
  if (req.query.startDate) { startDate = moment(req.query.startDate).format('YYYY-MM-DD'); }
  if (req.query.endDate) { endDate = moment(req.query.endDate).format('YYYY-MM-DD'); }
  filter = " sync_date >= '" + startDate + "' AND sync_date <= '" + endDate + "' AND version = IFNULL(" + version + ",version) "
  if (req.query.daysfilter != "undefined" && req.query.daysfilter != "") {
    for (var i = 0; i < days.length; i++) {
      beforeOneWeek = new Date(new Date().getTime() - 60 * 60 * 24 * days[i] * 1000)
      day = beforeOneWeek.getDay()
      diffToMonday = beforeOneWeek.getDate() - day + (day === 0 ? -6 : 1)
      dayofweeks.push(moment(new Date(beforeOneWeek.setDate(diffToMonday + parseInt(req.query.daysfilter)))).format('YYYY-MM-DD'))
    };
    if (req.query.daysfilter == new Date().getDay() - 1) {
      dayofweeks.push(moment(new Date()).format('YYYY-MM-DD'))
    }

    filter = " version = IFNULL(" + version + ",version) AND "
      + "  sync_date IN " + JSON.stringify(dayofweeks).replace('[', '(').replace(']', ')')


  }


  var query = "SELECT DATE_FORMAT(sync_datetime, '%Y-%m-%d') date,"
    + "      DATE_FORMAT(sync_datetime,'%H') hourRange,"
    + "      count(1) server"
    + " FROM vuscreen_tracker "
    + " where " + filter + " AND type= 'video' AND view_duration>0 AND partner= '" + req.user.partner_id + "'"
    + " GROUP BY hourRange,date order by date , hourRange";

  db.get().query(query, function (err, doc) {
    if (err) { return handleError(res, err); }
    else {
      var query1 = "SELECT DATE_FORMAT(sync_datetime, '%Y-%m-%d') date,"
        + "      DATE_FORMAT(sync_datetime,'%H') hourRange,"
        + "      ROUND(SUM(view_duration/60000)) client"
        + " FROM vuscreen_tracker "
        + " where " + filter + " AND type= 'video' AND view_duration>0 AND partner = '" + req.user.partner_id + "'"
        + " GROUP BY hourRange,date order by date , hourRange";
      db.get().query(query1, function (err, doc1) {
        if (err) { return handleError(res, err); }
        var data = [doc, doc1]
        return res.status(200).json(data);
      })
    }
  })
};


// Get list of server sessions logs
var vuscreen_getAllData_Pagination = function (req, cb) {
  var startDate = 'null', endDate = 'null';
  if (req.query.startDate) { startDate = moment(req.query.startDate).format('YYYY-MM-DD'); }
  if (req.query.endDate) { endDate = moment(req.query.endDate).format('YYYY-MM-DD'); }
  var filter = '';

  if (req.query.session_id) { filter = " AND A.session_id ='" + req.query.session_id + "'" }
  if (req.query.vehicle_no) { filter = " AND C.vehicle_no ='" + req.query.vehicle_no + "'" }
  if (req.query.device_id) { filter = " AND A.device_id ='" + req.query.device_id + "'" }
  // if (req.query.region) {filter = " AND region ='"+req.query.region+"'"}
  // if (req.query.uid) {filter = " AND uid ='"+req.query.uid+"'"}  

  var query = " select "
    + " A.id,"
    + " A.session_id,"
    + " A.device_id,"
    + " A.started_at,"
    + " C.vehicle_no,"
    + " C.partner,"
    + " C.reg_id,"
    + " C.source,"
    + " C.destination,"
    + " C.seat_start,"
    + " C.seat_end,"
    + " B.client_connected,"
    + " B.client_disconnected,"
    + " D.connected,"
    + " D.videoPlayed,"
    + " D.total_duration,"
    + " E.end_at"
    + " from"
    + " (select "
    + " A.id,"
    + " A.session_id,"
    + " A.device_id,"
    + " A.reg_id,"
    + " A.sync_datetime started_at"
    + " FROM"
    + " vuscreen_events A"
    + " join vuscreen_registration C ON A.reg_id = C.reg_id"
    + " where"
    + " user = 'server' and event = 'start') A"
    + " LEFT JOIN"
    + " (select "
    + " session_id,"
    + " reg_id,"
    + " sum(case"
    + " when user = 'client' and event = 'connected' then 1"
    + " else 0"
    + " end) client_connected,"
    + " sum(case"
    + " when"
    + " user = 'client'"
    + " and event = 'disconnected'"
    + " then"
    + " 1"
    + " else 0"
    + " end) client_disconnected"
    + " FROM"
    + " vuscreen_events"
    + " GROUP BY session_id , reg_id) B ON A.session_id = B.session_id"
    + " and A.reg_id = B.reg_id"
    + "  LEFT JOIN"
    + " (select "
    + " session_id,"
    + " reg_id,"
    + " count(distinct mac) connected,"
    + " count(1) videoPlayed,"
    + " ROUND(SUM(view_duration /60000)) total_duration"
    + " FROM"
    + " vuscreen_tracker"
    + "  GROUP BY session_id , reg_id) D ON A.session_id = D.session_id"
    + " and A.reg_id = D.reg_id"
    + " join"
    + " vuscreen_registration C ON A.reg_id = C.reg_id"
    + " left join"
    + " (select "
    + " session_id, reg_id, sync_datetime end_at"
    + " FROM"
    + " vuscreen_events"
    + " where"
    + "  user = 'server' and event = 'stop') E ON A.session_id = E.session_id"
    + " and A.reg_id = E.reg_id"
    + " where"
    + " C.partner = '" + req.user.partner_id + "'"
    + " AND DATE_FORMAT(A.started_at, '%Y-%m-%d') >= '" + startDate + "'"
    + " AND DATE_FORMAT(A.started_at, '%Y-%m-%d') <= '" + endDate + "'" + filter
    + " order by id desc"
  var option = { draw: req.query.draw, start: req.query.start, length: req.query.length };
  db.pagination(query, option, function (err, doc) {
    return cb(err, doc);
  })
};

// Get list of registered users
exports.vuscreen_index = function (req, res) {
  vuscreen_getAllData_Pagination(req, function (err, doc) {
    if (err) { return handleError(res, err); }
    return res.status(200).json(doc);
  })
};

//export csv function for  registered user
exports.vuscreen_export_csv = function (req, res) {
  var fields = ["session_id", "device_id", "started_at", "end_at", "vehicle_no", "source", "destination", "connected", "videoPlayed", "total_duration"];
  var fieldversions = ["session_id", "device_id", "started_at", "end_at", "vehicle_no", "source", "destination", "connected", "videoPlayed", "total_duration"];

  var name = 'server_sessions_' + (moment(new Date()).format('YYYY-MM-DD')).toString()
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-disposition', 'attachment;filename=' + name + '.csv');
  res.write(fields.join(","));

  function pagination() {
    vuscreen_getAllData_Pagination(req, function (err, doc) {
      if (doc.data.length > 0) {
        req.query.start = parseInt(req.query.start) + parseInt(req.query.length);
        var row = '';
        for (var i = 0; i < doc.data.length; i++) {
          var json = doc.data[i];
          var col = '';
          for (var x = 0; x < fields.length; x++) {
            var val = json[fields[x]];
            if (val) {
              val = val.toString().replace(/,/g, ' ').replace(/"/g, ' ');
            }
            if (val == '' || typeof (val) == 'undefined' || val == null) { val = ' '; };
            // if (fields[x] == 'started_at') { val =  moment(val).format('YYYY-MM-DD HH:mm:ss ').toString() };

            if (col == '') {
              col = val;
            } else {
              col = col + ',' + val;
            }
          };
          if (row == '') { row = col; }
          else { row = row + '\r\n' + col; }
        };
        res.write('\r\n');
        res.write(row);
        pagination();
      } else {
        res.end();
      }
    })
  }
  pagination();
}


// Get list of registered logs
var vuscreen_getAllRegData_Pagination = function (req, cb) {
  var startDate = 'null', endDate = 'null';
  if (req.query.startDate) { startDate = moment(req.query.startDate).format('YYYY-MM-DD'); }
  if (req.query.endDate) { endDate = moment(req.query.endDate).format('YYYY-MM-DD'); }
  var filter = '';

  if (req.query.device_id) { filter = " AND device_id ='" + req.query.device_id + "'" }
  //if (req.query.interface) {filter = " AND interface ='"+req.query.interface+"'"}
  //if (req.query.version) {filter = " AND version ='"+req.query.version+"'"}
  if (req.query.vehicle_no) { filter = " AND vehicle_no ='" + req.query.vehicle_no + "'" }
  if (req.query.reg_id) { filter = " AND reg_id ='" + req.query.reg_id + "'" }

  var query = "select * from vuscreen_registration"
    + " where partner = '" + req.user.partner_id + "' AND sync_date >= '" + startDate + "' AND sync_date <= '" + endDate + "'" + filter
    + " order by sync_datetime desc"
  var option = { draw: req.query.draw, start: req.query.start, length: req.query.length };
  // 
  db.pagination(query, option, function (err, doc) {
    return cb(err, doc);
  })
};

// Get list of registered users
exports.vuscreen_registration_index = function (req, res) {
  vuscreen_getAllRegData_Pagination(req, function (err, doc) {
    if (err) { return handleError(res, err); }
    return res.status(200).json(doc);
  })
};


//export csv function for  registered user
exports.vuscreen_registration_export_csv = function (req, res) {
  var fields = ["reg_id", "vehicle_no", "device_id", "source", "destination", "seat_start", "seat_end", "model", "interface", "os_version", "sync_datetime", "sdcard_name", "sdcard_no", "owner_email", "owner_name", "owner_no", "driver_name", "driver_no", "helper_name", "helper_no"];
  var fieldversions = ["reg_id", "vehicle_no", "device_id", "source", "destination", "seat_start", "seat_end", "model", "interface", "os_version", "sync_datetime", "sdcard_name", "sdcard_no", "owner_email", "owner_name", "owner_no", "driver_name", "driver_no", "helper_name", "helper_no"];

  var name = 'registered_' + (moment(new Date()).format('YYYY-MM-DD')).toString()
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-disposition', 'attachment;filename=' + name + '.csv');
  res.write(fields.join(","));

  function pagination() {
    vuscreen_getAllRegData_Pagination(req, function (err, doc) {
      if (doc.data.length > 0) {
        req.query.start = parseInt(req.query.start) + parseInt(req.query.length);
        var row = '';
        for (var i = 0; i < doc.data.length; i++) {
          var json = doc.data[i];
          var col = '';
          for (var x = 0; x < fields.length; x++) {
            var val = json[fields[x]];
            if (val) {
              val = val.toString().replace(/,/g, ' ').replace(/"/g, ' ');
            }
            if (val == '' || typeof (val) == 'undefined' || val == null) { val = ' '; };
            if (fields[x] == 'sync_datetime') { val = moment(val).format('YYYY-MM-DD HH:mm:ss ').toString() };
            if (col == '') {
              col = val;
            } else {
              col = col + ',' + val;
            }
          };
          if (row == '') { row = col; }
          else { row = row + '\r\n' + col; }
        };
        res.write('\r\n');
        res.write(row);
        pagination();
      } else {
        res.end();
      }
    })
  }
  pagination();
}


// Get list of events logs
var vuscreen_getAllEventsData_Pagination = function (req, cb) {
  var startDate = 'null', endDate = 'null';
  if (req.query.startDate) { startDate = moment(req.query.startDate).format('YYYY-MM-DD'); }
  if (req.query.endDate) { endDate = moment(req.query.endDate).format('YYYY-MM-DD'); }
  var filter = '';

  if (req.query.device_id) { filter = " AND ve.device_id ='" + req.query.device_id + "'" }
  if (req.query.interface) { filter = " AND ve.interface ='" + req.query.interface + "'" }
  if (req.query.version) { filter = " AND ve.version ='" + req.query.version + "'" }
  if (req.query.session_id) { filter = " AND ve.session_id ='" + req.query.session_id + "'" }
  if (req.query.user) { filter = " AND ve.user ='" + req.query.user + "'" }
  if (req.query.event) { filter = " AND ve.event ='" + req.query.event + "'" }
  if (req.query.vehicle_no) { filter = " AND vr.vehicle_no ='" + req.query.vehicle_no + "'" }
  if (req.query.reg_id) { filter = " AND vr.reg_id ='" + req.query.reg_id + "'" }

  var query = "select "
    + " ve.reg_id,ve.session_id,ve.device_id,ve.user,ve.event,ve.model,ve.interface,ve.version,ve.view_datetime,ve.sync_datetime,vr.source,vr.destination,vr.vehicle_no"
    + " from vuscreen_events ve LEFT JOIN vuscreen_content_package vc ON ve.view_id = vc.content_id"
    + " LEFT JOIN vuscreen_registration vr ON ve.reg_id = vr.reg_id"
    + " where ve.partner = '" + req.user.partner_id + "' AND ve.sync_date >= '" + startDate + "' AND ve.sync_date <= '" + endDate + "'" + filter
    + " order by ve.sync_datetime desc"

  var query = "select "
    + " ve.partner,"
    + " ve.reg_id,"
    + " ve.session_id,"
    + " ve.device_id,"
    + " ve.user,"
    + " ve.event,"
    + " ve.battery_level,"
    + " ve.number_of_unique_user,"
    + " ve.view_type,"
    + " ve.model,"
    + " ve.interface,"
    + " ve.package,"
    + " ve.version,"
    + " ve.view_datetime,"
    + " ve.sync_datetime,"
    + " ve.view_date,"
    + " DATE_FORMAT(ve.view_datetime, '%H:%i:%s') view_time,"
    + " ve.sync_date,"
    + " DATE_FORMAT(ve.sync_datetime, '%H:%i:%s') sync_time,"
    + " ve.source,"
    + " ve.destination,"
    + " vr.vehicle_no,"
    + " ve.view_id,"
    + " ve.tracking_id,"
    + " ve.latitude,"
    + " ve.longitude,"
    + " ve.sync_latitude,"
    + " ve.sync_longitude,"
    + " ve.journey_id,"
    + " ve.sync_type,"
    + " ve.unique_mac_address,"
    + "ve.home_page_user"
    + " from"
    + " vuscreen_events ve"
    + " LEFT JOIN"
    + " vuscreen_registration vr ON ve.reg_id = vr.reg_id"
    + " where"
    + " ve.partner = '" + req.user.partner_id + "'"
    + " AND ve.sync_date >= '" + startDate + "' AND ve.sync_date <= '" + endDate + "'" + filter
    + " order by ve.view_datetime desc,ve.sync_datetime"
  var option = { draw: req.query.draw, start: req.query.start, length: req.query.length };
  db.pagination(query, option, function (err, doc) {
    return cb(err, doc);
  })
};

// Get list of event bottom logs
exports.vuscreen_getEventData_Bottom = function (req, res) {
  var startDate = 'null', endDate = 'null';
  if (req.query.startDate) { startDate = moment(req.query.startDate).format('YYYY-MM-DD'); }
  if (req.query.endDate) { endDate = moment(req.query.endDate).format('YYYY-MM-DD'); }
  var query = "select (SELECT count(distinct device_id) FROM spicescreen.vuscreen_events where sync_date>='" + startDate + "' AND sync_date<='" + endDate + "' ) totalhost,"
    + "(SELECT COUNT(DISTINCT a.journey_id) FROM spicescreen.vuscreen_events a  JOIN vuscreen_registration b ON a.device_id = b.device_id WHERE a.sync_date>='" + startDate + "' AND a.sync_date<='" + endDate + "'  and a.event like '%start%')StartCycle,"
    + "(SELECT COUNT(DISTINCT a.journey_id) FROM spicescreen.vuscreen_events a  JOIN vuscreen_registration b ON a.device_id = b.device_id WHERE a.sync_date>='" + startDate + "' AND a.sync_date<='" + endDate + "'  and a.event like '%stop%')StopCycle"

  db.get().query(query, function (err, doc) {
    if (err) { return handleError(res, err); }
    else {
      var query1 = "SELECT distinct b.vehicle_no, a.event, a.view_datetime, a.journey_id,unique_mac_address FROM spicescreen.vuscreen_events a JOIN vuscreen_registration b ON a.device_id = b.device_id WHERE  a.sync_date>='" + startDate + "' AND a.sync_date<='" + endDate + "' and  a.event != 'download' AND a.event != 'charging' ORDER BY a.id DESC"

      db.get().query(query1, function (err, today) {
        if (err) { return handleError(res, err); }
        else {
          var today_user = 0

          var data = ""
          let wifiMap = new Map();
          // let a =  []

          for (let i = 0; i < today.length; i++) {
            data += today[i].unique_mac_address + ",";
            // console.log(doc[i].unique_mac_address)

            if (today.length == i + 1) {
              var data1 = data.split(',');
              // console.log(data1.length);

              for (let j = 0; j < data1.length; j++) {
                const element = data1[j];

                wifiMap.set(element, element)



              }
              // console.log(wifiMap);
              //  console.log(wifiMap.size)
              today_user = wifiMap.size
            }
          }
          doc[0].totaluser = today_user
          console.log(doc);

          return res.status(200).json(doc);
        }
      })
    }
  })
};
// Get list of events logs
exports.vuscreen_events_index = function (req, res) {
  vuscreen_getAllEventsData_Pagination(req, function (err, doc) {
    if (err) { return handleError(res, err); }
    else
      return res.status(200).json(doc);

  })
};


//export csv function for  events logs
exports.vuscreen_events_export_csv = function (req, res) {
  // var fields = ["journey_id", "vehicle_no", "reg_id", "user", "event", "model", "view_date", "view_time", "sync_date", "sync_time", "latitude", "longitude", "sync_latitude", "sync_longitude", "sync_type"];
  // var fieldversions = ["journey_id", "vehicle_no", "reg_id", "user", "event", "model", "view_date", "view_time", "sync_date", "sync_time", "latitude", "longitude", "sync_latitude", "sync_longitude", "sync_type"];
  var fields = ["vehicle_no", "source", "destination", "sync_date", "sync_time", "view_date", "view_time", "unique_mac_address", "event", "battery_level", "number_of_unique_user", "home_page_user","journey_id", "latitude", "longitude", "sync_latitude", "sync_longitude", "sync_type", "model", "reg_id","version"];
  var fieldversions = ["vehicle_no", "source", "destination", "sync_date", "sync_time", "view_date", "view_time", "unique_mac_address", "event", "battery_level", "number_of_unique_user","home_page_user" ,"journey_id", "latitude", "longitude", "sync_latitude", "sync_longitude", "sync_type", "model", "reg_id","version"];
  var name = 'events_' + (moment(new Date()).format('YYYY-MM-DD')).toString()
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-disposition', 'attachment;filename=' + name + '.csv');
  res.write(fields.join(","));

  function pagination() {
    vuscreen_getAllEventsData_Pagination(req, function (err, doc) {
      if (doc.data.length > 0) {
        req.query.start = parseInt(req.query.start) + parseInt(req.query.length);
        var row = '';
        for (var i = 0; i < doc.data.length; i++) {

          var sp = doc.data[i].event.split("|");

          if (sp.length == 1) {
            doc.data[i].event = sp[0];
            doc.data[i].battery = "-";
            doc.data[i].userConnected = "-";
          }
          if (sp.length == 2) {
            doc.data[i].event = sp[0];
            doc.data[i].battery = sp[1];
            doc.data[i].userConnected = "-";
          }
          if (sp.length == 3) {
            doc.data[i].event = sp[0];
            doc.data[i].battery = sp[1];
            doc.data[i].userConnected = sp[2];
          }
          var json = doc.data[i];

          var col = '';
          for (var x = 0; x < fields.length; x++) {
            var val = json[fields[x]];
            if (val) {
              val = val.toString().replace(/,/g, ' ').replace(/"/g, ' ');
            }
            if (val == '' || typeof (val) == 'undefined' || val == null) { val = ' '; };
            if (fields[x] == 'sync_datetime') { val = moment(val).format('YYYY-MM-DD HH:mm:ss ').toString() };
            if (col == '') {
              col = val;
            } else {
              col = col + ',' + val;
            }
          };
          if (row == '') { row = col; }
          else { row = row + '\r\n' + col; }
        };
        res.write('\r\n');
        res.write(row);
        pagination();
      } else {
        res.end();
      }
    })
  }
  pagination();
}

// Get list of tracker logs
var vuscreen_getAlTrackerData_Pagination = function (req, cb) {
  var startDate = 'null', endDate = 'null';
  if (req.query.startDate) { startDate = moment(req.query.startDate).format('YYYY-MM-DD'); }
  if (req.query.endDate) { endDate = moment(req.query.endDate).format('YYYY-MM-DD'); }
  var filter = '';
  if (req.query.mac) { filter = " AND vst.mac ='" + req.query.mac + "'" }
  if (req.query.device_id) { filter = " AND vst.device_id ='" + req.query.device_id + "'" }
  if (req.query.interface) { filter = " AND vst.interface ='" + req.query.interface + "'" }
  if (req.query.version) { filter = " AND vst.version ='" + req.query.version + "'" }
  if (req.query.session_id) { filter = " AND vst.session_id ='" + req.query.session_id + "'" }
  if (req.query.genre) { filter = " AND vc.genre ='" + req.query.genre + "'" }
  if (req.query.type) { filter = " AND vst.type ='" + req.query.type + "'" }
  if (req.query.vehicle_no) { filter = " AND vr.vehicle_no ='" + req.query.vehicle_no + "'" }
  if (req.query.reg_id) { filter = " AND vr.reg_id ='" + req.query.reg_id + "'" }

  var query = "select "
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
    + " DATE_FORMAT(vst.sync_datetime, '%H:%i:%s') sync_time,"
    + " vst.view_model,"
    + " vst.view_duration view_duration,"
    + " vst.view_datetime,"
    + " vst.view_date,"
    + " DATE_FORMAT(vst.view_datetime, '%H:%i:%s') view_time,"
    + " vst.source,"
    + " vst.destination,"
    + " vr.vehicle_no,"
    + " vst.sync_datetime,"
    + " vst.journey_id,"
    + " vst.user_agent,"
    + " vst.play_duration,"
    + " vst.sync_type,"
    + " vst.platform_duration"
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
    + " where vst.type IN ('video','brand-video') AND vst.sync_date>='" + startDate + "' AND vst.sync_date<='" + endDate + "' AND vst.partner = '" + req.user.partner_id + "'" + filter
    + " order by vst.view_datetime desc,vst.sync_datetime"
    console.log(query);
  var option = { draw: req.query.draw, start: req.query.start, length: req.query.length };
  db.pagination(query, option, function (err, doc) {
    return cb(err, doc);
  })
};
// Get list of tracker bottom logs
exports.vuscreen_getplayData_Bottom = function (req, res) {
  var startDate = 'null', endDate = 'null';
  if (req.query.startDate) { startDate = moment(req.query.startDate).format('YYYY-MM-DD'); }
  if (req.query.endDate) { endDate = moment(req.query.endDate).format('YYYY-MM-DD'); }
  var query = "select (SELECT count(distinct device_id) FROM spicescreen.vuscreen_tracker where menu='WATCH' and sync_date>='" + startDate + "' AND sync_date<='" + endDate + "' ) totalhost,"
    + "(SELECT count(distinct mac) FROM spicescreen.vuscreen_tracker where menu='WATCH' and sync_date>='" + startDate + "' AND sync_date<='" + endDate + "' ) Totaluser,"
    + "(SELECT ROUND(sum(view_duration/3600)) FROM spicescreen.vuscreen_tracker where menu='WATCH' and sync_date>='" + startDate + "' AND sync_date<='" + endDate + "' ) totalviewDuration"

  db.get().query(query, function (err, doc) {
    if (err) { return handleError(res, err); }
    return res.status(200).json(doc);
  })
};

exports.get_Platform_duration = function (req, res) {
  console.log("fadjklhldas");
  var startDate = 'null', endDate = 'null';
  if (req.query.startDate) { startDate = moment(req.query.startDate).format('YYYY-MM-DD'); }
  if (req.query.endDate) { endDate = moment(req.query.endDate).format('YYYY-MM-DD'); }

  var query2 = " SELECT distinct  a.mac, a.platform_duration, a.view_datetime,a.sync_datetime from spicescreen.vuscreen_tracker a JOIN vuscreen_registration b ON a.device_id = b.device_id WHERE a.sync_date>='" + startDate + "' AND a.sync_date<='" + endDate + "' ORDER BY a.id DESC";
  db.get().query(query2, function (err, doc2) {
    if (err) { return handleError(res, err); }
    else {
      var query3 = "SELECT distinct  a.mac from spicescreen.vuscreen_tracker a JOIN vuscreen_registration b ON a.device_id = b.device_id WHERE a.sync_date>='" + startDate + "' AND a.sync_date<='" + endDate + "' ORDER BY a.id DESC";
      db.get().query(query3, function (err, doc3) {
        if (err) { return handleError(res, err); }
        else {

          var data = 0
          var tday = 0
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
              tday += parseInt(data);
            }
          }
          console.log(tday / 3600);
          // console.log("today");
          let dt = (tday / 3600).toFixed(2);
          let dataa =
          {
            tsday: dt
          };
          console.log("dataa");
          console.log(dataa);

          return res.status(200).json(dataa);
        }
      })
    }
  })

}
// Get list of tracker logs
exports.vuscreen_tracker_index = function (req, res) {
  
  vuscreen_getAlTrackerData_Pagination(req, function (err, doc) {
    if (err) { return handleError(res, err); }
    else
      return res.status(200).json(doc);

  })
};


//export csv function for  tracker logs
exports.vuscreen_tracker_export_csv = function (req, res) {
  // var fields = ["reg_id", "mac", "vehicle_no", "session_id", "title", "genre", "view_duration", "model", "view_date", "view_time", "sync_date", "sync_time", "user_agent","play_duration","sync_type","platform_duration"];
  // var fieldversions = ["reg_id", "mac", "vehicle_no", "session_id", "title", "genre", "view_duration", "model", "view_date", "view_time", "sync_date", "sync_time", "user_agent","play_duration","sync_type","platform_duration"];


  var fields = ["vehicle_no", "source", "destination", "title", "mac", "sync_date", "sync_time", "view_date", "view_time", "view_datetime", "view_duration", "play_duration", "platform_duration", "sync_type", "genre", "model", "user_agent", "session_id", "reg_id"];
  var fieldversions = ["vehicle_no", "source", "destination", "title", "mac", "sync_date", "sync_time", "view_date", "view_time", "view_datetime", "view_duration", "play_duration", "platform_duration", "sync_type", "genre", "model", "user_agent", "session_id", "reg_id"];
  var name = 'tracker' + (moment(new Date()).format('YYYY-MM-DD')).toString()
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-disposition', 'attachment;filename=' + name + '.csv');
  res.write(fieldversions.join(","));

  function pagination() {
    vuscreen_getAlTrackerData_Pagination(req, function (err, doc) {
      if (doc.data.length > 0) {
        req.query.start = parseInt(req.query.start) + parseInt(req.query.length);
        var row = '';
        for (var i = 0; i < doc.data.length; i++) {
          var json = doc.data[i];
          var col = '';
          for (var x = 0; x < fields.length; x++) {
            var val = json[fields[x]];
            if (val) {
              val = val.toString().replace(/,/g, ' ').replace(/"/g, ' ');
            }
            if (val == '' || typeof (val) == 'undefined' || val == null) { val = ' '; };
            if (fields[x] == 'sync_datetime') { val = moment(val).format('YYYY-MM-DD HH:mm:ss ').toString() };
            if (col == '') {
              col = val;
            } else {
              col = col + ',' + val;
            }
          };
          if (row == '') { row = col; }
          else { row = row + '\r\n' + col; }
        };
        res.write('\r\n');
        res.write(row);
        pagination();
      } else {
        res.end();
      }
    })
  }
  pagination();
}

// Get list of game   logs
var vuscreen_getGameData_Pagination = function (req, cb) {
  var startDate = 'null', endDate = 'null';
  if (req.query.startDate) { startDate = moment(req.query.startDate).format('YYYY-MM-DD'); }
  if (req.query.endDate) { endDate = moment(req.query.endDate).format('YYYY-MM-DD'); }
  var filter = '';
  if (req.query.mac) { filter = " AND vst.mac ='" + req.query.mac + "'" }
  if (req.query.device_id) { filter = " AND vst.device_id ='" + req.query.device_id + "'" }
  if (req.query.interface) { filter = " AND vst.interface ='" + req.query.interface + "'" }
  if (req.query.version) { filter = " AND vst.version ='" + req.query.version + "'" }
  if (req.query.session_id) { filter = " AND vst.session_id ='" + req.query.session_id + "'" }
  if (req.query.genre) { filter = " AND vc.genre ='" + req.query.genre + "'" }
  if (req.query.type) { filter = " AND vst.type ='" + req.query.type + "'" }
  if (req.query.vehicle_no) { filter = " AND vr.vehicle_no ='" + req.query.vehicle_no + "'" }
  if (req.query.reg_id) { filter = " AND vr.reg_id ='" + req.query.reg_id + "'" }

  var query = "select "
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
    + " vst.view_date,"
    + " DATE_FORMAT(vst.view_datetime, '%H:%i:%s') view_time,"
    + " vst.sync_date,"
    + " DATE_FORMAT(vst.sync_datetime, '%H:%i:%s') sync_time,"
    + " vst.view_model,"
    + " vst.view_duration view_duration,"
    + " vst.view_datetime,"
    + " vst.source,"
    + " vst.destination,"
    + " vr.vehicle_no,"
    + " vst.sync_datetime,"
    + " vst.journey_id,"
    + " vst.user_agent,"
    + " vst.play_duration,"
    + " vst.sync_type"
    + " from"
    + " vuscreen_tracker vst"
    + " LEFT JOIN"
    + " vuscreen_store_content vc ON vst.view_id = vc.content_id"
    + " LEFT JOIN"
    + " account_management am ON vst.partner = am.id"
    + " LEFT JOIN "
    + " vuscreen_registration vr ON vst.reg_id = vr.reg_id"
    + " where vst.type = 'zip' AND vst.sync_date>='" + startDate + "' AND vst.sync_date<='" + endDate + "' AND vst.partner = '" + req.user.partner_id + "'" + filter
    + " order by vst.view_datetime desc,vst.sync_datetime"
  var option = { draw: req.query.draw, start: req.query.start, length: req.query.length };
  db.pagination(query, option, function (err, doc) {
    return cb(err, doc);
  })
};

// Get list of game bottom logs
exports.vuscreen_getGameData_Bottom = function (req, res) {
  var startDate = 'null', endDate = 'null';
  if (req.query.startDate) { startDate = moment(req.query.startDate).format('YYYY-MM-DD'); }
  if (req.query.endDate) { endDate = moment(req.query.endDate).format('YYYY-MM-DD'); }
  var query = "select (SELECT count(distinct device_id) FROM spicescreen.vuscreen_tracker where menu='STORE' and sync_date>='" + startDate + "' AND sync_date<='" + endDate + "' ) gamehost,"
    + "(SELECT count(distinct mac) FROM spicescreen.vuscreen_tracker where menu='STORE' and sync_date>='" + startDate + "' AND sync_date<='" + endDate + "' ) gameuser"
  db.get().query(query, function (err, doc) {
    if (err) { return handleError(res, err); }
    return res.status(200).json(doc);
  })
};
// Get list of game logs
exports.vuscreen_game_index = function (req, res) {
  vuscreen_getGameData_Pagination(req, function (err, doc) {
    if (err) { return handleError(res, err); }
    else


      return res.status(200).json(doc);


    // return res.status(200).json(doc);
  })
};


//export csv function for game logs
exports.vuscreen_game_export_csv = function (req, res) {
  var fields = ["vehicle_no", "source", "destination", "title", "mac", "sync_date", "sync_time", "view_date", "view_time", "view_datetime", "view_duration", "genre", "model", "user_agent", "session_id", "reg_id"];
  var fieldversions = ["vehicle_no", "source", "destination", "title", "mac", "sync_date", "sync_time", "view_date", "view_time", "view_datetime", "view_duration", "genre", "model", "user_agent", "session_id", "reg_id"];
  var name = 'game' + (moment(new Date()).format('YYYY-MM-DD')).toString()
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-disposition', 'attachment;filename=' + name + '.csv');
  res.write(fieldversions.join(","));

  function pagination() {
    vuscreen_getGameData_Pagination(req, function (err, doc) {
      if (doc.data.length > 0) {
        req.query.start = parseInt(req.query.start) + parseInt(req.query.length);
        var row = '';
        for (var i = 0; i < doc.data.length; i++) {
          var json = doc.data[i];
          var col = '';
          for (var x = 0; x < fields.length; x++) {
            var val = json[fields[x]];
            if (val) {
              val = val.toString().replace(/,/g, ' ').replace(/"/g, ' ');
            }
            if (val == '' || typeof (val) == 'undefined' || val == null) { val = ' '; };
            if (fields[x] == 'sync_datetime') { val = moment(val).format('YYYY-MM-DD HH:mm:ss ').toString() };
            if (col == '') {
              col = val;
            } else {
              col = col + ',' + val;
            }
          };
          if (row == '') { row = col; }
          else { row = row + '\r\n' + col; }
        };
        res.write('\r\n');
        res.write(row);
        pagination();
      } else {
        res.end();
      }
    })
  }
  pagination();
}

// Get list of ads logs
var vuscreen_getAdsData_Pagination = function (req, cb) {
  var startDate = 'null', endDate = 'null';
  if (req.query.startDate) { startDate = moment(req.query.startDate).format('YYYY-MM-DD'); }
  if (req.query.endDate) { endDate = moment(req.query.endDate).format('YYYY-MM-DD'); }
  var filter = '';
  if (req.query.mac) { filter = " AND vst.mac ='" + req.query.mac + "'" }
  if (req.query.device_id) { filter = " AND vst.device_id ='" + req.query.device_id + "'" }
  if (req.query.interface) { filter = " AND vst.interface ='" + req.query.interface + "'" }
  if (req.query.version) { filter = " AND vst.version ='" + req.query.version + "'" }
  if (req.query.session_id) { filter = " AND vst.session_id ='" + req.query.session_id + "'" }
  if (req.query.type) { filter = " AND vst.type ='" + req.query.type + "'" }
  if (req.query.vehicle_no) { filter = " AND vr.vehicle_no ='" + req.query.vehicle_no + "'" }
  if (req.query.reg_id) { filter = " AND vr.reg_id ='" + req.query.reg_id + "'" }

  var query = "select "
    + " vc.title,"
    + " vc.thumbnail,"
    + " vst.type,"
    + " am.login_id,"
    + " vst.session_id,"
    + " vst.view_android_id,"
    + " vst.device_id,"
    + " vst.version,"
    + " vst.interface,"
    + " vst.model,"
    + " vst.mac,"
    + " vst.reg_id,"
    + " vst.view_model,"
    + " vst.view_duration view_duration,"
    + " vst.view_datetime,"
    + " vst.source,"
    + " vst.destination,"
    + " vr.vehicle_no,"
    + " vst.sync_datetime,"
    + " vst.journey_id,"
    + " vst.sync_date,"
    + " vst.user_agent,"
    + " vst.play_duration,"
    + " vst.sync_type"
    + " from"
    + " vuscreen_tracker vst"
    + " LEFT JOIN"
    + " vuscreen_advertise_content vc ON vst.view_id = vc.id"
    + " LEFT JOIN"
    + " account_management am ON vst.partner = am.id"
    + " LEFT JOIN "
    + " vuscreen_registration vr ON vst.reg_id = vr.reg_id"
    + " where vst.type IN ('banner-ad','banner-adgames','banner-adtravel','banner-admall','banner-adfnb','banner-ad','video-ad','interstitial') AND vst.sync_date>='" + startDate + "' AND vst.sync_date<='" + endDate + "' AND vst.partner = '" + req.user.partner_id + "'" + filter
    + " order by vst.view_datetime desc,vst.sync_datetime"

  var option = { draw: req.query.draw, start: req.query.start, length: req.query.length };
  db.pagination(query, option, function (err, doc) {
    return cb(err, doc);
  })
};

// Get list of ads logs
exports.vuscreen_ads_index = function (req, res) {
  vuscreen_getAdsData_Pagination(req, function (err, doc) {
    if (err) { return handleError(res, err); }
    return res.status(200).json(doc);
  })
};


//export csv function for  ads logs
exports.vuscreen_ads_export_csv = function (req, res) {
  var fields = ["vehicle_no", "source", "destination", "title", "mac", "view_datetime", "view_duration", "type", "view_model", "model", "device_id", "view_android_id", "interface", "version", "reg_id", "session_id"];
  var fieldversions = ["vehicle_no", "source", "destination", "title", "mac", "view_datetime", "view_duration", "type", "view_model", "model", "device_id", "view_android_id", "interface", "version", "reg_id", "session_id"];
  var name = 'ads' + (moment(new Date()).format('YYYY-MM-DD')).toString()
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-disposition', 'attachment;filename=' + name + '.csv');
  res.write(fieldversions.join(","));

  function pagination() {
    vuscreen_getAdsData_Pagination(req, function (err, doc) {
      if (doc.data.length > 0) {
        req.query.start = parseInt(req.query.start) + parseInt(req.query.length);
        var row = '';
        for (var i = 0; i < doc.data.length; i++) {
          var json = doc.data[i];
          var col = '';
          for (var x = 0; x < fields.length; x++) {
            var val = json[fields[x]];
            if (val) {
              val = val.toString().replace(/,/g, ' ').replace(/"/g, ' ');
            }
            if (val == '' || typeof (val) == 'undefined' || val == null) { val = ' '; };
            if (fields[x] == 'sync_datetime') { val = moment(val).format('YYYY-MM-DD HH:mm:ss ').toString() };
            if (col == '') {
              col = val;
            } else {
              col = col + ',' + val;
            }
          };
          if (row == '') { row = col; }
          else { row = row + '\r\n' + col; }
        };
        res.write('\r\n');
        res.write(row);
        pagination();
      } else {
        res.end();
      }
    })
  }
  pagination();
}

// Get list of read logs
var vuscreen_getReadData_Pagination = function (req, cb) {
  var startDate = 'null', endDate = 'null';
  if (req.query.startDate) { startDate = moment(req.query.startDate).format('YYYY-MM-DD'); }
  if (req.query.endDate) { endDate = moment(req.query.endDate).format('YYYY-MM-DD'); }
  var filter = '';
  if (req.query.mac) { filter = " AND vst.mac ='" + req.query.mac + "'" }
  if (req.query.device_id) { filter = " AND vst.device_id ='" + req.query.device_id + "'" }
  if (req.query.interface) { filter = " AND vst.interface ='" + req.query.interface + "'" }
  if (req.query.version) { filter = " AND vst.version ='" + req.query.version + "'" }
  if (req.query.session_id) { filter = " AND vst.session_id ='" + req.query.session_id + "'" }
  if (req.query.genre) { filter = " AND vc.genre ='" + req.query.genre + "'" }
  if (req.query.type) { filter = " AND vst.type ='" + req.query.type + "'" }
  if (req.query.vehicle_no) { filter = " AND vr.vehicle_no ='" + req.query.vehicle_no + "'" }
  if (req.query.reg_id) { filter = " AND vr.reg_id ='" + req.query.reg_id + "'" }

  var query = "select "
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
    + " vst.source,"
    + " vst.destination,"
    + " vr.vehicle_no,"
    + " vst.sync_datetime,"
    + " vst.journey_id,"
    + " vst.user_agent,"
    + " vst.play_duration,"
    + " vst.sync_type"
    + " from"
    + " vuscreen_tracker vst"
    + " LEFT JOIN"
    + " vuscreen_read_content vc ON vst.view_id = vc.content_id"
    + " LEFT JOIN"
    + " account_management am ON vst.partner = am.id"
    + " LEFT JOIN "
    + " vuscreen_registration vr ON vst.reg_id = vr.reg_id"
    + " where vst.menu= 'READ' AND vst.trackingDetails != 'click' AND vst.sync_date>='" + startDate + "' AND vst.sync_date<='" + endDate + "' AND vst.partner = '" + req.user.partner_id + "'" + filter
    + " order by vst.view_datetime desc,vst.sync_datetime"
  console.log(query)
  var option = { draw: req.query.draw, start: req.query.start, length: req.query.length };
  db.pagination(query, option, function (err, doc) {
    return cb(err, doc);
  })
};

// Get list of read bottom logs
exports.vuscreen_getreadData_Bottom = function (req, res) {
  var startDate = 'null', endDate = 'null';
  if (req.query.startDate) { startDate = moment(req.query.startDate).format('YYYY-MM-DD'); }
  if (req.query.endDate) { endDate = moment(req.query.endDate).format('YYYY-MM-DD'); }
  var query = "select (SELECT count(1) FROM spicescreen.vuscreen_tracker where type='audio' and sync_date>='" + startDate + "' AND sync_date<='" + endDate + "' ) audioclick,"
    + "(SELECT count(distinct mac) FROM spicescreen.vuscreen_tracker where type='audio' and sync_date>='" + startDate + "' AND sync_date<='" + endDate + "' ) audiouser,"
    + "(SELECT count(1) FROM spicescreen.vuscreen_tracker where type='pdf' and sync_date>='" + startDate + "' AND sync_date<='" + endDate + "' ) magzineclick,"
    + "(SELECT count(distinct mac) FROM spicescreen.vuscreen_tracker where type='pdf' and sync_date>='" + startDate + "' AND sync_date<='" + endDate + "' ) magzineuser,"
    + "(SELECT count(distinct device_id) FROM spicescreen.vuscreen_tracker where type='pdf' and  sync_date>='" + startDate + "' AND sync_date<='" + endDate + "') magzinedevice,"
    + "(SELECT count(distinct device_id) FROM spicescreen.vuscreen_tracker where type='audio' and  sync_date>='" + startDate + "' AND sync_date<='" + endDate + "') audiodevice,"
    + "(SELECT count(distinct device_id) FROM spicescreen.vuscreen_tracker where type in ('audio','pdf') and  sync_date>='" + startDate + "' AND sync_date<='" + endDate + "') TotalHOst,"
    + "(SELECT count(distinct mac) FROM spicescreen.vuscreen_tracker where type in ('audio','pdf') and  sync_date>='" + startDate + "' AND sync_date<='" + endDate + "') TotalUser"
  db.get().query(query, function (err, doc) {
    console.log(doc);
    console.log(err);
    return res.status(200).json(doc);
  })
};
// Get list of read logs
exports.vuscreen_read_index = function (req, res) {
  vuscreen_getReadData_Pagination(req, function (err, doc) {
    if (err) { return handleError(res, err); }
    else

      return res.status(200).json(doc);

  })
};


//export csv function for read logs
exports.vuscreen_read_export_csv = function (req, res) {
  var fields = ["vehicle_no", "source", "destination", "title", "mac", "type", "sync_date", "view_datetime", "view_duration", "user_agent", "device_id", "genre", "view_model", "model", "view_android_id", "interface", "version", "session_id", "reg_id"];
  var fieldversions = ["vehicle_no", "source", "destination", "title", "mac", "type", "sync_date", "view_datetime", "view_duration", "user_agent", "device_id", "genre", "view_model", "model", "view_android_id", "interface", "version", "session_id", "reg_id"];
  var name = 'read' + (moment(new Date()).format('YYYY-MM-DD')).toString()
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-disposition', 'attachment;filename=' + name + '.csv');
  res.write(fieldversions.join(","));

  function pagination() {
    vuscreen_getReadData_Pagination(req, function (err, doc) {
      if (doc.data.length > 0) {
        req.query.start = parseInt(req.query.start) + parseInt(req.query.length);
        var row = '';
        for (var i = 0; i < doc.data.length; i++) {
          var json = doc.data[i];
          var col = '';
          for (var x = 0; x < fields.length; x++) {
            var val = json[fields[x]];
            if (val) {
              val = val.toString().replace(/,/g, ' ').replace(/"/g, ' ');
            }
            if (val == '' || typeof (val) == 'undefined' || val == null) { val = ' '; };
            if (fields[x] == 'sync_datetime') { val = moment(val).format('YYYY-MM-DD HH:mm:ss ').toString() };
            if (col == '') {
              col = val;
            } else {
              col = col + ',' + val;
            }
          };
          if (row == '') { row = col; }
          else { row = row + '\r\n' + col; }
        };
        res.write('\r\n');
        res.write(row);
        pagination();
      } else {
        res.end();
      }
    })
  }
  pagination();
}

// Get list of travel logs
var vuscreen_getTravelData_Pagination = function (req, cb) {
  var startDate = 'null', endDate = 'null';
  if (req.query.startDate) { startDate = moment(req.query.startDate).format('YYYY-MM-DD'); }
  if (req.query.endDate) { endDate = moment(req.query.endDate).format('YYYY-MM-DD'); }
  var filter = '';
  if (req.query.mac) { filter = " AND vst.mac ='" + req.query.mac + "'" }
  if (req.query.device_id) { filter = " AND vst.device_id ='" + req.query.device_id + "'" }
  if (req.query.interface) { filter = " AND vst.interface ='" + req.query.interface + "'" }
  if (req.query.version) { filter = " AND vst.version ='" + req.query.version + "'" }
  if (req.query.session_id) { filter = " AND vst.session_id ='" + req.query.session_id + "'" }
  if (req.query.genre) { filter = " AND vc.genre ='" + req.query.genre + "'" }
  if (req.query.type) { filter = " AND vst.type ='" + req.query.type + "'" }
  if (req.query.vehicle_no) { filter = " AND vr.vehicle_no ='" + req.query.vehicle_no + "'" }
  if (req.query.reg_id) { filter = " AND vr.reg_id ='" + req.query.reg_id + "'" }

  var query = "select "
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
    + " vst.source,"
    + " vst.destination,"
    + " vr.vehicle_no,"
    + " vst.sync_datetime,"
    + " vst.user_agent,"
    + " vst.play_duration,"
    + " vst.sync_type"
    + " from"
    + " vuscreen_tracker vst"
    + " LEFT JOIN"
    + " vuscreen_travel_content vc ON vst.view_id = vc.content_id"
    + " LEFT JOIN"
    + " account_management am ON vst.partner = am.id"
    + " LEFT JOIN "
    + " vuscreen_registration vr ON vst.reg_id = vr.reg_id"
    + " where vst.menu= 'TRAVEL' AND vst.trackingDetails != 'click' AND vst.sync_date>='" + startDate + "' AND vst.sync_date<='" + endDate + "' AND vst.partner = '" + req.user.partner_id + "'" + filter
    + " order by vst.view_datetime desc,vst.sync_datetime"
  console.log(query)
  var option = { draw: req.query.draw, start: req.query.start, length: req.query.length };
  db.pagination(query, option, function (err, doc) {
    return cb(err, doc);
  })
};

// Get list of travel logs
exports.vuscreen_travel_index = function (req, res) {
  vuscreen_getTravelData_Pagination(req, function (err, doc) {
    if (err) { return handleError(res, err); }
    return res.status(200).json(doc);
  })
};


//export csv function for travel logs
exports.vuscreen_travel_export_csv = function (req, res) {
  var fields = ["vehicle_no", "title", "view_datetime", "sync_date", "view_duration", "source", "destination", "mac", "type", "device_id", "genre", "view_model", "model", "view_android_id", "interface", "version", "user_agent", "reg_id", "session_id"];
  var fieldversions = ["vehicle_no", "title", "view_datetime", "sync_date", "view_duration", "source", "destination", "mac", "type", "device_id", "genre", "view_model", "model", "view_android_id", "interface", "version", "user_agent", "reg_id", "session_id"];
  var name = 'travel' + (moment(new Date()).format('YYYY-MM-DD')).toString()
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-disposition', 'attachment;filename=' + name + '.csv');
  res.write(fieldversions.join(","));

  function pagination() {
    vuscreen_getTravelData_Pagination(req, function (err, doc) {
      if (doc.data.length > 0) {
        req.query.start = parseInt(req.query.start) + parseInt(req.query.length);
        var row = '';
        for (var i = 0; i < doc.data.length; i++) {
          var json = doc.data[i];
          var col = '';
          for (var x = 0; x < fields.length; x++) {
            var val = json[fields[x]];
            if (val) {
              val = val.toString().replace(/,/g, ' ').replace(/"/g, ' ');
            }
            if (val == '' || typeof (val) == 'undefined' || val == null) { val = ' '; };
            if (fields[x] == 'sync_datetime') { val = moment(val).format('YYYY-MM-DD HH:mm:ss ').toString() };
            if (col == '') {
              col = val;
            } else {
              col = col + ',' + val;
            }
          };
          if (row == '') { row = col; }
          else { row = row + '\r\n' + col; }
        };
        res.write('\r\n');
        res.write(row);
        pagination();
      } else {
        res.end();
      }
    })
  }
  pagination();
}

// Get list of mall logs
var vuscreen_getMallData_Pagination = function (req, cb) {
  var startDate = 'null', endDate = 'null';
  if (req.query.startDate) { startDate = moment(req.query.startDate).format('YYYY-MM-DD'); }
  if (req.query.endDate) { endDate = moment(req.query.endDate).format('YYYY-MM-DD'); }
  var filter = '';
  if (req.query.mac) { filter = " AND vst.mac ='" + req.query.mac + "'" }
  if (req.query.device_id) { filter = " AND vst.device_id ='" + req.query.device_id + "'" }
  if (req.query.interface) { filter = " AND vst.interface ='" + req.query.interface + "'" }
  if (req.query.version) { filter = " AND vst.version ='" + req.query.version + "'" }
  if (req.query.session_id) { filter = " AND vst.session_id ='" + req.query.session_id + "'" }
  if (req.query.genre) { filter = " AND vc.genre ='" + req.query.genre + "'" }
  if (req.query.type) { filter = " AND vst.type ='" + req.query.type + "'" }
  if (req.query.vehicle_no) { filter = " AND vr.vehicle_no ='" + req.query.vehicle_no + "'" }
  if (req.query.reg_id) { filter = " AND vr.reg_id ='" + req.query.reg_id + "'" }

  var query = "select "
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
    + " vst.source,"
    + " vst.destination,"
    + " vr.vehicle_no,"
    + " vst.sync_datetime,"
    + " vst.user_agent,"
    + " vst.play_duration,"
    + " vst.sync_type"
    + " from"
    + " vuscreen_tracker vst"
    + " LEFT JOIN"
    + " vuscreen_mall_content vc ON vst.view_id = vc.content_id"
    + " LEFT JOIN"
    + " account_management am ON vst.partner = am.id"
    + " LEFT JOIN "
    + " vuscreen_registration vr ON vst.reg_id = vr.reg_id"
    + " where vst.menu= 'MALL' AND vst.trackingDetails != 'click' AND vst.sync_date>='" + startDate + "' AND vst.sync_date<='" + endDate + "' AND vst.partner = '" + req.user.partner_id + "'" + filter
    + " order by vst.view_datetime desc,vst.sync_datetime"
  console.log(query)
  var option = { draw: req.query.draw, start: req.query.start, length: req.query.length };
  db.pagination(query, option, function (err, doc) {
    return cb(err, doc);
  })
};

// Get list of mall logs
exports.vuscreen_mall_index = function (req, res) {
  vuscreen_getMallData_Pagination(req, function (err, doc) {
    if (err) { return handleError(res, err); }
    return res.status(200).json(doc);
  })
};


//export csv function for mall logs
exports.vuscreen_mall_export_csv = function (req, res) {
  var fields = ["reg_id", "source", "destination", "mac", "vehicle_no", "session_id", "device_id", "title", "genre", "type", "view_model", "view_duration", "model", "view_android_id", "interface", "version", "view_datetime", "sync_date", "user_agent"];
  var fieldversions = ["reg_id", "source", "destination", "mac", "vehicle_no", "session_id", "device_id", "title", "genre", "type", "view_model", "view_duration(seconds)", "model", "client_id", "interface", "version", "view_datetime", "sync_date", "user_agent"];

  var name = 'mall' + (moment(new Date()).format('YYYY-MM-DD')).toString()
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-disposition', 'attachment;filename=' + name + '.csv');
  res.write(fieldversions.join(","));

  function pagination() {
    vuscreen_getMallData_Pagination(req, function (err, doc) {
      if (doc.data.length > 0) {
        req.query.start = parseInt(req.query.start) + parseInt(req.query.length);
        var row = '';
        for (var i = 0; i < doc.data.length; i++) {
          var json = doc.data[i];
          var col = '';
          for (var x = 0; x < fields.length; x++) {
            var val = json[fields[x]];
            if (val) {
              val = val.toString().replace(/,/g, ' ').replace(/"/g, ' ');
            }
            if (val == '' || typeof (val) == 'undefined' || val == null) { val = ' '; };
            if (fields[x] == 'sync_datetime') { val = moment(val).format('YYYY-MM-DD HH:mm:ss ').toString() };
            if (col == '') {
              col = val;
            } else {
              col = col + ',' + val;
            }
          };
          if (row == '') { row = col; }
          else { row = row + '\r\n' + col; }
        };
        res.write('\r\n');
        res.write(row);
        pagination();
      } else {
        res.end();
      }
    })
  }
  pagination();
}

// Get list of FnB logs
var vuscreen_getFnBData_Pagination = function (req, cb) {
  var startDate = 'null', endDate = 'null';
  if (req.query.startDate) { startDate = moment(req.query.startDate).format('YYYY-MM-DD'); }
  if (req.query.endDate) { endDate = moment(req.query.endDate).format('YYYY-MM-DD'); }
  var filter = '';
  if (req.query.mac) { filter = " AND vst.mac ='" + req.query.mac + "'" }
  if (req.query.device_id) { filter = " AND vst.device_id ='" + req.query.device_id + "'" }
  if (req.query.interface) { filter = " AND vst.interface ='" + req.query.interface + "'" }
  if (req.query.version) { filter = " AND vst.version ='" + req.query.version + "'" }
  if (req.query.session_id) { filter = " AND vst.session_id ='" + req.query.session_id + "'" }
  if (req.query.genre) { filter = " AND vc.genre ='" + req.query.genre + "'" }
  if (req.query.type) { filter = " AND vst.type ='" + req.query.type + "'" }
  if (req.query.vehicle_no) { filter = " AND vr.vehicle_no ='" + req.query.vehicle_no + "'" }
  if (req.query.reg_id) { filter = " AND vr.reg_id ='" + req.query.reg_id + "'" }

  var query = "select "
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
    + " vst.source,"
    + " vst.destination,"
    + " vr.vehicle_no,"
    + " vst.sync_datetime,"
    + " vst.journey_id,"
    + " vst.user_agent,"
    + " vst.play_duration,"
    + " vst.sync_type,"
    + " vst.trackingDetails"
    + " from"
    + " vuscreen_tracker vst"
    + " LEFT JOIN"
    + " vuscreen_fnb_content vc ON vst.view_id = vc.content_id"
    + " LEFT JOIN"
    + " account_management am ON vst.partner = am.id"
    + " LEFT JOIN "
    + " vuscreen_registration vr ON vst.reg_id = vr.reg_id"
    + " where vst.menu in('F&B','FNB') AND vst.trackingDetails != 'click' AND vst.sync_date>='" + startDate + "' AND vst.sync_date<='" + endDate + "' AND vst.partner = '" + req.user.partner_id + "'" + filter
    + " order by vst.view_datetime desc,vst.sync_datetime"
  console.log(query)
  var option = { draw: req.query.draw, start: req.query.start, length: req.query.length };
  db.pagination(query, option, function (err, doc) {
    return cb(err, doc);
  })
};
// Get list of read bottom logs
exports.vuscreen_getfnbData_Bottom = function (req, res) {
  var startDate = 'null', endDate = 'null';
  if (req.query.startDate) { startDate = moment(req.query.startDate).format('YYYY-MM-DD'); }
  if (req.query.endDate) { endDate = moment(req.query.endDate).format('YYYY-MM-DD'); }
  var query = "select (SELECT count(distinct device_id) FROM spicescreen.vuscreen_tracker where menu='fnb' and sync_date>='" + startDate + "' AND sync_date<='" + endDate + "' ) TotalHost,"
    + "(SELECT count(distinct mac) FROM spicescreen.vuscreen_tracker where menu='fnb' and sync_date>='" + startDate + "' AND sync_date<='" + endDate + "' ) Totaluser,"
    + "(SELECT count(1) FROM spicescreen.vuscreen_tracker as a join vuscreen_fnb_content as b on a.view_id=b.content_id WHERE  menu ='f&b' and b.type='Veg' and a.sync_date>='" + startDate + "' AND a.sync_date<='" + endDate + "')Veg,"
    + "(SELECT count(1) FROM spicescreen.vuscreen_tracker as a join vuscreen_fnb_content as b on a.view_id=b.content_id WHERE menu ='f&b'and b.type='Non-Veg' and a.sync_date>='" + startDate + "' AND a.sync_date<='" + endDate + "')Non_veg"
  db.get().query(query, function (err, doc) {
    if (err) { return handleError(res, err); }
    return res.status(200).json(doc);
  })
};
// Get list of FnB logs
exports.vuscreen_FnB_index = function (req, res) {
  vuscreen_getFnBData_Pagination(req, function (err, doc) {
    if (err) { return handleError(res, err); }
    else

      return res.status(200).json(doc);

  })
};


//export csv function for FnB logs
exports.vuscreen_FnB_export_csv = function (req, res) {
  var fields = ["vehicle_no", "source", "destination", "title", "mac", "sync_date", "view_datetime", "type", "user_agent", "view_duration", "play_duration", "view_model", "model", "view_android_id", "interface", "version", "sync_type", "device_id", "genre", "reg_id", "session_id"];
  var fieldversions = ["vehicle_no", "source", "destination", "title", "mac", "sync_date", "view_datetime", "type", "user_agent", "view_duration", "play_duration", "view_model", "model", "view_android_id", "interface", "version", "sync_type", "device_id", "genre", "reg_id", "session_id"];
  var name = 'FnB' + (moment(new Date()).format('YYYY-MM-DD')).toString()
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-disposition', 'attachment;filename=' + name + '.csv');
  res.write(fieldversions.join(","));

  function pagination() {
    vuscreen_getFnBData_Pagination(req, function (err, doc) {
      if (doc.data.length > 0) {
        req.query.start = parseInt(req.query.start) + parseInt(req.query.length);
        var row = '';
        for (var i = 0; i < doc.data.length; i++) {
          var json = doc.data[i];
          var col = '';
          for (var x = 0; x < fields.length; x++) {
            var val = json[fields[x]];
            if (val) {
              val = val.toString().replace(/,/g, ' ').replace(/"/g, ' ');
            }
            if (val == '' || typeof (val) == 'undefined' || val == null) { val = ' '; };
            if (fields[x] == 'sync_datetime') { val = moment(val).format('YYYY-MM-DD HH:mm:ss ').toString() };
            if (col == '') {
              col = val;
            } else {
              col = col + ',' + val;
            }
          };
          if (row == '') { row = col; }
          else { row = row + '\r\n' + col; }
        };
        res.write('\r\n');
        res.write(row);
        pagination();
      } else {
        res.end();
      }
    })
  }
  pagination();
}

// Get list of tracker logs for FOR FOG
var vuscreen_getAlTracker1Data_Pagination = function (req, cb) {
  var startDate = 'null', endDate = 'null';
  if (req.query.startDate) { startDate = moment(req.query.startDate).format('YYYY-MM-DD'); }
  if (req.query.endDate) { endDate = moment(req.query.endDate).format('YYYY-MM-DD'); }
  var filter = '';

  if (req.query.mac) { filter = " AND vst.mac ='" + req.query.mac + "'" }
  if (req.query.session_id) { filter = " AND vst.session_id ='" + req.query.session_id + "'" }
  if (req.query.genre) { filter = " AND vc.genre ='" + req.query.genre + "'" }
  if (req.query.type) { filter = " AND vst.type ='" + req.query.type + "'" }

  var query = "select "
    + " vc.title,"
    + " vc.thumbnail,"
    + " vst.type,"
    + " vc.genre,"
    + " vst.session_id,"
    + " vst.view_android_id,"
    + " vst.mac,"
    + " vst.view_duration view_duration,"
    + " vst.sync_datetime"
    + " from"
    + " vuscreen_tracker vst"
    + " LEFT JOIN"
    + " vuscreen_content_package vc ON vst.view_id = vc.content_id"
    + " LEFT JOIN"
    + " account_management am ON vst.partner = am.id"
    + " LEFT JOIN "
    + " vuscreen_registration vr ON vst.reg_id = vr.reg_id"
    + " where vst.sync_date>='" + startDate + "' AND vst.sync_date<='" + endDate + "' AND vst.partner = '" + req.user.partner_id + "'" + filter
    + " order by sync_datetime desc"
  var option = { draw: req.query.draw, start: req.query.start, length: req.query.length };
  db.pagination(query, option, function (err, doc) {
    return cb(err, doc);
  })
};

// Get list of tracker1 logs
exports.vuscreen_tracker1_index = function (req, res) {
  vuscreen_getAlTracker1Data_Pagination(req, function (err, doc) {
    if (err) { return handleError(res, err); }
    return res.status(200).json(doc);
  })
};


//export csv function for  tracker logs
exports.vuscreen_tracker1_export_csv = function (req, res) {
  var fields = ["title", "sync_datetime", "view_duration", "type", "mac", "genre", "view_android_id", "session_id"];
  var fieldversions = ["title", "sync_datetime", "view_duration", "type", "mac", "genre", "view_android_id", "session_id"];
  var name = 'tracker' + (moment(new Date()).format('YYYY-MM-DD')).toString()
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-disposition', 'attachment;filename=' + name + '.csv');
  res.write(fieldversions.join(","));

  function pagination() {
    vuscreen_getAlTracker1Data_Pagination(req, function (err, doc) {
      if (doc.data.length > 0) {
        req.query.start = parseInt(req.query.start) + parseInt(req.query.length);
        var row = '';
        for (var i = 0; i < doc.data.length; i++) {
          var json = doc.data[i];
          var col = '';
          for (var x = 0; x < fields.length; x++) {
            var val = json[fields[x]];
            if (val) {
              val = val.toString().replace(/,/g, ' ').replace(/"/g, ' ');
            }
            if (val == '' || typeof (val) == 'undefined' || val == null) { val = ' '; };
            if (fields[x] == 'sync_datetime') { val = moment(val).format('YYYY-MM-DD HH:mm:ss ').toString() };
            if (col == '') {
              col = val;
            } else {
              col = col + ',' + val;
            }
          };
          if (row == '') { row = col; }
          else { row = row + '\r\n' + col; }
        };
        res.write('\r\n');
        res.write(row);
        pagination();
      } else {
        res.end();
      }
    })
  }
  pagination();
}


// Get list of memory tracker logs
var vuscreen_getAllMemoryData_Pagination = function (req, cb) {
  var startDate = 'null', endDate = 'null';
  if (req.query.startDate) { startDate = moment(req.query.startDate).format('YYYY-MM-DD'); }
  if (req.query.endDate) { endDate = moment(req.query.endDate).format('YYYY-MM-DD'); }
  var filter = '';

  if (req.query.interface) { filter = " AND vst.interface ='" + req.query.interface + "'" }
  if (req.query.version) { filter = " AND vst.version ='" + req.query.version + "'" }
  if (req.query.reg_id) { filter = " AND vst.session_id ='" + req.query.session_id + "'" }

  var query = "select"
    + " android_id,sync_timestamp,device_total_memory,device_remaining_memory,interface,model,version,package,reg_id"
    + " from"
    + " vuscreen_device_memory_tracker"
    + " where sync_date>='" + startDate + "' AND sync_date<='" + endDate + "'" + filter
    + " order by sync_timestamp desc"
  var option = { draw: req.query.draw, start: req.query.start, length: req.query.length };
  db.pagination(query, option, function (err, doc) {
    return cb(err, doc);
  })
};

// Get list of memory tracker logs
exports.memory_tracker_index = function (req, res) {
  vuscreen_getAllMemoryData_Pagination(req, function (err, doc) {
    if (err) { return handleError(res, err); }
    return res.status(200).json(doc);
  })
};


//export csv function for memory tracker logs
exports.memory_tracker_export_csv = function (req, res) {
  var fields = ["android_id", "sync_timestamp", "device_total_memory", "device_remaining_memory", "interface", "model", "version", "package", "reg_id"];
  var fieldversions = ["android_id", "sync_timestamp", "device_total_memory", "device_remaining_memory", "interface", "model", "version", "package", "reg_id"];

  var name = 'memory_tracker' + (moment(new Date()).format('YYYY-MM-DD')).toString()
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-disposition', 'attachment;filename=' + name + '.csv');
  res.write(fieldversions.join(","));

  function pagination() {
    vuscreen_getAllMemoryData_Pagination(req, function (err, doc) {
      if (doc.data.length > 0) {
        req.query.start = parseInt(req.query.start) + parseInt(req.query.length);
        var row = '';
        for (var i = 0; i < doc.data.length; i++) {
          var json = doc.data[i];
          var col = '';
          for (var x = 0; x < fields.length; x++) {
            var val = json[fields[x]];
            if (val) {
              val = val.toString().replace(/,/g, ' ').replace(/"/g, ' ');
            }
            if (val == '' || typeof (val) == 'undefined' || val == null) { val = ' '; };
            if (fields[x] == 'sync_timestamp') { val = moment(val).format('YYYY-MM-DD HH:mm:ss ').toString() };
            if (col == '') {
              col = val;
            } else {
              col = col + ',' + val;
            }
          };
          if (row == '') { row = col; }
          else { row = row + '\r\n' + col; }
        };
        res.write('\r\n');
        res.write(row);
        pagination();
      } else {
        res.end();
      }
    })
  }
  pagination();
}

exports.top_10_content = function (req, res) {
  var startDate, endDate;
  if (req.query.startDate) { startDate = moment(req.query.startDate).format('YYYY-MM-DD'); }
  if (req.query.endDate) { endDate = moment(req.query.endDate).format('YYYY-MM-DD'); }
  var query = '';
  if (req.query.vehicle_no == "undefined" || req.query.vehicle_no == "") {
    query = "select "
      + " vc.title,"
      + " vc.genre,"
      + " count(1) count,"
      + " count(distinct vst.mac) uniqueviwers,"
      + " ROUND(sum(vst.view_duration/60000),2) duration"
      + " from"
      + " vuscreen_tracker vst"
      + " LEFT JOIN"
      + " vuscreen_content_package vc ON vst.view_id = vc.content_id"
      + " LEFT JOIN"
      + " vuscreen_registration vr ON vst.reg_id = vr.reg_id"
      + " where vst.partner = '" + req.user.partner_id + "'"
      + " AND vst.sync_date>='" + startDate + "'AND vst.sync_date<='" + endDate + "'"
      // +" AND vehicle_no IN ('DL1VC2892','DL1VC2871' , 'DL1VC2900',"
      // +" 'DL1VC2861',"
      // +" 'DL1VC2888',"
      // +" 'DL1VC2893',"
      // +" 'DL1VC2942',"
      // +" 'DL1VC2887',"
      // +" 'DL1VC2738')"
      + " group by vc.title"
      + " order by count desc "
    // +" limit 15";
  } else {
    query = "select "
      + " vc.title,"
      + " vc.genre,"
      + " count(1) count,"
      + " count(distinct vst.mac) uniqueviwers,"
      + " ROUND(sum(vst.view_duration/60000),2) duration"
      + " from"
      + " vuscreen_tracker vst"
      + " LEFT JOIN"
      + " vuscreen_content_package vc ON vst.view_id = vc.content_id"
      + " LEFT JOIN"
      + " vuscreen_registration vr ON vst.reg_id = vr.reg_id"
      + " where vst.partner = '" + req.user.partner_id + "' AND vr.vehicle_no = '" + req.query.vehicle_no + "'"
      + " AND vst.sync_date>='" + startDate + "'AND vst.sync_date<='" + endDate + "'"
      + " group by vc.title"
      + " order by count desc "
    //limit 15";
  }
  db.get().query(query, function (err, doc) {
    if (err) { return handleError(res, err); }
    return res.status(200).json(doc);
  })
};



exports.top_10_genre = function (req, res) {
  var startDate, endDate;
  if (req.query.startDate) { startDate = moment(req.query.startDate).format('YYYY-MM-DD'); }
  if (req.query.endDate) { endDate = moment(req.query.endDate).format('YYYY-MM-DD'); }
  var query = "select "
    + " vc.genre,"
    + " count(1) count,"
    + " count(distinct vst.mac) uniqueviwers"
    + " from"
    + " vuscreen_tracker vst"
    + " JOIN"
    + " vuscreen_content_package vc ON vst.view_id = vc.content_id"
    + " where vst.partner = '" + req.user.partner_id + "' AND"
    + " vst.sync_date>='" + startDate + "'AND vst.sync_date<='" + endDate + "'"
    + " group by vc.genre"
    + " order by count desc limit 15";
  db.get().query(query, function (err, doc) {
    if (err) { return handleError(res, err); }
    return res.status(200).json(doc);
  })
};


exports.top_clicks_by_hosts = function (req, res) {
  var startDate, endDate;
  if (req.query.startDate) { startDate = moment(req.query.startDate).format('YYYY-MM-DD'); }
  if (req.query.endDate) { endDate = moment(req.query.endDate).format('YYYY-MM-DD'); }
  var query = "SELECT vr.vehicle_no, vst.menu, COUNT(1) COUNT "
    + " FROM vuscreen_tracker vst LEFT JOIN vuscreen_registration vr ON vst.device_id = vr.device_id"
    + " WHERE vst.trackingDetails = 'click' AND"
    + " vst.sync_date>='" + startDate + "'AND vst.sync_date<='" + endDate + "'"
    + " group by vst.menu,vr.vehicle_no"
    + " order by count desc";
  console.log(query)
  db.get().query(query, function (err, doc) {
    if (err) { return handleError(res, err); }
    return res.status(200).json(doc);
  })
};

exports.top_clicks = function (req, res) {
  var startDate, endDate;
  if (req.query.startDate) { startDate = moment(req.query.startDate).format('YYYY-MM-DD'); }
  if (req.query.endDate) { endDate = moment(req.query.endDate).format('YYYY-MM-DD'); }
  var query = "select "
    + " menu,"
    + " count(1) count"
    + " from"
    + " vuscreen_tracker"
    + " where trackingDetails = 'click' AND"
    + " sync_date>='" + startDate + "'AND sync_date<='" + endDate + "'"
    + " group by menu"
    + " order by count desc";
  console.log(query)
  db.get().query(query, function (err, doc) {
    if (err) { return handleError(res, err); }
    return res.status(200).json(doc);
  })
};

/*  Get list of top buses by time spent.
    @Authentication ----> by session key
    @Authorization ----> Access Controll Logic
    Author : Kedar Gadre
    Date : 29/01/2018
    Modified_by : Kedar Gadre
    Modification Date : 29/01/2018
*/
exports.busSummary = function (req, res) {
  var startDate, endDate;
  if (req.query.startDate) { startDate = moment(req.query.startDate).format('YYYY-MM-DD'); }
  if (req.query.endDate) { endDate = moment(req.query.endDate).format('YYYY-MM-DD'); }

  var query = "select "
    + " B.vehicle_no bus,ROUND(sum(A.view_duration/60000),2) count,count(1) views, count(distinct A.mac) uniqueviwers"
    + " from"
    + " vuscreen_tracker A Left Join vuscreen_registration B ON A.reg_id = B.reg_id"
    + " where "
    + " A.sync_date>='" + startDate + "' AND A.sync_date<='" + endDate + "' AND B.vehicle_no != ''"
    + " AND A.partner = '" + req.user.partner_id + "' group by B.vehicle_no order by count desc"
  // 
  db.get().query(query, function (err, doc) {
    if (err) { return handleError(res, err); }
    return res.status(200).json(doc);
  })
};

/*  Get list of top content played on bus.
    @Authentication ----> by session key
    @Authorization ----> Access Controll Logic
    Author : Kedar Gadre
    Date : 29/01/2018
    Modified_by : Kedar Gadre
    Modification Date : 29/01/2018
*/
exports.busSummaryDetails = function (req, res) {
  var startDate, endDate;
  if (req.query.startDate) { startDate = moment(req.query.startDate).format('YYYY-MM-DD'); }
  if (req.query.endDate) { endDate = moment(req.query.endDate).format('YYYY-MM-DD'); }

  var query = "select "
    + " B.title,"
    + " ROUND(sum(A.view_duration/60000),2) count,"
    + " count(1) views,"
    + " count(distinct A.mac) uniqueviwers"
    + " from"
    + " vuscreen_tracker A"
    + " Left Join"
    + " vuscreen_content_package B ON A.view_id = B.content_id"
    + " Join vuscreen_registration C ON A.reg_id = C.reg_id"
    + " where"
    + " A.sync_date >= '" + startDate + "'"
    + " AND A.sync_date <= '" + endDate + "'"
    + " AND A.partner = '" + req.user.partner_id + "'"
    + " AND C.vehicle_no = '" + req.params.cat + "'"
    + " group by B.title"
    + " order by count desc limit 15"
  db.get().query(query, function (err, doc) {
    if (err) { return handleError(res, err); }
    return res.status(200).json(doc);
  })
};


/*  Get list of top genre by time spent.
    @Authentication ----> by session key
    @Authorization ----> Access Controll Logic
    Author : Kedar Gadre
    Date : 29/01/2018
    Modified_by : Kedar Gadre
    Modification Date : 29/01/2018
*/
exports.genreSummary = function (req, res) {
  var startDate, endDate;
  if (req.query.startDate) { startDate = moment(req.query.startDate).format('YYYY-MM-DD'); }
  if (req.query.endDate) { endDate = moment(req.query.endDate).format('YYYY-MM-DD'); }

  var query = "select "
    + " B.genre,ROUND(sum(A.view_duration/60000),2) count,count(1) views, count(distinct A.mac) uniqueviwers"
    + " from"
    + " vuscreen_tracker A Left Join vuscreen_content_package B ON A.view_id = B.content_id"
    + " where "
    + " A.sync_date>='" + startDate + "' AND A.sync_date<='" + endDate + "' AND B.genre != ''"
    + " AND A.partner = '" + req.user.partner_id + "' group by B.genre order by count desc"
  db.get().query(query, function (err, doc) {
    if (err) { return handleError(res, err); }
    return res.status(200).json(doc);
  })
};

/*  Get list of top content played on genre.
    @Authentication ----> by session key
    @Authorization ----> Access Controll Logic
    Author : Kedar Gadre
    Date : 29/01/2018
    Modified_by : Kedar Gadre
    Modification Date : 29/01/2018
*/
exports.genreSummaryDetails = function (req, res) {
  var startDate, endDate;
  if (req.query.startDate) { startDate = moment(req.query.startDate).format('YYYY-MM-DD'); }
  if (req.query.endDate) { endDate = moment(req.query.endDate).format('YYYY-MM-DD'); }

  var query = "select "
    + " B.title,"
    + " ROUND(sum(A.view_duration/60000),2) count,"
    + " count(1) views,"
    + " count(distinct A.mac) uniqueviwers"
    + " from"
    + " vuscreen_tracker A"
    + " Left Join"
    + " vuscreen_content_package B ON A.view_id = B.content_id"
    + " where"
    + " A.sync_date >= '" + startDate + "'"
    + " AND A.sync_date <= '" + endDate + "'"
    + " AND A.partner = '" + req.user.partner_id + "'"
    + " AND B.genre = '" + req.params.cat + "'"
    + " group by B.title"
    + " order by count desc limit 15"
  db.get().query(query, function (err, doc) {
    if (err) { return handleError(res, err); }
    return res.status(200).json(doc);
  })
};



function set_key_value(keys, value, cb) {
  // body...
  cachedData.set(keys, value, function (err, success) {
    cb(err, value);
  });
}
function get_cached_data(keys, cb) {
  // body...
  cachedData.mget(keys, function (err, value) {
    cb(err, value);
  });
}



// leaderboard data
exports.leaderboard = function (req, res) {
  var startDate, endDate;
  if (req.query.startDate) { startDate = moment(req.query.startDate).format('YYYY-MM-DD'); }
  if (req.query.endDate) { endDate = moment(req.query.endDate).format('YYYY-MM-DD'); }
  var query = "SELECT "
    + " rank,"
    + " vehicle_no,"
    + " SUM(points) AS points,"
    + " SUM(view_id) AS content_watched,"
    + " ROUND(SUM((view_duration / 60000))) AS view_duration,"
    + " COUNT(device_id) AS connections,"
    + " COUNT(IF(unique_device = 1, 1, NULL)) AS unique_connections"
    + " FROM"
    + " vuscreen_driver_points"
    + " WHERE"
    + " date >= '" + startDate + "'"
    + " AND date <= '" + endDate + "'"
    + " AND uploaded_by = '" + req.user.partner_id + "'"
    // +" AND package = 'com.vuscreen.shuttl.driver'"
    // +" AND vehicle_no IN ('DL1VC2892','DL1VC2871' , 'DL1VC2900',"
    // +" 'DL1VC2861',"
    // +" 'DL1VC2888',"
    // +" 'DL1VC2893',"
    // +" 'DL1VC2942',"
    // +" 'DL1VC2887',"
    // +" 'DL1VC2738')"
    + " GROUP BY vehicle_no"
    + " ORDER BY rank;";
  db.get().query(query, function (err, doc) {
    if (err) { return handleError(res, err); }
    return res.status(200).json(doc);
  })
};

// get registration details
exports.get_partner_detaills = function (req, res) {
  var query = "select * "
    + " from"
    + " vuscreen_registration"
    + " where "
    + " reg_id='" + req.params.id + "'"
  db.get().query(query, function (err, doc) {
    if (err) { return handleError(res, err); }
    return res.status(200).json(doc);
  })
}

// save registration details after edit
exports.edit_registration = function (req, res) {
  var query = "Update "
    + " vuscreen_registration SET "
    + "    vehicle_no = '" + req.body.vehicle_no + "',"
    + "    source = '" + req.body.source + "',"
    + "    destination = '" + req.body.destination + "',"
    + "    owner_email = '" + req.body.owner_email + "',"
    + "    owner_name = '" + req.body.owner_name + "',"
    + "    owner_no = '" + req.body.owner_no + "',"
    + "    driver_name = '" + req.body.driver_name + "',"
    + "    driver_no = '" + req.body.driver_no + "',"
    + "    helper_name = '" + req.body.helper_name + "',"
    + "    helper_no = '" + req.body.helper_no + "',"
    + "    location = '" + req.body.location + "'"
    + " where "
    + " reg_id='" + req.body.reg_id + "'"
  db.get().query(query, function (err, doc) {
    if (err) { return handleError(res, err); }
    else {
      var sms = 'Mr ' + req.body.owner_name + ',\n'
        + req.user.fname + ',\n'
        + 'VuScreen System is INSTALLED in ' + req.body.vehicle_no + ' on '
        + moment(new Date()).format("YYYY-MM-DD HH:mm:ss") + ' at ' + req.body.location + ' and is VERIFIED by '
        + req.body.driver_name + ' with mobile no ' + req.body.driver_no + '.'
      // var number =       owner ,      driver              sahil,     deepak   varun goyal   manoj gupta    gunjan    subodh   kedar
      var number = [req.body.owner_no, req.body.driver_no, 9582340204, 9650379456, 9818436189, 9810772396, 9899116084, 8826614109, 7042854343]
      // var number = [req.body.owner_no]
      for (var i = 0; i < number.length; i++) {
        var message = 'http://www.myvaluefirst.com/smpp/sendsms?username=Mobiservehttp1&password=mobi1234&to=' + number[i] + '&from=VUINFO&text=Dear ' + sms
        request(message, function (error, response, body) {
          if (!error && response.statusCode == 200) {
            console.log("Alert has been " + body) // Show the HTML for the Google homepage.
          } else {
            return handleError(res, err);
          }
        })
      }
      return res.status(200).json(doc);
    }

  })
}


// send sms
exports.send_sms = function (req, res) {
  var number = req.query.number;
  generateSecureVal(function (secureVal) {
    var message = 'http://www.myvaluefirst.com/smpp/sendsms?username=Mobiservehttp1&password=mobi1234&to=' + number + '&from=VUINFO&text=Dear Recipients,\nYour OTP is -' + secureVal
    request(message, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        console.log("Alert has been " + body) // Show the HTML for the Google homepage.
        return res.status(200).send({ "body": body, "response": response, "secureVal": secureVal });
      } else {
        return handleError(res, err);
      }
    })
  })
}


/////////////////////
// Get list of tracker logs
var vuscreen_getAlcabinCrewData_Pagination = function (req, cb) {
  var startDate = 'null', endDate = 'null';
  if (req.query.startDate) { startDate = moment(req.query.startDate).format('YYYY-MM-DD'); }
  if (req.query.endDate) { endDate = moment(req.query.endDate).format('YYYY-MM-DD'); }
  var filter = '';
  if (req.query.mac) { filter = " AND vst.mac ='" + req.query.mac + "'" }
  if (req.query.device_id) { filter = " AND vst.device_id ='" + req.query.device_id + "'" }
  if (req.query.interface) { filter = " AND vst.interface ='" + req.query.interface + "'" }
  if (req.query.version) { filter = " AND vst.version ='" + req.query.version + "'" }
  if (req.query.session_id) { filter = " AND vst.session_id ='" + req.query.session_id + "'" }
  if (req.query.genre) { filter = " AND vc.genre ='" + req.query.genre + "'" }
  if (req.query.type) { filter = " AND vst.type ='" + req.query.type + "'" }
  if (req.query.vehicle_no) { filter = " AND vr.vehicle_no ='" + req.query.vehicle_no + "'" }
  if (req.query.reg_id) { filter = " AND vr.reg_id ='" + req.query.reg_id + "'" }

  var query = "select "


    + " vst.type,"



    + " vst.session_id,"
    + " vst.view_android_id,"
    + " vst.device_id,"
    + " vst.version,"
    + " vst.interface,"
    + " vst.model,"
    + " vst.mac,"
    + " vst.reg_id,"
    + " vst.sync_date,"
    + " DATE_FORMAT(vst.sync_datetime, '%H:%i:%s') sync_time,"
    + " vst.view_model,"
    + " vst.view_duration view_duration,"
    + " vst.view_datetime,"
    + " vst.view_date,"
    + " DATE_FORMAT(vst.view_datetime, '%H:%i:%s') view_time,"
    + " vst.source,"
    + " vst.destination,"
    + " vr.vehicle_no,"
    + " vst.sync_datetime,"
    + " vst.journey_id,"
    + " vst.user_agent,"
    + " vst.play_duration,"
    + " vst.sync_type,"
    + " vst.platform_duration"
    + " from"
    + " vuscreen_tracker vst"
    + " LEFT JOIN"
    + " vuscreen_registration vr ON vst.reg_id = vr.reg_id"
    + " where vst.menu='cabincrew' AND vst.sync_date>='" + startDate + "' AND vst.sync_date<='" + endDate + "' AND vst.partner = '" + req.user.partner_id + "'" + filter
    + " order by vst.view_datetime desc,vst.sync_datetime"
  var option = { draw: req.query.draw, start: req.query.start, length: req.query.length };
  db.pagination(query, option, function (err, doc) {
    return cb(err, doc);
  })
};


// Get list of tracker logs
exports.vuscreen_cabinCrew_index = function (req, res) {
  vuscreen_getAlcabinCrewData_Pagination(req, function (err, doc) {
    if (err) { return handleError(res, err); }
    else
      return res.status(200).json(doc);

  })
};


//export csv function for  tracker logs
exports.vuscreen_CabinCrew_export_csv = function (req, res) {
  // var fields = ["reg_id", "mac", "vehicle_no", "session_id", "title", "genre", "view_duration", "model", "view_date", "view_time", "sync_date", "sync_time", "user_agent","play_duration","sync_type","platform_duration"];
  // var fieldversions = ["reg_id", "mac", "vehicle_no", "session_id", "title", "genre", "view_duration", "model", "view_date", "view_time", "sync_date", "sync_time", "user_agent","play_duration","sync_type","platform_duration"];


  var fields = ["vehicle_no", "source", "destination", "title", "mac", "sync_date", "sync_time", "view_date", "view_time", "view_datetime", "view_duration", "play_duration", "platform_duration", "sync_type", "genre", "model", "user_agent", "session_id", "reg_id"];
  var fieldversions = ["vehicle_no", "source", "destination", "title", "mac", "sync_date", "sync_time", "view_date", "view_time", "view_datetime", "view_duration", "play_duration", "platform_duration", "sync_type", "genre", "model", "user_agent", "session_id", "reg_id"];
  var name = 'tracker' + (moment(new Date()).format('YYYY-MM-DD')).toString()
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-disposition', 'attachment;filename=' + name + '.csv');
  res.write(fieldversions.join(","));

  function pagination() {
    vuscreen_getAlcabinCrewData_Pagination(req, function (err, doc) {
      if (doc.data.length > 0) {
        req.query.start = parseInt(req.query.start) + parseInt(req.query.length);
        var row = '';
        for (var i = 0; i < doc.data.length; i++) {
          var json = doc.data[i];
          var col = '';
          for (var x = 0; x < fields.length; x++) {
            var val = json[fields[x]];
            if (val) {
              val = val.toString().replace(/,/g, ' ').replace(/"/g, ' ');
            }
            if (val == '' || typeof (val) == 'undefined' || val == null) { val = ' '; };
            if (fields[x] == 'sync_datetime') { val = moment(val).format('YYYY-MM-DD HH:mm:ss ').toString() };
            if (col == '') {
              col = val;
            } else {
              col = col + ',' + val;
            }
          };
          if (row == '') { row = col; }
          else { row = row + '\r\n' + col; }
        };
        res.write('\r\n');
        res.write(row);
        pagination();
      } else {
        res.end();
      }
    })
  }
  pagination();
}
/////////////////////

var crypto = require('crypto');
const { map, parseInt } = require('lodash');
const { json } = require('body-parser');
const { host } = require('../../config/email-settings');
var secureVal = 0;

function generateSecureVal(cb) {
  crypto.randomBytes(3, function (err, buffer) {
    secureVal = parseInt(buffer.toString('hex'), 16);
    if (secureVal > 999999 || secureVal < 100000) {
      generateSecureVal(cb);
    } else {
      cb(secureVal);
    }
  });
}

// play real time logs
exports.play_real_time = function (req, res) {
  var filter = "";
  var limit = 10;
  if (req.query.id) {
    filter = " Where vst.id >" + req.query.id;
    limit = 1000;
    if (req.query.device_id) {
      filter = filter + " AND vst.view_android_id = '" + req.query.device_id + "'";
    }
  } else {
    if (req.query.device_id) {
      filter = " Where vst.view_android_id = '" + req.query.device_id + "'";
    }
  }
  var query = "select "
    + " vc.title,"
    + " vc.thumbnail,"
    + " vst.type,"
    + " vc.genre,"
    + " am.login_id,"
    + " vst.session_id,"
    + " vst.id,"
    + " vst.view_android_id,"
    + " vst.device_id,"
    + " vst.version,"
    + " vst.interface,"
    + " vst.model,"
    + " vst.mac,"
    + " vst.reg_id,"
    + " vst.view_model,"
    + " vst.view_duration/60000 view_duration,"
    + " vst.view_datetime,"
    + " vr.source,"
    + " vr.destination,"
    + " vr.vehicle_no,"
    + " vst.sync_datetime"
    + " from"
    + " vuscreen_tracker vst"
    + " LEFT JOIN"
    + " vuscreen_content_package vc ON vst.view_id = vc.content_id"
    + " LEFT JOIN"
    + " account_management am ON vst.partner = am.id"
    + " LEFT JOIN "
    + " vuscreen_registration vr ON vst.reg_id = vr.reg_id" + filter
    + " AND vst.partner = '" + req.user.partner_id + "'"
    + " order by vst.id DESC limit " + limit.toString();
  // var query = "select * from stream_tracker " + filter + " ORDER BY id DESC limit "+ limit.toString();
  // 
  db.get().query(query, function (err, doc) {
    if (err) { return handleError(res, err); }
    return res.status(200).json(doc);
  })
};




function handleError(res, err) {
  return res.status(500).send(err);
}


/////////////////// fnb item logs

var vuscreen_getFnBIemData_Pagination = function (req, cb) {
  console.log(req.query);
  if (req.query.startDate) { var startDate = moment(req.query.startDate).format('YYYY-MM-DD'); }
  if (req.query.endDate) { var endDate = moment(req.query.endDate).format('YYYY-MM-DD'); }
  var query = "SELECT device_id,sync_date, menu, trackingDetails, COUNT(1) as totalRecords, b.title FROM spicescreen.vuscreen_tracker a JOIN vuscreen_fnb_content b ON a.view_id = b.content_id WHERE trackingDetails LIKE '%f&b%' AND a.sync_date>='" + startDate + "' AND a.sync_date<='" + endDate + "' GROUP BY sync_date ,menu , b.title,device_id ORDER BY id DESC";
  var option = { draw: req.query.draw, start: req.query.start, length: req.query.length };
  db.pagination(query, option, function (err, doc) {
    console.log(doc);
    return cb(err, doc);
  })
};
//////////////////// fnb item clicks csv 

exports.vuscreen_FnB_items_export_csv = function (req, res) {
  var fields = ["device_id", "title", "menu", "trackingDetails", "sync_date", "totalRecords"];
  var fieldversions = ["device_id", "title", "menu", "trackingDetails", "sync_date", "totalRecords"];

  var name = 'FnB' + (moment(new Date()).format('YYYY-MM-DD')).toString()
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-disposition', 'attachment;filename=' + name + '.csv');
  res.write(fieldversions.join(","));
  // console.log(req);
  function pagination() {
    vuscreen_getFnBIemData_Pagination(req, function (err, doc) {
      console.log(doc);
      if (doc.data.length > 0) {
        req.query.start = parseInt(req.query.start) + parseInt(req.query.length);
        var row = '';
        for (var i = 0; i < doc.data.length; i++) {
          var json = doc.data[i];
          var col = '';
          for (var x = 0; x < fields.length; x++) {
            var val = json[fields[x]];
            if (val) {
              val = val.toString().replace(/,/g, ' ').replace(/"/g, ' ');
            }
            if (val == '' || typeof (val) == 'undefined' || val == null) { val = ' '; };
            if (fields[x] == 'sync_datetime') { val = moment(val).format('YYYY-MM-DD HH:mm:ss ').toString() };
            if (col == '') {
              col = val;
            } else {
              col = col + ',' + val;
            }
          };
          if (row == '') { row = col; }
          else { row = row + '\r\n' + col; }
        };
        res.write('\r\n');
        res.write(row);
        pagination();
      } else {
        res.end();
      }
    })
  }
  pagination();
}








exports.vuscreen_FnB_items_export_csv = function (req, res) {
  var fields = ["device_id", "title", "menu", "trackingDetails", "sync_date", "totalRecords"];
  var fieldversions = ["device_id", "title", "menu", "trackingDetails", "sync_date", "totalRecords"];

  var name = 'FnB' + (moment(new Date()).format('YYYY-MM-DD')).toString()
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-disposition', 'attachment;filename=' + name + '.csv');
  res.write(fieldversions.join(","));
  // console.log(req);
  function pagination() {
    vuscreen_getFnBIemData_Pagination(req, function (err, doc) {
      console.log(doc);
      if (doc.data.length > 0) {
        req.query.start = parseInt(req.query.start) + parseInt(req.query.length);
        var row = '';
        for (var i = 0; i < doc.data.length; i++) {
          var json = doc.data[i];
          var col = '';
          for (var x = 0; x < fields.length; x++) {
            var val = json[fields[x]];
            if (val) {
              val = val.toString().replace(/,/g, ' ').replace(/"/g, ' ');
            }
            if (val == '' || typeof (val) == 'undefined' || val == null) { val = ' '; };
            if (fields[x] == 'sync_datetime') { val = moment(val).format('YYYY-MM-DD HH:mm:ss ').toString() };
            if (col == '') {
              col = val;
            } else {
              col = col + ',' + val;
            }
          };
          if (row == '') { row = col; }
          else { row = row + '\r\n' + col; }
        };
        res.write('\r\n');
        res.write(row);
        pagination();
      } else {
        res.end();
      }
    })
  }
  pagination();
}




const ids = [
  {
    device_id: "1b65cae1eaeba474",
    vehicle_no: 1
  },
  {
    device_id: "75538609177e4152",
    vehicle_no: 2
  },
  {
    device_id: "a8e1abf97c693cc",
    vehicle_no: 3
  },
  {
    device_id: "2fc266ab5dcc26b0",
    vehicle_no: 4
  },
  {
    device_id: "104147a818ac3808",
    vehicle_no: 5
  },
  {
    device_id: "a2cecc94e3a04d",
    vehicle_no: 6
  },
  {
    device_id: "a06f76beb4584cd4",
    vehicle_no: 7
  },
  {
    device_id: "5f0f7aaeeec78eda",
    vehicle_no: 8
  },
  {
    device_id: "98d0a028c618f251",
    vehicle_no: 9
  },
  {
    device_id: "8e23f6922c211e65",
    vehicle_no: 10
  },
  {
    device_id: "b5d565ca52d63a09",
    vehicle_no: 11
  },
  {
    device_id: "c11ff66984c85cfb",
    vehicle_no: 12
  },
  {
    device_id: "5d5bd83375b23bc0",
    vehicle_no: 13
  },
  {
    device_id: "60e31f73b31bca6",
    vehicle_no: 14
  },
  {
    device_id: "38bac22273350d51",
    vehicle_no: 15
  },
  {
    device_id: "ceea700a44bb59cf",
    vehicle_no: 16
  },
  {
    device_id: "42ca32afd8c1c554",
    vehicle_no: 17
  },
  {
    device_id: "f65dab259c60f4b6",
    vehicle_no: 18
  },
  {
    device_id: "712df6fe834672b9",
    vehicle_no: 19
  },
  {
    device_id: "5207d65a46c250b0",
    vehicle_no: 20
  },
  {
    device_id: "d459bedf9f1b3f3e",
    vehicle_no: 21
  },
  {
    device_id: "24e6d10c1598d94b",
    vehicle_no: 22
  },
  {
    device_id: "42a928ec331e744c",
    vehicle_no: 23
  },
  {
    device_id: "11403e6c296230a1",
    vehicle_no: 24
  },
  {
    device_id: "8d7958a14d65f348",
    vehicle_no: 25
  },
  {
    device_id: "2e64ae9b5d477ff6",
    vehicle_no: 26
  },
  {
    device_id: "7f02912065618881",
    vehicle_no: 27
  },
  {
    device_id: "29d6c2c7e82ea1d5",
    vehicle_no: 28
  },
  {
    device_id: "2046db62bc9a390e",
    vehicle_no: 29
  },
  {
    device_id: "94b86fa76130a773",
    vehicle_no: 30
  },
  {
    device_id: "ee499b1f0afff81a",
    vehicle_no: 31
  },
  {
    device_id: "16fa92d30cc71229",
    vehicle_no: 32
  }
]


exports.monthly_usage = function (req, res) {
  var query = "SELECT DATE_FORMAT(sync_date, '%Y') YEAR, DATE_FORMAT(sync_date, '%m-%Y') MONTH, "
    + " COUNT(1) Views, COUNT(DISTINCT mac) Users, ROUND(SUM(view_duration/3600)) Duration"
    + " FROM vuscreen_tracker"
    + " WHERE DATE_FORMAT(sync_date, '%Y') > '2019'"
    + " GROUP BY MONTH"
    + " ORDER BY MONTH DESC";
  db.get().query(query, function (err, doc) {
    if (err) { return handleError(res, err); }
    return res.status(200).json(doc);
  })
};

exports.usage_bucket = async function (req, res) {
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
  for (let i = 0; i < 7; i++) {
    let d = new Date();
    d.setDate(d.getDate() - i - 1);
    Last7Days.push(formatDate(d))
  }

  Last7Days.reverse().join(',');
  // const bucket = ["SUM(view_duration/60) >= 0 AND SUM(view_duration/60) <= 30",
  //   "SUM(view_duration/60) >= 31 AND SUM(view_duration/60) <= 60",
  //   "SUM(view_duration/60) >= 61 AND SUM(view_duration/60) <= 90",
  //   "SUM(view_duration/60) >= 91",
  //   "Total User",
  //   "Avg Time Spent",
  //   "Total Time Spent",
  //   "Total Host"
  // ]
  const bucket = ["Thirty",
    "Sixty",
    "Ninty",
    "Gninty",
    "TotalUser",
    "AvgTimeSpent",
    "TotalTimeSpent",
    "TotalHost"
  ]
  const finalResult = []
  let bucketMap = new Map();
  for (let i = 0; i < Last7Days.length; i++) {
    const element = Last7Days[i];
    let obj = { "date": element };
    for (let j = 0; j < bucket.length; j++) {
      let query = ""
      if (bucket[j] == "Thirty") {
        try {
          query = "SELECT mac,ROUND(SUM(view_duration/60)) duration "
            + " FROM vuscreen_tracker"
            + " WHERE sync_date = '" + element + "' AND mac!= ''"
            + " GROUP BY mac"
            + " HAVING SUM(view_duration/60) >= 0 AND SUM(view_duration/60) <= 30";
          db.get().query(query, function (err, data) {
            if (!err) {
              obj[bucket[j]] = data.length;
            } else {
              console.log(err)
            }
          })
        } catch (error) {
          console.log(error)
        }
      }
      else if (bucket[j] == "Sixty") {
        try {
          query = "SELECT mac,ROUND(SUM(view_duration/60)) duration "
            + " FROM vuscreen_tracker"
            + " WHERE sync_date = '" + element + "' AND mac!= ''"
            + " GROUP BY mac"
            + " HAVING SUM(view_duration/60) >= 31 AND SUM(view_duration/60) <= 60";
          db.get().query(query, function (err, data) {
            if (!err) {
              obj[bucket[j]] = data.length;
            } else {
              console.log(err)
            }
          })
        } catch (error) {
          console.log(error)
        }
      } else if (bucket[j] == "Ninty") {
        try {
          query = "SELECT mac,ROUND(SUM(view_duration/60)) duration "
            + " FROM vuscreen_tracker"
            + " WHERE sync_date = '" + element + "' AND mac!= ''"
            + " GROUP BY mac"
            + " HAVING SUM(view_duration/60) >= 61 AND SUM(view_duration/60) <= 90";
          db.get().query(query, function (err, data) {
            if (!err) {
              obj[bucket[j]] = data.length;
            } else {
              console.log(err)
            }
          })
        } catch (error) {
          console.log(error)
        }
      } else if (bucket[j] == "Gninty") {
        try {
          query = "SELECT mac,ROUND(SUM(view_duration/60)) duration "
            + " FROM vuscreen_tracker"
            + " WHERE sync_date = '" + element + "' AND mac!= ''"
            + " GROUP BY mac"
            + " HAVING SUM(view_duration/60) >= 91";
          db.get().query(query, function (err, data) {
            if (!err) {
              obj[bucket[j]] = data.length;
            } else {
              console.log(err)
            }
          })
        } catch (error) {
          console.log(error)
        }
      } else if (bucket[j] == "TotalUser") {
        try {
          query = "SELECT COUNT(DISTINCT mac) users from vuscreen_tracker WHERE sync_date = '" + element + "' AND mac!= ''"
          db.get().query(query, function (err, data) {
            if (!err) {
              obj[bucket[j]] = data[0].users;
            } else {
              console.log(err)
            }
          })
        } catch (error) {
          console.log(error)
        }
      } else if (bucket[j] == "AvgTimeSpent") {
        try {
          query = "SELECT ROUND(Sum(view_duration/60)/COUNT(DISTINCT mac),2) avg_time from vuscreen_tracker WHERE sync_date = '" + element + "' AND mac!= ''"
          db.get().query(query, function (err, data) {
            if (!err) {
              obj[bucket[j]] = data[0].avg_time;

            } else {
              console.log(err)
            }
          })
        } catch (error) {
          console.log(error)
        }
      } else if (bucket[j] == "TotalTimeSpent") {
        try {
          query = "SELECT ROUND(Sum(view_duration/60),2) total_time from vuscreen_tracker WHERE sync_date = '" + element + "' AND mac!= ''"
          db.get().query(query, function (err, data) {
            if (!err) {
              obj[bucket[j]] = data[0].total_time;
            } else {
              console.log(err)
            }
          })
        } catch (error) {
          console.log(error)
        }
      } else {
        try {
          query = "SELECT COUNT(DISTINCT device_id) total_host from vuscreen_tracker WHERE sync_date = '" + element + "' AND device_id!= ''"
          db.get().query(query, function (err, data) {
            if (!err) {
              obj[bucket[j]] = data[0].total_host;
            } else {
              console.log(err)
            }
          })
        } catch (error) {
          console.log(error)
        }
      }
      if (j + 1 == bucket.length) {
        finalResult.push(obj)

      }
    }

    if (i + 1 == Last7Days.length) {
      setTimeout(() => {
        return res.status(200).json(`finalResult`);
      }, 12000);
      //return res.status(200).json(finalResult);

    }
  }
  // for (let index = 0; index < bucketMap.length; index++) {
  //   const element = bucketMap[index];
  //   console.log(element)
  // }
  //setTimeout(() => {
  //  return res.status(200).json(finalResult);
  //}, 10000);

};





// test();



/*  Get server session details
    @Authentication ----> by session key
    @Authorization ----> Access Controll Logic
    Author : Kedar Gadre
    Date : 06/01/2021
*/
exports.serverSessionDetails_old = function (req, res) {
  var startDate, endDate;
  if (req.query.startDate) { startDate = moment(req.query.startDate).format('YYYY-MM-DD'); }
  if (req.query.endDate) { endDate = moment(req.query.endDate).format('YYYY-MM-DD'); }
  let query = "SELECT distinct DATE_FORMAT(convert(ve.view_datetime,datetime), '%Y-%m-%d %H:%i') as ts ,ve.sync_date,vr.vehicle_no as HostID,ve.event"
    + " FROM vuscreen_events ve"
    + " LEFT JOIN vuscreen_registration vr ON ve.device_id = vr.device_id"
    + " WHERE ve.sync_date >= '" + startDate + "' AND ve.sync_date <= '" + endDate + "' AND ve.user = 'server'"
    + " AND ve.event NOT IN ('start', 'download', 'stop', 'delete') AND ve.event NOT Like 'charging%'"
    + " AND vr.vehicle_no != '' GROUP BY ve.view_datetime, vr.vehicle_no, ve.event ORDER BY ve.sync_datetime"
  console.log(query)
  db.get().query(query, function (error, dataArray) {
    if (error) {
      console.log(error)
    } else {
      let finalArr = []
      let dataObj = {
        sync_date: null, HostID: null, cycle: null, wifiLogin: null, start_date: null, start_time: null, start_battery: null,
        stop_date: null, stop_time: null, stop_battery: null, start_stop_duration: null, battery_consumed: null
      }
      let deviceMap = new Map();
      console.log(dataArray.length)
      for (let i = 0; i < dataArray.length; i++) {
        const element = dataArray[i];
        try {
          let eventType = element.event.split("|")[0]
          let batteryPer = element.event.split(":")[1].split("%")[0]
          let wifiLogin = element.event.split("% |")[1]
          if (dataObj.sync_date == null) {
            if (eventType.trim() == "start") {
              dataObj.sync_date = element.sync_date
              dataObj.HostID = element.HostID;
              var startDate = element.ts
              dataObj.start_date = element.ts.split(" ")[0]
              dataObj.start_time = element.ts.split(" ")[1]
              dataObj.start_battery = batteryPer + "%"
              dataObj.wifiLogin = wifiLogin
              if (deviceMap.has(element.sync_date + '_' + element.HostID)) {
                let value = deviceMap.get(element.sync_date + '_' + element.HostID)
                dataObj.cycle = value + 1
                deviceMap.set(element.sync_date + '_' + element.HostID, value + 1)
              } else {
                deviceMap.set(element.sync_date + '_' + element.HostID, 1)
                dataObj.cycle = 1
              }
            }
          } else {
            if (dataObj.HostID == element.HostID) {
              let endDate = element.ts
              dataObj.stop_date = element.ts.split(" ")[0]
              dataObj.stop_time = element.ts.split(" ")[1]
              dataObj.stop_battery = batteryPer + "%"
              dataObj.wifiLogin = wifiLogin
              // need to cal time duration & battery consumed
              let difference = diff_minutes(new Date(startDate), new Date(endDate))
              dataObj.start_stop_duration = difference
              let battery_consumed = dataObj.start_battery.replace("%", "") - dataObj.stop_battery.replace("%", "")
              dataObj.battery_consumed = battery_consumed + "%"
              finalArr.push(dataObj)
              dataObj = {
                sync_date: null, HostID: null, cycle: null, wifiLogin: null, start_date: null, start_time: null, start_battery: null,
                stop_date: null, stop_time: null, stop_battery: null, start_stop_duration: null, battery_consumed: null
              }
            }
          }
        } catch (error) {
          console.log(error)
        }

        if (i + 1 >= dataArray.length) {
          // return res.status(200).json(finalArr);
          setTimeout(() => {
            console.log("finalArr.length")
            console.log(finalArr.length)
            return res.status(200).json(finalArr);
          }, 12000);
        }
      }
      console.log(finalArr.length)
    }
  })
}

exports.serverSessionDetails = async function (req, res) {
  return res.status(200).json(await cronController.serverSessionCron(req, true))
}

function diff_minutes(dt2, dt1) {
  var diff = (dt2.getTime() - dt1.getTime()) / 1000;
  diff /= 60;
  return Rbs(Math.round(diff));

}





var wifi_login_sync = function (req, res) {
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
  var query = "SELECT distinct b.vehicle_no, a.event, a.view_datetime, a.journey_id,unique_mac_address FROM spicescreen.vuscreen_events a JOIN vuscreen_registration b ON a.device_id = b.device_id WHERE a.sync_date= '" + Yesterday + "' AND a.event != 'download' AND a.event != 'charging' ORDER BY a.id DESC";


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
      var email = 'vishal.garg@mobisign.co.in,tushar.mehta@mobisign.co.in'
      //var email = 'anurag.kumar@spicejet.com,puneet.angrish@spicejet.com,sapna.kumar@spicejet.com,jitendra.gautam@spicejet.com,prashant.mishra4@spicejet.com,sushant.madhab@spicejet.com,manoj.gupta@mobisign.co.in,deepak.kumar@mobisign.co.in,monali.monalisa@mobisign.co.in,product@mobisign.co.in,ashyin.thakral@mobisign.co.in,kedargdr@gmail.com,amajit.das@spicejet.com,nidhi.sinha@spicejet.com,vishal.garg@mobisign.co.in,tushar.mehta@mobisign.co.in'
      //  var email = 'vishal.garg@mobisign.co.in,deepak.kumar@mobisign.co.in,tushar.mehta@mobisign.co.in'
      EM.dispatchEmail(email, subject, html, "wifisync", function (e) {
        console.log(e)
      })
      // return res.status(200).json(doc);
    }
  })
};
// wifi_login_sync();


var wifi_login_count = function (req, res) {
  // var wifi_login_sync = function (req, res) {
  // var startDate = 'null', endDate = 'null';
  // if (req.query.startDate) { startDate = moment(req.query.startDate).format('YYYY-MM-DD'); }
  // if (req.query.endDate) { endDate = moment(req.query.endDate).format('YYYY-MM-DD'); }
  var currentDate = moment(new Date()).format('YYYY-MM-DD');
  var d = new Date();

  d.setDate(d.getDate() - 1);
  // var Yesterday = moment(d).format('YYYY-MM-DD').toString();
  var Yesterday = "2021-01-24"

  var query1 = "SELECT distinct b.vehicle_no FROM spicescreen.vuscreen_events a JOIN vuscreen_registration b ON a.device_id = b.device_id WHERE a.view_date = '" + Yesterday + "' AND a.event != 'download' AND a.event != 'charging' ORDER BY a.id DESC";
  db.get().query(query1, function (err, doc1) {
    // console.log(err);
    if (err) { return handleError(res, err); }
    else {

      var query = "SELECT distinct b.vehicle_no, a.event, a.view_datetime, a.journey_id,unique_mac_address FROM spicescreen.vuscreen_events a JOIN vuscreen_registration b ON a.device_id = b.device_id WHERE a.view_date = '" + Yesterday + "' AND a.event != 'download' AND a.event != 'charging' ORDER BY a.id DESC";
      db.get().query(query, function (err, doc) {
        if (err) { return handleError(res, err); }
        else {


          var data = ""
          let a = []

          for (let k = 0; k < doc1.length; k++) {
            var count = 0;
            var data = "";
            let wifiMap = new Map();
            for (let i = 0; i < doc.length; i++) {
              if (doc1[k].vehicle_no == doc[i].vehicle_no) {
                data += doc[i].unique_mac_address + ",";
                // console.log(doc[i].unique_mac_address)
              }
              if (doc.length == i + 1) {
                var data1 = data.split(',');
                // console.log(data1.length);

                for (let j = 0; j < data1.length; j++) {
                  const element = data1[j];

                  wifiMap.set(element, element)

                  if (data1.length == j + 1) {
                    // console.log(wifiMap.size)
                    count = wifiMap.size

                  }

                }
                // console.log(wifiMap);
                // console.log(wifiMap.size)
              }

            }
            var dt = {
              host: doc1[k].vehicle_no,
              mac: count
            }
            a.push(dt);
          }

          console.log(a);
          var fields = ["host", "mac"];
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
          // var email = 'manoj.gupta@mobisign.co.in,deepak.kumar@mobisign.co.in,vishal.garg@mobisign.co.in,tushar.mehta@mobisign.co.in,ataul.khan001@gmail.com'
          //var email = 'anurag.kumar@spicejet.com,puneet.angrish@spicejet.com,sapna.kumar@spicejet.com,jitendra.gautam@spicejet.com,prashant.mishra4@spicejet.com,sushant.madhab@spicejet.com,manoj.gupta@mobisign.co.in,deepak.kumar@mobisign.co.in,monali.monalisa@mobisign.co.in,product@mobisign.co.in,ashyin.thakral@mobisign.co.in,kedargdr@gmail.com,amajit.das@spicejet.com,nidhi.sinha@spicejet.com,vishal.garg@mobisign.co.in,tushar.mehta@mobisign.co.in'
          var email = 'vishal.garg@mobisign.co.in,tushar.mehta@mobisign.co.in'
          EM.dispatchEmail(email, subject, html, "wifisync", function (e) {
            console.log(e)
          })
          // return res.status(200).json(doc);
        }
      })
    }
  })
};
// wifi_login_count()
// vuscreen_analyticsSMS();

////////  visualize analytics by  tushar mehta  //////////////////////////////////////////
exports.vuscreen_analyticsvu_panl = function (req, res) {
  var startDate = 'null', endDate = 'null';
  if (req.query.startDate) { startDate = moment(req.query.startDate).format('YYYY-MM-DD'); }
  if (req.query.endDate) { endDate = moment(req.query.endDate).format('YYYY-MM-DD'); }



  async.parallel([
    function (callback) {
      var query = "SELECT b.content_id, b.title, count(distinct mac) as users, count(1)as clicks FROM spicescreen.vuscreen_tracker AS a JOIN spicescreen.vuscreen_content_package AS b ON a.view_id = b.content_id where a.sync_date>='" + startDate + "' and a.sync_date<='" + endDate + "' group by b.content_id, b.title"
      db.get().query(query, function (err, Watch) {
        if (err) {
          callback(err, null);
        }
        else {
          callback(null, Watch);
        }
      })
    },
    function (callback) {
      var query1 = "SELECT b.content_id, b.title, count(distinct mac) as users, count(1) as clicks FROM spicescreen.vuscreen_tracker AS a JOIN spicescreen.vuscreen_read_content AS b ON a.view_id = b.content_id where a.type='pdf' and a.sync_date>='" + startDate + "' and a.sync_date<='" + endDate + "' group by b.content_id, b.title"
  db.get().query(query1, function (err, pdf) {
         if (err) {
          callback(err, null);
        }
        else {
          callback(null, pdf);
        }
      })
    },function (callback) {
      var query2 = "SELECT b.content_id, b.title, count(distinct mac) as users, count(1) as clicks FROM spicescreen.vuscreen_tracker AS a JOIN spicescreen.vuscreen_read_content AS b ON a.view_id = b.content_id where a.type='audio' and a.sync_date>='" + startDate + "' and a.sync_date<='" + endDate + "' group by b.content_id, b.title"
      db.get().query(query2, function (err, audio) {
             if (err) {
          callback(err, null);
        }
        else {
          callback(null, audio);
        }
      })
    },function (callback) {
      var query3 = "SELECT b.content_id, b.title, count(distinct mac) as users, count(1) as clicks FROM spicescreen.vuscreen_tracker AS a JOIN spicescreen.vuscreen_travel_content AS b ON a.view_id = b.content_id where a.type='TRAVEL' and a.sync_date>='" + startDate + "' and a.sync_date<='" + endDate + "' group by b.content_id, b.title"
      db.get().query(query3, function (err, travel) {
                if (err) {
          callback(err, null);
        }
        else {
          callback(null, travel);
        }
      })
    },function (callback) {
      var query4 = "SELECT b.content_id, b.title, count(distinct mac) as users, count(1) as clicks FROM spicescreen.vuscreen_tracker AS a JOIN spicescreen.vuscreen_store_content AS b ON a.view_id = b.content_id where a.menu='STORE' and a.sync_date>='" + startDate + "' and a.sync_date<='" + endDate + "' group by b.content_id, b.title"
      db.get().query(query4, function (err, store) {
        if (err) {
          callback(err, null);
        }
        else {
          callback(null, store);
        }
      })
    },function (callback) {
      var query5 = "SELECT b.content_id, b.title, count(distinct mac) as users, count(1) as clicks FROM spicescreen.vuscreen_tracker AS a JOIN spicescreen.vuscreen_fnb_content AS b ON a.view_id = b.content_id where a.menu='f&b' and a.sync_date>='" + startDate + "' and a.sync_date<='" + endDate + "' group by b.content_id, b.title"
      db.get().query(query5, function (err, fnb) {
                         if (err) {
          callback(err, null);
        }
        else {
          callback(null, fnb);
        }
      })
    },function (callback) {
      var query6 = "SELECT b.id, b.title, count(distinct mac) as users, count(1) as clicks FROM spicescreen.vuscreen_tracker AS a JOIN spicescreen.vuscreen_advertise_content AS b ON a.view_id = b.id where a.type  like '%ad%'  and a.sync_date>='" + startDate + "' and a.sync_date<='" + endDate + "' or a.menu like '%ad%' group by b.id, b.title"
      db.get().query(query6, function (err, ad) {
                                              if (err) {
          callback(err, null);
        }
        else {
          callback(null, ad);
        }
      })
    },function (callback) {
      var query7 = "SELECT count(1) as clicks, count(distinct mac) as users, menu FROM spicescreen.vuscreen_tracker where sync_date>='" + startDate + "' and sync_date<='" + endDate + "' group by menu"
     db.get().query(query7, function (err, menu) {
                       if (err) {
          callback(err, null);
        }
        else {
          callback(null, menu);
        }
      })
    },
  ],
    function (err, results) {

      console.log(results.length);
      var finalData = {
                                          WATCH: results[0],
                                          PDF: results[1],
                                          AUDIO: results[2],
                                          TRAVEL: results[3],
                                          STORE: results[4],
                                          FNB: results[5],
                                          AD: results[6],
                                          MENU: results[7]
                                        }

      return res.status(200).json(finalData);
     
    });



 
}
// vuscreen_analyticsvu_panl();
exports.vuscreen_analyticsvu_panlpro = function (req, res) {
  var startDate = 'null', endDate = 'null';
  if (req.query.startDate) { startDate = moment(req.query.startDate).format('YYYY-MM-DD'); }
  if (req.query.endDate) { endDate = moment(req.query.endDate).format('YYYY-MM-DD'); }
  // var hostss = " ('1', '2', '3', '4', '5', '6', '8', '10', '11', '13', '14', '15', '17', '18', '20', '22', '23', '26', '29', '32', '33', '35', '36', '37', '39', '40', '41', '42', '43', '44', '45', '46', '47', '48', '49', '51', '52', '53', '54', '55', '56', '57', '58', '59', '60', '61', '62', '63', '64', '65', '66', '67', '68', '69', '70', '71', '72', '73', '74', '75', '76', '78', '79', '81', '82', '83', '84', '85', '86', '88', '89', '90', '91', '92', '93', '94', '95', '96', '97', '98', '99', '100', '101', '102', '103', '106', '107', '108', '110', '111', '112', '113', '114', '115', '116', '117', '118', '123', '124', '125', '127', '128', '130', '132', '134', '142', '146', '148', '149', '150', '151', '152', '153', '154', '155', '156', '157', '158', '159', '160', '161', '163', '164', '169', '171', '172', '173', '174', '175', '177', '180', '181', '184', '185', '186', '188', '190', '191', '192', '193', '194', '195', '196', '197', '198', '199', '200', '201', '203', '205', '206', '207', '208', '211', '212', '213', '214', '215', '216', '217', '218', '219', '220', '221', '301', '302', '303', '304', '305', '306')"

  var querys = "SELECT count(distinct device_id) as device,sync_date FROM spicescreen.vuscreen_tracker  where sync_date>='" + startDate + "' and sync_date<='" + endDate + "' group by sync_date";
  db.get().query(querys, function (err, device) {
    // console.log(err);
    if (err) {
      return handleError(res, err);
    }
    else {

      var div = 0;
      for (let dat in device) {
        div += parseInt(device[dat].device);
      }
      // console.log(div);
      // var div = parseInt(device[0].device);
      var mul = 163 * 31;


      async.parallel([
        function (callback) {
          var query = "SELECT b.content_id, b.title, Round((count(distinct mac)/" + div + ")*" + mul + ") as users, Round((count(1)/" + div + ")*" + mul + ") as clicks FROM spicescreen.vuscreen_tracker AS a JOIN spicescreen.vuscreen_content_package AS b ON a.view_id = b.content_id where a.sync_date>='" + startDate + "' and a.sync_date<='" + endDate + "' group by b.content_id, b.title";
          db.get().query(query, function (err, Watch) {
            if (err) {
              callback(err, null);
            }
            else {
              callback(null, Watch);
            }
          })
        },
        function (callback) {
          var query1 = "SELECT b.content_id, b.title, Round((count(distinct mac)/" + div + ")*" + mul + ") as users, Round((count(1)/" + div + ")*" + mul + ") as clicks FROM spicescreen.vuscreen_tracker AS a JOIN spicescreen.vuscreen_read_content AS b ON a.view_id = b.content_id where a.type='pdf' and a.sync_date>='" + startDate + "' and a.sync_date<='" + endDate + "' group by b.content_id, b.title";
          db.get().query(query1, function (err, pdf) {
             if (err) {
              callback(err, null);
            }
            else {
              callback(null, pdf);
            }
          })
        },function (callback) {
          var query2 = "SELECT b.content_id, b.title, Round((count(distinct mac)/" + div + ")*" + mul + ") as users, Round((count(1)/" + div + ")*" + mul + ") as clicks FROM spicescreen.vuscreen_tracker AS a JOIN spicescreen.vuscreen_read_content AS b ON a.view_id = b.content_id where a.type='audio' and a.sync_date>='" + startDate + "' and a.sync_date<='" + endDate + "' group by b.content_id, b.title";
              db.get().query(query2, function (err, audio) {
                 if (err) {
              callback(err, null);
            }
            else {
              callback(null, audio);
            }
          })
        },function (callback) {
          var query3 = "SELECT b.content_id, b.title, Round((count(distinct mac)/" + div + ")*" + mul + ") as users, Round((count(1)/" + div + ")*" + mul + ") as clicks FROM spicescreen.vuscreen_tracker AS a JOIN spicescreen.vuscreen_travel_content AS b ON a.view_id = b.content_id where a.type='TRAVEL' and a.sync_date>='" + startDate + "' and a.sync_date<='" + endDate + "' group by b.content_id, b.title";
                  db.get().query(query3, function (err, travel) {
                    if (err) {
              callback(err, null);
            }
            else {
              callback(null, travel);
            }
          })
        },function (callback) {
          var query4 = "SELECT b.content_id, b.title, Round((count(distinct mac)/" + div + ")*" + mul + ") as users, Round((count(1)/" + div + ")*" + mul + ") as clicks FROM spicescreen.vuscreen_tracker AS a JOIN spicescreen.vuscreen_store_content AS b ON a.view_id = b.content_id where a.menu='STORE' and a.sync_date>='" + startDate + "' and a.sync_date<='" + endDate + "' group by b.content_id, b.title";
          db.get().query(query4, function (err, store) {
            if (err) {
              callback(err, null);
            }
            else {
              callback(null, store);
            }
          })
        },function (callback) {
          var query5 = "SELECT b.content_id, b.title, Round((count(distinct mac)/" + div + ")*" + mul + ") as users, Round((count(1)/" + div + ")*" + mul + ") as clicks FROM spicescreen.vuscreen_tracker AS a JOIN spicescreen.vuscreen_fnb_content AS b ON a.view_id = b.content_id where a.menu='f&b' and a.sync_date>='" + startDate + "' and a.sync_date<='" + endDate + "' group by b.content_id, b.title";
                          db.get().query(query5, function (err, fnb) {
                             if (err) {
              callback(err, null);
            }
            else {
              callback(null, fnb);
            }
          })
        },function (callback) {
          var query6 = "SELECT b.id, b.title, Round((count(distinct mac)/" + div + ")*" + mul + ") as users, Round((count(1)/" + div + ")*" + mul + ") as clicks FROM spicescreen.vuscreen_tracker AS a JOIN spicescreen.vuscreen_advertise_content AS b ON a.view_id = b.id where a.type  like '%ad%'  and a.sync_date>='" + startDate + "' and a.sync_date<='" + endDate + "' or a.menu like '%ad%' group by b.id, b.title";
                              db.get().query(query6, function (err, ad) {
                                                  if (err) {
              callback(err, null);
            }
            else {
              callback(null, ad);
            }
          })
        },function (callback) {
          var query7 = "SELECT Round((count(distinct mac)/" + div + ")*" + mul + ") as users, Round((count(1)/" + div + ")*" + mul + ") as clicks, menu FROM spicescreen.vuscreen_tracker where sync_date>='" + startDate + "' and sync_date<='" + endDate + "' group by menu"
          db.get().query(query7, function (err, menu) {
                           if (err) {
              callback(err, null);
            }
            else {
              callback(null, menu);
            }
          })
        },
      ],
        function (err, results) {

          console.log(results.length);
          var finalData = {
                                              WATCH: results[0],
                                              PDF: results[1],
                                              AUDIO: results[2],
                                              TRAVEL: results[3],
                                              STORE: results[4],
                                              FNB: results[5],
                                              AD: results[6],
                                              MENU: results[7]
                                            }

          return res.status(200).json(finalData);
         
        });

    
    }
  })
}
// vuscreen_analyticsvu_panlpro();
exports.vuscreen_analyticsvu_des = function (req, res) {
  console.log("vishall");
  var startDate = 'null', endDate = 'null';
  if (req.query.startDate) { startDate = moment(req.query.startDate).format('YYYY-MM-DD'); }
  if (req.query.endDate) { endDate = moment(req.query.endDate).format('YYYY-MM-DD'); }
  //var hostss = " ('1', '2', '3', '4', '5', '6', '8', '10', '11', '13', '14', '15', '17', '18', '20', '22', '23', '26', '29', '32', '33', '35', '36', '37', '39', '40', '41', '42', '43', '44', '45', '46', '47', '48', '49', '51', '52', '53', '54', '55', '56', '57', '58', '59', '60', '61', '62', '63', '64', '65', '66', '67', '68', '69', '70', '71', '72', '73', '74', '75', '76', '78', '79', '81', '82', '83', '84', '85', '86', '88', '89', '90', '91', '92', '93', '94', '95', '96', '97', '98', '99', '100', '101', '102', '103', '106', '107', '108', '110', '111', '112', '113', '114', '115', '116', '117', '118', '123', '124', '125', '127', '128', '130', '132', '134', '142', '146', '148', '149', '150', '151', '152', '153', '154', '155', '156', '157', '158', '159', '160', '161', '163', '164', '169', '171', '172', '173', '174', '175', '177', '180', '181', '184', '185', '186', '188', '190', '191', '192', '193', '194', '195', '196', '197', '198', '199', '200', '201', '203', '205', '206', '207', '208', '211', '212', '213', '214', '215', '216', '217', '218', '219', '220', '221', '301', '302', '303', '304', '305', '306')"
  var querys = "SELECT count(distinct device_id) as device,sync_date FROM spicescreen.vuscreen_tracker  where sync_date>='" + startDate + "' and sync_date<='" + endDate + "' group by sync_date";
  db.get().query(querys, function (err, device) {
    console.log(querys);
    if (err) {
      return handleError(res, err);
    }
    else {
      var div = 0;
      for (let dat in device) {
        div += parseInt(device[dat].device);
      }
      // var dt = endDate.split('-');
      // var div = parseInt(device[0].device);
      var mul = 163 * 31;

      async.parallel([
        function (callback) {
          var query = "SELECT b.content_id, b.title, Round((count(distinct mac)/" + div + ")*" + mul + ") as users, Round((count(1)/" + div + ")*" + mul + ") as clicks FROM spicescreen.vuscreen_tracker AS a JOIN spicescreen.vuscreen_content_package AS b ON a.view_id = b.content_id where a.destination='" + req.query.destination + "' and  a.sync_date>='" + startDate + "' and a.sync_date<='" + endDate + "' group by b.content_id, b.title";
       db.get().query(query, function (err, Watch) {
            if (err) {
              callback(err, null);
            }
            else {
              callback(null, Watch);
            }
          })
        },
        function (callback) {
          var query1 = "SELECT b.content_id, b.title, Round((count(distinct mac)/" + div + ")*" + mul + ") as users, Round((count(1)/" + div + ")*" + mul + ") as clicks FROM spicescreen.vuscreen_tracker AS a JOIN spicescreen.vuscreen_read_content AS b ON a.view_id = b.content_id where a.destination='" + req.query.destination + "' and a.type='pdf' and a.sync_date>='" + startDate + "' and a.sync_date<='" + endDate + "' group by b.content_id, b.title";
          db.get().query(query1, function (err, pdf) {
             if (err) {
              callback(err, null);
            }
            else {
              callback(null, pdf);
            }
          })
        },function (callback) {
          var query2 = "SELECT b.content_id, b.title, Round((count(distinct mac)/" + div + ")*" + mul + ") as users, Round((count(1)/" + div + ")*" + mul + ") as clicks FROM spicescreen.vuscreen_tracker AS a JOIN spicescreen.vuscreen_read_content AS b ON a.view_id = b.content_id where a.destination='" + req.query.destination + "' and a.type='audio' and a.sync_date>='" + startDate + "' and a.sync_date<='" + endDate + "' group by b.content_id, b.title";
    db.get().query(query2, function (err, audio) {
                 if (err) {
              callback(err, null);
            }
            else {
              callback(null, audio);
            }
          })
        },function (callback) {
          var query3 = "SELECT b.content_id, b.title, Round((count(distinct mac)/" + div + ")*" + mul + ") as users, Round((count(1)/" + div + ")*" + mul + ") as clicks FROM spicescreen.vuscreen_tracker AS a JOIN spicescreen.vuscreen_travel_content AS b ON a.view_id = b.content_id where a.destination='" + req.query.destination + "' and a.type='TRAVEL' and a.sync_date>='" + startDate + "' and a.sync_date<='" + endDate + "' group by b.content_id, b.title";
          db.get().query(query3, function (err, travel) {
                    if (err) {
              callback(err, null);
            }
            else {
              callback(null, travel);
            }
          })
        },function (callback) {
          var query4 = "SELECT b.content_id, b.title, Round((count(distinct mac)/" + div + ")*" + mul + ") as users, Round((count(1)/" + div + ")*" + mul + ") as clicks FROM spicescreen.vuscreen_tracker AS a JOIN spicescreen.vuscreen_store_content AS b ON a.view_id = b.content_id where a.destination='" + req.query.destination + "' and a.menu='STORE' and a.sync_date>='" + startDate + "' and a.sync_date<='" + endDate + "' group by b.content_id, b.title";
          db.get().query(query4, function (err, store) {
            if (err) {
              callback(err, null);
            }
            else {
              callback(null, store);
            }
          })
        },function (callback) {
          var query5 = "SELECT b.content_id, b.title, Round((count(distinct mac)/" + div + ")*" + mul + ") as users, Round((count(1)/" + div + ")*" + mul + ") as clicks FROM spicescreen.vuscreen_tracker AS a JOIN spicescreen.vuscreen_fnb_content AS b ON a.view_id = b.content_id where a.destination='" + req.query.destination + "' and a.menu='f&b' and a.sync_date>='" + startDate + "' and a.sync_date<='" + endDate + "' group by b.content_id, b.title";
                db.get().query(query5, function (err, fnb) {
                             if (err) {
              callback(err, null);
            }
            else {
              callback(null, fnb);
            }
          })
        },function (callback) {
          var query6 = "SELECT b.id, b.title, Round((count(distinct mac)/" + div + ")*" + mul + ") as users, Round((count(1)/" + div + ")*" + mul + ") as clicks FROM spicescreen.vuscreen_tracker AS a JOIN spicescreen.vuscreen_advertise_content AS b ON a.view_id = b.id where a.destination='" + req.query.destination + "' and a.type like '%ad%' and a.sync_date>='" + startDate + "' and a.sync_date<='" + endDate + "' or a.menu like '%ad%' group by b.id, b.title";
                     db.get().query(query6, function (err, ad) {
                                                  if (err) {
              callback(err, null);
            }
            else {
              callback(null, ad);
            }
          })
        },function (callback) {
          var query7 = "SELECT Round((count(distinct mac)/" + div + ")*" + mul + ") as users, Round((count(1)/" + div + ")*" + mul + ") as clicks,menu FROM spicescreen.vuscreen_tracker where destination='" + req.query.destination + "' and sync_date>='" + startDate + "' and sync_date<='" + endDate + "' group by menu";
          db.get().query(query7, function (err, menu) {
                           if (err) {
              callback(err, null);
            }
            else {
              callback(null, menu);
            }
          })
        },
      ],
        function (err, results) {

          console.log(results.length);
          var finalData = {
                                              WATCH: results[0],
                                              PDF: results[1],
                                              AUDIO: results[2],
                                              TRAVEL: results[3],
                                              STORE: results[4],
                                              FNB: results[5],
                                              AD: results[6],
                                              MENU: results[7]
                                            }

          return res.status(200).json(finalData);
         
        });




      // var query8 = "SELECT b.content_id, b.title, Round((count(distinct mac)/" + div + ")*" + mul + ") as users, Round((count(1)/" + div + ")*" + mul + ") as clicks FROM spicescreen.vuscreen_tracker AS a JOIN spicescreen.vuscreen_content_package AS b ON a.view_id = b.content_id where a.destination='" + req.query.destination + "' and  a.sync_date>='" + startDate + "' and a.sync_date<='" + endDate + "' group by b.content_id, b.title";
      // db.get().query(query8, function (err, Watch) {
      //   if (err) {
      //     return handleError(res, err);
      //   }
      //   else {
      //     var query1 = "SELECT b.content_id, b.title, Round((count(distinct mac)/" + div + ")*" + mul + ") as users, Round((count(1)/" + div + ")*" + mul + ") as clicks FROM spicescreen.vuscreen_tracker AS a JOIN spicescreen.vuscreen_read_content AS b ON a.view_id = b.content_id where a.destination='" + req.query.destination + "' and a.type='pdf' and a.sync_date>='" + startDate + "' and a.sync_date<='" + endDate + "' group by b.content_id, b.title";
      //     db.get().query(query1, function (err, pdf) {
      //       if (err) { return handleError(res, err); }
      //       else {
      //         var query2 = "SELECT b.content_id, b.title, Round((count(distinct mac)/" + div + ")*" + mul + ") as users, Round((count(1)/" + div + ")*" + mul + ") as clicks FROM spicescreen.vuscreen_tracker AS a JOIN spicescreen.vuscreen_read_content AS b ON a.view_id = b.content_id where a.destination='" + req.query.destination + "' and a.type='audio' and a.sync_date>='" + startDate + "' and a.sync_date<='" + endDate + "' group by b.content_id, b.title";

      //         db.get().query(query2, function (err, audio) {
      //           if (err) { return handleError(res, err); }
      //           else {
      //             var query3 = "SELECT b.content_id, b.title, Round((count(distinct mac)/" + div + ")*" + mul + ") as users, Round((count(1)/" + div + ")*" + mul + ") as clicks FROM spicescreen.vuscreen_tracker AS a JOIN spicescreen.vuscreen_travel_content AS b ON a.view_id = b.content_id where a.destination='" + req.query.destination + "' and a.type='TRAVEL' and a.sync_date>='" + startDate + "' and a.sync_date<='" + endDate + "' group by b.content_id, b.title";

      //             db.get().query(query3, function (err, travel) {
      //               if (err) { return handleError(res, err); }
      //               else {
      //                 var query4 = "SELECT b.content_id, b.title, Round((count(distinct mac)/" + div + ")*" + mul + ") as users, Round((count(1)/" + div + ")*" + mul + ") as clicks FROM spicescreen.vuscreen_tracker AS a JOIN spicescreen.vuscreen_store_content AS b ON a.view_id = b.content_id where a.destination='" + req.query.destination + "' and a.menu='STORE' and a.sync_date>='" + startDate + "' and a.sync_date<='" + endDate + "' group by b.content_id, b.title";

      //                 db.get().query(query4, function (err, store) {
      //                   if (err) { return handleError(res, err); }
      //                   else {
      //                     var query5 = "SELECT b.content_id, b.title, Round((count(distinct mac)/" + div + ")*" + mul + ") as users, Round((count(1)/" + div + ")*" + mul + ") as clicks FROM spicescreen.vuscreen_tracker AS a JOIN spicescreen.vuscreen_fnb_content AS b ON a.view_id = b.content_id where a.destination='" + req.query.destination + "' and a.menu='f&b' and a.sync_date>='" + startDate + "' and a.sync_date<='" + endDate + "' group by b.content_id, b.title";

      //                     db.get().query(query5, function (err, fnb) {
      //                       if (err) { return handleError(res, err); }
      //                       else {
      //                         var query6 = "SELECT b.id, b.title, Round((count(distinct mac)/" + div + ")*" + mul + ") as users, Round((count(1)/" + div + ")*" + mul + ") as clicks FROM spicescreen.vuscreen_tracker AS a JOIN spicescreen.vuscreen_advertise_content AS b ON a.view_id = b.id where a.destination='" + req.query.destination + "' and a.type like '%ad%' and a.sync_date>='" + startDate + "' and a.sync_date<='" + endDate + "' or a.menu like '%ad%' group by b.id, b.title";

      //                         db.get().query(query6, function (err, ad) {
      //                           if (err) { return handleError(res, err); }
      //                           else {
      //                             var query7 = "SELECT Round((count(distinct mac)/" + div + ")*" + mul + ") as users, Round((count(1)/" + div + ")*" + mul + ") as clicks,menu FROM spicescreen.vuscreen_tracker where destination='" + req.query.destination + "' and sync_date>='" + startDate + "' and sync_date<='" + endDate + "' group by menu";
      //                             db.get().query(query7, function (err, menu) {
      //                               if (err) { return handleError(res, err); }
      //                               else {
      //                                 var finalData = {
      //                                   WATCH: Watch,
      //                                   PDF: pdf,
      //                                   AUDIO: audio,
      //                                   TRAVEL: travel,
      //                                   STORE: store,
      //                                   FNB: fnb,
      //                                   AD: ad,
      //                                   MENU: menu
      //                                 }
      //                                 return res.status(200).json(finalData);
      //                               }
      //                             })
      //                           }
      //                         })
      //                       }
      //                     })
      //                   }
      //                 })
      //               }
      //             })
      //           }
      //         })
      //       }
      //     })
      //   }
      // })
    }
  })
}
exports.wifi_login = function (req, res) {
  // var wifi_login_sync = function (req, res) {
  var startDate = 'null', endDate = 'null';
  if (req.query.startDate) { startDate = moment(req.query.startDate).format('YYYY-MM-DD'); }
  if (req.query.endDate) { endDate = moment(req.query.endDate).format('YYYY-MM-DD'); }
  //   var currentDate = moment(new Date()).format('YYYY-MM-DD');
  //   var d = new Date();
  // // var Yesterday='2020-10-30';
  // // var Yesterdays='2020-10-01';

  //   d.setDate(d.getDate() - 1);
  //   var Yesterday = moment(d).format('YYYY-MM-DD').toString()
  var query = "SELECT distinct b.vehicle_no, a.event, a.view_datetime, a.journey_id,unique_mac_address FROM spicescreen.vuscreen_events a JOIN vuscreen_registration b ON a.device_id = b.device_id WHERE a.sync_date >= '" + startDate + "' and a.sync_date <= '" + endDate + "' AND a.event != 'download' AND a.event != 'charging' ORDER BY a.id DESC";

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
          // console.log(wifiMap.size)
          count = wifiMap.size;
        }
      }


      return res.status(200).json(count);
    }
  })
};
// vuscreen_analyticsvu_des()


exports.wifi_login_pro = function (req, res, next) {
  async function app() {
    console.log("vishalalaa");
    // var currentDate = moment(new Date()).format('YYYY-MM-DD');
    // var d = new Date();
    // d.setDate(d.getDate() - 1);
    // var Yesterday = moment(d).format('YYYY-MM-DD').toString()

    var startDate = 'null', endDate = 'null';
    if (req.query.startDate) { startDate = moment(req.query.startDate).format('YYYY-MM-DD'); }
    if (req.query.endDate) { endDate = moment(req.query.endDate).format('YYYY-MM-DD'); }
    var mul = 152 * 31;
    let doc = await get_host(startDate, endDate);
    console.log(doc);
    let doc1 = await get_login(startDate, endDate);
    let doc2 = await get_login_unique(doc1);
    var total = Math.round((doc2 / doc) * mul);

    return res.status(200).json(total);

    //   res.status("200").json(insert);

  }
  app();

};

exports.wifi_login_act = function (req, res, next) {
  async function app() {
    // var currentDate = moment(new Date()).format('YYYY-MM-DD');
    // var d = new Date();
    // d.setDate(d.getDate() - 1);
    // var Yesterday = moment(d).format('YYYY-MM-DD').toString()

    var startDate = 'null', endDate = 'null';
    if (req.query.startDate) { startDate = moment(req.query.startDate).format('YYYY-MM-DD'); }
    if (req.query.endDate) { endDate = moment(req.query.endDate).format('YYYY-MM-DD'); }
    var mul = 152 * 31;
    // let doc = await get_host(startDate,endDate);
    let doc1 = await get_login(startDate, endDate);
    let doc2 = await get_login_unique(doc1);
    // var total=(doc2/doc)*mul;

    return res.status(200).json(doc2);

    //   res.status("200").json(insert);

  }
  app();

};
//  vuscreen_basestation()
function get_host(startDate, endDate) {
  return new Promise(function (myResolve, myReject) {
    let query = "SELECT count(distinct device_id) as device,sync_date FROM spicescreen.vuscreen_tracker  where sync_date>='" + startDate + "' and sync_date<='" + endDate + "' group by sync_date";
    db.get().query(query, function (err, device) {
      if (err) { myResolve(err) }
      else {
        var div = 0;
        for (let dat in device) {
          div += parseInt(device[dat].device);
        }
        myResolve(div);
      }
    })

  });

}

//  vuscreen_basestation()
function get_login(startDate, endDate) {
  return new Promise(function (myResolve, myReject) {
    let query = "SELECT distinct b.vehicle_no, a.event, a.view_datetime, a.journey_id,unique_mac_address FROM spicescreen.vuscreen_events a JOIN vuscreen_registration b ON a.device_id = b.device_id WHERE a.sync_date >= '" + startDate + "' and a.sync_date <= '" + endDate + "' AND a.event != 'download' AND a.event != 'charging' ORDER BY a.id DESC";
    db.get().query(query, function (err, device) {
      if (err) { myResolve(err) }
      else {

        myResolve(device);
      }
    })

  });

}


function get_login_unique(doc) {
  return new Promise(function (myResolve, myReject) {

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
        // console.log(wifiMap.size)
        count = wifiMap.size;
        myResolve(count);
      }
    }

  });

}

exports.get_ss = function (req, res) {
  var startDate, endDate;
  if (req.query.startDate) { startDate = moment(req.query.startDate).format('YYYY-MM-DD'); }
  if (req.query.endDate) { endDate = moment(req.query.endDate).format('YYYY-MM-DD'); }
  var query = "select "
    + " count(distinct mac) count"
    + " from"
    + " vuscreen_tracker "
    + " where menu = 'SS' AND"
    + " sync_date>='" + startDate + "' AND sync_date<='" + endDate + "'"
    console.log(query)
  db.get().query(query, function (err, doc) {
    if (err) { return handleError(res, err); }
    return res.status(200).json(doc);
  })
};

















