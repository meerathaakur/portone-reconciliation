const express = require('express');
const { uploadSettlementData } = require('../controllers/settlement');
const upload = require('../config/multer.config');
const router = express.Router();

router.post("/upload",upload.single("txt"), uploadSettlementData)

module.exports = router;