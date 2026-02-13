require('dotenv').config();
const express = require('express');
const router = express.Router();
const { OAuth2Client } = require('google-auth-library');
const fs = require('fs');

// OAuth2 Client setup
const client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    // The Redirect URI will likely be your Hostinger domain + /auth/google/callback
    process.env.GOOGLE_REDIRECT_URI
);

// MOCK Database (For now)
// In a real scenario, this would be a DB or fetched from Google Directory API
const getUserRole = async (email) => {
    // Basic logic
    if (email.endsWith('@rizingsunmedia.com')) {
        // Here you would query your DB or Google Directory API for 'role' and 'groups'
        // For demonstration, returning a default
        return {
            role: 'Employee', // Default role
            groups: [] // Default groups
        };
    }
    return { role: 'Guest', groups: [] };
};

// 1. Initiate OAuth Flow
// GET /auth/google?callback_url=http://localhost:8765/callback
router.get('/google', (req, res) => {
    // The client sends a callback_url query param
    const clientCallbackUrl = req.query.callback_url;

    if (!clientCallbackUrl) {
        return res.status(400).send('Missing callback_url query parameter');
    }

    // Set state to include the client's callback URL so we know where to redirect back after Google auth
    const state = Buffer.from(JSON.stringify({ callbackUrl: clientCallbackUrl })).toString('base64');

    const authorizeUrl = client.generateAuthUrl({
        access_type: 'offline', // Get a refresh token if possible (backend might need it)
        scope: [
            'https://www.googleapis.com/auth/userinfo.profile',
            'https://www.googleapis.com/auth/userinfo.email',
            // Add other scopes like Directory API if needed
            'https://www.googleapis.com/auth/admin.directory.user.readonly',
            'https://www.googleapis.com/auth/admin.directory.group.readonly'
        ],
        state: state
    });

    res.redirect(authorizeUrl);
});

// 2. Google OAuth Callback
// GET /auth/google/callback (This must match the Redirect URI in Google Console)
router.get('/google/callback', async (req, res) => {
    const { code, state } = req.query;

    if (!code) {
        return res.status(400).send('Authorization code missing');
    }

    try {
        // Exchange code for tokens
        const { tokens } = await client.getToken(code);
        client.setCredentials(tokens);

        // Get user info
        const ticket = await client.verifyIdToken({
            idToken: tokens.id_token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        const email = payload.email;

        // Fetch additional user info (Role, Groups)
        // This is where you'd call Google Directory API or your DB
        const userDetails = await getUserRole(email);

        // Parse state to get original callback URL
        let callbackUrl = '';
        if (state) {
            try {
                const decodedState = JSON.parse(Buffer.from(state, 'base64').toString());
                callbackUrl = decodedState.callbackUrl;
            } catch (e) {
                console.error('Failed to parse state', e);
            }
        }

        if (!callbackUrl) {
            return res.status(400).send('Invalid state parameter (callbackUrl missing)');
        }

        // Construct redirect URL with query params for the client app
        const redirectParams = new URLSearchParams({
            email: email,
            name: payload.name,
            picture: payload.picture,
            job_title: userDetails.jobTitle || 'Team Member', // Mock job title if not fetched
            role: userDetails.role,
            groups: JSON.stringify(userDetails.groups),
            id_token: tokens.id_token,
            access_token: tokens.access_token,
            // refresh_token usually not sent to client for security, stored in backend DB session
        });

        res.redirect(`${callbackUrl}?${redirectParams.toString()}`);

    } catch (error) {
        console.error('Error during Google callback:', error);
        res.status(500).send('Authentication failed');
    }
});


// 3. Silent Refresh
// GET /auth/refresh?email=...
// Expects Authorization: Bearer <token>
router.get('/refresh', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const email = req.query.email;

    try {
        // Verify token (ID token or access token)
        // Simple verification - might want to use tokeninfo endpoint or client.verifyIdToken
        // For access tokens, we can verify by making a call to userinfo
        const oauth2 = require('googleapis').google.oauth2({ version: 'v2', auth: client });
        client.setCredentials({ access_token: token });

        const userInfo = await oauth2.userinfo.get();
        if (userInfo.data.email !== email) {
            return res.status(403).json({ error: 'Token email mismatch' });
        }

        // Fetch updated role/groups
        const userDetails = await getUserRole(email);

        res.json({
            role: userDetails.role,
            groups: userDetails.groups
        });

    } catch (error) {
        console.error('Refresh failed:', error);
        res.status(401).json({ error: 'Invalid token' });
    }
});

module.exports = router;
