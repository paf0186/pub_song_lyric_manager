# Song Lyrics Manager

A mobile-first web app for displaying and managing song lyrics collections.

## Setup (Mac with Homebrew)

1. **Install Node.js** (if not already installed):
   ```bash
   brew install node
   ```

2. **Clone and enter the repo**:
   ```bash
   git clone <repo-url>
   cd pub_song_lyric_manager
   ```

3. **Install dependencies**:
   ```bash
   npm install
   ```

4. **Start the server**:
   ```bash
   npm start
   ```

5. **Open in browser**:
   - Main page: http://localhost:3000
   - Admin panel: http://localhost:3000/admin.html

## Admin Login

Default password: `admin123`

(Change this in `data/data.json` for production use)

## Features

- Mobile-first responsive design
- Expandable song cards (accordion-style)
- Full-text search across lyrics
- Admin panel to add/edit/delete songs
- Create named song lists
- QR code generation for each list
- Library-style alphabetical sorting
