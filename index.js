require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const helmet = require('helmet');
const path = require('path');

const authRoutes = require('./src/routes/auth');
const apiRoutes = require('./src/routes/api');
const updateRoutes = require('./src/routes/updates');

const app = express();
const PORT = process.env.PORT || 3000;

// Security and utility middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(cookieParser());

// Static file serving (for update ZXP downloads)
app.use('/public', express.static(path.join(__dirname, 'public')));

// Routes
// 1. Auth routes (Google OAuth flow)
app.use('/auth', authRoutes);

// 2. API routes (Photo proxy, user details)
// These were called with `https://rizingsunmedia.com/api/user/:email`
app.use('/api', apiRoutes);

// 3. Update routes (Manifest, etc.)
// These were called with `https://rizingsunmedia.com/updates/manifest.json`
app.use('/updates', updateRoutes);

// Health check
app.get('/', (req, res) => {
    res.status(200).send('Elixir Backend Service Running');
});

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
