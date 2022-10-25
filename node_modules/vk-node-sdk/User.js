'use strict'

const API = require('./API')
const Utils = require('./utils')

class User {

	constructor(token, use_longpoll, is_out) {
        this.API = new API(typeof token === 'object' ? token : [token])
        this.onCaptchaListener = Function()
        if (use_longpoll) {
            this.API.longPoll(is_out)
        }
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

    coverUpload(group_id, file, callback, params) {
        this.API.coverUpload(group_id, file, callback, params)
    }

    onCaptchaError(callback) {
        this.onCaptchaListener = callback
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

    setTyping(peer_id) {
        this.api('messages.setActivity', {type: 'typing', peer_id: peer_id})
    }

    api(method, params, callback) {
        callback = callback || Function()
        return this.API.api(method, params, (data) => {
            if (data && data.error) {
                if (data.error.error_code == 14) {
                    self.onCaptchaListener(data.error.captcha_sid, data.error.captcha_img, (captcha_key) => {
                        params.captcha_sid = data.error.captcha_sid
                        params.captcha_key = captcha_key
                        self.api(method, params, callback)
                    })
                } else {
                    callback(false)
                }
            } else {
                callback(data)
            }
        })
    }
}

module.exports = User