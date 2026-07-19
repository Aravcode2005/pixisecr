const express = require('express');
const adminController = require('../controllers/admin');
const router = express.Router();
router.get('/admin/verify/otp', adminController.getAdminotp);
router.post('/admin/verify/otp', adminController.postAdminotp);
router.get('/verifyotp', adminController.getverifyotp);
router.post('/verifyotp', adminController.postverifyotp);
router.get('/admin/dashboard', adminController.isAdminAuth, adminController.verifyAdminJwt, adminController.getadmindashboard);
router.post('/admin/dashboard', adminController.postadmindashboard);
module.exports = router;


