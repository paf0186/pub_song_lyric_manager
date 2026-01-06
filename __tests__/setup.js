const fs = require('fs');
const path = require('path');

// Test data file path (NODE_ENV is set in env.js)
const TEST_DATA_FILE = path.join(__dirname, '..', 'data', 'data.test.json');

// Clean up test data file before and after tests
beforeAll(() => {
    if (fs.existsSync(TEST_DATA_FILE)) {
        fs.unlinkSync(TEST_DATA_FILE);
    }
});

afterAll(() => {
    if (fs.existsSync(TEST_DATA_FILE)) {
        fs.unlinkSync(TEST_DATA_FILE);
    }
});
