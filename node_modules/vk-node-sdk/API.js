'use strict'

const Utils = require('./utils')
const Message = require('./message')
const API_URL = 'https://api.vk.com/method/'
const API_VERSION = '5.68'

class API {
    constructor(tokens) {
        let self = this
        self.AccessTokens = tokens
        self.TypingStatus = Function()
        self.CallbackRegistry = {}
        self.TypingTimers = {}
        self.LastServers = {}
        self.MethodQueue = []
        self.MessageIds = []
        self.EventRegistry = []
        self.Users = []
        self.LastToken = 0
        self.MaxMessageId = 0
        self.LongPollParams = false
        setInterval(() => self.executeMethods(), Math.ceil(1000 / (self.AccessTokens.length * 3)) + 50)
        setInterval(() => {
            self.executeUsers()
            self.executeMessages()
        }, 600)
    }

    docsSearch(q = '', callback, count = 100, offset = 0) {
        let self = this
        self.api('docs.search', {q: q, count: count, offset: offset}, (data, error) => {
            if (data && data.items) {
                callback(data.items, false)
            } else {
                callback(false, error)
            }
        })
    }

    getVKTime(callback) {
        this.api('utils.getServerTime', {}, (data, error) => {
            callback(data, error)
        })
    }

    shortLink(url, callback, is_private = 0) {
        let self = this
        self.api('utils.getShortLink', {url: url, private: is_private}, (data, error) => {
            if (data && data.short_url) {
                callback(data.short_url, data)
            } else {
                callback(false, false)
            }
        })
    }

    execute(code, callback) {
        let self = this
        self.api('execute', {code: code}, (data, error) => {
            callback(data, error)
        })
    }

    coverUpload(group_id, file, callback, params) {
        let self = this
        callback = callback || Function()
        params = params || {crop_x2: 1590, crop_y2: 400}
        if (!params.group_id) {
            params.group_id = group_id
        }
        if (typeof file === 'string') {
            if (file.startsWith('http:') || file.startsWith('https:')) {
                Utils.getBuffer(file, {}, (buffer, response) => {
                    if (buffer) {
                        self.coverUpload({
                            buffer: buffer, 
                            mimetype: response.headers['content-type'],
                            filename: 'file.' + response.headers['content-type'].split(/\//)[1]
                        }, callback, params)
                    } else {
                        callback(false)
                    }
                })
            } else {
                let ext = path.extname(file)
                self.coverUpload({
                    file: file, 
                    mimetype: 'image/' + ext,
                    filename: 'file.' + ext
                }, callback, params)
            }
            return
        }
        self.api('photos.getOwnerCoverPhotoUploadServer', params, (data, error) => {
            if (error) callback(false, error)
            if (data.response) data.upload_url = data.response.upload_url
            Utils.upload(data.upload_url, {photo: file}, (upload, response) => {
                try {
                    upload = JSON.parse(upload)
                    if (upload.photo) {
                        self.api('photos.saveOwnerCoverPhoto', upload, (save, error) => {
                            if (save.response) save = save.response
                            callback(save, error)
                        })
                    } else {
                        callback(false, upload)
                    }
                } catch(e) {
                    callback(false, e)
                }
            })
        })
    }

    onCommand(command, callback) {
        this.use((message, next) => {
            let body = message.body.toLowerCase()
            if (typeof command === 'string') {
                command = command.toLowerCase()//.replace(/\//g, '\\/')
                if (body.match(new RegExp('^' + command, 'g'))) {
                    var parse = body.replace(command, '').split(' ')
                    parse.shift()
                    callback(message, parse)
                } else {
                    next()
                }
            } else {
                for (var i = 0; i < command.length; i++) {
                    let c = command[i].toLowerCase()// .replace(/\//g, '\\/')
                    if (body.match(new RegExp('^' + c, 'g'))) {
                        var parse = body.replace(c, '').split(' ')
                        parse.shift()
                        return callback(message, parse)
                    }
                }
                next()
            }
        }, true)
    }

    photoUpload(peer_id, file, callback, attempt = 0, last_error = {}) {
        let self = this
        if (Object.keys(self.LastServers).length >= 500) {
            self.LastServers = {}
        }
        attempt++
        if (attempt > 6) {
            return callback(false, last_error)
        }
        let key = 'photo' + peer_id
        if (self.LastServers[key]) {
            Utils.upload(self.LastServers[key], {photo: file}, (upload, response) => {
                if (!upload) {
                    delete self.LastServers[key]
                    return self.photoUpload(peer_id, file, callback, attempt, (upload || last_error))
                }
                try {
                    upload = JSON.parse(upload)
                    if (!upload.photo) {
                        return self.photoUpload(peer_id, file, callback, attempt, (upload || last_error))
                    }
                    self.api('photos.saveMessagesPhoto', upload, (save, error) => {
                        if (save && save.length) {
                            callback(save[0])
                        } else {
                            self.photoUpload(peer_id, file, callback, attempt, (error || last_error))
                        }
                    })
                } catch(e) {
                    delete self.LastServers[key]
                    return self.photoUpload(peer_id, file, callback, attempt, (e || last_error))
                }
            })
        } else {
            self.api('photos.getMessagesUploadServer', {peer_id: peer_id}, (data, error) => {
                if (data && data.upload_url) {
                    self.LastServers[key] = data.upload_url
                    self.photoUpload(peer_id, file, callback, attempt, (error || last_error))
                } else {
                    self.photoUpload(peer_id, file, callback, attempt, (error || last_error))
                }
            })
        }
    }

    docUpload(peer_id, file, callback, type = 'doc', attempt = 0, last_error = {}) {
        let self = this
        if (Object.keys(self.LastServers).length >= 500) {
            self.LastServers = {}
        }
        attempt++
        if (attempt > 6) {
            return callback(false, last_error)
        }
        let key = 'doc' + peer_id + '_' + (type || 'file')
        if (self.LastServers[key]) {
            Utils.upload(self.LastServers[key], {file: file}, (upload, response) => {
                try {
                    let uploadJSON = JSON.parse(upload)
                    if (!uploadJSON.file) {
                        return self.docUpload(peer_id, file, callback, type, attempt, (uploadJSON || last_error))
                    }
                    self.api('docs.save', uploadJSON, (save, error) => {
                        if (save && save.length) {
                            callback(save[0], false)
                        } else {
                            self.docUpload(peer_id, file, callback, type, attempt, (error || last_error))
                        }
                    })
                } catch(e) {
                    if (self.LastServers[key]) {
                        delete self.LastServers[key]
                    }
                    self.docUpload(peer_id, file, callback, type, attempt, last_error)
                }
                
            })
        } else {
            let params = {
                peer_id: peer_id
            }
            if (type) {
                params.type = type
            }
            self.api('docs.getMessagesUploadServer', params, (data, error) => {
                if (data && data.upload_url) {
                    self.LastServers[key] = data.upload_url
                }
                self.docUpload(peer_id, file, callback, type, attempt, (error || last_error))
            })
        }
    }

    message(peer_id) {
        let self = this
        return new Message(() => {
            return self
        }, {user_id: peer_id})
    }

    setTyping(peer_id) {
        this.api('messages.setActivity', {type: 'typing', peer_id: peer_id})
    }

    cancelUse(callback) {
        let i = this.EventRegistry.indexOf(callback)
        if (i != -1) {
            this.EventRegistry.splice(i, 1)
        }
    }

    use(callback, first) {
        if (first) {
            this.EventRegistry.unshift(callback)
        } else {
            this.EventRegistry.push(callback)
        }
    }

    onUse(callback) {
        this.use(callback)
    }

    onChatDelete(callback) {
        this.use((message, next) => {
            if (message.isChatRemove()) {
                callback(message)
            } else {
                next()
            }
        })
    }

    onChatInvite(callback) {
        this.use((message, next) => {
            if (message.isChatInvite()) {
                callback(message)
            } else {
                next()
            }
        })
    }

    onChatPhotoChange(callback) {
        this.use((message, next) => {
            if (message.isChatPhotoUpdate()) {
                callback(message)
            } else {
                next()
            }
        })
    }

    onChatTitleChange(callback) {
        this.use((message, next) => {
            if (message.isChatTitleUpdate()) {
                callback(message)
            } else {
                next()
            }
        })
    }

    onMessageForward(callback) {
        let self = this
        self.use((message, next) => {
            if (message.isForwardMessage()) {
                if (callback(message)) {
                    for (var i = message.fwd_messages.length - 1; i >= 0; i--) {
                        self.notifyMessage(message.fwd_messages[i])
                    }
                }
            } else {
                next()
            }
        })
    }

    onMessageGift(callback) {
        this.use((message, next) => {
            if (message.isGiftMessage()) {
                callback(message)
            } else {
                next()
            }
        })
    }

    onMessageWallReply(callback) {
        this.use((message, next) => {
            if (message.isWallReplyMessage()) {
                callback(message)
            } else {
                next()
            }
        })
    }

    onMessageWall(callback) {
        this.use((message, next) => {
            if (message.isWallMessage()) {
                callback(message)
            } else {
                next()
            }
        })
    }

    onMessageMarketAlbum(callback) {
        this.use((message, next) => {
            if (message.isMarketAlbumMessage()) {
                callback(message)
            } else {
                next()
            }
        })
    }

    onMessageMarket(callback) {
        this.use((message, next) => {
            if (message.isMarketMessage()) {
                callback(message)
            } else {
                next()
            }
        })
    }

    onMessageLink(callback) {
        this.use((message, next) => {
            if (message.isLinkMessage()) {
                callback(message)
            } else {
                next()
            }
        })
    }

    onMessageVideo(callback) {
        this.use((message, next) => {
            if (message.isVideoMessage()) {
                callback(message)
            } else {
                next()
            }
        })
    }

    onMessageMap(callback) {
        this.use((message, next) => {
            if (message.geo) {
                callback(message)
            } else {
                next()
            }
        })
    }

    onMessagePhoto(callback) {
        this.use((message, next) => {
            if (message.isPhotoMessage()) {
                callback(message)
            } else {
                next()
            }
        })
    }

    onMessageVoice(callback) {
        this.use((message, next) => {
            if (message.isVoiceMessage()) {
                callback(message)
            } else {
                next()
            }
        })
    }

    onMessageGif(callback) {
        this.use((message, next) => {
            if (message.isGifMessage()) {
                callback(message)
            } else {
                next()
            }
        })
    }

    onMessageDoc(callback) {
        this.use((message, next) => {
            if (message.isDocMessage()) {
                callback(message)
            } else {
                next()
            }
        })
    }

    onMessageMusic(callback) {
        this.use((message, next) => {
            if (message.isMusicMessage()) {
                callback(message)
            } else {
                next()
            }
        })
    }

    onMessageSticker(callback) {
        this.use((message, next) => {
            if (message.isStickerMessage()) {
                callback(message)
            } else {
                next()
            }
        })
    }

    onMessageText(callback) {
        this.use((message, next) => {
            if (message.isTextMessage()) {
                callback(message)
            } else {
                next()
            }
        })
    }

    onMessage(callback) {   
        this.use((message, next) => {
            callback(message)
        })
    }

    onTypingStatusChange(callback) {
        this.TypingStatus = callback
    }

    pushTyping(user_id, type) {
        let self = this
        let key = 'typing' + user_id
        self.TypingStatus(user_id, true)
        let timerId = setTimeout(() => {
            self.TypingStatus(user_id, false)
            delete self.TypingTimers[key]
        }, 10000)
        self.TypingTimers[key] = timerId
    }

    pushMessage(json) {
        let self = this
        let key = 'typing' + json.user_id
        if (self.TypingTimers[key]) {
            clearTimeout(self.TypingTimers[key])
            self.TypingStatus(json.user_id, false)
            delete self.TypingTimers[key]
        }
        if (json.id > self.MaxMessageId) {
            self.MaxMessageId = json.id
        }
        let message = new Message(() => {
            return self
        }, json)
        self.notifyMessage(message)
    }

    notifyMessage(messageObject) {
        let stack = this.EventRegistry
        if (stack.length == 0) {
            return
        }
        var index = 0
        let notify = () => {
            if (index >= stack.length) {
                return
            }
            stack[index](messageObject, () => {
                index++
                notify()
            })
        }
        notify()
    }

    longPoll(is_out) {
        let self = this
        if (!self.LongPollParams) {
            return self.api('messages.getLongPollServer', {need_pts: 1, lp_version: 2}, (data, error) => {
                if (!data || !data.response) {
                    return self.longPoll(is_out);
                }
                self.LongPollParams = data.response
                self.longPoll(is_out)
            })
        }
        let params = {
            act: 'a_check', 
            key: self.LongPollParams.key,
            ts: self.LongPollParams.ts,
            wait: 25,
            mode: (128 + 32 + 2),
            version: 2
        }
        Utils.get('https://' + self.LongPollParams.server, params, (data, response) => {
            if (data && response) {
                try {
                    data = JSON.parse(data)
                } catch(e) {
                    self.getLongPollHistory(self.LongPollParams.ts, self.LongPollParams.pts)
                    self.LongPollParams = false
                    self.longPoll(is_out)
                    return
                }
                if (data.pts) {
                    self.LongPollParams.pts = data.pts
                }
                if (data.ts) {
                    self.LongPollParams.ts = data.ts
                } else {
                    self.getLongPollHistory(self.LongPollParams.ts, self.LongPollParams.pts)
                    self.LongPollParams = false
                }
                self.longPoll(is_out)
                if (!data.updates || !data.updates.length) {
                    return
                }
                for (var i = 0; i < data.updates.length; i++) {
                    let update = data.updates[i]
                    if (update[0] == 61) {
                        self.pushTyping(update[1], update[2])
                    }
                    if (update[0] != 4) {
                        continue
                    }
                    if (is_out !== true && (update[2] & 2) != 0) {
                        continue
                    }
                    let attachments = update.length >= 6 ? update[6] : {}
                    if (attachments.attach1_type || attachments.fwd || attachments.geo || attachments.geo) {
                        self.messageGet(update[1], (message_object) => {
                            if (message_object) {
                                self.pushMessage(message_object)
                            }
                        })
                    } else {
                        let message = {
                            id: update[1],
                            date: update[4],
                            out: (update[2] & 2) == 2 ? 1 : 0,
                            user_id: update[3],
                            read_state: 0,
                            title: attachments.title || ' ... ',
                            body: update[5].replace(/<br>/g, '\n'),
                            emoji: attachments.emoji || 0
                        }
                        if (message.user_id > 2000000000 && attachments.from) {
                            message.chat_id = Math.abs(message.user_id - 2000000000)
                            message.user_id = Utils.intval(attachments.from)
                        }
                        if (attachments.source_act) {
                            message.action = attachments.source_act
                            switch(message.action) {
                                case 'chat_title_update':
                                    message.action_text = attachments.source_text
                                    message.action_old_text = attachments.source_old_text
                                    break
                                case 'chat_kick_user':
                                case 'chat_invite_user':
                                    message.action_mid = attachments.source_mid ? Utils.intval(attachments.source_mid) : message.user_id
                                    break
                            }
                        }
                        self.pushMessage(message)
                    }
                }
            } else {
                self.getLongPollHistory(self.LongPollParams.ts, self.LongPollParams.pts)
                self.LongPollParams = false
                self.longPoll(is_out)
            }
        })
    }

    getLongPollHistory(ts, pts) {
        let self = this
        self.api('messages.getLongPollHistory', {ts: ts, pts: pts, max_msg_id: self.MaxMessageId}, (data, error) => {
            if (data && data.messages) {
                let items = data.messages.items
                for (var i = 0; i < items.length; i++) {
                    self.pushMessage(items[i])
                }
            }
        })
    }

    executeMessages() {
        let self = this
        if (!self.MessageIds.length) return
        let items = self.MessageIds.slice(0, 100)
        self.MessageIds = self.MessageIds.slice(100)
        self.api('messages.getById', {message_ids: items.join(',')}, (data, error) => {
            if (!data || error) {
                return
            }
            for (var i = 0; i < data.items.length; i++) {
                let key = 'messageGet' + data.items[i].id
                if (self.CallbackRegistry[key]) {
                    self.CallbackRegistry[key](data.items[i])
                }
            }
        })
    }

    executeUsers() {
        let self = this
        if (!self.Users.length) return
        let items = self.Users.slice(0, 1000)
        self.Users = self.Users.slice(1000)
        self.api('users.get', {user_ids: items.join(','), fields: 'verified,sex,bdate,has_photo,photo_50,photo_100,photo_200_orig,photo_200,photo_400_orig,photo_max,photo_max_orig,online,domain,has_mobile,city,country,status,last_seen'}, (data, error) => {
            for (var i = 0; i < data.length; i++) {
                let key = 'userGet' + data[i].id
                if (self.CallbackRegistry[key]) self.CallbackRegistry[key](data[i])
            }
        })
    }

    messageGet(message_id, callback) {
        let self = this
        let key = 'messageGet' + message_id
        if (self.MessageIds.indexOf(message_id) == -1) {
            self.MessageIds.push(message_id)
        }
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

    userGet(user_id, callback) {
        let self = this
        let key = 'userGet' + user_id
        if (self.Users.indexOf(user_id) == -1) self.Users.push(user_id)
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

    executeMethods() {
        let self = this
        let methods = self.MethodQueue.slice(0, 25)
        self.MethodQueue = self.MethodQueue.slice(25)
        if (!methods.length) return
        let code = 'return [' + methods.join(',') + '];'
        self.api('execute', {code: code}, (data, error) => {
            if (!data || !data.response) return
            let execute_errors = []
            for (var i = 0; i < (data.execute_errors || []); i++) {
                if (data.execute_errors[i].method != 'execute') execute_errors.push()
            }
            for (var i = 0; i < data.response.length; i++) {
                let item = data.response[i]
                if (self.CallbackRegistry[item.callback]) {
                    try {
                        self.CallbackRegistry[item.callback](item.response, !item.response ? execute_errors.shift() : false)
                    } catch(e) {
                        console.log('API.execute', e)
                        self.CallbackRegistry[item.callback](item.response, {error: {error_code: -1, error_msg: 'Execution failed'}})
                    }
                }
            }
        })
    }

    sendMessage(params, callback) {
        let self = this
        callback = callback || Function()
        var to_id = params.peer_id || params.user_id || params.chat_id
        if (!params.random_id) {
            params.random_id = Utils.rand()
        }
        self.api('messages.send', params, (id, error) => {
            if (parseInt(id) >= 1) {
                callback(parseInt(id), error, params.random_id)
            } else {
                callback(false, error, params.random_id)
            }
        })
    }

    api(method = 'execute', params = {}, callback = Function(), attempt = 0, request_stack = []) {
        let self = this
        attempt++
        if (attempt > 5) {
            return callback(false, request_stack)
        }
        if (!method.startsWith('appWidgets.') && method != 'execute' && method != 'photos.getOwnerCoverPhotoUploadServer' && method != 'photos.saveOwnerCoverPhoto' && method != 'messages.getLongPollServer' && method != 'streaming.getServerUrl') {
            let callbackName = 'request' + Utils.time() + '_' + Utils.rand() + '_' + Utils.rand()
            var isOk = false
            let timerId = setTimeout(() => { 
                if (!isOk) {
                    self.api(method, params, callback, attempt)
                }
            }, 4000)
            self.CallbackRegistry[callbackName] = (data, error) => {
                if (data && data.response) {
                    data = data.response
                }
                isOk = true
                if (error) {
                    error.request_params = []
                    Object.keys(params).forEach((key) => error.request_params.push({key: key, value: params[key]}))
                }
                callback(data, error)
                clearTimeout(timerId)
                delete self.CallbackRegistry[callbackName]
            }
            self.MethodQueue.push('{"callback": "' + callbackName + '", "response": API.' + method + '(' + JSON.stringify(params) + ')}')
        } else {
            if (!params.v) {
                params.v = API_VERSION
            }
            params.access_token = self.AccessTokens[self.LastToken]
            self.LastToken++
            if (self.LastToken >= self.AccessTokens.length) {
                self.LastToken = 0
            }
            Utils.post(API_URL + method, params, (body, response) => {
                if (!body && !response) {
                    return self.api(method, params, callback, attempt)
                }
                if (!response.headers['content-type'].startsWith('application/json')) {
                    return self.api(method, params, callback, attempt)
                }
                try {
                    body = JSON.parse(body)
                } catch(e) {
                    return self.api(method, params, callback, attempt)
                }
                if (body.response) {
                    return callback(body)
                }
                switch (body.error.error_code) {
                    case 10:
                    case 9:
                    case 6:
                    case 1:
                        return setTimeout(() => {
                            self.api(method, params, callback, attempt)
                        }, 400)
                    case 901:
                        return callback(false, body.error)
                    default:
                        console.log(body)
                        callback(false, body.error)
                }
            })
      }
    }
}

module.exports = API