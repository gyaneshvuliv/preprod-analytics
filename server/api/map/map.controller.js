'use strict';

var _ = require('lodash');
var db = require('../../config/mysql')
var db_vp = require('../../config/mysql_vp')
var moment = require('moment');

/*  Get list of lat long. 
    @Authentication ----> by session key
    @Authorization ----> Access Controll Logic
    Date Format ---->  DD-MM-YYYY
    Author : Kedar Gadre
    Date : 16-08-2018
    Modified_by : Kedar Gadre
    Modification Date : 16-08-2018
*/

exports.get_lat_lng = function(req, res) {
  var intrfce='null',searchText='null';
  var filter = '';
  var bus = []
  if (req.query.bus == 'undefined' || req.query.bus == '') {
    var filter = '';
  }else{
    var a = req.query.bus
      var b = a.split(',')
      for (var i = 0; i < b.length; i++) {
        bus.push("'"+b[i]+"'")
      }
      filter = " AND vt.hostId IN("+bus+")"
  }
  // if (req.query.version && req.query.version != "undefined") { version = "'"+req.query.version+"'";}
  if (req.query.interface && req.query.interface != "undefined") { intrfce = "'"+req.query.interface+"'";}
  if (req.query.searchText && req.query.searchText != "undefined") { searchText = "'"+req.query.searchText+"'";}
  var query ="select vt.interface,vt.view_model,vt.menu,vt.sync_type,ROUND(vt.platform_duration/60,2) platform_duration,"
            +" vt.mac,vt.view_datetime,vt.sync_datetime,ROUND(vt.view_duration/60,2) view_duration,"
            +" vt.sync_latitude lat,"
            +" vt.sync_longitude lng,"
            // +" count(1) played,ROUND(SUM(view_duration/60)) duration,"
            +" vt.hostId,vt.source,vt.destination"
            +" from"
            +" vuscreen_tracker vt"
            +" where vt.partner= '"+ req.user.partner_id +"' AND vt.sync_latitude > 0 " + filter +" order by vt.sync_datetime desc limit 1000";
    db.get().query(query, function (err,doc) {
    if(err) { return handleError(res, err); }
    return res.status(200).json(doc);
  })
};

/*  Get list of bus list. 
    @Authentication ----> by session key
    @Authorization ----> Access Controll Logic
    Date Format ---->  DD-MM-YYYY
    Author : Kedar Gadre
    Date : 16-08-2018
    Modified_by : Kedar Gadre
    Modification Date : 16-08-2018
*/

exports.bus_list = function(req, res) {
  var query ="select distinct hostId as vehicle_no"
            +" from"
            +"  vuscreen_tracker"
            +" where hostId regexp '^[0-9]' AND partner= '"+ req.user.partner_id +"'";
  db.get().query(query, function (err,doc) {
    if(err) { return handleError(res, err); }
    return res.status(200).json(doc);
  })
};

/*  Get list of play lat long. 
    @Authentication ----> by session key
    @Authorization ----> Access Controll Logic
    Date Format ---->  DD-MM-YYYY
    Author : Kedar Gadre
    Date : 16-08-2018
    Modified_by : Kedar Gadre
    Modification Date : 16-08-2018
*/
exports.play_data_geography = function(req, res) {
  var currentDate = moment(new Date()).format('YYYY-MM-DD');

  var filter = " where sync_date = '"+currentDate+"' ",limit = 100000;
  if(req.query.id){
    filter = " where id > " + req.query.id + " ";
    limit = 100;
  }
  var query = "select CONCAT('play-', B.id) as uniqueId,B.id,B.source,B.destination,B.hostId,B.view_id,B.mac,B.view_datetime,B.sync_latitude lat,"
              +" B.sync_longitude lng,B.interface,B.view_model,B.view_duration view_duration,A.thumbnail,A.genre,A.title from (select id,source,destination,hostId,view_id,"
              +" sync_latitude,sync_longitude,partner,view_model,view_duration,view_datetime,sync_datetime,mac,interface from vuscreen_tracker "+filter+" ) B "
              +" JOIN vuscreen_content_package A ON A.content_id = B.view_id "
              +" where B.partner= '"+ req.user.partner_id +"'"
              +" AND B.sync_latitude > 0 AND B.view_datetime != '' AND A.type IN ('video','brand-video') limit "+limit.toString();
    db.get().query(query, function (err,doc) {
    if(err) { return handleError(res, err); }
    return res.status(200).json(doc);
  })
};

/*  Get list of ads lat long. 
    @Authentication ----> by session key
    @Authorization ----> Access Controll Logic
    Date Format ---->  DD-MM-YYYY
    Author : Kedar Gadre
    Date : 16-08-2018
    Modified_by : Kedar Gadre
    Modification Date : 16-08-2018
*/
exports.ads_data_geography = function(req, res) {
  var currentDate = moment(new Date()).format('YYYY-MM-DD');

  var filter = " where sync_date = '"+currentDate+"' ",limit = 100000;
  if(req.query.id){
    filter = " where id > " + req.query.id + " ";
    limit = 100;
  }
  var query = "select CONCAT('ad-', B.id) as uniqueId,B.id,B.source,B.destination,B.hostId,B.view_id,B.mac,B.view_datetime,B.sync_latitude lat,"
  +" B.sync_longitude lng,B.interface,B.view_model,B.view_duration view_duration,A.thumbnail,A.title from (select id,source,destination,hostId,view_id,"
  +" sync_latitude,sync_longitude,partner,view_model,view_duration,view_datetime,sync_datetime,mac,interface from vuscreen_tracker "+filter+" ) B "
  +" JOIN vuscreen_advertise_content A ON A.id = B.view_id "
  +" where B.partner= '"+ req.user.partner_id +"'"
  +" AND B.sync_latitude > 0 AND B.view_datetime != '' AND A.type IN ('banner-ad','banner-adgames','banner-adtravel','banner-admall','banner-adfnb','banner-ad','video-ad','interstitial') limit "+limit.toString();
  console.log(query)
  db.get().query(query, function (err,doc) {
    if(err) { return handleError(res, err); }
    return res.status(200).json(doc);
  })
};



/*  Get list of ads lat long. 
    @Authentication ----> by session key
    @Authorization ----> Access Controll Logic
    Date Format ---->  DD-MM-YYYY
    Author : Kedar Gadre
    Date : 14-09-2018
*/
exports.get_vp_lat_lng = function(req, res) {
  var intrfce='null',searchText='null';
  var filter = '';
  var version = []
  if (req.query.version != 'undefined') {
      var a = req.query.version
      var b = a.split(',')
      for (var i = 0; i < b.length; i++) {
        version.push("'"+b[i]+"'")
      }
      filter = " AND version IN("+version+")"
  }
  // if (req.query.version && req.query.version != "undefined") { version = "'"+req.query.version+"'";}
  if (req.query.interface && req.query.interface != "undefined") { intrfce = "'"+req.query.interface+"'";}
  if (req.query.searchText && req.query.searchText != "undefined") { searchText = "'"+req.query.searchText+"'";}
  var query ="select android_id,"
            +"  name,age,gender,phone_no,_interface,model,"
            +"  latitude,"
            +"  longitude"
            +" from"
            +"  vupoint_registration "
            +" where latitude > 0 " + filter + " AND (android_id=IFNULL("+searchText+", android_id) OR name=IFNULL("+searchText+", name)"
            +" OR phone_no=IFNULL("+searchText+", phone_no))" ;
  console.log(query)
            db_vp.get().query(query, function (err,doc) {
    if(err) { return handleError(res, err); }
    return res.status(200).json(doc);
  })
};

function handleError(res, err) {
  return res.status(500).send(err);
}
