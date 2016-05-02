var config = require("./config.js")
var request = require("request");

var environment = {
  endpoint : process.argv[2] ? process.argv[2] : ONEOPS_ENDPOINT,
  org: '',
  authkey: process.argv[3] ? process.argv[3] : AUTH_TOKEN
}

module.exports.getInstances = function getInstances(orgname, assembly, platform, enviornment, component, callback) {
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


module.exports.getMonitorIds = function getMonitorIds(orgname, assembly, platform, enviornment, component, monitor, callback) {
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
