'use strict';

const SlackBot = require('slack-quick-bots');
const handlebars = require('handlebars');
const fs = require('fs');
let request = require("request");
const subscribeTemplate = fs.readFileSync('./templates/subscribe.hbs', 'utf8');
const subscriptionsTemplate = fs.readFileSync('./templates/subscriptions.hbs', 'utf8');
const unsubscribeTemplate = fs.readFileSync('./templates/unsubscribe.hbs', 'utf8');
const sampleTemplate = fs.readFileSync('./sample.hbs', 'utf8');
let endOfLine = require('os').EOL;
let subscriptions = [];

// TODO parameterize these
let subscriptionsFile = './data/subscriptions.txt'
let token = 'xoxb-36874808758-Mp5gcyKLuBbv2TB8ibapGdHV'
let webHookUrl = 'https://hooks.slack.com/services/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'
// let webHookPort = 9901

loadSubscriptionsFromFile()

var config = {
	bots: [{
		botCommand: {
			subscribe: {
				commandType: 'DATA',
        		allowedParam: ['*'],
        		template: function() {
          			return handlebars.compile(subscribeTemplate);
        		},
        		data: function(input, options, callback) {
			        let nspath = createNsPath(input.params)
			        // TODO validate if nspath exist and conditionally call addSubscription
			        addSubscription(options.channel, nspath)
			        let channel = null
			        if(options.channel.startsWith('C')) {
			        	channel = options.channel
			        }
			        let isSuccessFul = true
			        let error = null
		          	callback({
		            	successful: isSuccessFul,
		            	channel: channel,
		            	nspath: nspath,
		            	error: error
		          	});
        		}
      		},      		
			unsubscribe: {
				commandType: 'DATA',
        		allowedParam: ['*'],
        		template: function() {
          			return handlebars.compile(unsubscribeTemplate);
        		},
        		data: function(input, options, callback) {
					let nspath = createNsPath(input.params)
        			callback({});
        		}
      		},
			subscriptions: {
				commandType: 'DATA',
        		allowedParam: ['*'],
        		template: function() {
          			return handlebars.compile(subscriptionsTemplate);
        		},
        		data: function(input, options, callback) {
        			let registeredNspaths = []
        			for(let sub of subscriptions) {
        				if(sub.channel === options.channel) {
        					registeredNspaths.push(sub.nspath)
        				}
        			}
		          	callback({
		            	nspaths: registeredNspaths
		          	});
        		}
      		},
      		trend: {
        		commandType: 'DATA',
        		responseType: {
          			type: 'svg',
          			ylabel: 'Load-metric-name',
          			timeUnit: 'm',
          			title: 'Trend',
          			logscale: false,
          			style: 'lines'
        		},
        		allowedParam: ['*'],
        		data: function(input, options, callback) {
        			// Identify monitor to get metrics for. Get metrics
        			// Create data in format below.
        			var multiLineData = {
		                "load1": {1462079460:0.041, 1462079520:0.06, 1462079580:0.062},
		     	        "load5": {1462079460:0.031, 1462079520:0.041, 1462079580:0.041},
		                "load15": {1462079460:0.001, 1462079520:0.001, 1462079580:0.001}
			        }
          			var dataArr = [ // Sample data
			            [100, 120, 130, 110, 123, 90],
			            [1, 120, 130, 110, 90, 85],
			            [1, 120, 130, 1010, 140, 145],
			            [100, 120, 130, 250, 140, 145],
			            [100, 120, 130, 300, 140, 145],
			            [100, 400, 130, 300, 140, 145],
			            [100, 90, 130, 300, 140, 145],
			            [100, 120, 130, 1010, 150, 90]
	          		];
					callback(multiLineData);
				}
      		},
			testNotify: {
				commandType: 'DATA',
        		allowedParam: ['*'],
        		template: function() {
          			return handlebars.compile('Test notification. Should have received alert on channels {{channels}}');
        		},
        		data: function(input, options, callback) {
					let nspath = createNsPath(input.params)
		          	let channelsNotified = onNotification(nspath, 'sample notification, you may have subscribed to notifications at nspath: ' + nspath)
		          	callback({channels: channelsNotified});
        		}
      		}
    	},
    	blockDirectMessage: false,
    	webHook: false,
    	botToken: token
  	}],
  	logger: console // you could pass a winston logger.
	// server: {
	// 	port: webHookPort,
	// 	webHook: true
	// }
};

var slackBot = new SlackBot(config);
slackBot.start();

// Add to file and local variable
function addSubscription(channel, nspath) {
	let sub = {nspath:nspath, channel:channel}
	let err = fs.appendFileSync(subscriptionsFile, JSON.stringify(sub)+endOfLine)
	subscriptions.push(sub)
	console.log('write to file')
	console.log(err)
}

// Load from file and fill local variable
function loadSubscriptionsFromFile() {
	try{
		let fileContent = fs.readFileSync(subscriptionsFile);
		let lines = fileContent.toString().split('\n')
		for(let line of lines) {
			try {
				let sub = JSON.parse(line)
				subscriptions.push(sub)
			} catch(e) {
				console.log('invalid line' + e)
			}
		} 
	} catch (fne) {
		console.log('file not found. this may starting of the module' + fne)
	}
}

// When there are new notification from OneOps invoke this with nspath. message may need some formatting.
function onNotification(nspath, message) {
	let channelsToNotify = []
	for(let sub of subscriptions) {
		if(nspath.startsWith(sub.nspath)) {
			if(channelsToNotify.indexOf(sub.channel) < 0) {
				channelsToNotify.push(sub.channel)
			}
		}
	}
	for(let channel of channelsToNotify) {
		let postBody = {
			channel: channel,
			username: 'aom',
			text: message
		}
		let options = {
			uri : webHookUrl,
			method : 'POST',
			headers : {
				'Content-type' : 'application/json',
				'Accept' : 'application/json'
			},
			body : JSON.stringify(postBody)
		}
		request(options, function(error, response, body) {
			if(error) {
				console.log('Unable to send notification to Slack. Check error below')
				console.log(error)
			} else {
				console.log(body)
			}
		})
	}
	return channelsToNotify
}

function createNsPath(params) {
	let nspath = null
	let org, assembly, environment, platform = null        		
	if(params.length > 0) {
		org = params[0]
		nspath = org
	}
	if(params.length > 1) {
		assembly = params[1]
		nspath = nspath + '/' + assembly
	}
	if(params.length > 2) {
		environment = params[2]
		nspath = nspath + '/' + environment
	}
	if(params.length > 3) {
		platform = params[3]
		nspath = nspath + '/' + platform
	}
	return nspath
}