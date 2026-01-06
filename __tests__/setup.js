const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'data.json');
const BACKUP_FILE = path.join(__dirname, '..', 'data', 'data.backup.json');

// Backup original data before tests
beforeAll(() => {
    if (fs.existsSync(DATA_FILE)) {
        fs.copyFileSync(DATA_FILE, BACKUP_FILE);
    }
});

// Restore original data after all tests
afterAll(() => {
    if (fs.existsSync(BACKUP_FILE)) {
        fs.copyFileSync(BACKUP_FILE, DATA_FILE);
        fs.unlinkSync(BACKUP_FILE);
    }
});

// Set test environment
process.env.NODE_ENV = 'test';
