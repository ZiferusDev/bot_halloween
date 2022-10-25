'use strict'

const http = require('http')
const Utils = require('./utils')
const API = require('./API')
const Streaming = require('./Streaming')

class App {

    constructor(token) {
        let self = this
        self.API = new API(typeof token === 'object' ? token : [token])
    }

    Streaming() {
        let self = this
        return new Streaming(() => {
            return self
        })
    }

    api(method, params, callback) {
        let self = this
        callback = callback || Function()
        return self.API.api(method, params, (data, error) => {
            if (data && data.response) {
                data = data.response
            }
            callback(data, error)
        })
    }
}

module.exports = App
