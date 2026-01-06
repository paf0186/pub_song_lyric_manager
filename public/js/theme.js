// Theme toggle functionality
(function() {
    const THEME_KEY = 'theme-preference';

    // Get current effective theme
    function getEffectiveTheme() {
        const saved = localStorage.getItem(THEME_KEY);
        if (saved === 'dark' || saved === 'light') {
            return saved;
        }
        // Auto: check system preference
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    // Apply theme to document
    function applyTheme(theme) {
        const root = document.documentElement;
        root.classList.remove('dark-mode', 'light-mode');

        if (theme === 'dark') {
            root.classList.add('dark-mode');
        } else if (theme === 'light') {
            root.classList.add('light-mode');
        }
        // If 'auto', no class is added - CSS media query handles it
    }

    // Get saved preference (dark/light/auto)
    function getSavedPreference() {
        return localStorage.getItem(THEME_KEY) || 'auto';
    }

    // Cycle through: auto -> light -> dark -> auto
    function cycleTheme() {
        const current = getSavedPreference();
        let next;

        if (current === 'auto') {
            next = 'light';
        } else if (current === 'light') {
            next = 'dark';
        } else {
            next = 'auto';
        }

        localStorage.setItem(THEME_KEY, next);
        applyTheme(next === 'auto' ? null : next);
        updateToggleButton();
        return next;
    }

    // Update toggle button text/icon
    function updateToggleButton() {
        const btn = document.getElementById('themeToggle');
        if (!btn) return;

        const pref = getSavedPreference();
        const icon = btn.querySelector('.theme-toggle-icon');
        const text = btn.querySelector('.theme-toggle-text');

        if (pref === 'auto') {
            if (icon) icon.textContent = '◐';
            if (text) text.textContent = 'Theme: Auto';
        } else if (pref === 'light') {
            if (icon) icon.textContent = '☀';
            if (text) text.textContent = 'Theme: Light';
        } else {
            if (icon) icon.textContent = '☾';
            if (text) text.textContent = 'Theme: Dark';
        }
    }

    // Initialize on page load
    function init() {
        const pref = getSavedPreference();
        if (pref !== 'auto') {
            applyTheme(pref);
        }

        // Set up toggle button if it exists
        const btn = document.getElementById('themeToggle');
        if (btn) {
            btn.addEventListener('click', cycleTheme);
            updateToggleButton();
        }
    }

    // Apply immediately to prevent flash
    const pref = getSavedPreference();
    if (pref !== 'auto') {
        applyTheme(pref);
    }

    // Full init after DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Export for external use
    window.themeToggle = {
        cycle: cycleTheme,
        getPreference: getSavedPreference,
        getEffective: getEffectiveTheme
    };
})();
