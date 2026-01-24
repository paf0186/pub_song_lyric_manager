const {
    loadSiteConfigs,
    getSiteByPath,
    generateThemeCSS,
    defaults
} = require('../config/site-loader');

describe('Site Loader', () => {
    describe('loadSiteConfigs', () => {
        test('loads site configs from sites directory', () => {
            const sites = loadSiteConfigs();
            expect(sites).toBeInstanceOf(Map);
            expect(sites.size).toBeGreaterThan(0);
        });

        test('applies defaults to loaded configs', () => {
            const sites = loadSiteConfigs();
            for (const [, config] of sites) {
                expect(config.theme).toBeDefined();
                expect(config.features).toBeDefined();
                expect(config.labels).toBeDefined();
            }
        });

        test('normalizes basePath with leading slash', () => {
            const sites = loadSiteConfigs();
            for (const [, config] of sites) {
                if (config.basePath) {
                    expect(config.basePath.startsWith('/')).toBe(true);
                    expect(config.basePath.endsWith('/')).toBe(false);
                }
            }
        });
    });

    describe('getSiteByPath', () => {
        let sites;

        beforeEach(() => {
            sites = new Map();
            sites.set('root', { id: 'root', basePath: '' });
            sites.set('pubsong', { id: 'pubsong', basePath: '/pubsong' });
            sites.set('community', { id: 'community', basePath: '/community_support' });
        });

        test('returns matching site for exact basePath', () => {
            const result = getSiteByPath(sites, '/pubsong');
            expect(result.id).toBe('pubsong');
        });

        test('returns matching site for path with prefix', () => {
            const result = getSiteByPath(sites, '/pubsong/catalog');
            expect(result.id).toBe('pubsong');
        });

        test('falls back to root site for unmatched path', () => {
            const result = getSiteByPath(sites, '/unknown/path');
            expect(result.id).toBe('root');
        });

        test('matches longer basePaths correctly', () => {
            const result = getSiteByPath(sites, '/community_support/admin');
            expect(result.id).toBe('community');
        });

        test('returns first site if no root site exists', () => {
            const noRootSites = new Map();
            noRootSites.set('site1', { id: 'site1', basePath: '/site1' });
            noRootSites.set('site2', { id: 'site2', basePath: '/site2' });

            const result = getSiteByPath(noRootSites, '/unknown');
            expect(result).toBeDefined();
        });
    });

    describe('generateThemeCSS', () => {
        test('returns empty string for null theme', () => {
            const css = generateThemeCSS(null);
            expect(css).toBe('');
        });

        test('generates CSS for light theme', () => {
            const theme = {
                light: {
                    primaryColor: '#ff0000',
                    primaryDark: '#cc0000'
                }
            };
            const css = generateThemeCSS(theme);
            expect(css).toContain(':root');
            expect(css).toContain('--primary-color: #ff0000');
            expect(css).toContain('--primary-dark: #cc0000');
        });

        test('generates CSS for dark theme', () => {
            const theme = {
                dark: {
                    primaryColor: '#00ff00',
                    successColor: '#00cc00'
                }
            };
            const css = generateThemeCSS(theme);
            expect(css).toContain(':root.dark-mode');
            expect(css).toContain('--primary-color: #00ff00');
            expect(css).toContain('--success-color: #00cc00');
        });

        test('generates CSS for both light and dark themes', () => {
            const theme = {
                light: { primaryColor: '#ff0000' },
                dark: { primaryColor: '#00ff00' }
            };
            const css = generateThemeCSS(theme);
            expect(css).toContain(':root');
            expect(css).toContain(':root.dark-mode');
            expect(css).toContain('@media (prefers-color-scheme: dark)');
        });

        test('includes all theme properties', () => {
            const css = generateThemeCSS(defaults.theme);
            expect(css).toContain('--primary-color');
            expect(css).toContain('--primary-dark');
            expect(css).toContain('--primary-light');
            expect(css).toContain('--secondary-color');
            expect(css).toContain('--success-color');
            expect(css).toContain('--danger-color');
        });
    });

    describe('defaults', () => {
        test('has expected structure', () => {
            expect(defaults.name).toBeDefined();
            expect(defaults.theme).toBeDefined();
            expect(defaults.theme.light).toBeDefined();
            expect(defaults.theme.dark).toBeDefined();
            expect(defaults.features).toBeDefined();
            expect(defaults.labels).toBeDefined();
        });
    });
});

