const mongoose = require('mongoose')
const Schema = mongoose.Schema

const ProductSchema = new Schema({
    name:{
        type:String
    },
    brand:{
        type:String
    },
    price:{
        type:Number
    },
    userId:{
        type:String
    }
})

const Product = mongoose.model('product',ProductSchema)

module.exports = Product