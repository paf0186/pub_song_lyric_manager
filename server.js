const express = require('express');
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'data.json');

// Middleware
app.use(express.json());
app.use(express.static('public'));

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
    const { password } = req.body;
    const data = readData();

    if (password === data.admin.password) {
        res.json({ success: true, token: 'admin-token-' + Date.now() });
    } else {
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
    const data = readData();
    const list = data.lists.find(l => l.id === req.params.listId);

    if (!list) {
        return res.status(404).json({ error: 'List not found' });
    }

    // Get the host from the request or use a default
    const protocol = req.protocol;
    const host = req.get('host');
    const url = `${protocol}://${host}/list.html?id=${list.id}`;

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
        const searchTerm = q.toLowerCase();
        songs = songs.filter(s =>
            s.title.toLowerCase().includes(searchTerm) ||
            s.lyrics.toLowerCase().includes(searchTerm)
        );
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

// Start server
app.listen(PORT, () => {
    ensureDataFile();
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Admin panel: http://localhost:${PORT}/admin`);
});
