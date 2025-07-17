require("dotenv").config({quiet:true})
const express = require('express');
const paymentRoutes = require('./routes/payment.js');
const settlementRoutes = require('./routes/settlement');
const reportRoutes = require('./routes/report');


const app = express();

app.use('/api/payments', paymentRoutes);
app.use('/api/settlements', settlementRoutes);
app.use('/api/report', reportRoutes);

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});