const mongoose = require('mongoose')

mongoose.connect('mongodb://0.0.0.0:27017',{dbName:'auth_db'}).then(()=>{
    console.log('mongodb connected.')
}).catch(err => console.log(err.message))
