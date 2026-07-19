const express = require('express');
const userController = require('../controllers/user');
const authController = require('../controllers/auth');
const router = express.Router();
router.get('/user', authController.isAuthenticated, authController.verifyJwt, userController.getuserpage);
router.post('/user', authController.isAuthenticated, authController.verifyJwt, userController.postuserpage);
router.get('/profile', authController.verifyJwt, userController.getProfile);
router.get('/', userController.getHomepage);
router.post('/player/feedback', userController.postFeedback);
module.exports = router;


