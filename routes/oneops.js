var express = require('express');
var router = express.Router();
var http=require('http')
var request = require("request");
var config = require("../config.js")
var plot = require('plotter').plot;
var client = require('../api-client/client.js')
var async=require('async')


router.get('/', function(req, res, next) {
  res.send('OneOps API route');
});


router.get('/health', function(req, res, next) {
  var org = req.param('orgname')
  var assembly = req.param('assembly')
  var env = req.param('env')
  if(env) {
    client.getEnvHealth(org, assembly, env, function(data){
      res.send(data)
    })
  } else {
    client.getAssemblyHealth(org, assembly, function(data){
      res.send(data)
    })
  }
});

router.get('/metricgraph', function(req, res, next) {
  var org = req.param('orgname')
  var assembly = req.param('assembly')
  var enviornment = req.param('enviornment')
  var platform = req.param('platform')
  var monitor = req.param('monitor')

  client.getMetricData(org, assembly, platform, enviornment, monitor, function(data){
    res.send(data)
  })

});

router.post('/notifications', function(req, res, next) {
  var data=req.body
  console.log(data.payload)
  res.send('respond with a resource');
});

module.exports = router;
