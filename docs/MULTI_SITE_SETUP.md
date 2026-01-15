# Multi-Site Framework Setup Guide

This application supports running multiple independent sites from a single server instance. Each site can have its own branding, color scheme, and data.

## Quick Start

1. Copy `config/sites/demo.js.example` to `config/sites/yoursite.js`
2. Update the configuration with your branding
3. Set a unique `basePath` (e.g., `/yoursite`)
4. Create a data file at the path specified in `dataFile`
5. Restart the server

Your site will be accessible at `http://localhost:3000/yoursite/`

## Configuration Options

Each site configuration file exports an object with the following properties:

### Site Identity

```javascript
{
    // Unique identifier for this site (required)
    id: 'mysite',

    // Full name shown on home page and browser title
    name: 'My Lyrics Collection',

    // Short name shown in side menu header
    shortName: 'My Lyrics',

    // Tagline shown below the title on home page
    tagline: 'Your collection description',
}
```

### URL and Data

```javascript
{
    // URL path prefix - site will be at this path
    // Use '' (empty string) for root path (/)
    // Use '/mysite' for http://localhost:3000/mysite/
    basePath: '/mysite',

    // Data file location (relative to project root)
    // Each site can have its own separate data file
    dataFile: 'data/mysite-data.json',

    // Favicon path (relative to public directory)
    // Set to null for no favicon
    favicon: '/mysite-favicon.ico',
}
```

### Color Theming

Override the default colors for light and dark modes:

```javascript
{
    theme: {
        light: {
            primaryColor: '#4a7c9b',      // Main accent color
            primaryDark: '#3a6a87',       // Darker variant (hover states)
            primaryLight: '#e8f1f6',      // Lighter variant (backgrounds)
            secondaryColor: '#6889a0',    // Secondary accent
            successColor: '#4a9a6a',      // Success messages/buttons
            dangerColor: '#c45c5c'        // Error/delete buttons
        },
        dark: {
            primaryColor: '#6a9fc0',
            primaryDark: '#7ab0d0',
            primaryLight: '#2a3a48',
            secondaryColor: '#7a9ab5',
            successColor: '#5aaa7a',
            dangerColor: '#d06a6a'
        }
    }
}
```

### Feature Toggles

Enable or disable features per site:

```javascript
{
    features: {
        qrCodes: true,      // QR code generation for sharing
        statistics: true,   // Usage statistics display
        admin: true,        // Admin panel access
        search: true,       // Search functionality
        print: true,        // Print buttons
        download: true      // Download buttons
    }
}
```

### UI Labels

Customize text throughout the interface:

```javascript
{
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
}
```

## Example: Adding a Second Site

Here's a complete example of adding a poetry collection site:

### 1. Create the config file

Create `config/sites/poetry.js`:

```javascript
module.exports = {
    id: 'poetry',
    name: 'Poetry Collection',
    shortName: 'Poetry',
    tagline: 'Beautiful verses for every occasion',

    basePath: '/poetry',
    dataFile: 'data/poetry-data.json',
    favicon: null,

    theme: {
        light: {
            primaryColor: '#9b4a7c',      // Purple-pink
            primaryDark: '#873a6a',
            primaryLight: '#f6e8f1',
            secondaryColor: '#a06889',
            successColor: '#4a9a6a',
            dangerColor: '#c45c5c'
        },
        dark: {
            primaryColor: '#c06a9f',
            primaryDark: '#d07ab0',
            primaryLight: '#482a3a',
            secondaryColor: '#b57a9a',
            successColor: '#5aaa7a',
            dangerColor: '#d06a6a'
        }
    },

    features: {
        qrCodes: true,
        statistics: false,  // Disable stats for this site
        admin: true,
        search: true,
        print: true,
        download: true
    },

    labels: {
        allSongs: 'All Poems',
        songLists: 'Collections',
        home: 'Home',
        adminPanel: 'Admin',
        searchPlaceholder: 'Search poems...',
        searchHint: 'Search by title or any line',
        shareThisPage: 'Share this page',
        shareThisList: 'Share this collection',
        noSongsFound: 'No poems found',
        emptyCatalog: 'No poems yet. Add some from the admin panel!',
        emptyList: 'This collection is empty.',
        print: 'Print',
        download: 'Download',
        copy: 'Copy',
        shareLink: 'Share',
        printAll: 'Print All',
        downloadAll: 'Download All'
    }
};
```

### 2. Restart the server

```bash
npm start
```

### 3. Access your sites

- Original site: `http://localhost:3000/`
- Poetry site: `http://localhost:3000/poetry/`

Each site has its own:
- Admin panel (`/poetry/admin.html`)
- Song/poem catalog (`/poetry/catalog.html`)
- Lists/collections
- Data storage

## File Structure

```
pub_song_lyric_manager/
├── config/
│   ├── site-loader.js          # Site configuration loader
│   └── sites/
│       ├── pubsongs.js         # Main pub songs site config
│       ├── demo.js.example     # Example config template
│       └── poetry.js           # Your new site config
├── data/
│   ├── data.json               # Main site data
│   └── poetry-data.json        # Poetry site data
├── views/
│   ├── index.ejs               # Home page template
│   ├── catalog.ejs             # All songs page
│   ├── list.ejs                # Song list page
│   ├── admin.ejs               # Admin panel
│   └── partials/
│       ├── head.ejs            # Common head elements
│       └── side-menu.ejs       # Side menu component
└── public/
    ├── css/styles.css          # Shared styles
    └── js/
        ├── admin.js            # Admin functionality
        └── theme.js            # Theme toggle
```

## Notes

- The root site (basePath: '') will handle all requests that don't match other site paths
- Data files are created automatically on first access if they don't exist
- All sites share the same CSS and JavaScript files, but colors are overridden via the theme config
- Each site has independent admin credentials stored in its data file
