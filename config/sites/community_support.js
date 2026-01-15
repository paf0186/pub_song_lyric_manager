/**
 * Site configuration for Community Support
 * Accessible at https://mulberrytree.us/community_support/
 */
module.exports = {
    // Site identity
    id: 'community_support',
    name: 'Community Support',
    shortName: 'Community',
    tagline: 'Resources and assistance for our community',

    // URL path prefix - must match nginx location
    basePath: '/community_support',

    // Data file location (relative to project root)
    dataFile: 'data/community_support-data.json',

    // Favicon path (relative to public directory, or null for none)
    favicon: null,

    // Theme colors - warm, welcoming colors
    theme: {
        light: {
            primaryColor: '#2e7d32',      // Green - supportive, growth
            primaryDark: '#1b5e20',
            primaryLight: '#e8f5e9',
            secondaryColor: '#558b2f',
            successColor: '#43a047',
            dangerColor: '#c62828'
        },
        dark: {
            primaryColor: '#66bb6a',
            primaryDark: '#81c784',
            primaryLight: '#1b3d1c',
            secondaryColor: '#8bc34a',
            successColor: '#69f0ae',
            dangerColor: '#ef5350'
        }
    },

    // Feature toggles
    features: {
        qrCodes: true,
        statistics: false,
        admin: true,
        search: true,
        print: true,
        download: true
    },

    // UI Labels - customized for community support context
    labels: {
        allSongs: 'All Resources',
        songLists: 'Resource Categories',
        home: 'Home',
        adminPanel: 'Admin Panel',
        searchPlaceholder: 'Search resources...',
        searchHint: 'Search by keyword or topic',
        shareThisPage: 'Share this page',
        shareThisList: 'Share this category',
        noSongsFound: 'No resources found',
        emptyCatalog: 'No resources yet. Add some from the admin panel!',
        emptyList: 'This category has no resources yet.',
        print: 'Print',
        download: 'Download',
        copy: 'Copy',
        shareLink: 'Share Link',
        printAll: 'Print All',
        downloadAll: 'Download All'
    }
};

