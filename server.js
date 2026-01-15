const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const QRCode = require('qrcode');
const { loadSiteConfigs, getSiteByPath, generateThemeCSS } = require('./config/site-loader');

const app = express();
const PORT = process.env.PORT || 3000;

// Load site configurations
const sites = loadSiteConfigs();

// Default data file (used for testing or fallback)
const DEFAULT_DATA_FILE = process.env.NODE_ENV === 'test'
    ? path.join(__dirname, 'data', 'data.test.json')
    : path.join(__dirname, 'data', 'data.json');

// Get data file for a site
function getDataFile(site) {
    if (!site || !site.dataFile) {
        return DEFAULT_DATA_FILE;
    }
    return path.join(__dirname, site.dataFile);
}

// Legacy DATA_FILE for backward compatibility with tests
const DATA_FILE = DEFAULT_DATA_FILE;

// Set up EJS as view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Rate limiting for login attempts
const loginAttempts = new Map();
const MAX_ATTEMPTS = 5;
const LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutes

function hashPassword(password, salt) {
    return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
}

function generateSalt() {
    return crypto.randomBytes(16).toString('hex');
}

function checkRateLimit(ip) {
    const now = Date.now();
    const attempts = loginAttempts.get(ip);

    if (!attempts) return { allowed: true };

    // Clean up old attempts
    if (now - attempts.firstAttempt > LOCKOUT_TIME) {
        loginAttempts.delete(ip);
        return { allowed: true };
    }

    if (attempts.count >= MAX_ATTEMPTS) {
        const remaining = Math.ceil((LOCKOUT_TIME - (now - attempts.firstAttempt)) / 1000 / 60);
        return { allowed: false, remaining };
    }

    return { allowed: true };
}

function recordFailedAttempt(ip) {
    const now = Date.now();
    const attempts = loginAttempts.get(ip);

    if (!attempts) {
        loginAttempts.set(ip, { count: 1, firstAttempt: now });
    } else {
        attempts.count++;
    }
}

// Middleware
app.use(express.json());

// Trust proxy headers (required for X-Forwarded-Proto, X-Forwarded-Prefix, etc.)
app.set('trust proxy', true);

// Site detection middleware - attaches site config to request
app.use((req, res, next) => {
    req.site = getSiteByPath(sites, req.path);
    // In test mode, always use the test data file
    if (process.env.NODE_ENV === 'test') {
        req.dataFile = DEFAULT_DATA_FILE;
    } else {
        req.dataFile = getDataFile(req.site);
    }
    next();
});

// Serve static files (CSS, JS, images)
app.use(express.static('public'));

// Ensure data directory and file exist
function ensureDataFile(dataFile = DATA_FILE) {
    const dataDir = path.dirname(dataFile);
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    if (!fs.existsSync(dataFile)) {
        const initialData = {
            songs: [],
            lists: [],
            admin: {
                password: 'admin123'  // Simple password - change in production
            },
            stats: {
                songViews: {},
                listViews: {}
            }
        };
        fs.writeFileSync(dataFile, JSON.stringify(initialData, null, 2));
    }
}

// Ensure stats structure exists in data
function ensureStats(data) {
    if (!data.stats) {
        data.stats = {
            songViews: {},
            listViews: {}
        };
    }
    if (!data.stats.songViews) data.stats.songViews = {};
    if (!data.stats.listViews) data.stats.listViews = {};
    return data;
}

// Read data
function readData(dataFile = DATA_FILE) {
    ensureDataFile(dataFile);
    return JSON.parse(fs.readFileSync(dataFile, 'utf8'));
}

// Write data
function writeData(data, dataFile = DATA_FILE) {
    ensureDataFile(dataFile);
    fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
}

// Library-style sorting (ignores articles like "The", "A", "An")
function librarySortKey(title) {
    const articles = /^(the|a|an)\s+/i;
    return title.replace(articles, '').toLowerCase();
}

function sortSongs(songs) {
    return [...songs].sort((a, b) =>
        librarySortKey(a.title).localeCompare(librarySortKey(b.title))
    );
}

// Generate unique ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// ============ AUTH ROUTES ============

app.post('/api/auth/login', (req, res) => {
    const ip = req.ip || req.connection.remoteAddress;
    const rateCheck = checkRateLimit(ip);

    if (!rateCheck.allowed) {
        return res.status(429).json({
            success: false,
            error: `Too many attempts. Try again in ${rateCheck.remaining} minutes.`
        });
    }

    const { password } = req.body;
    const data = readData(req.dataFile);

    // Support both hashed and plain text passwords for migration
    let isValid = false;
    if (data.admin.salt) {
        // Hashed password
        const hash = hashPassword(password, data.admin.salt);
        isValid = hash === data.admin.password;
    } else {
        // Plain text password (legacy) - migrate to hashed
        isValid = password === data.admin.password;
        if (isValid) {
            // Migrate to hashed password
            const salt = generateSalt();
            data.admin.salt = salt;
            data.admin.password = hashPassword(password, salt);
            writeData(data, req.dataFile);
        }
    }

    if (isValid) {
        loginAttempts.delete(ip); // Clear failed attempts on success
        res.json({ success: true, token: 'admin-token-' + Date.now() });
    } else {
        recordFailedAttempt(ip);
        res.status(401).json({ success: false, error: 'Invalid password' });
    }
});

app.post('/api/auth/change-password', (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({
            success: false,
            error: 'Current password and new password are required'
        });
    }

    if (newPassword.length < 6) {
        return res.status(400).json({
            success: false,
            error: 'New password must be at least 6 characters'
        });
    }

    const data = readData(req.dataFile);

    // Validate current password
    let isValid = false;
    if (data.admin.salt) {
        const hash = hashPassword(currentPassword, data.admin.salt);
        isValid = hash === data.admin.password;
    } else {
        isValid = currentPassword === data.admin.password;
    }

    if (!isValid) {
        return res.status(401).json({
            success: false,
            error: 'Current password is incorrect'
        });
    }

    // Set new password with new salt
    const salt = generateSalt();
    data.admin.salt = salt;
    data.admin.password = hashPassword(newPassword, salt);
    writeData(data, req.dataFile);

    res.json({ success: true, message: 'Password changed successfully' });
});

// ============ SONG ROUTES ============

// Get all songs (sorted)
app.get('/api/songs', (req, res) => {
    const data = readData(req.dataFile);
    res.json(sortSongs(data.songs));
});

// Get single song
app.get('/api/songs/:id', (req, res) => {
    const data = readData(req.dataFile);
    const song = data.songs.find(s => s.id === req.params.id);
    if (song) {
        res.json(song);
    } else {
        res.status(404).json({ error: 'Song not found' });
    }
});

// Add new song
app.post('/api/songs', (req, res) => {
    const { title, lyrics } = req.body;

    if (!title || !lyrics) {
        return res.status(400).json({ error: 'Title and lyrics are required' });
    }

    const data = readData(req.dataFile);
    const newSong = {
        id: generateId(),
        title: title.trim(),
        lyrics: lyrics.trim(),
        createdAt: new Date().toISOString()
    };

    data.songs.push(newSong);
    writeData(data, req.dataFile);

    res.status(201).json(newSong);
});

// Update song
app.put('/api/songs/:id', (req, res) => {
    const { title, lyrics } = req.body;
    const data = readData(req.dataFile);
    const index = data.songs.findIndex(s => s.id === req.params.id);

    if (index === -1) {
        return res.status(404).json({ error: 'Song not found' });
    }

    if (title) data.songs[index].title = title.trim();
    if (lyrics) data.songs[index].lyrics = lyrics.trim();
    data.songs[index].updatedAt = new Date().toISOString();

    writeData(data, req.dataFile);
    res.json(data.songs[index]);
});

// Delete song
app.delete('/api/songs/:id', (req, res) => {
    const data = readData(req.dataFile);
    const index = data.songs.findIndex(s => s.id === req.params.id);

    if (index === -1) {
        return res.status(404).json({ error: 'Song not found' });
    }

    // Also remove from all lists
    data.lists.forEach(list => {
        list.songIds = list.songIds.filter(id => id !== req.params.id);
    });

    data.songs.splice(index, 1);
    writeData(data, req.dataFile);

    res.json({ success: true });
});

// ============ LIST ROUTES ============

// Get all lists
app.get('/api/lists', (req, res) => {
    const data = readData(req.dataFile);
    res.json(data.lists);
});

// Get single list with songs
app.get('/api/lists/:id', (req, res) => {
    const data = readData(req.dataFile);
    const list = data.lists.find(l => l.id === req.params.id);

    if (!list) {
        return res.status(404).json({ error: 'List not found' });
    }

    // Get full song data for the list, preserving songIds order
    const songs = list.songIds
        .map(id => data.songs.find(s => s.id === id))
        .filter(Boolean);

    // Sort alphabetically unless useCustomOrder is true
    const orderedSongs = list.useCustomOrder ? songs : sortSongs(songs);

    res.json({
        ...list,
        songs: orderedSongs
    });
});

// Create new list
app.post('/api/lists', (req, res) => {
    const { name, songIds } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'List name is required' });
    }

    const data = readData(req.dataFile);
    const newList = {
        id: generateId(),
        name: name.trim(),
        songIds: songIds || [],
        createdAt: new Date().toISOString()
    };

    data.lists.push(newList);
    writeData(data, req.dataFile);

    res.status(201).json(newList);
});

// Update list
app.put('/api/lists/:id', (req, res) => {
    const { name, songIds, useCustomOrder } = req.body;
    const data = readData(req.dataFile);
    const index = data.lists.findIndex(l => l.id === req.params.id);

    if (index === -1) {
        return res.status(404).json({ error: 'List not found' });
    }

    if (name) data.lists[index].name = name.trim();
    if (songIds !== undefined) data.lists[index].songIds = songIds;
    if (useCustomOrder !== undefined) data.lists[index].useCustomOrder = useCustomOrder;
    data.lists[index].updatedAt = new Date().toISOString();

    writeData(data, req.dataFile);
    res.json(data.lists[index]);
});

// Delete list
app.delete('/api/lists/:id', (req, res) => {
    const data = readData(req.dataFile);
    const index = data.lists.findIndex(l => l.id === req.params.id);

    if (index === -1) {
        return res.status(404).json({ error: 'List not found' });
    }

    data.lists.splice(index, 1);
    writeData(data, req.dataFile);

    res.json({ success: true });
});

// ============ QR CODE ROUTE ============

app.get('/api/qr/:listId', async (req, res) => {
    const protocol = req.protocol;
    const host = req.get('host');
    // Use site basePath, fall back to env or header
    const basePath = (req.site && req.site.basePath) || process.env.BASE_PATH || req.get('x-forwarded-prefix') || '';
    let url;

    // Special case for home page
    if (req.params.listId === 'home') {
        url = `${protocol}://${host}${basePath}/`;
    } else if (req.params.listId === 'catalog') {
        // Special case for catalog page
        url = `${protocol}://${host}${basePath}/catalog.html`;
    } else {
        const data = readData(req.dataFile);
        const list = data.lists.find(l => l.id === req.params.listId);

        if (!list) {
            return res.status(404).json({ error: 'List not found' });
        }

        url = `${protocol}://${host}${basePath}/list.html?id=${list.id}`;
    }

    try {
        const qrDataUrl = await QRCode.toDataURL(url, {
            width: 300,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#ffffff'
            }
        });
        res.json({ qrCode: qrDataUrl, url });
    } catch (err) {
        res.status(500).json({ error: 'Failed to generate QR code' });
    }
});

// ============ SEARCH ROUTE ============

// Normalize whitespace - convert all whitespace (including newlines) to single spaces
function normalizeWhitespace(text) {
    return text.replace(/\s+/g, ' ').trim();
}

// Calculate Levenshtein distance between two strings
function levenshteinDistance(a, b) {
    const matrix = [];

    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    matrix[i][j - 1] + 1,     // insertion
                    matrix[i - 1][j] + 1      // deletion
                );
            }
        }
    }

    return matrix[b.length][a.length];
}

// Check if text contains a fuzzy match for the query
function fuzzyMatch(text, query) {
    const normalizedText = normalizeWhitespace(text).toLowerCase();
    const normalizedQuery = normalizeWhitespace(query).toLowerCase();

    // First check for exact substring match
    if (normalizedText.includes(normalizedQuery)) {
        return true;
    }

    // For short queries (1-2 chars), require exact match
    if (normalizedQuery.length <= 2) {
        return false;
    }

    // Split query into words for multi-word fuzzy matching
    const queryWords = normalizedQuery.split(' ').filter(w => w.length > 0);
    const textWords = normalizedText.split(' ').filter(w => w.length > 0);

    // Each query word should fuzzy match at least one text word
    return queryWords.every(queryWord => {
        // Allow ~15% character errors for fuzzy matching
        const maxDistance = Math.max(1, Math.floor(queryWord.length * 0.15));

        return textWords.some(textWord => {
            // Check if text word contains the query (e.g., "paradise" contains "para")
            if (textWord.includes(queryWord)) {
                return true;
            }

            // For fuzzy matching, only match words of similar length to avoid
            // matching very short words (prevents "apple" from matching "a")
            const lengthDiff = Math.abs(textWord.length - queryWord.length);
            if (lengthDiff <= 2) {
                // Check Levenshtein distance for typos
                return levenshteinDistance(queryWord, textWord) <= maxDistance;
            }

            return false;
        });
    });
}

// Check for exact match (used when query is in quotes)
function exactMatch(text, query) {
    const normalizedText = normalizeWhitespace(text).toLowerCase();
    const normalizedQuery = normalizeWhitespace(query).toLowerCase();
    return normalizedText.includes(normalizedQuery);
}

// Parse search query - detect quoted exact searches
function parseSearchQuery(query) {
    const exactMatch = query.match(/^"(.+)"$/);
    if (exactMatch) {
        return { type: 'exact', term: exactMatch[1] };
    }
    return { type: 'fuzzy', term: query };
}

app.get('/api/search', (req, res) => {
    const { q, listId } = req.query;
    const data = readData(req.dataFile);

    let songs = data.songs;

    // If listId provided, filter to that list's songs
    if (listId) {
        const list = data.lists.find(l => l.id === listId);
        if (list) {
            songs = songs.filter(s => list.songIds.includes(s.id));
        }
    }

    // Search filter
    if (q) {
        const { type, term } = parseSearchQuery(q);

        if (type === 'exact') {
            // Exact search (quoted) - handles newlines via normalization
            songs = songs.filter(s =>
                exactMatch(s.title, term) ||
                exactMatch(s.lyrics, term)
            );
        } else {
            // Fuzzy search (default)
            songs = songs.filter(s =>
                fuzzyMatch(s.title, term) ||
                fuzzyMatch(s.lyrics, term)
            );
        }
    }

    res.json(sortSongs(songs));
});

// ============ STATS ROUTES ============

// Track song view
app.post('/api/stats/song/:id', (req, res) => {
    const data = readData(req.dataFile);
    ensureStats(data);

    const songId = req.params.id;
    if (!data.songs.find(s => s.id === songId)) {
        return res.status(404).json({ error: 'Song not found' });
    }

    if (!data.stats.songViews[songId]) {
        data.stats.songViews[songId] = 0;
    }
    data.stats.songViews[songId]++;

    writeData(data, req.dataFile);
    res.json({ success: true, views: data.stats.songViews[songId] });
});

// Track list view
app.post('/api/stats/list/:id', (req, res) => {
    const data = readData(req.dataFile);
    ensureStats(data);

    const listId = req.params.id;
    if (!data.lists.find(l => l.id === listId)) {
        return res.status(404).json({ error: 'List not found' });
    }

    if (!data.stats.listViews[listId]) {
        data.stats.listViews[listId] = 0;
    }
    data.stats.listViews[listId]++;

    writeData(data, req.dataFile);
    res.json({ success: true, views: data.stats.listViews[listId] });
});

// Get all stats
app.get('/api/stats', (req, res) => {
    const data = readData(req.dataFile);
    ensureStats(data);

    // Get top songs and lists
    const topSongs = Object.entries(data.stats.songViews)
        .map(([id, views]) => ({
            song: data.songs.find(s => s.id === id),
            views
        }))
        .filter(item => item.song)
        .sort((a, b) => b.views - a.views)
        .slice(0, 10);

    const topLists = Object.entries(data.stats.listViews)
        .map(([id, views]) => ({
            list: data.lists.find(l => l.id === id),
            views
        }))
        .filter(item => item.list)
        .sort((a, b) => b.views - a.views)
        .slice(0, 10);

    res.json({
        totalSongs: data.songs.length,
        totalLists: data.lists.length,
        totalSongViews: Object.values(data.stats.songViews).reduce((a, b) => a + b, 0),
        totalListViews: Object.values(data.stats.listViews).reduce((a, b) => a + b, 0),
        topSongs,
        topLists
    });
});

// Helper to render pages with site config
function renderPage(res, template, site, extraData = {}) {
    const themeCSS = generateThemeCSS(site.theme);
    res.render(template, {
        site,
        themeCSS,
        ...extraData
    });
}

// Serve main pages - these need to come after API routes
// Root/index page
app.get('/', (req, res) => {
    renderPage(res, 'index', req.site);
});

// Also handle index.html explicitly
app.get('/index.html', (req, res) => {
    renderPage(res, 'index', req.site);
});

// Catalog page
app.get('/catalog.html', (req, res) => {
    renderPage(res, 'catalog', req.site);
});

// List page
app.get('/list.html', (req, res) => {
    renderPage(res, 'list', req.site);
});

// Admin page
app.get('/admin.html', (req, res) => {
    renderPage(res, 'admin', req.site);
});

// Legacy routes (without .html)
app.get('/admin', (req, res) => {
    renderPage(res, 'admin', req.site);
});

app.get('/list', (req, res) => {
    renderPage(res, 'list', req.site);
});

app.get('/catalog', (req, res) => {
    renderPage(res, 'catalog', req.site);
});

// Start server only if not in test mode
if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        // Ensure data files exist for all sites
        for (const [, site] of sites) {
            const dataFile = getDataFile(site);
            ensureDataFile(dataFile);
        }

        console.log(`Server running at http://localhost:${PORT}`);
        console.log('\nConfigured sites:');
        for (const [, site] of sites) {
            const sitePath = site.basePath || '/';
            console.log(`  - ${site.name}: http://localhost:${PORT}${sitePath}`);
        }
    });
}

// Export for testing
module.exports = {
    app,
    // Utility functions
    normalizeWhitespace,
    levenshteinDistance,
    fuzzyMatch,
    exactMatch,
    parseSearchQuery,
    librarySortKey,
    sortSongs,
    generateId,
    hashPassword,
    generateSalt,
    checkRateLimit,
    recordFailedAttempt,
    loginAttempts,
    // Data functions
    readData,
    writeData,
    ensureDataFile,
    ensureStats,
    getDataFile,
    // Site configuration
    sites,
    // Constants
    DATA_FILE,
    DEFAULT_DATA_FILE,
    MAX_ATTEMPTS,
    LOCKOUT_TIME
};
