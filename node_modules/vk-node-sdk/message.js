const path = require('path')
const Utils = require('./utils')

class Message {

    constructor(vkCallBack, json) {
        let self = this
        self.lastError = false
        self.vkCallBack = vkCallBack
        self.id = json.id || 0
        self.date = json.date || 0
        self.out = json.out || 0
        self.chat_id = json.chat_id || 0
        self.user_id = json.user_id
        self.read_state = json.read_state || 0
        self.title = json.title || ' ... '
        self.body = json.body || ''
        self.geo = json.geo || false
        self.attachments = json.attachments || false
        self.fwd_messages = json.fwd_messages || false
        self.emoji = json.emoji || false
        self.action = json.action || false
        self.action_text = json.action_text || ''
        self.action_old_text = json.action_old_text || ''
        self.action_mid = json.action_mid || 0
        self.fwd_messages = []
        self.peer_id = json.peer_id || (self.chat_id ? (2000000000 + self.chat_id) : self.user_id)
        self.reply = {peer_id: self.peer_id, attachment: [], forward_messages: []}
        self.uploadDocs = []
        self.uploadPhotos = []
        self.sendMessage = {attachments: [], title: ' ... ', peer_id: self.peer_id, out: 0, read_state: 0}
        self.replyFun = false
        self.isReplyListener = false
        self.buttons = []
        if (json.fwd_messages) {
            for (var i = 0; i < json.fwd_messages.length; i++) {
                let msg = json.fwd_messages[i]
                msg.peer_id = self.peer_id
                self.fwd_messages.push(new Message(vkCallBack, msg))
            }
        }
        if (!self.fwd_messages.length) {
            self.fwd_messages = false
        }
    }

    delete() {
        this.vkCallBack().api('messages.delete', {message_ids: this.id})
    }

    setRead() {
        this.vkCallBack().api('messages.markAsRead', {message_ids: this.id, peer_id: this.peer_id})
    }

    checkReplyListener() {
        let self = this
        if (self.isReplyListener === true) {
            return
        }
        self.isReplyListener = true
        let event = (msg, next) => {
            if (msg.peer_id != self.peer_id) {
                return next()
            }
            let body = msg.body.toLowerCase()
            for (var i = self.buttons.length - 1; i >= 0; i--) {
                let button = self.buttons[i]
                for (var n = button.titles.length - 1; n >= 0; n--) {
                    if (button.titles[n].toLowerCase() == body) {
                        self.vkCallBack().cancelUse(event)
                        button.fun(msg)
                        return
                    }
                }
            }
            if (self.replyFun) {
                self.replyFun(msg)
                self.vkCallBack().cancelUse(event)
            } else {
                next()
            }
        }
        self.vkCallBack().use(event, true)
    }

    onReply(buttonTitle, callback) {
        this.checkReplyListener()
        if (callback) {
            let params = {
                fun: callback,
                titles: []
            }
            if (typeof buttonTitle === 'string') {
                params.titles.push(buttonTitle.toLowerCase())
            } else {
                params.titles = buttonTitle
            }
            this.buttons.push(params)
        } else {
            this.replyFun = buttonTitle
        }
        return this
    }

    setChatTitle(chat_title) {
        if (this.chat_id > 0) {
            this.vkCallBack().api('messages.editChat', {chat_id: this.chat_id, title: chat_title})
        }
    }

    setTyping() {
        this.vkCallBack().setTyping(this.peer_id)
    }

    setPeerId(peer_id) {
        this.reply.peer_id = this.peer_id
        this.sendMessage.user_id = this.peer_id
    }

    toJSON() {
        let json = {
            peer_id: this.peer_id,
            id: this.id,
            date: this.date,
            out: this.out,
            user_id: this.user_id,
            read_state: this.read_state,
            title: this.title,
            body: this.body
        }
        if (this.chat_id) json.chat_id = this.chat_id
        if (this.fwd_messages) json.fwd_messages = this.fwd_messages
        if (this.attachments) json.attachments = this.attachments
        if (this.geo) json.geo = this.geo
        if (this.emoji) json.emoji = 1
        if (this.action) json.action = this.action
        if (this.action_text) json.action_text = this.action_text
        if (this.action_old_text) json.action_old_text = this.action_old_text
        if (this.action_mid) json.action_mid = this.action_mid
        if (this.fwd_messages) {
            json.fwd_messages = []
            for (var i = 0; i < this.fwd_messages.length; i++) {
                json.fwd_messages.push(this.fwd_messages[i].toJSON())
            }
        }
        return json
    }

    toString() {
        return JSON.stringify(toJSON())
    }

    isPhotoMessage() {
    	return this.attachments && this.attachments[0].type == 'photo'
    }

    getPhotos() {
        if (!this.isPhotoMessage()) return []
        let photos = []
        for (var i = this.attachments.length - 1; i >= 0; i--) {
            if (this.attachments[i].photo) photos.push(this.attachments[i].photo)
        }
        return photos
    }

    getVoiceMessages() {
        if (!this.isVoiceMessage()) return []
        let audio_messages = []
        for (var i = this.attachments.length - 1; i >= 0; i--) {
            let attachment = this.attachments[i]
            if (attachment.type != 'doc') break
            if (attachment.doc && attachment.doc.preview && attachment.doc.preview.audio_msg) {
                audio_messages.push(attachment.doc)
            }
        }
        return audio_messages
    }

    isForwardMessage() {
        return this.fwd_messages && this.fwd_messages.length > 0
    }

    isChatRemove() {
        return this.action && this.action == 'chat_kick_user'
    }

    isChatInvite() {
        return this.action && this.action == 'chat_invite_user'
    }

    isChatPhotoUpdate() {
        return this.action && this.action == 'chat_photo_update'
    }

    isChatTitleUpdate() {
        return this.action && this.action == 'chat_title_update'
    }

    isGiftMessage() {
        return this.attachments && this.attachments[0].type == 'gift'
    }

    isWallReplyMessage() {
        return this.attachments && this.attachments[0].type == 'wall_reply'
    }

    isWallMessage() {
        return this.attachments && this.attachments[0].type == 'wall'
    }

    isMarketAlbumMessage() {
        return this.attachments && this.attachments[0].type == 'market_album'
    }

    isMarketMessage() {
        return this.attachments && this.attachments[0].type == 'market'
    }

    isLinkMessage() {
        return this.attachments && this.attachments[0].type == 'link'
    }

    isVideoMessage() {
        return this.attachments && this.attachments[0].type == 'video'
    }

    isMusicMessage() {
        return this.attachments && this.attachments[0].type == 'audio'
    }

    isStickerMessage() {
        return this.attachments && this.attachments[0].type == 'sticker'
    }

    isVoiceMessage() {
    	return this.attachments && this.attachments[0].type == 'doc' && this.attachments[0].doc.preview && this.attachments[0].doc.preview.audio_msg
    }

    isGifMessage() {
    	return this.attachments && this.attachments[0].type == 'doc' && this.attachments[0].doc.ext == 'gif'
    }

    isDocMessage() {
    	return this.attachments && this.attachments[0].type == 'doc' && !this.isVoiceMessage() && !this.isGifMessage()
    }

    isTextMessage() {
        return this.body && !this.attachments && !this.fwd_messages && !this.geo
    }

    addText(text) {
        this.reply.message = text
        this.sendMessage.body = text
        return this
    }

    sendSticker(sticker_id, callback) {
        this.reply.sticker_id = sticker_id
        this.send(callback)
    }

    addForward(data) {
        this.sendMessage.go_api = true
        if (typeof data === 'object') {
            for (var i = data.length - 1; i >= 0; i--) {
                this.addForward(data[i])
            }
        } else {
            data = parseInt(data)
            if (data == NaN || 0 >= data) return this
            try {
                this.reply.forward_messages.push(data)
            } catch(e) {
                this.reply.forward_messages = []
                this.addForward(data)
            }
        }
        return this
    }

    addPhoto(file) {
        let self = this
        if (typeof file === 'string') {
            if (file.match(/photo(-?)[0-9]+_[0-9]+?$/g)) {
                self.sendMessage.go_api = true
                self.addAttachment(file)
            } else if (file.startsWith('http:') || file.startsWith('https:')) {
                file = {
                    url: file
                }
                self.uploadPhotos.push(file)
            } else {
                let ext = path.extname(file)
                file = {
                    file: file, 
                    filename: path.basename(file)
                }
                switch(ext) {
                    case '.gif':
                    case '.jpg':
                    case '.jpeg':
                    case '.png':
                        file.mimetype = 'image' + ext.replace(/\./g, /\//g)
                        break
                }
                self.uploadPhotos.push(file)
            }
        } else if ((file.filename && file.mimetype && (file.buffer || file.file)) || file.url) {
            self.uploadPhotos.push(file)
        }
        return this
    }
    
    addAttachment(attachment) {
        this.sendMessage.go_api = true
        if (!this.reply.attachment) {
            this.reply.attachment = []
        }
        if (typeof this.reply.attachment == 'string') {
            this.reply.attachment = this.reply.attachment.split(',')
        }
        this.reply.attachment.push(attachment)
        return this
    }

    addGraffiti(file, filename) {
        return this.addDoc(file, filename || 'file', 'graffiti')
    }

    addVoice(file, filename) {
        return this.addDoc(file, filename || 'file', 'audio_message')
    }

    addDoc(file, filename, type) {
        let self = this
        if (typeof file === 'string') {
            if (file.match(/doc(-?)[0-9]+_[0-9]+?$/g)) {
                self.sendMessage.go_api = true
                self.addAttachment(file)
            } else if (file.startsWith('http:') || file.startsWith('https:')) {
                file = {
                    url: file,
                    filename: filename
                }
                if (type) file.type = type
                self.uploadDocs.push(file)
            } else {
                let ext = path.extname(file)
                file = {
                    file: file, 
                    filename: (filename || path.basename(file))
                }
                switch(ext) {
                    case '.mp3':
                    case '.wav':
                        file.mimetype = 'audio/mpeg'
                        type = 'audio_message'
                        break
                    case '.gif':
                    case '.jpg':
                    case '.jpeg':
                    case '.png':
                        file.mimetype = 'image' + ext.replace(/\./g, /\//g)
                        break
                    default:
                        file.mimetype = 'application/octet-stream'
                        break
                }
                if (type) file.type = type
                self.uploadDocs.push(file)
            }
        } else if (file.filename && file.mimetype && (file.buffer || file.file)) {
            if (type) file.type = type
            self.uploadDocs.push(file)
        }
        return self
    }

    send(callback) {
        let self = this
        callback = callback || Function()
        if (self.uploadDocs.length) {
            let file = self.uploadDocs.shift()
            if (file.url) {
                Utils.getBuffer(file.url, (file.params || {}), (buffer, response) => {
                    if (buffer) {
                        file.buffer = buffer
                        file.mimetype = response.headers['content-type']
                        file.filename = (file.filename || 'file.' + file.mimetype.split(/\//)[1])
                        delete file.url
                        self.uploadDocs.push(file)
                        self.send(callback)
                    } else {
                        callback(false, {from_ur: response})
                    }
                })
                return
            }
            self.vkCallBack().docUpload(self.peer_id, file, (doc, error) => {
                if (doc) {
                    self.reply.attachment.push('doc' + doc.owner_id + '_' + doc.id)
                    self.sendMessage.attachments.push({type: 'doc', photo: doc})
                } else if (error) {
                    return callback(false, {doc: error})
                }
                self.send(callback)
            }, file.type)
            return
        }
        if (self.uploadPhotos.length) {
            let file = self.uploadPhotos.shift()
            if (file.url) {
                Utils.getBuffer(file.url, (file.params || {}), (buffer, response) => {
                    if (buffer && response.headers['content-type'].startsWith('image')) {
                        file.buffer = buffer
                        file.mimetype = response.headers['content-type']
                        file.filename = 'file.' + file.mimetype.split(/\//)[1]
                        self.uploadPhotos.push(file)
                        delete file.url
                        self.send(callback)
                    } else {
                        callback(false, {from_ur: response})
                    }
                })
                return
            }
            self.vkCallBack().photoUpload(self.peer_id, file, (photo, error) => {
                if (photo) {
                    self.reply.attachment.push('photo' + photo.owner_id + '_' + photo.id)
                    self.sendMessage.attachments.push({type: 'photo', photo: photo})
                } else if (error) {
                    return callback(false, {photo: error})
                }
                self.send(callback)
            })
            return
        }
        if (self.reply.attachment instanceof Array) {
            self.reply.attachment = self.reply.attachment.join(',')
        }
        if (self.reply.attachment == '') {
            delete self.reply.attachment
        }
        if (self.reply.forward_messages instanceof Array) {
            self.reply.forward_messages = self.reply.forward_messages.join(',')
        }
        if (self.reply.forward_messages == '') {
            delete self.reply.forward_messages
        }
        if (self.reply.message == '') {
            delete self.reply.message
        }
        if (self.reply.peer_id && (self.reply.message || self.reply.attachment || self.reply.forward_messages || self.reply.sticker_id)) {
            self.vkCallBack().sendMessage(self.reply, (message_id, error, random_id) => {
                if (message_id && self.sendMessage.go_api) {
                    self.vkCallBack().messageGet(message_id, (message_object) => {
                        callback(message_object, false)
                    })
                } else if (message_id) {
                    self.sendMessage.id = message_id
                    self.sendMessage.random_id = random_id
                    callback(self.sendMessage, false)
                } else {
                    callback(false, error)
                }
                self.sendMessage = {attachments: [], title: ' ... ', peer_id: self.peer_id, out: 0, read_state: 0}
            })
        } else {
            callback(false)
        }
        self.uploadPhotos = []
        self.uploadDocs = []
        self.reply = {peer_id: self.peer_id, attachment: [], forward_messages: []}
    }
}

module.exports = Message;