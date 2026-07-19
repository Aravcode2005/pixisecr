const mongoose = require('mongoose');
const { model, Schema } = mongoose;
const feedbackSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    feedback: {
        type: [String],
        required: true
    }
},
    {
        timestamps: true
    }
)
module.exports = model('feedback', feedbackSchema);