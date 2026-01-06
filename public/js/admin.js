// Admin page JavaScript

let songs = [];
let lists = [];
let editingListId = null;

// DOM Elements
const loginScreen = document.getElementById('loginScreen');
const adminPanel = document.getElementById('adminPanel');
const loginForm = document.getElementById('loginForm');
const logoutBtn = document.getElementById('logoutBtn');
const addSongForm = document.getElementById('addSongForm');
const createListForm = document.getElementById('createListForm');
const songsList = document.getElementById('songsList');
const songCheckboxes = document.getElementById('songCheckboxes');
const listsContainer = document.getElementById('listsContainer');
const toastContainer = document.getElementById('toastContainer');

// Tab elements
const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');

// QR Modal elements
const qrModal = document.getElementById('qrModal');
const qrListName = document.getElementById('qrListName');
const qrCodeImg = document.getElementById('qrCodeImg');
const qrUrl = document.getElementById('qrUrl');

// Edit Song Modal elements
const editSongModal = document.getElementById('editSongModal');
const editSongForm = document.getElementById('editSongForm');

// List form elements
const listFormTitle = document.getElementById('listFormTitle');
const listSubmitBtn = document.getElementById('listSubmitBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const listName = document.getElementById('listName');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Check if already logged in
    const token = sessionStorage.getItem('adminToken');
    if (token) {
        showAdminPanel();
    }

    setupEventListeners();
});

// Event Listeners
function setupEventListeners() {
    loginForm.addEventListener('submit', handleLogin);
    logoutBtn.addEventListener('click', handleLogout);
    addSongForm.addEventListener('submit', handleAddSong);
    createListForm.addEventListener('submit', handleListSubmit);
    editSongForm.addEventListener('submit', handleEditSong);
    cancelEditBtn.addEventListener('click', cancelEditList);

    // Tab switching
    tabs.forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    // Close modals on overlay click
    qrModal.addEventListener('click', (e) => {
        if (e.target === qrModal) closeQrModal();
    });
    editSongModal.addEventListener('click', (e) => {
        if (e.target === editSongModal) closeEditSongModal();
    });
}

// Tab switching
function switchTab(tabId) {
    tabs.forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabId);
    });
    tabContents.forEach(content => {
        content.classList.toggle('active', content.id === `${tabId}-tab`);
    });
}

// Login
async function handleLogin(e) {
    e.preventDefault();
    const password = document.getElementById('password').value;

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });

        const data = await response.json();

        if (data.success) {
            sessionStorage.setItem('adminToken', data.token);
            showAdminPanel();
            showToast('Logged in successfully', 'success');
        } else {
            showToast('Invalid password', 'error');
        }
    } catch (error) {
        showToast('Login failed', 'error');
    }
}

// Logout
function handleLogout() {
    sessionStorage.removeItem('adminToken');
    loginScreen.style.display = 'block';
    adminPanel.style.display = 'none';
    document.getElementById('password').value = '';
    showToast('Logged out', 'info');
}

// Show admin panel
function showAdminPanel() {
    loginScreen.style.display = 'none';
    adminPanel.style.display = 'block';
    loadSongs();
    loadLists();
}

// Load songs
async function loadSongs() {
    try {
        const response = await fetch('/api/songs');
        songs = await response.json();
        renderSongsList();
        renderSongCheckboxes();
    } catch (error) {
        showToast('Failed to load songs', 'error');
    }
}

// Load lists
async function loadLists() {
    try {
        const response = await fetch('/api/lists');
        lists = await response.json();
        renderLists();
    } catch (error) {
        showToast('Failed to load lists', 'error');
    }
}

// Render songs in manage section
function renderSongsList() {
    if (songs.length === 0) {
        songsList.innerHTML = '<p style="color: var(--text-secondary);">No songs yet. Add your first song above!</p>';
        return;
    }

    songsList.innerHTML = songs.map(song => `
        <div class="admin-song-item">
            <div class="admin-song-info">
                <div class="admin-song-title">${escapeHtml(song.title)}</div>
            </div>
            <div class="admin-song-actions">
                <button class="btn btn-secondary btn-small" onclick="openEditSong('${song.id}')">Edit</button>
                <button class="btn btn-danger btn-small" onclick="deleteSong('${song.id}')">Delete</button>
            </div>
        </div>
    `).join('');
}

// Render song checkboxes for list creation
function renderSongCheckboxes(selectedIds = []) {
    if (songs.length === 0) {
        songCheckboxes.innerHTML = '<p style="color: var(--text-secondary);">No songs available. Add songs first!</p>';
        return;
    }

    songCheckboxes.innerHTML = songs.map(song => `
        <div class="admin-song-item">
            <input type="checkbox" id="song-${song.id}" value="${song.id}"
                ${selectedIds.includes(song.id) ? 'checked' : ''}>
            <label for="song-${song.id}" class="admin-song-info" style="cursor: pointer;">
                <div class="admin-song-title">${escapeHtml(song.title)}</div>
            </label>
        </div>
    `).join('');
}

// Render lists
function renderLists() {
    if (lists.length === 0) {
        listsContainer.innerHTML = '<p style="color: var(--text-secondary);">No lists yet. Create your first list above!</p>';
        return;
    }

    listsContainer.innerHTML = lists.map(list => `
        <div class="list-item">
            <div class="list-info">
                <div class="list-name">${escapeHtml(list.name)}</div>
                <div class="list-meta">${list.songIds.length} song${list.songIds.length !== 1 ? 's' : ''}</div>
            </div>
            <div class="list-actions">
                <button class="btn btn-secondary btn-small" onclick="showQrCode('${list.id}')">QR Code</button>
                <button class="btn btn-secondary btn-small" onclick="editList('${list.id}')">Edit</button>
                <button class="btn btn-danger btn-small" onclick="deleteList('${list.id}')">Delete</button>
            </div>
        </div>
    `).join('');
}

// Add song
async function handleAddSong(e) {
    e.preventDefault();

    const title = document.getElementById('songTitle').value.trim();
    const lyrics = document.getElementById('songLyrics').value.trim();

    try {
        const response = await fetch('/api/songs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, lyrics })
        });

        if (response.ok) {
            addSongForm.reset();
            loadSongs();
            showToast('Song added successfully', 'success');
        } else {
            const data = await response.json();
            showToast(data.error || 'Failed to add song', 'error');
        }
    } catch (error) {
        showToast('Failed to add song', 'error');
    }
}

// Open edit song modal
function openEditSong(id) {
    const song = songs.find(s => s.id === id);
    if (!song) return;

    document.getElementById('editSongId').value = song.id;
    document.getElementById('editSongTitle').value = song.title;
    document.getElementById('editSongLyrics').value = song.lyrics;
    editSongModal.classList.add('active');
}

// Close edit song modal
function closeEditSongModal() {
    editSongModal.classList.remove('active');
}

// Handle edit song
async function handleEditSong(e) {
    e.preventDefault();

    const id = document.getElementById('editSongId').value;
    const title = document.getElementById('editSongTitle').value.trim();
    const lyrics = document.getElementById('editSongLyrics').value.trim();

    try {
        const response = await fetch(`/api/songs/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, lyrics })
        });

        if (response.ok) {
            closeEditSongModal();
            loadSongs();
            showToast('Song updated successfully', 'success');
        } else {
            showToast('Failed to update song', 'error');
        }
    } catch (error) {
        showToast('Failed to update song', 'error');
    }
}

// Delete song
async function deleteSong(id) {
    if (!confirm('Are you sure you want to delete this song?')) return;

    try {
        const response = await fetch(`/api/songs/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            loadSongs();
            loadLists(); // Reload lists as song might be removed from them
            showToast('Song deleted', 'success');
        } else {
            showToast('Failed to delete song', 'error');
        }
    } catch (error) {
        showToast('Failed to delete song', 'error');
    }
}

// Create or update list
async function handleListSubmit(e) {
    e.preventDefault();

    const name = listName.value.trim();
    const checkboxes = songCheckboxes.querySelectorAll('input[type="checkbox"]:checked');
    const songIds = Array.from(checkboxes).map(cb => cb.value);

    if (songIds.length === 0) {
        showToast('Please select at least one song', 'error');
        return;
    }

    try {
        const url = editingListId ? `/api/lists/${editingListId}` : '/api/lists';
        const method = editingListId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, songIds })
        });

        if (response.ok) {
            createListForm.reset();
            renderSongCheckboxes();
            cancelEditList();
            loadLists();
            showToast(editingListId ? 'List updated' : 'List created', 'success');
        } else {
            showToast('Failed to save list', 'error');
        }
    } catch (error) {
        showToast('Failed to save list', 'error');
    }
}

// Edit list
async function editList(id) {
    const list = lists.find(l => l.id === id);
    if (!list) return;

    editingListId = id;
    listName.value = list.name;
    renderSongCheckboxes(list.songIds);

    listFormTitle.textContent = 'Edit List';
    listSubmitBtn.textContent = 'Update List';
    cancelEditBtn.style.display = 'inline-flex';

    // Scroll to form
    createListForm.scrollIntoView({ behavior: 'smooth' });
}

// Cancel edit list
function cancelEditList() {
    editingListId = null;
    listName.value = '';
    renderSongCheckboxes();
    listFormTitle.textContent = 'Create New List';
    listSubmitBtn.textContent = 'Create List';
    cancelEditBtn.style.display = 'none';
}

// Delete list
async function deleteList(id) {
    if (!confirm('Are you sure you want to delete this list?')) return;

    try {
        const response = await fetch(`/api/lists/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            loadLists();
            showToast('List deleted', 'success');
        } else {
            showToast('Failed to delete list', 'error');
        }
    } catch (error) {
        showToast('Failed to delete list', 'error');
    }
}

// Show QR code
async function showQrCode(listId) {
    const list = lists.find(l => l.id === listId);
    if (!list) return;

    try {
        const response = await fetch(`/api/qr/${listId}`);
        const data = await response.json();

        qrListName.textContent = list.name;
        qrCodeImg.src = data.qrCode;
        qrUrl.textContent = data.url;
        qrModal.classList.add('active');
    } catch (error) {
        showToast('Failed to generate QR code', 'error');
    }
}

// Close QR modal
function closeQrModal() {
    qrModal.classList.remove('active');
}

// Utility functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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

// Global functions for onclick handlers
window.openEditSong = openEditSong;
window.closeEditSongModal = closeEditSongModal;
window.deleteSong = deleteSong;
window.editList = editList;
window.deleteList = deleteList;
window.showQrCode = showQrCode;
window.closeQrModal = closeQrModal;
