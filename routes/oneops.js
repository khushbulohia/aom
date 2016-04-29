var express = require('express');
var router = express.Router();
var http=require('http')

router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});


router.get('/health', function(req, res, next) {
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
  res.send('respond with a resource');
});

router.post('/notifications', function(req, res, next) {
  var data=req.body
  console.log(data.payload)
  res.send('respond with a resource');
});

module.exports = router;
