// Public Trap Page (Root) with Decoy Download Link
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
