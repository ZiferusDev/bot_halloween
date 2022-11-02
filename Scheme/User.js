const mongoose = require('mongoose')

const Schema = mongoose.Schema

const userSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    surname: {
        type: String,
        required: false
    },
    id: {
        type: Number,
        required: true,
        unique: true 
        
    }
})

module.exports = mongoose.model('user', userSchema)