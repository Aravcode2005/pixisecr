
const Redis = require('ioredis');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const crypto = require('crypto');

const { default: OpenAI } = require('openai');

const client = new OpenAI({ apiKey: process.env.OPEN_AI_API_KEY });

async function aiFilteration(input) {

    try {
        const response = await client.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "system",
                    content: `You are a feedback classifier,classify the given ${input} according to the genre`
                },

                {
                    role: "user",
                    content: input
                }

            ]

        })

        return response?.choices?.[0].message?.content || '';
    } catch (error) {

        console.log(error);
    }
}
const redis = new Redis(process.env.REDIS_URL || "redis://redis:6379");

redis.on('error', (err) => {
    console.log(err);
})
const nodemailer = require('nodemailer');
const feedbackSchema = require('../models/feedback');

const transporter = nodemailer.createTransport(({
    host: 'smtp.sendgrid.net',
    port: 587,
    auth: {
        user: 'apikey',
        pass: process.env.SGKEY
    }
}))
exports.getAdminotp = (req, res, next) => {
    console.log("Hit");
    res.render('verifyOtp', {
        pageTitle: "verifyOtp"
    })
}
exports.postAdminotp = async (req, res, next) => {
    const name = req.body.name;
    const pswd = req.body.pswd;
    const email = req.body.email;
    console.log(`The enetered name ${name} and ${pswd}`);
    if (name === process.env.ADMIN_NAME && pswd === process.env.ADMIN_PASSWORD) {
        const otp = Math.floor(900000 + Math.random() * 100000);
        req.session.token = crypto.randomUUID();
        try {
            await redis.hset(req.session.token, {
                name: name,
                email: email,
                savedOtp: otp,
                attempts: 3,
                verified: false,
                timeStamp: Date.now()
            })
            await redis.expire(req.session.token, 300);

        } catch (error) {
            console.log(error);
        }
        try {
            await transporter.sendMail({
                to: email,
                from: 'aravlead@gmail.com',
                subject: `OTP for Admin Verification`,
                html: `<p>This is the one time password for the requested verification attempt <h1>${otp}!</h1></p>`
            })
        } catch (error) {
            console.log(error);
        }
        console.log("Now redirecting");
        return res.redirect('/verifyotp');
    }
    else if (name !== process.env.ADMIN_NAME || pswd !== process.env.ADMIN_PASSWORD) {
        console.log("Please try again");
        return res.redirect('/admin/verify/otp');
    }
}
exports.getverifyotp = (req, res, next) => {
    res.render('otp', {
        pageTitle: 'adminotpverification'
    })
}
exports.postverifyotp = async (req, res, next) => {
    const otp = req.body.otp;
    if (!req.session.token) {
        return res.redirect('/admin/verify/otp');
    }
    const savedOtp = await redis.hget(req.session.token, "savedOtp");
    console.log(String(savedOtp));
    console.log(String(otp));
    if (String(otp) === String(savedOtp)) {
        const sensei = await redis.hget(req.session.token, "name");
        const tkn = req.session.token;
        req.session.regenerate(async (err) => {
            if (err) {
                return next(err);
            }
            req.session.isLoggedIn = true;
            req.session.adminName = sensei;
            req.session.role = "admin";
            const payload = {
                id: req.sessionID,
                admin: req.session.adminName,
                role: "admin"
            }
            const secretKey = process.env.JWT_ADMIN_SECRET;
            const expiresIn = process.env.JWT_EXPIRES_IN;
            const token = jwt.sign(payload, secretKey, { expiresIn });
            res.cookie('admin_jwt', token, {
                httpOnly: true,
                secure: false,
                sameSite: 'strict',
                maxAge: 3600000,
                path: '/'
            })
            console.log("JWT token generated:", token);
            console.log("User is Logged in" + req.session.adminName);
            await redis.del(tkn);
            return res.redirect('/admin/dashboard');
        })
    }
    else if (String(otp) !== String(savedOtp)) {
        const attempts = await redis.hincrby(req.session.token, "attempts", -1);
        if (attempts > 0) {
            console.log('Please retry!');
            return res.redirect('/verifyotp');
        }
        if (attempts <= 0) {
            await redis.del(req.session.token);
            return res.redirect('/admin/verify/otp');
        }
    }
}
exports.verifyAdminJwt = (req, res, next) => {
    const token = req.cookies.admin_jwt;
    if (!token) {
        return res.redirect('/admin/verify/otp');
    }
    else {
        try {
            const decoded = jwt.verify(token, process.env.JWT_ADMIN_SECRET);
            if (decoded.role === "admin") {
                req.session.adminName = decoded.adminName;
                req.session.role = decoded.role
                req.session.isLoggedIn = true
                next();
            }
            else {
                return res.redirect('/admin/verify/otp');
            }
        }
        catch (error) {
            console.error(error);
            return res.redirect('/admin/verify/otp');
        }
    }
}

exports.isAdminAuth = (req, res, next) => {
    if (req.session && req.session.isLoggedIn && req.session.role === "admin") {
        return next();
    }
    else {
        return res.redirect('/admin/verify/otp');
    }
}
exports.getadmindashboard = async (req, res, next) => {
    const data = await feedbackSchema.find();
    const prompt = `These are user feedbacks ${data} for my app, group them by type and give a detailed report`;
    const finalprocessedata = await aiFilteration(prompt);
    res.render('fb', {
        pageTitle: 'feedback',
        content: finalprocessedata,
        feedbacks: data
    });
};

exports.postadmindashboard = async (req, res, next) => {
    req.session.destroy((err) => {
        if (err) {
            return console.log(err);
        }
        console.log("Destroying the current session");
        res.clearCookie('admin_jwt');
        res.redirect('/');
    });
}