const mongoose = require('mongoose');
const { Schema, model } = mongoose;
const userSchema = new Schema({
    name: String,
    email: String,
    password: String,
    imageUrl: {
        type: String,
        required: true
    },
    gamesplayed:  Number,

}, {
    timestamps: true
});
const userdata = model('user', userSchema);
module.exports = userdata;