const express = require('express');
const useragent = require('express-useragent');
const axios = require('axios');

const app = express();
const PORT = 3000;

app.use(useragent.express());

app.get('*', async (req, res) => {
    // Get client IP (handling ngrok/proxy headers)
    let clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    if (clientIp && clientIp.includes(',')) {
        clientIp = clientIp.split(',')[0].trim();
    }

    let geoInfo = { country: 'Local / Unknown', city: 'Local / Unknown', isp: 'Local / Unknown' };
    
    try {
        // If it's a public IP, fetch geolocation data
        if (clientIp && clientIp !== '::1' && clientIp !== '127.0.0.1') {
            const response = await axios.get(`http://ip-api.com/json/${clientIp}`);
            if (response.data.status === 'success') {
                geoInfo = response.data;
            }
        }
    } catch (error) {
        // Fallback if API fails
    }

    console.log(`\n[ALERT] New Visitor Trapped!`);
    console.log(`IP Address : ${clientIp}`);
    console.log(`Location   : ${geoInfo.city}, ${geoInfo.country}`);
    console.log(`ISP / Org  : ${geoInfo.isp}`);
    console.log(`Browser    : ${req.useragent.browser} (${req.useragent.os})`);
    console.log(`Request URL: ${req.path}`);
    console.log('--------------------------------------------------');

    res.send('Access Denied: Your visit has been logged.');
});

app.listen(PORT, () => {
    console.log(`Honeypot Server running on port ${PORT}`);
});
