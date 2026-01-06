// Song List page JavaScript

let listId = null;
let listData = null;
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
const notFoundState = document.getElementById('notFoundState');
const pageTitle = document.getElementById('pageTitle');
const toastContainer = document.getElementById('toastContainer');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Get list ID from URL
    const params = new URLSearchParams(window.location.search);
    listId = params.get('id');

    if (!listId) {
        showNotFound();
        return;
    }

    loadList();
    loadMenuLists();
    setupEventListeners();
});

// Event Listeners
function setupEventListeners() {
    menuBtn.addEventListener('click', toggleMenu);
    menuOverlay.addEventListener('click', closeMenu);
    searchInput.addEventListener('input', debounce(handleSearch, 300));

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

// Load list from API
async function loadList() {
    try {
        const response = await fetch(`/api/lists/${listId}`);

        if (!response.ok) {
            showNotFound();
            return;
        }

        listData = await response.json();
        songs = listData.songs;

        // Update page title
        pageTitle.textContent = listData.name;
        document.title = `${listData.name} - Song Lyrics`;

        // Mark current list as active in menu
        highlightCurrentList();

        renderSongs(songs);
    } catch (error) {
        console.error('Error loading list:', error);
        showNotFound();
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

    // Remove existing list items
    const existingItems = menuItems.querySelectorAll('.menu-item.list-link');
    existingItems.forEach(item => item.remove());

    // Add list links after the section title
    lists.forEach(list => {
        const link = document.createElement('a');
        link.href = `/list.html?id=${list.id}`;
        link.className = 'menu-item list-link';
        if (list.id === listId) {
            link.classList.add('active');
        }
        link.textContent = list.name;
        listSection.after(link);
    });
}

// Highlight current list in menu
function highlightCurrentList() {
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
        if (item.href && item.href.includes(`id=${listId}`)) {
            item.classList.add('active');
        }
    });
}

// Show not found state
function showNotFound() {
    songList.style.display = 'none';
    emptyState.style.display = 'none';
    notFoundState.style.display = 'block';
}

// Render songs
function renderSongs(songsToRender) {
    if (songsToRender.length === 0) {
        songList.innerHTML = '';
        emptyState.style.display = 'block';
        notFoundState.style.display = 'none';
        return;
    }

    emptyState.style.display = 'none';
    notFoundState.style.display = 'none';

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
    if (expandedCardId === id) {
        expandedCardId = null;
    } else {
        expandedCardId = id;
    }

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
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&listId=${listId}`);
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

window.toggleCard = toggleCard;
