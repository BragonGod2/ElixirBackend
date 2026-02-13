const express = require('express');
const router = express.Router();
const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');
const fetch = require('node-fetch');

// Middleware to extract token
const getAuthToken = (req) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7, authHeader.length);
    }
    return null;
};

// User Details Endpoint
router.get('/user/:email', async (req, res) => {
    const email = req.params.email;
    const token = getAuthToken(req);

    if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const client = new OAuth2Client();
        client.setCredentials({ access_token: token });

        const admin = google.admin({ version: 'directory_v1', auth: client });

        // Directory API requires ADMIN_DIRECTORY_USER_READONLY scope
        const user = await admin.users.get({
            userKey: email,
            projection: 'full',
            viewType: 'domain_public'
        });

        const userData = user.data;

        const details = {
            department: userData.organizations?.[0]?.department || '',
            jobTitle: userData.organizations?.[0]?.title || '',
            workPhone: userData.phones?.find(p => p.type === 'work')?.value || ''
        };

        res.json(details);

    } catch (error) {
        // Fallback: This endpoint is sometimes called heavily. If fail, just return empty.
        // Or return status 404/500 depending on actual error.
        console.error('API Error:', error.message);
        res.json({ department: '', jobTitle: '', workPhone: '' });
    }
});

// Photo Proxy Endpoint
router.get('/photo/:email', async (req, res) => {
    const email = req.params.email;
    const token = getAuthToken(req);

    if (!token) {
        return res.status(401).send('Unauthorized');
    }

    try {
        const client = new OAuth2Client();
        client.setCredentials({ access_token: token });

        const admin = google.admin({ version: 'directory_v1', auth: client });

        const user = await admin.users.get({
            userKey: email,
            projection: 'basic',
            viewType: 'domain_public'
        });

        if (user.data.thumbnailPhotoUrl) {
            // Need to change the URL slightly sometimes to get high res?
            // Usually thumbnailPhotoUrl is small.
            // But simple proxy is fine.
            const response = await fetch(user.data.thumbnailPhotoUrl);
            const buffer = await response.buffer();

            res.setHeader('Content-Type', 'image/jpeg');
            // Cache heavily
            res.setHeader('Cache-Control', 'public, max-age=86400');
            res.send(buffer);
        } else {
            res.status(404).send('Photo not found');
        }

    } catch (error) {
        console.error('Photo API Error:', error.message);
        res.status(404).send('Photo not found');
    }
});

module.exports = router;
