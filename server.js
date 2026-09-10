// Protected Admin Dashboard with Search Filter, Download Button & Sanitized Inputs
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

    // Search query capture karein (Username ya IP ke basis par)
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
                .btn { background-color: #27ae60; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px; font-weight: bold; }
                .btn:hover { background-color: #219653; }
                .top-bar { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; }
                .search-box { margin: 15px 0; }
                .search-box input { padding: 8px; width: 250px; border: 1px solid #ccc; border-radius: 4px; }
                .search-box button { padding: 8px 12px; background: #2980b9; color: white; border: none; border-radius: 4px; cursor: pointer; }
                table { width: 100%; border-collapse: collapse; background: #fff; box-shadow: 0 2px 5px rgba(0,0,0,0.1); margin-top: 10px; border-radius: 5px; overflow: hidden; }
                th, td { padding: 12px 15px; text-align: left; border-bottom: 1px solid #ddd; }
                th { background-color: #2c3e50; color: white; }
                tr:hover { background-color: #f1f1f1; }
            </style>
        </head>
        <body>
            <div class="top-bar">
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
// Decoy Document / Canary Token Route
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

    // Log save karein
    saveLog(logEntry);
    
    // Special Canary Alert Telegram par bhejein
    if (TELEGRAM_BOT_TOKEN !== 'YOUR_BOT_TOKEN_HERE') {
        const alertMessage = `⚠️ *CANARY TOKEN TRIGGERED!*\n\n` +
                             `📁 *Kisi ne fake confidential report access karne ki koshish ki!*\n` +
                             `🌐 *IP:* ${ip}\n` +
                             `📍 *Location:* ${geoData.city || 'N/A'}, ${geoData.country || 'N/A'}\n` +
                             `💻 *Device:* ${ua.browser} / ${ua.os}`;
        try {
            await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                chat_id: TELEGRAM_CHAT_ID,
                text: alertMessage,
                parse_mode: 'Markdown'
            });
        } catch (err) {
            console.error('Telegram alert failed:', err.message);
        }
    }

    // Attacker ko lage ki file protected ya restricted hai
    res.status(403).send('<h2>403 Forbidden</h2><p>You do not have administrative privileges to access this document.</p>');
});
