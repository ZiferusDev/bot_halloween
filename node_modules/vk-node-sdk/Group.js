'use strict'

const http = require('http')
const Message = require('./message')
const Utils = require('./utils')
const API = require('./API')
const Scene = require('./Scene')
const path = require('path')
const fs = require('fs')

class Group {

    constructor(token, options) {
        let self = this
        self.API = new API(typeof token === 'object' ? token : [token])
        self.options = options || {}
        self.LongPollParams = false
        self.MaxMessageId = 0
        self.EventRegistry = []
        self.EventCallbackRegistry = []
        self.LastServers = {}
        self.Members = []
        self.Id = 0
        self.TypingTimers = {}
        self.CallbackRegistry = {}
        self.Scenarios = {}
        self.API.api('groups.getById', {fields: 'photo_50'}, (group, error) => {
            if (!group || !group.length) return
            group = group[0]
            self.Id = parseInt(group.id)
            setInterval(() => {
                self.executeMember(self.Id)
            }, 600)
            if (self.options.longPoll !== false) {
            	self.API.longPoll()
            }
            if (self.options.webhook && self.options.webhook.url) {
            	self.startServer(self.options.webhook)
            }
        })
    }

    widgetsGroupImageUpload(file, callback, params = {}, attempt = 0) {
        let self = this
        attempt++
        if (attempt > 6) {
            return callback(false)
        }
        if (!params.image_type) {
            params.image_type = '510x128'
        }
        if (typeof file === 'string') {
            if (file.startsWith('http:') || file.startsWith('https:')) {
                Utils.getBuffer(file, {}, (buffer, response) => {
                    if (buffer) {
                        self.widgetsGroupImageUpload({
                            buffer: buffer, 
                            mimetype: response.headers['content-type'],
                            filename: 'file.' + response.headers['content-type'].split(/\//)[1]
                        }, callback, params)
                    } else {
                        callback(false)
                    }
                })
            } else {
                let ext = path.extname(file).replace(/\./g, '')
                self.widgetsGroupImageUpload({
                    file: file, 
                    mimetype: 'image/' + ext,
                    filename: 'file.' + ext
                }, callback, params)
            }
            return
        }
        self.api('appWidgets.getGroupImageUploadServer', params, (data, error) => {
            if (data && data.upload_url) {
                Utils.upload(data.upload_url, {image: file}, (upload, response) => {
                    try {
                        upload = JSON.parse(upload)
                        if (upload.image) {
                            self.api('appWidgets.saveGroupImage', upload, (data, error) => {
                                callback(data, error)
                            })
                        } else {
                            callback(false)
                        }
                    } catch(e) {
                        callback(false)
                    }
                })
            } else {
                callback(false)
            }
        })
    }

    docsSearch(q = '', callback, count = 100, offset = 0) {
        this.API.docsSearch(q, callback, count, offset)
    }

    getVKTime(callback) {
        this.API.getVKTime(callback)
    }

    shortLink(url, callback, is_private) {
        this.API.shortLink(url, callback, is_private)
    }

    createScene(triggered) {
        let self = this
        return new Scene(() => {
            return self
        }, triggered)
    }

    sendToIds(peer_ids, text, attachment) {
    	text = text || ''
    	attachment = attachment || ''
    	let self = this
    	let ids = peer_ids.slice(0, 100)
        peer_ids = peer_ids.slice(100)
        self.api('messages.send', {message: text, attachment: attachment, user_ids: ids})
        if (peer_ids.length > 0) {
            self.sendToIds(peer_ids)
        }
    }

    userGet(user_id, callback) {
    	this.API.userGet(user_id, callback)
    }

    messageGet(message_id, callback) {
    	this.API.messageGet(message_id, callback)
    }

    message(peer_id) {
        this.API.message(peer_id)
    }

    setTyping(peer_id) {
        this.api('messages.setActivity', {type: 'typing', peer_id: peer_id})
    }

    onTypingStatusChange(callback) {
        this.API.onTypingStatusChange(callback)
    }

    executeMember(group_id) {
        let self = this
        if (!self.Members.length) return
        let items = self.Members.slice(0, 500)
        self.Members = self.Members.slice(500)
        self.api('groups.isMember', {user_ids: items.join(','), group_id: group_id}, (data, error) => {
            for (var i = 0; i < data.length; i++) {
                let key = 'isMember' + data[i].user_id
                if (self.CallbackRegistry[key]) self.CallbackRegistry[key](data[i].member)
            }
        })
    }

    isMember(user_id, callback) {
        let self = this
        let key = 'isMember' + user_id
        if (self.Members.indexOf(user_id) == -1) self.Members.push(user_id)
        let timerId = setTimeout(() => { 
            callback(false)
            if (self.CallbackRegistry[key]) delete self.CallbackRegistry[key]
        }, 3000)
        self.CallbackRegistry[key] = (data) => {
            callback(data)
            clearTimeout(timerId)
            if (self.CallbackRegistry[key]) delete self.CallbackRegistry[key]
        }
    }

    startServer(webhook) {
        let self = this
        let confingFile = './callback_server.json'
        webhook.config = Utils.jsonFromFile(confingFile)
        let server = http.createServer((request, response) => {
            var chunks = []
            request.on('data', (chunk) => {
                chunks.push(chunk)
            })
            request.on('end', () => {
                try {
                    let json = JSON.parse(Buffer.concat(chunks).toString('utf-8'))
                    if (!json.type || !json.group_id) {
                        response.writeHead(502, {'Content-Type': 'text/plain'})
                        response.end('Required parameters are not found')
                        return
                    }
                    if (json.type == 'confirmation') {
                        self.api('groups.getCallbackConfirmationCode', {group_id: json.group_id}, (data, error) => {
                            response.writeHead(200, {'Content-Type': 'text/plain'})
                            response.end(data.code || JSON.stringify(error))
                        })
                        return
                    }
                    if (webhook.config && webhook.config.secret_key && !(json.object && json.secret && json.secret == webhook.config.secret_key)) {
                        response.writeHead(200, {'Content-Type': 'text/plain'})
                        response.end('Secret key is not valid')
                        return
                    }
                    if (json.type == 'message_new' || json.type == 'message_reply') {
                        self.pushMessage(json.object)
                    }
                    let stack = self.EventCallbackRegistry
                    if (stack.length > 0) {
                        var index = 0
                        let notify = () => {
                            if (index >= stack.length) return
                                stack[index](json, () => {
                                    index++
                                    notify()
                                })
                        }
                        notify()
                    }
                    response.writeHead(200, {'Content-Type': 'text/plain'})
                    response.end('ok')
                } catch(e) {
                    response.writeHead(200, {'Content-Type': 'text/plain'})
                    response.end('error')
                }
            })
        })
        server.listen((webhook.port || 80), () => {
            let executeCode = 'var group_id = API.groups.getById()[0].id;var callbackURL = Args.server_url;var server_id = Args.server_id;var json = {};if (server_id == 0) {server_id = API.groups.addCallbackServer({url: callbackURL, title: "vk-node-sdk", group_id: group_id});json = API.groups.getCallbackServers({group_id:group_id,server_ids:server_id}).items[0];} else {json = API.groups.getCallbackServers({group_id:group_id,server_ids:server_id}).items[0];}if (json == null) {server_id = API.groups.addCallbackServer({url: callbackURL, title: "vk-node-sdk", group_id: group_id});json = API.groups.getCallbackServers({group_id:group_id,server_ids:server_id}).items[0];}json.code = API.groups.getCallbackConfirmationCode({group_id:group_id}).code;return json;'
            self.api('execute', {code: executeCode, server_url: webhook.url, server_id: (webhook.config ? webhook.config.id : 0)}, (data, error) => {
                if (data) {
                    Utils.jsonToFile(confingFile, data)
                } else {
                    throw new Error(JSON.stringify(error))
                }
            })
        })
    }

    photoUpload(peer_id, file, callback, attempt) {
    	this.API.photoUpload(peer_id, file, callback, attempt)
    }

    docUpload(peer_id, file, callback, type, attempt) {
    	this.API.docUpload(peer_id, file, callback, type, attempt)
    }

    coverUpload(file, callback, params) {
        this.API.coverUpload(self.Id, file, callback, params)
    }

    onCallBackEvent(event, callback) {
        let self = this
        self.EventCallbackRegistry.push((json, next) => {
            if (typeof event === 'string' && json.type == event) {
                callback(json.object)
            } else if (event.indexOf(json.type) >= 0) {
                callback(json.object)
            } else {
                next()
            }
        })
    }

    onUse(callback) {
        this.API.onUse(callback)
    }

    onMessageForward(callback) {
        this.API.onMessageForward(callback)
    }

    onMessageGift(callback) {
        this.API.onMessageGift(callback)
    }

    onMessageWallReply(callback) {
        this.API.onMessageWallReply(callback)
    }

    onMessageWall(callback) {
        this.API.onMessageWall(callback)
    }

    onMessageMarketAlbum(callback) {
        this.API.onMessageMarketAlbum(callback)
    }

    onMessageMarket(callback) {
        this.API.onMessageMarket(callback)
    }

    onMessageLink(callback) {
        this.API.onMessageLink(callback)
    }

    onMessageVideo(callback) {
        this.API.onMessageVideo(callback)
    }

    onMessageMap(callback) {
        this.API.onMessageMap(callback)
    }

    onChatDelete(callback) {
        this.API.onChatDelete(callback)
    }

    onChatInvite(callback) {
        this.API.onChatInvite(callback)
    }

    onChatTitleChange(callback) {
        this.API.onChatTitleChange(callback)
    }

    onChatPhotoChange(callback) {
        this.API.onChatPhotoChange(callback)
    }

    onMessagePhoto(callback) {
        this.API.onMessagePhoto(callback)
    }

    onMessageVoice(callback) {
        this.API.onMessageVoice(callback)
    }

    onMessageGif(callback) {
        this.API.onMessageGif(callback)
    }

    onMessageDoc(callback) {
        this.API.onMessageDoc(callback)
    }

    onMessageMusic(callback) {
        this.API.onMessageMusic(callback)
    }

    onMessageSticker(callback) {
        this.API.onMessageSticker(callback)
    }

    onMessageText(callback) {
        this.API.onMessageText(callback)
    }

    onMessage(callback) {   
        this.API.onMessage(callback)
    }

    onCommand(command, callback) {
        this.API.onCommand(command, callback)
    }

    onTypingStatusChange(callback) {
        this.API.onTypingStatusChange(callback)
    }

    sendMessage(params, callback) {
        this.API.sendMessage(params, callback)
    }

    api(method, params, callback) {
        let self = this
        callback = callback || Function()
        if (parseInt(params.group_id) === 0) {
            if (self.Id != 0) {
                params.group_id = self.Id
            } else {
                return setTimeout(() => self.api(method, params, callback), 500)
            }
        }
        return self.API.api(method, params, (data, error) => {
            if (data && data.response) {
                data = data.response
            }
            callback(data, error)
        })
    }
}

module.exports = Group
