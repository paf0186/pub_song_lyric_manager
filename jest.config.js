module.exports = {
    testEnvironment: 'node',
    setupFiles: ['<rootDir>/__tests__/env.js'],
    setupFilesAfterEnv: ['<rootDir>/__tests__/setup.js'],
    testMatch: ['**/__tests__/**/*.test.js'],
    collectCoverageFrom: [
        'server.js',
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
