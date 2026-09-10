const express = require('express');
const app = express(); // Express app initialize karein

// Aapka baaki ka code, routes aur middlewares yahan aayenge...

// Server ko Render ke dynamic port par listen karne ke liye set karein
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
