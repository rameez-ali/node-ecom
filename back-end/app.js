const express = require('express')
const morgan = require('morgan')
const cors = require('cors')
const createError = require('http-errors')
require('dotenv').config()

require('./helpers/init_mongodb')

const Product = require('./Models/Product.model');

const AuthRoute = require('./Routes/Auth.route')

const auth = require("./middleware/auth");

const app = express();

app.use(express.json());
app.use(express.urlencoded({extended:true}));

app.use(cors());

app.use('/auth', AuthRoute)


app.post('/product/create', auth, async (req, res, next) => {
    let data = new Product(req.body)
    const result = await data.save();
    res.send(result)
})

app.get('/product/list', auth, async (req, res, next) => {
    let data = await Product.find();
    res.status(200).send(data);
})

app.delete('/product/delete/:_id', auth, async (req, res, next) => {
    console.log(req.params)
    let data = await Product.deleteOne(req.params);
    res.send(data)
})

app.get('/product/edit/:_id', auth, async (req, res, next) => {
    let data = await Product.findOne({_id:req.params});
    if(data){
        res.send(data)
    }
    else{
        res.send({data:"No Data Found"})
    }
   
})

app.put('/product/update/:_id', auth, async (req, res, next) => {
    console.log(req.params)
    let data = await Product.updateOne(
        req.params,
        {
            $set:req.body
        }
    );
    res.send(data)
})

app.get('/product/search/:keyword', auth, async (req, res, next) => {
    console.log(req.params)
    let data = await Product.find({
     "$or":[
        {name: { $regex:req.params.keyword }}
     ]   
    });
    res.send(data)
})

const PORT = process.env.PORT || 5000

app.listen(PORT,()=>{
    console.log(`Server running on port ${PORT}`)
})