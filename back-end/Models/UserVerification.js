const mongoose = require('mongoose')
const Schema = mongoose.Schema

const UserVerificationSchema = new Schema({
    userID:{
        type:String
    },
    uniqueString:{
        type:String
    },
    createdAt:{
        type:Date
    },
    expiresAt:{
        type:Date
    }
})

const UserVerfication = mongoose.model('UserVerification',UserVerificationSchema)

module.exports = UserVerfication