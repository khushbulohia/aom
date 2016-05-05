var config = require("./config.js")
var request = require("request");
var async=require('async')

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

var environment = {
  endpoint : process.argv[2] ? process.argv[2] : ONEOPS_ENDPOINT,
  org: '',
  authkey: process.argv[3] ? process.argv[3] : AUTH_TOKEN
}

function getInstances(orgname, assembly, platform, enviornment, component, callback) {
    environment.org = orgname
    var options = config.options(environment)
    options.uri += '/assemblies/' + assembly + '/operations/environments/' + enviornment + '/platforms/'
    + platform + '/components/' + component + '/instances.json?instances_state=all'

    var ids = []
    request(options, function(error, response, body) {
      var data = JSON.parse(body);
      for(var key in data) {
        ids.push(data[key].ciId)
      }
      callback (ids)
    });
  }


function getMonitorIds(orgname, assembly, platform, enviornment, component, monitor, callback) {
    environment.org = orgname
    var options = config.options(environment)
    options.uri += '/assemblies/' + assembly + '/transition/environments/' + enviornment + '/platforms/' + platform
    + '/components/' + component + '/monitors.json'

    var ids = []
    request(options, function(error, response, body) {
      var data = JSON.parse(body);
      for(var key in data) {
        var name = data[key].ciName

        if(name && name.endsWith(monitor))
          ids.push(data[key].ciId)
      }
      callback (ids)
    });
  }

function getMetricGraph(orgname, assembly, platform, enviornment, component, instance, monitorId, callback) {
      environment.org = orgname
      var options = config.options(environment)
      options.uri += '/assemblies/' + assembly + '/operations/environments/' + enviornment + '/platforms/' + platform
      + '/components/' + component + '/instances/' + instance + '/monitors/' + monitorId + '.json'

      request(options, function(error, response, body) {
        var data = JSON.parse(body);
        var plotdata = {}
        var step = 0, start= 0
        for(var key in data) {//array of metric objects
          if(key == 'charts') {
            var obj = data[key]
            for(var o in obj) {
              var seriesdata = obj[o].data
              for(var s in seriesdata) {
                var sdata = seriesdata[s]
                var md = sdata.header.metric
                step = sdata.header.step
                start = sdata.header.start
                // plotdata.put(md,sdata.data)
                plotdata[md] = sdata.data
              }
            }
            plotdata.step = step
            plotdata.start = start
            plotdata.instance = instance
          }
        }
        callback(plotdata)
      });
    }

  module.exports.getAssemblyHealth = function getAssemblyHealth(orgname, assembly, callback) {
      environment.org = orgname
      var options = config.options(environment)
      options.uri += '/assemblies/' + assembly + '/instances.json?instances_state=all'

      var instances = {}
      request(options, function(error, response, body) {
        var data = JSON.parse(body);
        for(var key in data) {
          var state = data[key].opsState
          if(state in instances) {
              var vals = Number(instances[state]) + 1
              instances[state] = vals
          } else {
              instances[state] = 1
          }
        }
        callback(instances)
      });
    }

  module.exports.getEnvHealth = function getEnvHealth(orgname, assembly, env, callback) {
      environment.org = orgname
      var options = config.options(environment)
      options.uri += '/assemblies/' + assembly + '/operations/environments/' + env + '/instances.json?instances_state=all'

      var instances = {}
      request(options, function(error, response, body) {
        var data = JSON.parse(body);
        for(var key in data) {
          var state = data[key].opsState
          if(state in instances) {
              var vals = Number(instances[state]) + 1
              instances[state] = vals
          } else {
              instances[state] = 1
          }
        }
        callback(instances)
      });
    }

   module.exports.getMetricData = function getMetricData(orgname, assembly, enviornment, platform, monitor, callback) {
      async.parallel([
       function(callback){
         getInstances(orgname, assembly, platform, enviornment, 'compute', function(ids){
           var data = {
             instances : ids
           }
           callback(null, data)
         })
       },
       function(callback){
         getMonitorIds(orgname, assembly, platform, enviornment, 'compute', monitor, function(ids){
           var data = {
             monitorId : ids
           }
           callback(null, data)
         })}
       ],

      function(err, results) {
        var items = 0, mon = 0
        for(var key in results) {
          var k = results[key]
          if('instances' in k) {
              items = k.instances
          } else   if('monitorId' in k) {
            mon = k.monitorId[0]
          }
        }
        var plots = {}

        async.forEach(items, function(item, next) {
          console.log('item', item)
          getMetricGraph(orgname, assembly, platform, enviornment, 'compute', item ,mon, function(plotdata) {
            plots[plotdata.instance] = plotdata
            console.log('instance' , plotdata.instance)
            next()
          });
        }, function(d) {
            callback(plots)
        });
    });
  }
