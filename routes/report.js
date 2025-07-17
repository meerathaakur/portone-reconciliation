const express = require('express');
const { generateReport } = require('../controllers/records');
const router = express.Router();

router.get("/",generateReport)


module.exports = router;