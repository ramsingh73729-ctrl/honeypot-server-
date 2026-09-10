const express = require('express');
const useragent = require('express-useragent');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(useragent.express());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Array to store logs in memory
let attackLogs = [];
let visitCount = 0;

async function logVisitor(req, actionType = 'Page Visit') {
    let clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    if (clientIp && clientIp.includes(',')) {
        clientIp = clientIp.split(',')[0].trim();
    }

    let geoInfo = { country: 'Local / Unknown', city: 'Local / Unknown', isp: 'Local / Unknown' };
    
    try {
        if (clientIp && clientIp !== '::1' && clientIp !== '127.0.0.1') {
            const response = await axios.get(`http://ip-api.com/json/${clientIp}`);
            if (response.data.status === 'success') {
                geoInfo = response.data;
            }
        }
    } catch (error) {
        // Fallback
    }

    const logEntry = {
        time: new Date().toLocaleTimeString(),
        action: actionType,
        ip: clientIp,
        country: geoInfo.country,
        city: geoInfo.city,
        isp: geoInfo.isp,
        browser: req.useragent.browser,
        os: req.useragent.os,
        credentials: (req.body && req.body.username) ? { username: req.body.username, password: req.body.password } : null
    };

    attackLogs.push(logEntry);
    if (actionType.includes('Visit')) visitCount++;

    console.log(`\n[ALERT] ${actionType}!`);
    console.log(`IP Address : ${clientIp}`);
    console.log(`Location   : ${geoInfo.city}, ${geoInfo.country}`);
    if (logEntry.credentials) {
        console.log(`Credentials: User='${logEntry.credentials.username}' | Pass='${logEntry.credentials.password}'`);
    }
    console.log('--------------------------------------------------');
}

// Serve login page
app.get('/', async (req, res) => {
    await logVisitor(req, 'Page Visit');
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Capture credentials
app.post('/login', async (req, res) => {
    await logVisitor(req, 'Credentials Captured');
    res.send('<h2>Access Denied</h2><p>Invalid credentials or unauthorized attempt logged.</p>');
});

// API endpoint to send logs to dashboard
app.get('/api/logs', (req, res) => {
    const creds = attackLogs.filter(log => log.credentials !== null);
    res.json({
        visits: visitCount,
        credentials: creds,
        logs: attackLogs
    });
});

// Dashboard route
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.listen(PORT, () => {
    console.log(`Honeypot Server running on port ${PORT}`);
    console.log(`Access Dashboard at: http://localhost:${PORT}/dashboard`);
});
