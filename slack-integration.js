'use strict';

const SlackBot = require('slack-quick-bots');
const handlebars = require('handlebars');
const fs = require('fs');
let request = require("request");
const subscribeTemplate = fs.readFileSync('./templates/subscribe.hbs', 'utf8');
const subscriptionsTemplate = fs.readFileSync('./templates/subscriptions.hbs', 'utf8');
const unsubscribeTemplate = fs.readFileSync('./templates/unsubscribe.hbs', 'utf8');
const healthTemplate = fs.readFileSync('./templates/health.hbs', 'utf8');
let oneOpsClient = require("./api-client/client.js")


let yargs = require('yargs')
	.usage('node $0 [options]')
	.option('t', {
		alias: 'token',
		description: 'Specify a bot token'
	})
	.option('w', {
		alias: 'webhook',
		description: 'Specify Slack incomming webhook'
	})
	.option('s', {
		alias: 'subscriptionsFile',
		description: 'Specify the location of subscriptions file'
	})
	.option('h', {
		alias: 'help',
		description: 'Show help'
	})
var argv = yargs.argv

if(argv.help) {
	yargs.showHelp('log')
	return
}
let token = ''
let webHookUrl = ''
let subscriptionsFile = ''
if(!argv.token) {
	console.log('Token is required')
	return
} else {
	token = argv.token
}

if(!argv.webhook) {
	console.log('Webhook is required')
	return
} else {
	webHookUrl = argv.webhook
}

if(argv.subscriptionsFile) {
	subscriptionsFile = argv.subscriptionsFile 
} else {
	subscriptionsFile = './data/subscriptions.txt'
}

let endOfLine = require('os').EOL;
let subscriptions = [];

// let webHookPort = 9901

loadSubscriptionsFromFile()

var config = {
	bots: [{
		botCommand: {
			subscribe: {
				commandType: 'DATA',
        		allowedParam: ['*'],
				helpText: '>    Subscribes current channel to receive notifications. Usage `subscribe organization [assembly [environment [platform]]]`\\n',
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
			health: {
				commandType: 'DATA',
        		allowedParam: ['*'],
				helpText: '>    Provides health of application at given hierarchy. Usage `health organization assembly [environment]`\\n',
        		template: function() {
          			return handlebars.compile(healthTemplate);
        		},
        		data: function(input, options, callback) {
			        let nspath = createNsPath(input.params)
			        if(input.params.length == 2) {
						oneOpsClient.getAssemblyHealth(input.params[0], input.params[1], function(health) {
							callback({
				            	health: health,
				            	nspath: nspath
				          	});
						})	
					} else if (input.params.length == 3) {
						oneOpsClient.getEnvHealth(input.params[0], input.params[1], input.params[2], function(health) {
							callback({
				            	health: health,
				            	nspath: nspath
				          	});
						})
			        } else {
			        	callback({});
			        }
        		}
      		},
      		unsubscribe: {
				commandType: 'DATA',
        		allowedParam: ['*'],
				helpText: '>    Unsubscribe and active subscription. Usage `unsubscribe organization [assembly [environment [platform]]]` (_Not supported yet_)\\n',
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
				helpText: '>    Show list of subscriptions on the current channel. Usage `subscriptions`\\n',
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
				helpText: '>    Provides trends of monitor data. Usage `trend organization assembly environment platform cpu|load`\\n',        		
        		responseType: {
          			type: 'png',
          			ylabel: 'Value',
          			xlabel: 'Metrics',
          			timeUnit: 'm',
          			title: 'Trend',
          			logscale: false,
          			style: 'lines'
        		},
        		allowedParam: ['*'],
        		data: function(input, options, callback) {        			
					oneOpsClient.getMetricData(input.params[0], input.params[1], input.params[2], input.params[3], input.params[4], function(response) {
						for(let instanceKey in response) {
							let instanceDetails = response[instanceKey]
							let step = instanceDetails.step
							let start = instanceDetails.start
							let data = {}
							for(let key in instanceDetails) {
								if(key === 'step' || key === 'start' || key === 'instance') {
									continue
								}
								let metrics = {}
								let t = start
								for(let value of instanceDetails[key]) {
									metrics[t] = value
									t = t + step
								}
								data[key] =  metrics
							}
							callback(data);
						}
					})
				}
      		},
			testNotify: {
				commandType: 'DATA',
				helpText: '>    *Test command dont use.*\\n',        						
        		allowedParam: ['*'],
        		template: function() {
          			return handlebars.compile('Test notification. Should have received alert on channels {{channels}}');
        		},
        		data: function(input, options, callback) {
					let nspath = createNsPath(input.params)
		          	let channelsNotified = onNotification(nspath, 'sample notification, you may have subscribed to notifications at nspath: ' + nspath, 'good')
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
module.exports.onNotification = function onNotification(nspath, message, state) {
	nspath = nspath.replace('bom/','')
	let icon = ':white_check_mark:'
	if(state === 'notify') {
		icon = ':warning:'
	} else if (state === 'unhealthy') {
		icon = ':x:'
	}
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
			text: icon + ' ' + message
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
		nspath = '/' + org
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