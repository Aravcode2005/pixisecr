const mongoose = require('mongoose');
const dotenv = require('dotenv');
 dotenv.config();
 const mongoOptions = {
     serverSelectionTimeoutMS: 30000,
     connectTimeoutMS: 30000,
     socketTimeoutMS: 45000,
     maxPoolSize: 10,
     minPoolSize: 2,
    retryWrites: true
};

const ConnectDB = mongoose.connect(process.env.MONGODB_URI, mongoOptions)
     .then(() => console.log("Connected to the database"))
     .catch(err => {
        console.error('Database connection failed:', err);
     });

 mongoose.connection.on('connected', () => {
     console.log("Connected to the database!!!")
 })
 mongoose.connection.on('disconnected', () => {
     console.log("Disconnected from the database");
 });
 mongoose.connection.on('reconnected', () => {
     console.log("Reconnected to the database");
})
 module.exports = ConnectDB;