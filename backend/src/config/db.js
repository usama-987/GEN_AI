const mongoose = require("mongoose");

async function connectDB(){

    try{
        await mongoose.connect(process.env.MONGO_URI)
    console.log("Database Connected with the server")
    }catch(err){
        console.log(err);
        process.exit(1);
    }

}

module.exports = connectDB