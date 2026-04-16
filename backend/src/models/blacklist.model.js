const mongoose = require("mongoose");


const BlacklistTokenSchema = new mongoose.Schema({
    token :{
    type: String,
    required: [true,"Token is required to blacklist"],
    },
}, {timestamps: true})



const TokenBlackListModel = mongoose.model("BlacklistToken", BlacklistTokenSchema);

module.exports = TokenBlackListModel;