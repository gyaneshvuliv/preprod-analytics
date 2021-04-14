'use strict';

var _ = require('lodash');
var db = require('../../config/mysql')
var moment = require('moment');


/*  Get list of config . 
    @Authentication ----> by session key
    @Authorization ----> Access Controll Logic
    Date Format ---->  DD-MM-YYYY
    Author : Kedar Gadre
    Date : 09-04-2021
    Modified_by : Kedar Gadre
    Modification Date : 09-04-2021
*/

exports.get_config_detailsg = function (req, res) {
  var query = ` select id,conf_key,conf_value from server_configurations where conf_key IN 
          ("KNOWLARITY_URL","KNOWLARITY_SMS","ROUTE_URL","ROUTE_SMS","EXOTEL_URL","EXOTEL_SMS")`;
  db.get().query(query, function (err, doc) {
    if (err) { return handleError(res, err); }
    return res.status(200).json(doc);
  })
};

// save config details after edit
exports.save = function (req, res) {
  const ids = [ {"id": 617, "value": req.body.a},{"id": 618, "value": req.body.b},{"id": 625, "value": req.body.c},{"id": 626, "value": req.body.d},
        {"id": 627, "value": req.body.e},{"id": 628, "value": req.body.f}];
  for (let index = 0; index < ids.length; index++) {
    const element = ids[index];
    var query = "Update "
      + " server_configurations SET "
      + "    conf_value = '" + element.value + "'"
      + " where "
      + " id='" + element.id + "'"
    db.get().query(query, function (err, doc) {
      if (err) { 
        if(index+1==ids.length){
          return handleError(res, err); ;
        }
      }
      else {
        console.log("saved")
        if(index+1==ids.length){
          return res.status(200).json("success");
        }
      }

    })
  }
}


function handleError(res, err) {
  return res.status(500).send(err);
}
