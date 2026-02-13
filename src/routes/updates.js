const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// Route to serve the manifest.json
// Matches https://rizingsunmedia.com/updates/manifest.json
router.get('/manifest.json', (req, res) => {
    try {
        const manifestPath = path.join(__dirname, '../../public/manifest.json');

        if (fs.existsSync(manifestPath)) {
            const manifest = fs.readFileSync(manifestPath, 'utf8');
            res.setHeader('Content-Type', 'application/json');
            res.send(manifest);
        } else {
            console.error('Manifest file not found at:', manifestPath);
            res.status(404).json({ error: 'Manifest not found' });
        }
    } catch (error) {
        console.error('Error serving manifest:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Route to download update files
// E.g. https://rizingsunmedia.com/updates/download/ElixirContext.zxp
router.get('/download/:filename', (req, res) => {
    const filename = req.params.filename;
    // Basic security to prevent directory traversal
    if (filename.includes('..')) {
        return res.status(400).send('Invalid filename');
    }

    const filePath = path.join(__dirname, '../../public/updates', filename);

    if (fs.existsSync(filePath)) {
        res.download(filePath);
    } else {
        res.status(404).json({ error: 'File not found' });
    }
});

module.exports = router;
