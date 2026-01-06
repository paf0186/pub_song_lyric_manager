// Main page JavaScript

let songs = [];
let expandedCardId = null;

// DOM Elements
const menuBtn = document.getElementById('menuBtn');
const sideMenu = document.getElementById('sideMenu');
const menuOverlay = document.getElementById('menuOverlay');
const menuItems = document.getElementById('menuItems');
const searchInput = document.getElementById('searchInput');
const songList = document.getElementById('songList');
const emptyState = document.getElementById('emptyState');
const toastContainer = document.getElementById('toastContainer');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadSongs();
    loadMenuLists();
    setupEventListeners();
});

// Event Listeners
function setupEventListeners() {
    menuBtn.addEventListener('click', toggleMenu);
    menuOverlay.addEventListener('click', closeMenu);
    searchInput.addEventListener('input', debounce(handleSearch, 300));

    // Close menu on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeMenu();
    });
}

// Menu functions
function toggleMenu() {
    sideMenu.classList.toggle('active');
    menuOverlay.classList.toggle('active');
}

function closeMenu() {
    sideMenu.classList.remove('active');
    menuOverlay.classList.remove('active');
}

// Load songs from API
async function loadSongs() {
    try {
        const response = await fetch('/api/songs');
        songs = await response.json();
        renderSongs(songs);
    } catch (error) {
        console.error('Error loading songs:', error);
        showToast('Failed to load songs', 'error');
    }
}

// Load lists for menu
async function loadMenuLists() {
    try {
        const response = await fetch('/api/lists');
        const lists = await response.json();
        renderMenuLists(lists);
    } catch (error) {
        console.error('Error loading lists:', error);
    }
}

// Render menu lists
function renderMenuLists(lists) {
    const listSection = menuItems.querySelector('.menu-section-title');

    // Remove existing list items (keep the section title)
    const existingItems = menuItems.querySelectorAll('.menu-item.list-link');
    existingItems.forEach(item => item.remove());

    // Add list links after the section title
    lists.forEach(list => {
        const link = document.createElement('a');
        link.href = `/list.html?id=${list.id}`;
        link.className = 'menu-item list-link';
        link.textContent = list.name;
        listSection.after(link);
    });
}

// Render songs
function renderSongs(songsToRender) {
    if (songsToRender.length === 0) {
        songList.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';

    songList.innerHTML = songsToRender.map(song => `
        <div class="song-card${expandedCardId === song.id ? ' expanded' : ''}" data-id="${song.id}">
            <div class="song-header" onclick="toggleCard('${song.id}')">
                <span class="song-title">${escapeHtml(song.title)}</span>
                <svg class="expand-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
            </div>
            <div class="song-lyrics">
                <div class="lyrics-content">${escapeHtml(song.lyrics)}</div>
            </div>
        </div>
    `).join('');
}

// Toggle card expansion
function toggleCard(id) {
    const previousId = expandedCardId;

    // If clicking the same card, close it
    if (expandedCardId === id) {
        expandedCardId = null;
    } else {
        expandedCardId = id;
    }

    // Update card states
    document.querySelectorAll('.song-card').forEach(card => {
        if (card.dataset.id === expandedCardId) {
            card.classList.add('expanded');
        } else {
            card.classList.remove('expanded');
        }
    });
}

// Search handler
async function handleSearch() {
    const query = searchInput.value.trim();

    if (!query) {
        renderSongs(songs);
        return;
    }

    try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const results = await response.json();
        renderSongs(results);
    } catch (error) {
        console.error('Error searching:', error);
    }
}

// Utility functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Make toggleCard globally available
window.toggleCard = toggleCard;
