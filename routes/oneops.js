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
  var component = req.param('component')

  async.parallel([
   function(callback){
     client.getInstances(org, assembly, platform, enviornment, component, function(ids){
       var data = {
         instances : ids
       }
       callback(null, data)
     })
   },
   function(callback){
     client.getMonitorIds(org, assembly, platform, enviornment, component, monitor, function(ids){
       var data = {
         monitorId : ids
       }
       callback(null, data)
     })}
   ],

  function(err, results) {
    var int = 0, mon = 0
    for(var key in results) {
      var k = results[key]
      if('instances' in k) {
          int = k.instances
      } else   if('monitorId' in k) {
        mon = k.monitorId
      }
    }

    var plots = {}
    for(var i = 0 ;i < int.length; i++) {
      for(var j = 0 ;j < mon.length; j++) {
        client.getMetricGraph(org, assembly, platform, enviornment, component, int[i] ,mon[j], function(plotdata){

          console.log(JSON.stringify(plotdata))
          // plot({
          //   data:	plotdata,
          //   filename:	'output.svg',
          //   format: 'svg',
          //   logscale:   true,
          //   title: 'metric graph'
          // });
        });
      }
    }
    res.send(plots);
  });

});

router.post('/notifications', function(req, res, next) {
  var data=req.body
  console.log(data.payload)
  res.send('respond with a resource');
});

module.exports = router;
