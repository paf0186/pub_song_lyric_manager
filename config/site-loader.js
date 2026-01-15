/**
 * Site Configuration Loader
 *
 * Loads and manages site configurations for multi-site support.
 * Each site can have its own branding, colors, and data file.
 */
const fs = require('fs');
const path = require('path');

// Default configuration values
const defaults = {
    name: 'My Site',
    shortName: 'My Site',
    tagline: 'Welcome',
    basePath: '',
    dataFile: 'data/data.json',
    favicon: null,
    theme: {
        light: {
            primaryColor: '#4a7c9b',
            primaryDark: '#3a6a87',
            primaryLight: '#e8f1f6',
            secondaryColor: '#6889a0',
            successColor: '#4a9a6a',
            dangerColor: '#c45c5c'
        },
        dark: {
            primaryColor: '#6a9fc0',
            primaryDark: '#7ab0d0',
            primaryLight: '#2a3a48',
            secondaryColor: '#7a9ab5',
            successColor: '#5aaa7a',
            dangerColor: '#d06a6a'
        }
    },
    features: {
        qrCodes: true,
        statistics: true,
        admin: true,
        search: true,
        print: true,
        download: true
    },
    labels: {
        allSongs: 'All Songs',
        songLists: 'Song Lists',
        home: 'Home',
        adminPanel: 'Admin Panel',
        searchPlaceholder: 'Search...',
        searchHint: 'Search by title or content',
        shareThisPage: 'Share this page',
        shareThisList: 'Share this list',
        noSongsFound: 'No items found',
        emptyCatalog: 'No items yet.',
        emptyList: 'This list is empty.',
        print: 'Print',
        download: 'Download',
        copy: 'Copy',
        shareLink: 'Share Link',
        printAll: 'Print All',
        downloadAll: 'Download All'
    }
};

/**
 * Deep merge two objects
 */
function deepMerge(target, source) {
    const result = { ...target };
    for (const key of Object.keys(source)) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
            result[key] = deepMerge(target[key] || {}, source[key]);
        } else {
            result[key] = source[key];
        }
    }
    return result;
}

/**
 * Load all site configurations from the sites directory
 */
function loadSiteConfigs() {
    const sitesDir = path.join(__dirname, 'sites');
    const sites = new Map();

    if (!fs.existsSync(sitesDir)) {
        console.warn('Sites directory not found:', sitesDir);
        return sites;
    }

    const files = fs.readdirSync(sitesDir).filter(f => f.endsWith('.js'));

    for (const file of files) {
        try {
            const config = require(path.join(sitesDir, file));
            const mergedConfig = deepMerge(defaults, config);

            // Normalize basePath (ensure no trailing slash, but keep leading slash if present)
            if (mergedConfig.basePath && mergedConfig.basePath !== '/') {
                mergedConfig.basePath = mergedConfig.basePath.replace(/\/$/, '');
                if (!mergedConfig.basePath.startsWith('/')) {
                    mergedConfig.basePath = '/' + mergedConfig.basePath;
                }
            } else {
                mergedConfig.basePath = '';
            }

            sites.set(mergedConfig.id, mergedConfig);
            console.log(`Loaded site config: ${mergedConfig.id} (${mergedConfig.basePath || '/'})`);
        } catch (err) {
            console.error(`Error loading site config ${file}:`, err.message);
        }
    }

    return sites;
}

/**
 * Get site config by request path
 */
function getSiteByPath(sites, requestPath) {
    // First, try to match by basePath prefix
    for (const [, config] of sites) {
        if (config.basePath && requestPath.startsWith(config.basePath + '/')) {
            return config;
        }
        if (config.basePath && requestPath === config.basePath) {
            return config;
        }
    }

    // Fall back to root site (basePath === '')
    for (const [, config] of sites) {
        if (!config.basePath || config.basePath === '') {
            return config;
        }
    }

    // Return first site if no root site
    return sites.values().next().value;
}

/**
 * Generate CSS variable overrides from theme config
 */
function generateThemeCSS(theme) {
    if (!theme) return '';

    let css = '';

    if (theme.light) {
        css += ':root {\n';
        if (theme.light.primaryColor) css += `    --primary-color: ${theme.light.primaryColor};\n`;
        if (theme.light.primaryDark) css += `    --primary-dark: ${theme.light.primaryDark};\n`;
        if (theme.light.primaryLight) css += `    --primary-light: ${theme.light.primaryLight};\n`;
        if (theme.light.secondaryColor) css += `    --secondary-color: ${theme.light.secondaryColor};\n`;
        if (theme.light.successColor) css += `    --success-color: ${theme.light.successColor};\n`;
        if (theme.light.dangerColor) css += `    --danger-color: ${theme.light.dangerColor};\n`;
        css += '}\n';
    }

    if (theme.dark) {
        css += ':root.dark-mode {\n';
        if (theme.dark.primaryColor) css += `    --primary-color: ${theme.dark.primaryColor};\n`;
        if (theme.dark.primaryDark) css += `    --primary-dark: ${theme.dark.primaryDark};\n`;
        if (theme.dark.primaryLight) css += `    --primary-light: ${theme.dark.primaryLight};\n`;
        if (theme.dark.secondaryColor) css += `    --secondary-color: ${theme.dark.secondaryColor};\n`;
        if (theme.dark.successColor) css += `    --success-color: ${theme.dark.successColor};\n`;
        if (theme.dark.dangerColor) css += `    --danger-color: ${theme.dark.dangerColor};\n`;
        css += '}\n';

        // Also for auto dark mode
        css += '@media (prefers-color-scheme: dark) {\n';
        css += '    :root:not(.light-mode):not(.dark-mode) {\n';
        if (theme.dark.primaryColor) css += `        --primary-color: ${theme.dark.primaryColor};\n`;
        if (theme.dark.primaryDark) css += `        --primary-dark: ${theme.dark.primaryDark};\n`;
        if (theme.dark.primaryLight) css += `        --primary-light: ${theme.dark.primaryLight};\n`;
        if (theme.dark.secondaryColor) css += `        --secondary-color: ${theme.dark.secondaryColor};\n`;
        if (theme.dark.successColor) css += `        --success-color: ${theme.dark.successColor};\n`;
        if (theme.dark.dangerColor) css += `        --danger-color: ${theme.dark.dangerColor};\n`;
        css += '    }\n';
        css += '}\n';
    }

    return css;
}

module.exports = {
    loadSiteConfigs,
    getSiteByPath,
    generateThemeCSS,
    defaults
};
