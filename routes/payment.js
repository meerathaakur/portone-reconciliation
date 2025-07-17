const express = require('express');
const { uploadPaymentData } = require('../controllers/payment');
const upload = require('../config/multer.config');
const router = express.Router();

router.post("/upload",upload.single("csv"), uploadPaymentData)

module.exports = router;