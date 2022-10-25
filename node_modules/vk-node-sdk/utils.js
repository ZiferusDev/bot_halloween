'use strict'

const http = require('http')
const https = require('https')
const url = require('url')
const fs = require('fs')
const buffer = require('buffer')

class Utils {

    constructor() {
        let self = this
    }

	request(_request_url, options, callback, attempt = 0) {
        if (attempt > 6) {
            return callback(false)
        }
        attempt++
		let self = this
		callback = callback || Function()
        var request_url = _request_url.split(':')
        let url_parse = url.parse(request_url[0] + ':' + request_url[1])
        let port = url_parse.protocol == 'http:' ? (request_url.length >= 2 ? self.intval(request_url[2]) : 80) : 443
        if (!self.isIp(url_parse.host)) {
            url_parse.path = _request_url
        }
        let sendOptions = {
            host: url_parse.host,
            path: url_parse.path,
            port: port,
            method: options.method || 'GET',
            headers: {'User-Agent': 'VK SDK Lib (vk.com/nodesdk)'}
        }
        if (url_parse.host === undefined || url_parse.host === null || url_parse.host === 'undefined') {
            throw new Error('host === undefined')
        }
        if (sendOptions.method == 'GET' && options.params) {
        	sendOptions.path += '?' + self.toURL(options.params)
        }
        let protocol = (url_parse.protocol == 'http:' ? http : https)
        sendOptions.agent = new protocol.Agent({keepAlive: true})
        let request = protocol.request(sendOptions, (response) => {
            var chunks = []
            response.on('data', (chunk) => {
                chunks.push(chunk)
            })
            response.on('end', () => {
            	if (options.encode) {
            		callback(Buffer.concat(chunks).toString('utf-8'), response)
            	} else {
            		callback(Buffer.concat(chunks), response)
            	}
            })
        })
        request.on('error', (e) => {
            callback(false, false)
        })
        if (options.json) {
            options.json = JSON.stringify(options.json)
            request.setHeader('Content-Type', 'application/json')
            request.setHeader('Content-Length', Buffer.byteLength(options.json))
            request.write(options.json)
            request.end()
        } else if (options.method == 'POST' && options.multipart) {
        	let field = Object.keys(options.multipart)[0]
        	let data = options.multipart[field]
        	if (!data.buffer) {
        		data.buffer = fs.readFile(data.file, (err, data) => {
                    if (err || !data) {
                        callback(false, false)
                        return
                    }
                    delete data.file
                    options.multipart[field].buffer = data
                    self.request(_request_url, options, callback, attempt)
                })
        		return
        	}
        	let boundaryKey = '----WebKitFormBoundary' + self.rand() + 'time' + self.time()
        	let header = self.multipartHeader(boundaryKey, field, data) 
        	let endBoundary = "\r\n--" + boundaryKey + "--\r\n"
        	let length = Buffer.byteLength(data.buffer) + header.length + endBoundary.length
        	request.setHeader('Content-Type', 'multipart/form-data; boundary="' + boundaryKey + '"')
        	request.setHeader('Content-Length', length)
        	request.write(header)
        	request.write(data.buffer)
        	request.write(endBoundary)
        	request.end()
        } else if (options.method == 'POST' && options.params) {
        	request.setHeader('Content-Type', 'application/x-www-form-urlencoded')
        	let postbody = self.toURL(options.params)
            request.setHeader('Content-Length', Buffer.byteLength(postbody))
        	request.end(postbody)
        } else {
        	request.setHeader('Content-Length', 0)
        	request.end()
        }
	}

	multipartHeader(boundaryKey, field, data) {
		var header = "Content-Disposition: form-data; name=\"" + field + 
  	            "\"; filename=\"" + (data.filename || 'file') + "\"\r\n" +
  	            "Content-Length: " + data.buffer.length + "\r\n" +
  	            "Content-Transfer-Encoding: binary\r\n" + 
  	            "Content-Type: " + (data.mimetype || 'application/octet-stream');
  	    return "--" + boundaryKey + "\r\n" + header + "\r\n\r\n";
	}

	getBuffer(request_url, params, callback) {
		try {
            callback = callback || Function()
            let options = {
                method: 'POST'
            }
            if (!Object.keys(params).length) {
                options.method = 'GET'
            } else {
                options.params = params
            }
            this.request(request_url, options, callback)
        } catch(e) {
            console.log(e)
            callback(false)
        }
	}

	upload(server, params, callback) {
		callback = callback || Function()
		let options = {
			method: 'POST',
			encode: true,
			multipart: params
		}
		this.request(server, options, callback)
    }

	post(request_url, params, callback, json = false) {
		callback = callback || Function()
		let options = {
			method: 'POST',
			params: params,
			encode: true
		}
        if (json) {
            options.json = options.params
            delete options.params
        }
		this.request(request_url, options, callback)
    }

    get(request_url, params, callback, json = false) {
    	callback = callback || Function()
		let options = {
			method: 'GET',
			params: params,
			encode: true
		}
        if (json) {
            options.json = options.params
            delete options.params
        }
		this.request(request_url, options, callback)
    }

    delete(request_url, params, callback, json = false) {
        callback = callback || Function()
        let options = {
            method: 'DELETE',
            params: params,
            encode: true
        }
        if (json) {
            options.json = options.params
            delete options.params
        }
        this.request(request_url, options, callback)
    }

    toURL(params) {
        return Object.keys(params).map((key) => {
            return encodeURIComponent(key) + "=" + encodeURIComponent(params[key])
        }).join('&')
    }

    rand(low, high) {
        low = low || 0
        high = high || (9 * 1000000)
        let r = Math.floor(Math.random() * (high - low + 1) + low)
        return r
    }

    randIndex(items) {
        return this.rand(0, Math.abs(items.length - 1))
    }

    time() {
        return Math.round(new Date().getTime() / 1000)
    }

    jsonFromFile(file) {
        var data = ''
        try {
            data = fs.readFileSync(file, 'utf8')
            return JSON.parse(data)
        } catch(e) {
            return false
        }
    }

    jsonToFile(file, json) {
        return fs.writeFile(file, (typeof json === 'string' ? json : JSON.stringify(json)), 'utf8', () => { });
    }
    
    intval(value) {
        try {
            if (value === true) return 1
            value = parseInt(value) || 0
            return value == NaN ? 0 : value
        } catch(e) {
            return 0
        }
    }

    getMilliseconds() {
        return (new Date).getTime()
    }

    isIp(ipaddress) {
        return /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(ipaddress)
    }
}

module.exports = new Utils()