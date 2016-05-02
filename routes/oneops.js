var express = require('express');
var router = express.Router();
var http=require('http')
var request = require("request");
var config = require("../config.js")
var plot = require('plotter').plot;
var client = require('../api-client/client.js')

var environment = {
  endpoint : process.argv[2] ? process.argv[2] : ONEOPS_ENDPOINT,
  org: '',
  authkey: process.argv[3] ? process.argv[3] : AUTH_TOKEN
}

router.get('/', function(req, res, next) {
  res.send('OneOps API route');
});


router.get('/health1', function(req, res, next) {
  var org = req.param('orgname')
  console.log(org)
  var options = {
    method: 'GET',
    isArray: true,
    headers: { 'Authorization': 'Basic ' + "XXXXX:" },
    host: 'https://stg.oneops.walmart.com',
    path: '/$org/operations/health?state=total&profiles%5B%5D=DEV'
  };
  callback = function(data) {
    data.on('data', function(chunk){
      str += chunk
    })

    data.on('end', function(data){
     console.log(data)
    })
  }
  http.request(options, callback).end()
  res.send('OneOps API route');
});


router.get('/health', function(req, res, next) {
  environment.org = req.param('orgname')
  var options = config.options(environment)
  options.uri += '/operations/health.json?state=total'
  request(options, function(error, response, body) {
    var data = JSON.parse(body);
    var hasUnhealhty = false;
    var reqPath = req.param('nspath')
    for(var key in data) {//array of heath objects
      var nspath = data[key].ns

      if(reqPath) {
        if(nspath.startsWith(reqPath) > 0) {
          var h = data[key].health
          if('unhealthy' in h) {
            hasUnhealhty = true;
            console.log(nspath + "  " + JSON.stringify(h));
          }
        }

      }  else {
        console.log(nspath + " " + JSON.stringify(data[key].health));
      }
    }
    if(!hasUnhealhty) {
      console.log('nspath ' + reqPath + ' has everything in good state')
    }
  });
  res.send('OneOps API health route');
});


router.get('/metricgraph', function(req, res, next) {
  environment.org = req.param('orgname')
  var assembly = req.param('assembly')
  var enviornment = req.param('enviornment')
  var platform = req.param('platform')
  var instance = req.param('instance')
  var monitor = req.param('monitor')
  var component = req.param('component')

  var options = config.options(environment)
  options.uri += '/assemblies/' + assembly + '/operations/environments/' + enviornment + '/platforms/' + platform
  + '/components/' + component + '/instances/' + instance + '/monitors/' + monitor + '.json'

  request(options, function(error, response, body) {
    var data = JSON.parse(body);
    var plotdata = {}
    for(var key in data) {//array of metric objects
      if(key == 'charts') {
        var obj = data[key]
        for(var o in obj) {
          var seriesdata = obj[o].data
          for(var s in seriesdata) {
            var sdata = seriesdata[s]
            var md = sdata.header.metric
            // plotdata.put(md,sdata.data)
            plotdata[md] = sdata.data
          }
        }
      }
    }
    // console.log(JSON.stringify(plotdata))
    // plot({
    //   data:	plotdata,
    //   filename:	'output.svg',
    //   format: 'svg',
    //   logscale:   true,
    //   title: 'metric graph'
    // });

  });
  res.send('OneOps API metric graph route');
});


router.get('/getmonit', function(req, res, next) {
  var org = req.param('orgname')
  var assembly = req.param('assembly')
  var enviornment = req.param('enviornment')
  var platform = req.param('platform')
  var monitor = req.param('monitor')
  var component = req.param('component')

  var ids = client.getInstances(org, assembly, platform, enviornment, component)
  console.log(ids)
});

router.post('/notifications', function(req, res, next) {
  var data=req.body
  console.log(data.payload)
  res.send('respond with a resource');
});

module.exports = router;
