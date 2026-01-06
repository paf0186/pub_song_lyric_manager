const request = require('supertest');
const fs = require('fs');
const { app, DATA_FILE, loginAttempts } = require('../server');

// Helper to set up clean test data
function setupTestData(data = null) {
    const defaultData = {
        songs: [
            { id: 'song1', title: 'Apple Tree Wassail', lyrics: 'Old apple tree we wassail thee' },
            { id: 'song2', title: 'The Bells of Norwich', lyrics: 'All shall be well' },
            { id: 'song3', title: 'Chariots', lyrics: 'Swing low\nsweet chariots' }
        ],
        lists: [
            { id: 'list1', name: 'Christmas Songs', songIds: ['song1', 'song3'] }
        ],
        admin: {
            password: 'testpass123'
        }
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(data || defaultData, null, 2));
}

describe('Songs API', () => {
    beforeEach(() => {
        setupTestData();
        loginAttempts.clear();
    });

    describe('GET /api/songs', () => {
        test('returns all songs sorted alphabetically', async () => {
            const res = await request(app).get('/api/songs');
            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(3);
            // Should be sorted: Apple Tree, Bells of Norwich (ignores The), Chariots
            expect(res.body[0].title).toBe('Apple Tree Wassail');
            expect(res.body[1].title).toBe('The Bells of Norwich');
            expect(res.body[2].title).toBe('Chariots');
        });
    });

    describe('GET /api/songs/:id', () => {
        test('returns single song by ID', async () => {
            const res = await request(app).get('/api/songs/song1');
            expect(res.status).toBe(200);
            expect(res.body.title).toBe('Apple Tree Wassail');
        });

        test('returns 404 for non-existent song', async () => {
            const res = await request(app).get('/api/songs/nonexistent');
            expect(res.status).toBe(404);
        });
    });

    describe('POST /api/songs', () => {
        test('creates new song', async () => {
            const res = await request(app)
                .post('/api/songs')
                .send({ title: 'New Song', lyrics: 'New lyrics' });

            expect(res.status).toBe(201);
            expect(res.body.title).toBe('New Song');
            expect(res.body.lyrics).toBe('New lyrics');
            expect(res.body.id).toBeDefined();
        });

        test('requires title', async () => {
            const res = await request(app)
                .post('/api/songs')
                .send({ lyrics: 'Only lyrics' });

            expect(res.status).toBe(400);
        });

        test('requires lyrics', async () => {
            const res = await request(app)
                .post('/api/songs')
                .send({ title: 'Only title' });

            expect(res.status).toBe(400);
        });

        test('trims whitespace from title and lyrics', async () => {
            const res = await request(app)
                .post('/api/songs')
                .send({ title: '  Trimmed Title  ', lyrics: '  Trimmed lyrics  ' });

            expect(res.status).toBe(201);
            expect(res.body.title).toBe('Trimmed Title');
            expect(res.body.lyrics).toBe('Trimmed lyrics');
        });
    });

    describe('PUT /api/songs/:id', () => {
        test('updates existing song', async () => {
            const res = await request(app)
                .put('/api/songs/song1')
                .send({ title: 'Updated Title', lyrics: 'Updated lyrics' });

            expect(res.status).toBe(200);
            expect(res.body.title).toBe('Updated Title');
            expect(res.body.updatedAt).toBeDefined();
        });

        test('returns 404 for non-existent song', async () => {
            const res = await request(app)
                .put('/api/songs/nonexistent')
                .send({ title: 'Updated' });

            expect(res.status).toBe(404);
        });
    });

    describe('DELETE /api/songs/:id', () => {
        test('deletes song', async () => {
            const res = await request(app).delete('/api/songs/song1');
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);

            // Verify deletion
            const getRes = await request(app).get('/api/songs/song1');
            expect(getRes.status).toBe(404);
        });

        test('removes song from lists when deleted', async () => {
            await request(app).delete('/api/songs/song1');

            const listRes = await request(app).get('/api/lists/list1');
            expect(listRes.body.songIds).not.toContain('song1');
        });

        test('returns 404 for non-existent song', async () => {
            const res = await request(app).delete('/api/songs/nonexistent');
            expect(res.status).toBe(404);
        });
    });
});

describe('Lists API', () => {
    beforeEach(() => {
        setupTestData();
    });

    describe('GET /api/lists', () => {
        test('returns all lists', async () => {
            const res = await request(app).get('/api/lists');
            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(1);
            expect(res.body[0].name).toBe('Christmas Songs');
        });
    });

    describe('GET /api/lists/:id', () => {
        test('returns list with songs', async () => {
            const res = await request(app).get('/api/lists/list1');
            expect(res.status).toBe(200);
            expect(res.body.name).toBe('Christmas Songs');
            expect(res.body.songs).toHaveLength(2);
        });

        test('returns songs sorted alphabetically', async () => {
            const res = await request(app).get('/api/lists/list1');
            expect(res.body.songs[0].title).toBe('Apple Tree Wassail');
            expect(res.body.songs[1].title).toBe('Chariots');
        });

        test('returns 404 for non-existent list', async () => {
            const res = await request(app).get('/api/lists/nonexistent');
            expect(res.status).toBe(404);
        });
    });

    describe('POST /api/lists', () => {
        test('creates new list', async () => {
            const res = await request(app)
                .post('/api/lists')
                .send({ name: 'New List', songIds: ['song1'] });

            expect(res.status).toBe(201);
            expect(res.body.name).toBe('New List');
            expect(res.body.songIds).toContain('song1');
        });

        test('requires name', async () => {
            const res = await request(app)
                .post('/api/lists')
                .send({ songIds: ['song1'] });

            expect(res.status).toBe(400);
        });

        test('allows empty songIds', async () => {
            const res = await request(app)
                .post('/api/lists')
                .send({ name: 'Empty List' });

            expect(res.status).toBe(201);
            expect(res.body.songIds).toEqual([]);
        });
    });

    describe('PUT /api/lists/:id', () => {
        test('updates list name', async () => {
            const res = await request(app)
                .put('/api/lists/list1')
                .send({ name: 'Updated Name' });

            expect(res.status).toBe(200);
            expect(res.body.name).toBe('Updated Name');
        });

        test('updates list songs', async () => {
            const res = await request(app)
                .put('/api/lists/list1')
                .send({ songIds: ['song2'] });

            expect(res.status).toBe(200);
            expect(res.body.songIds).toEqual(['song2']);
        });

        test('returns 404 for non-existent list', async () => {
            const res = await request(app)
                .put('/api/lists/nonexistent')
                .send({ name: 'Updated' });

            expect(res.status).toBe(404);
        });
    });

    describe('DELETE /api/lists/:id', () => {
        test('deletes list', async () => {
            const res = await request(app).delete('/api/lists/list1');
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });

        test('returns 404 for non-existent list', async () => {
            const res = await request(app).delete('/api/lists/nonexistent');
            expect(res.status).toBe(404);
        });
    });
});

describe('Search API', () => {
    beforeEach(() => {
        setupTestData();
    });

    describe('GET /api/search', () => {
        test('returns all songs when no query', async () => {
            const res = await request(app).get('/api/search');
            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(3);
        });

        test('searches by title', async () => {
            const res = await request(app).get('/api/search?q=apple');
            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(1);
            expect(res.body[0].title).toBe('Apple Tree Wassail');
        });

        test('searches by lyrics', async () => {
            const res = await request(app).get('/api/search?q=wassail');
            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(1);
        });

        test('handles fuzzy matching with typos', async () => {
            const res = await request(app).get('/api/search?q=chariot');
            expect(res.status).toBe(200);
            expect(res.body.length).toBeGreaterThan(0);
        });

        test('handles exact search with quotes', async () => {
            const res = await request(app).get('/api/search?q="All shall be well"');
            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(1);
            expect(res.body[0].title).toBe('The Bells of Norwich');
        });

        test('handles search spanning newlines', async () => {
            const res = await request(app).get('/api/search?q="Swing low sweet"');
            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(1);
            expect(res.body[0].title).toBe('Chariots');
        });

        test('filters by listId', async () => {
            const res = await request(app).get('/api/search?listId=list1');
            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(2);
        });

        test('combines search query with listId filter', async () => {
            const res = await request(app).get('/api/search?q=apple&listId=list1');
            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(1);
        });

        test('returns empty array for no matches', async () => {
            const res = await request(app).get('/api/search?q=xyznonexistent');
            expect(res.status).toBe(200);
            expect(res.body).toEqual([]);
        });
    });
});

describe('QR Code API', () => {
    beforeEach(() => {
        setupTestData();
    });

    describe('GET /api/qr/:listId', () => {
        test('generates QR code for list', async () => {
            const res = await request(app).get('/api/qr/list1');
            expect(res.status).toBe(200);
            expect(res.body.qrCode).toBeDefined();
            expect(res.body.qrCode).toMatch(/^data:image\/png;base64,/);
            expect(res.body.url).toContain('list.html?id=list1');
        });

        test('generates QR code for catalog', async () => {
            const res = await request(app).get('/api/qr/catalog');
            expect(res.status).toBe(200);
            expect(res.body.url).toContain('catalog.html');
        });

        test('generates QR code for home', async () => {
            const res = await request(app).get('/api/qr/home');
            expect(res.status).toBe(200);
            expect(res.body.url).toMatch(/\/$/);
        });

        test('returns 404 for non-existent list', async () => {
            const res = await request(app).get('/api/qr/nonexistent');
            expect(res.status).toBe(404);
        });
    });
});

describe('Auth API', () => {
    beforeEach(() => {
        setupTestData();
        loginAttempts.clear();
    });

    describe('POST /api/auth/login', () => {
        test('accepts correct password', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({ password: 'testpass123' });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.token).toBeDefined();
        });

        test('rejects incorrect password', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({ password: 'wrongpassword' });

            expect(res.status).toBe(401);
            expect(res.body.success).toBe(false);
        });

        test('rate limits after max attempts', async () => {
            // Make MAX_ATTEMPTS failed attempts
            for (let i = 0; i < 5; i++) {
                await request(app)
                    .post('/api/auth/login')
                    .send({ password: 'wrongpassword' });
            }

            // Next attempt should be rate limited
            const res = await request(app)
                .post('/api/auth/login')
                .send({ password: 'testpass123' });

            expect(res.status).toBe(429);
        });

        test('migrates plain text password to hashed on successful login', async () => {
            // First login with plain text password
            await request(app)
                .post('/api/auth/login')
                .send({ password: 'testpass123' });

            // Check that password is now hashed in data file
            const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
            expect(data.admin.salt).toBeDefined();
            expect(data.admin.password).not.toBe('testpass123');

            // Should still be able to login
            loginAttempts.clear();
            const res = await request(app)
                .post('/api/auth/login')
                .send({ password: 'testpass123' });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });
    });
});

describe('Static Routes', () => {
    test('serves home page', async () => {
        const res = await request(app).get('/');
        expect(res.status).toBe(200);
        expect(res.type).toMatch(/html/);
    });

    test('serves admin page', async () => {
        const res = await request(app).get('/admin');
        expect(res.status).toBe(200);
        expect(res.type).toMatch(/html/);
    });

    test('serves list page', async () => {
        const res = await request(app).get('/list');
        expect(res.status).toBe(200);
        expect(res.type).toMatch(/html/);
    });
});
