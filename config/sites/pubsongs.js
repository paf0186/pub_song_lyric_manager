/**
 * Site configuration for Minnesota Shanty & Pub Sings
 */
module.exports = {
    // Site identity
    id: 'pubsongs',
    name: 'Minnesota Shanty & Pub Sings',
    shortName: 'MN Shanty & Pub Sings',
    tagline: 'Lyrics for singing along',

    // URL path prefix (e.g., '/pubsongs' means site is at /pubsongs/)
    // Use '' for root path
    basePath: '',

    // Data file location (relative to project root)
    dataFile: 'data/data.json',

    // Favicon path (relative to public directory, or null for none)
    favicon: null,

    // Theme colors (CSS variable overrides)
    // Set to null to use defaults from styles.css
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

    // Feature toggles
    features: {
        qrCodes: true,
        statistics: true,
        admin: true,
        search: true,
        print: true,
        download: true
    },

    // UI Labels (for internationalization or customization)
    labels: {
        allSongs: 'All Songs',
        songLists: 'Song Lists',
        home: 'Home',
        adminPanel: 'Admin Panel',
        searchPlaceholder: 'Search lyrics...',
        searchHint: "Don't know the title? Search with any lyrics!",
        shareThisPage: 'Share this page',
        shareThisList: 'Share this list',
        noSongsFound: 'No songs found',
        emptyCatalog: 'The catalog is empty. Head to the admin panel to add your first song!',
        emptyList: 'This list has no songs yet. Add songs from the admin panel.',
        print: 'Print',
        download: 'Download',
        copy: 'Copy',
        shareLink: 'Share Link',
        printAll: 'Print All',
        downloadAll: 'Download All'
    }
};
