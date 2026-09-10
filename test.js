const express = require('express');
const app = express();

app.get('/', (req, res) => {
    res.send('Server is working fine!');
});

app.listen(3000, () => {
    console.log('Test server running on http://localhost:3000');
});
