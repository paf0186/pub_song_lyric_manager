module.exports = {
    testEnvironment: 'node',
    setupFiles: ['<rootDir>/__tests__/env.js'],
    setupFilesAfterEnv: ['<rootDir>/__tests__/setup.js'],
    testMatch: ['**/__tests__/**/*.test.js'],
    // Run tests sequentially to avoid race conditions with shared data file
    maxWorkers: 1,
    collectCoverageFrom: [
        'server.js',
        'config/site-loader.js',
        '!node_modules/**',
        '!coverage/**'
    ],
    coverageThreshold: {
        global: {
            branches: 70,
            functions: 80,
            lines: 80,
            statements: 80
        }
    },
    verbose: true
};
