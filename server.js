const express = require('express');
const basicAuth = require('express-basic-auth');
const useragent = require('express-useragent');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = 4000;

// Middleware setup
app.use(useragent.express());
app.use(express.urlencoded({ extended: true }));

// Store captured logs in memory
const logs = [];

// Public Trap Page (Root)
app.get('/', async (req, res) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const ua = req.useragent;
    
    let geoData = {};
    try {
        const response = await axios.get(`http://ip-api.com/json/${ip}`);
        geoData = response.data;
    } catch (err) {
        console.error('IP lookup failed:', err.message);
    }

    logs.push({
        time: new Date().toISOString(),
        ip,
        browser: ua.browser,
        os: ua.os,
        device: ua.platform,
        location: geoData
    });

    res.send(`
        <!DOCTYPE html>
        <html>
        <head><title>Login Portal</title></head>
        <body style="font-family: Arial, sans-serif; text-align: center; margin-top: 50px;">
            <h2>System Login</h2>
            <form action="/login" method="POST">
                <input type="text" name="username" placeholder="Username" required style="padding: 8px; margin: 5px;"/><br>
                <input type="password" name="password" placeholder="Password" required style="padding: 8px; margin: 5px;"/><br>
                <button type="submit" style="padding: 8px 15px; margin-top: 10px;">Sign In</button>
            </form>
        </body>
        </html>
    `);
});

app.post('/login', (req, res) => {
    res.send('<h3>Authentication Failed. Please try again.</h3>');
});

// Protected Admin Dashboard
app.get('/dashboard', basicAuth({
    users: { 'admin': 'SuperSecretPassword123' },
    challenge: true,
    realm: 'HoneypotAdminArea'
}), (req, res) => {
    res.json(logs);
});

// Start Server
app.listen(PORT, () => {
    console.log(`Honeypot Server running on port ${PORT}`);
});
