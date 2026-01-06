const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const QRCode = require('qrcode');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'data.json');

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
app.use(express.static('public'));

// Trust proxy headers (required for X-Forwarded-Proto, X-Forwarded-Prefix, etc.)
app.set('trust proxy', true);

// Ensure data directory and file exist
function ensureDataFile() {
    const dataDir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    if (!fs.existsSync(DATA_FILE)) {
        const initialData = {
            songs: [],
            lists: [],
            admin: {
                password: 'admin123'  // Simple password - change in production
            }
        };
        fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
    }
}

// Read data
function readData() {
    ensureDataFile();
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

// Write data
function writeData(data) {
    ensureDataFile();
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
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
    const data = readData();

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
            writeData(data);
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

// ============ SONG ROUTES ============

// Get all songs (sorted)
app.get('/api/songs', (req, res) => {
    const data = readData();
    res.json(sortSongs(data.songs));
});

// Get single song
app.get('/api/songs/:id', (req, res) => {
    const data = readData();
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

    const data = readData();
    const newSong = {
        id: generateId(),
        title: title.trim(),
        lyrics: lyrics.trim(),
        createdAt: new Date().toISOString()
    };

    data.songs.push(newSong);
    writeData(data);

    res.status(201).json(newSong);
});

// Update song
app.put('/api/songs/:id', (req, res) => {
    const { title, lyrics } = req.body;
    const data = readData();
    const index = data.songs.findIndex(s => s.id === req.params.id);

    if (index === -1) {
        return res.status(404).json({ error: 'Song not found' });
    }

    if (title) data.songs[index].title = title.trim();
    if (lyrics) data.songs[index].lyrics = lyrics.trim();
    data.songs[index].updatedAt = new Date().toISOString();

    writeData(data);
    res.json(data.songs[index]);
});

// Delete song
app.delete('/api/songs/:id', (req, res) => {
    const data = readData();
    const index = data.songs.findIndex(s => s.id === req.params.id);

    if (index === -1) {
        return res.status(404).json({ error: 'Song not found' });
    }

    // Also remove from all lists
    data.lists.forEach(list => {
        list.songIds = list.songIds.filter(id => id !== req.params.id);
    });

    data.songs.splice(index, 1);
    writeData(data);

    res.json({ success: true });
});

// ============ LIST ROUTES ============

// Get all lists
app.get('/api/lists', (req, res) => {
    const data = readData();
    res.json(data.lists);
});

// Get single list with songs
app.get('/api/lists/:id', (req, res) => {
    const data = readData();
    const list = data.lists.find(l => l.id === req.params.id);

    if (!list) {
        return res.status(404).json({ error: 'List not found' });
    }

    // Get full song data for the list
    const songs = list.songIds
        .map(id => data.songs.find(s => s.id === id))
        .filter(Boolean);

    res.json({
        ...list,
        songs: sortSongs(songs)
    });
});

// Create new list
app.post('/api/lists', (req, res) => {
    const { name, songIds } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'List name is required' });
    }

    const data = readData();
    const newList = {
        id: generateId(),
        name: name.trim(),
        songIds: songIds || [],
        createdAt: new Date().toISOString()
    };

    data.lists.push(newList);
    writeData(data);

    res.status(201).json(newList);
});

// Update list
app.put('/api/lists/:id', (req, res) => {
    const { name, songIds } = req.body;
    const data = readData();
    const index = data.lists.findIndex(l => l.id === req.params.id);

    if (index === -1) {
        return res.status(404).json({ error: 'List not found' });
    }

    if (name) data.lists[index].name = name.trim();
    if (songIds !== undefined) data.lists[index].songIds = songIds;
    data.lists[index].updatedAt = new Date().toISOString();

    writeData(data);
    res.json(data.lists[index]);
});

// Delete list
app.delete('/api/lists/:id', (req, res) => {
    const data = readData();
    const index = data.lists.findIndex(l => l.id === req.params.id);

    if (index === -1) {
        return res.status(404).json({ error: 'List not found' });
    }

    data.lists.splice(index, 1);
    writeData(data);

    res.json({ success: true });
});

// ============ QR CODE ROUTE ============

app.get('/api/qr/:listId', async (req, res) => {
    const protocol = req.protocol;
    const host = req.get('host');
    const basePath = process.env.BASE_PATH || req.get('x-forwarded-prefix') || '';
    let url;

    // Special case for home page
    if (req.params.listId === 'home') {
        url = `${protocol}://${host}${basePath}/`;
    } else if (req.params.listId === 'catalog') {
        // Special case for catalog page
        url = `${protocol}://${host}${basePath}/catalog.html`;
    } else {
        const data = readData();
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
        // Allow ~20% character errors (minimum 1)
        const maxDistance = Math.max(1, Math.floor(queryWord.length * 0.2));

        return textWords.some(textWord => {
            // Check substring containment first
            if (textWord.includes(queryWord) || queryWord.includes(textWord)) {
                return true;
            }
            // Then check Levenshtein distance
            return levenshteinDistance(queryWord, textWord) <= maxDistance;
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
    const data = readData();

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

// Serve main pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/list', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'list.html'));
});

// Start server only if not in test mode
if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        ensureDataFile();
        console.log(`Server running at http://localhost:${PORT}`);
        console.log(`Admin panel: http://localhost:${PORT}/admin`);
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
    // Constants
    DATA_FILE,
    MAX_ATTEMPTS,
    LOCKOUT_TIME
};
