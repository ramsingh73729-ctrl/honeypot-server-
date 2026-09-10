const express = require('express');
const basicAuth = require('express-basic-auth');
const useragent = require('express-useragent');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 4000;
const LOG_FILE = path.join(__dirname, 'logs.json');

// ⚠️ Yahan apni asli Telegram Bot Token aur Chat ID daalein
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
async function sendTelegramAlert(messageText) {
    if (TELEGRAM_BOT_TOKEN === 'YOUR_BOT_TOKEN_HERE') return;
    
    try {
        await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            chat_id: TELEGRAM_CHAT_ID,
            text: messageText,
            parse_mode: 'Markdown'
        });
    } catch (err) {
        console.error('Telegram alert failed:', err.message);
    }
}

// Helper function to read and save logs
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

// 1. Public Trap Page (Root) with Login & Canary Link
app.get('/', async (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Internal Portal Login</title>
            <style>
                body { font-family: Arial, sans-serif; background: #f4f4f9; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
                .container { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); width: 300px; text-align: center; }
                input { width: 90%; padding: 10px; margin: 8px 0; border: 1px solid #ccc; border-radius: 4px; }
                button { width: 95%; padding: 10px; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; }
                button:hover { background: #2980b9; }
                .trap-link { margin-top: 20px; font-size: 12px; border-top: 1px solid #eee; padding-top: 15px; }
                .trap-link a { color: #e74c3c; text-decoration: none; font-weight: bold; }
                .trap-link a:hover { text-decoration: underline; }
            </style>
        </head>
        <body>
            <div class="container">
                <h2>Corporate Login</h2>
                <form action="/login" method="POST">
                    <input type="text" name="username" placeholder="Username" required /><br>
                    <input type="password" name="password" placeholder="Password" required /><br>
                    <button type="submit">Sign In</button>
                </form>
                
                <div class="trap-link">
                    <p>Looking for internal files?</p>
                    <a href="/download/confidential-report.pdf">📥 Download Q4 Confidential Report.pdf</a>
                </div>
            </div>
        </body>
        </html>
    `);
});

// 2. Capture Login Credentials
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

    const alertMessage = `🚨 *New Honeypot Capture!*\n\n` +
                         `👤 *User:* ${escapeHtml(username)}\n` +
                         `🔑 *Pass:* ${escapeHtml(password)}\n` +
                         `🌐 *IP:* ${ip}\n` +
                         `📍 *Location:* ${geoData.city || 'N/A'}, ${geoData.country || 'N/A'}\n` +
                         `💻 *Device:* ${ua.browser} / ${ua.os}`;
    
    await sendTelegramAlert(alertMessage);

    res.send('<h3>Authentication Failed. Please try again.</h3>');
});

// 3. Canary Token Route (Decoy File Trap)
app.get('/download/confidential-report.pdf', async (req, res) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const ua = req.useragent;

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
        username: 'TRAP_TRIGGERED (Decoy File Download)',
        password: 'N/A',
        browser: ua.browser,
        os: ua.os,
        device: ua.platform,
        location: geoData
    };

    saveLog(logEntry);

    const alertMessage = `⚠️ *CANARY TOKEN TRIGGERED!*\n\n` +
                         `📁 *Kisi ne fake confidential report access ki!*\n` +
                         `🌐 *IP:* ${ip}\n` +
                         `📍 *Location:* ${geoData.city || 'N/A'}, ${geoData.country || 'N/A'}\n` +
                         `💻 *Device:* ${ua.browser} / ${ua.os}`;
    
    await sendTelegramAlert(alertMessage);

    res.status(403).send('<h2>403 Forbidden</h2><p>You do not have administrative privileges to access this document.</p>');
});

// 4. Protected Admin Dashboard with Search & Filter
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

    const searchQuery = req.query.search ? req.query.search.toLowerCase() : '';
    const filteredLogs = logs.filter(log => {
        const username = log.username ? log.username.toLowerCase() : '';
        const ip = log.ip ? log.ip.toLowerCase() : '';
        return username.includes(searchQuery) || ip.includes(searchQuery);
    });

    const rows = filteredLogs.map(log => {
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
                .btn { background-color: #27ae60; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px; font-weight: bold; float: right; }
                .btn:hover { background-color: #219653; }
                .search-box { margin: 15px 0; }
                .search-box input { padding: 8px; width: 250px; border: 1px solid #ccc; border-radius: 4px; }
                .search-box button { padding: 8px 12px; background: #2980b9; color: white; border: none; border-radius: 4px; cursor: pointer; }
                table { width: 100%; border-collapse: collapse; background: #fff; box-shadow: 0 2px 5px rgba(0,0,0,0.1); margin-top: 10px; border-radius: 5px; overflow: hidden; clear: both; }
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
            
            <div class="search-box">
                <form action="/dashboard" method="GET">
                    <input type="text" name="search" placeholder="Search by Username or IP..." value="${escapeHtml(searchQuery)}" />
                    <button type="submit">Search</button>
                    <a href="/dashboard" style="margin-left: 10px; text-decoration: none; color: #e74c3c;">Reset</a>
                </form>
            </div>

            <p>Showing <strong>${filteredLogs.length}</strong> of <strong>${logs.length}</strong> total captures</p>
            
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
                    ${rows.length > 0 ? rows : '<tr><td colspan="6" style="text-align:center;">No matching logs found.</td></tr>'}
                </tbody>
            </table>
        </body>
        </html>
    `);
});

// 5. Download JSON Logs
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
