const userModel = require("../models/user.model")
const bcrypt = require("bcryptjs");
const jwt = require('jsonwebtoken')
const tokenBlacklistModel = require('../models/blacklist.model')

async function registerUserController(req,res){

    const {username,email,password} = req.body;

    if(!username || !email || !password){
        return res.status(400).json({
            status: false,
            message:"Username, email and password required"
        })
    }

    const isUserAlreadyExist = await userModel.findOne({$or: [{username},{email}]})

    if (isUserAlreadyExist){
        return res.status(400).json({
            status: false,
            message: "Account Already exist with this email or username"
        })
    }

    const hash = await bcrypt.hash(password,10);

    const user = await userModel.create({
        username,
        email,
        password: hash

    })

    const token = jwt.sign({id: user._id, username : user.username }, process.env.JWT_SECRET, {
        expiresIn: "1d"
    })

    res.cookie("token", token)

    res.status(201).json({
        status: true,
        message: "User Register Sucessfully",
        user:{
            id: user._id,
            username: user.username,
            email: user.email
        }
    })

    

    
}

async function loginUserController(req,res){
    const {email,password} = req.body;

    const user = await userModel.findOne({email})

    if(!user){
        return res.status(400).json({
            status: false,
            message:"Invalid Email"
        })
    }

    const isPasswordvalid = await bcrypt.compare(password, user.password);

    if(!isPasswordvalid){
        return res(400).json({
            status: false,
            message : "Invalid password"
        })
    }

    const token = jwt.sign({id: user._id, username : user.username }, process.env.JWT_SECRET, {
        expiresIn: "1d"
    })

    res.cookie("token", token)

    res.status(201).json({
        status: true,
        message: "User Login Sucessfully",
        user:{
            id: user._id,
            username: user.username,
            email: user.email
        }
    })


    
}

async function logoutUserController(req,res){
    const token = req.cookies.token;

    if(token){
        await tokenBlacklistModel.create({token})
    }

    res.clearCookie("token")

    res.status(200).json({
        status: true,
        message: "User Logout Sucessfully"
    })

}

async function getMeController(req,res){
    const user = await userModel.findById( req.user.id )

    res.status(200).json({
        status: true,
        message: "User detailed Fetched sucessfully",
        user:{
            id:user._id,
            username: user.username,
            email: user.emails
        }
    })
}


module.exports = {registerUserController, loginUserController, logoutUserController, getMeController}