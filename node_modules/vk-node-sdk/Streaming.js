'use strict'

const Utils = require('./utils')
const WebSocket = require('websocket').client

class Streaming {

    constructor(appCallback) {
    	let self = this
    	self.endpoint = false
    	self.key = false
    	self.callbackListener = Function()
    	appCallback().api('streaming.getServerUrl', {}, (data, error) => {
            if (data && data.key) {
                self.endpoint = data.endpoint
                self.key = data.key
                self.startListener()
            } else {
                throw new Error(error)
            }
        })
    }

    onListener(callback = Function()) {
    	this.callbackListener = callback
    }

    startListener() {
    	let self = this
    	var client = new WebSocket()
    	client.on('connectFailed', () => {
    		self.startListener()
    	})
    	client.on('connect', (connection) => {
    		connection.on('error', (error) => {
    			self.startListener()
    		})
    		connection.on('close', () => {
    			self.startListener()
    		})
    		connection.on('message', function(message) {
    			if (message.type === 'utf8') {
    				try {
    					let json = JSON.parse(message.utf8Data)
    					if (json.code == 100) {
    						if (json.event.text) {
    							json.event.text = json.event.text.replace(/<br>/g, '\n')
    						}
    						self.callbackListener(json.event)
    					}
    				} catch(ignored) { } 
    			}
    		})
    	})
    	client.connect('wss://' + self.endpoint + '/stream/?key=' + self.key)
    }

    clearRules(callback = Function(), attempt = 0) {
    	let self = this
    	attempt++
    	if (attempt > 5) {
    		return callback(false)
    	}
    	if (!this.endpoint) {
    		return setTimeout(() => {
    			self.clearRules(callback)
    		}, 100)
    	}
    	self.getRules((rules) => {
    		if (!rules || !rules.length) {
    			return self.getRules((rules) => {
    				return rules.length == 0 ? callback(true) : self.clearRules(callback, attempt)
    			})
    		}
    		var index = 0
    		let deleteRule = () => {
    			if (index >= rules.length) {
    				return callback(true)
    			}
    			self.deleteRule(rules[index].tag, (done) => {
    				if (done) {
    					index++
    					deleteRule()
    				} else {
    					callback(false)
    				}
    			})
    		}
    		deleteRule()
    	})
    }

    deleteRule(tag, callback = Function()) {
    	let self = this
    	if (!this.endpoint) {
    		return setTimeout(() => {
    			self.deleteRule(callback)
    		}, 100)
    	}
    	Utils.delete('https://' + this.endpoint + '/rules/?key=' + this.key, {tag: tag + ''}, (data, response) => {
    		try {
    			callback(JSON.parse(data).code == 200)
    		} catch(e) {
    			callback(false)
    		}
		}, true)
		return self
    }

    getRules(callback = Function()) {
    	let self = this
    	if (!this.endpoint) {
    		return setTimeout(() => {
    			self.getRules(callback)
    		}, 100)
    	}
    	Utils.get('https://' + this.endpoint + '/rules/?key=' + this.key, {}, (data, response) => {
    		try {
    			callback(JSON.parse(data).rules || [])
    		} catch(e) {
    			callback([])
    		}
		}, true)
		return self
    }

    addRule(value, tag, callback = Function()) {
    	let self = this
    	if (!this.endpoint) {
    		return setTimeout(() => {
    			self.addRule(value, tag, callback)
    		}, 100)
    	}
    	let rule = {rule:{value: value + '', tag: tag + ''}}
    	Utils.post('https://' + this.endpoint + '/rules/?key=' + this.key, rule, (data, response) => {
			try {
				callback(JSON.parse(data).code == 200)
			} catch(e) {
				callback(false)
			}
		}, true)
		return self
    }
}

module.exports = Streaming
