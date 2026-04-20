const express = require("express");
const authRouter = require('./routes/auth.routes')
const interviewRouter = require('./routes/interview.routes.js')
const cookieparser = require('cookie-parser')
const cors = require('cors')

const app = express();
app.use(express.json());
app.use(cors({
    origin: "http://localhost:5173",
    credentials: true
}))
app.use(cookieparser());


app.use("/api/auth",authRouter)
app.use("/api/interview",interviewRouter)

module.exports = app;