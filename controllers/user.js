
const feedbackSchema = require('../models/feedback');
exports.getuserpage = (req, res, next) => {
    console.log("This is the email of the user" + req.session.email);
    console.log("This is the name of the logged in user " + JSON.stringify(req.session.username));
    res.render('user', {
        pageTitle: req.session.username
    })
}
exports.postuserpage = (req, res, next) => {
req.session.destroy((err) => {
        if (err) {
            return console.log(err);
        }
        console.log("Destroying the current session");
        res.clearCookie('player_jwt');
        return res.redirect('/');
    });
}
exports.getProfile = (req, res, next) => {
    res.render('profile', {
        pageTitle: "profile",
        personname: req.session.username,
        personemail: req.session.email,
        personimage: req.session.photo,
        persongames: req.session.games
    })
}
exports.getHomepage = (req, res, next) => {
    console.log('Cookies:', JSON.stringify(req.cookies));
    res.render('Eco', {
        pageTitle: "Echoes of Oblivion",
        junglelink: '/mainScene',
        sealink: '/sea'
    })
}
exports.postFeedback = async (req, res, next) => {
    const fb = req.body.feedback;
    const name = req.body.name;
    try {
        const alreadyExistsrecord = await feedbackSchema.findOne({ name: name });

        if (alreadyExistsrecord) {
            console.log(alreadyExistsrecord);
            try {
                const array = alreadyExistsrecord.feedback;
                array.push(fb);
                const updatedRecord = await feedbackSchema.findOneAndUpdate({ name }, {
                    name: name,
                    feedback: array
                })
                if (updatedRecord) {
                    return res.redirect('/');
                }
                else {
                    return res.status(503).json({
                        message: `Not saved,sorry!`
                    })

                }
            }
            catch (error) {
                console.log(error);
            }
        }

        else {
            try {
                const newfb = await feedbackSchema.create({
                    name: name,
                    feedback: [fb]
                })

                if (newfb) {
                    return res.redirect('/');
                }

                else {
                    return res.status(403).json({
                        message: 'Not saved to db'
                    })
                }
            }

            catch (error) {
                console.log(error);
            }
        }

    }
    catch (error) {
        console.log(error);
    }
}










