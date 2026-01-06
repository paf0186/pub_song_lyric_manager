const {
    normalizeWhitespace,
    levenshteinDistance,
    fuzzyMatch,
    exactMatch,
    parseSearchQuery,
    librarySortKey,
    sortSongs,
    generateId,
    hashPassword,
    generateSalt,
    checkRateLimit,
    recordFailedAttempt,
    loginAttempts,
    ensureStats,
    MAX_ATTEMPTS
} = require('../server');

describe('normalizeWhitespace', () => {
    test('converts newlines to spaces', () => {
        expect(normalizeWhitespace('hello\nworld')).toBe('hello world');
    });

    test('converts multiple spaces to single space', () => {
        expect(normalizeWhitespace('hello    world')).toBe('hello world');
    });

    test('converts tabs to spaces', () => {
        expect(normalizeWhitespace('hello\tworld')).toBe('hello world');
    });

    test('trims leading and trailing whitespace', () => {
        expect(normalizeWhitespace('  hello world  ')).toBe('hello world');
    });

    test('handles complex whitespace', () => {
        expect(normalizeWhitespace('hello\n\n  world\t\tfoo')).toBe('hello world foo');
    });

    test('handles empty string', () => {
        expect(normalizeWhitespace('')).toBe('');
    });
});

describe('levenshteinDistance', () => {
    test('returns 0 for identical strings', () => {
        expect(levenshteinDistance('hello', 'hello')).toBe(0);
    });

    test('returns correct distance for single character difference', () => {
        expect(levenshteinDistance('hello', 'hallo')).toBe(1);
    });

    test('returns correct distance for insertions', () => {
        expect(levenshteinDistance('hello', 'helloo')).toBe(1);
    });

    test('returns correct distance for deletions', () => {
        expect(levenshteinDistance('hello', 'helo')).toBe(1);
    });

    test('returns correct distance for multiple changes', () => {
        expect(levenshteinDistance('kitten', 'sitting')).toBe(3);
    });

    test('handles empty strings', () => {
        expect(levenshteinDistance('', 'hello')).toBe(5);
        expect(levenshteinDistance('hello', '')).toBe(5);
        expect(levenshteinDistance('', '')).toBe(0);
    });
});

describe('fuzzyMatch', () => {
    test('matches exact substring', () => {
        expect(fuzzyMatch('hello world', 'hello')).toBe(true);
    });

    test('matches case insensitively', () => {
        expect(fuzzyMatch('Hello World', 'hello')).toBe(true);
    });

    test('handles query spanning newlines', () => {
        expect(fuzzyMatch('hello\nworld', 'hello world')).toBe(true);
    });

    test('allows small typos in longer words', () => {
        expect(fuzzyMatch('shepherds arise', 'sheperds')).toBe(true); // missing h
    });

    test('requires exact match for short queries', () => {
        expect(fuzzyMatch('hello world', 'hx')).toBe(false);
        expect(fuzzyMatch('hello world', 'he')).toBe(true);
    });

    test('handles multiple word queries', () => {
        expect(fuzzyMatch('The quick brown fox', 'quick fox')).toBe(true);
    });

    test('rejects non-matching queries', () => {
        expect(fuzzyMatch('hello world', 'xyz')).toBe(false);
    });

    test('matches words with typos in multi-word text', () => {
        expect(fuzzyMatch('apple tree wassail', 'aple tre')).toBe(true);
    });
});

describe('exactMatch', () => {
    test('matches exact substring', () => {
        expect(exactMatch('hello world', 'hello')).toBe(true);
    });

    test('matches case insensitively', () => {
        expect(exactMatch('Hello World', 'hello world')).toBe(true);
    });

    test('handles query spanning newlines', () => {
        expect(exactMatch('hello\nworld', 'hello world')).toBe(true);
    });

    test('does not match with typos', () => {
        expect(exactMatch('hello world', 'helo world')).toBe(false);
    });
});

describe('parseSearchQuery', () => {
    test('parses quoted string as exact search', () => {
        expect(parseSearchQuery('"hello world"')).toEqual({
            type: 'exact',
            term: 'hello world'
        });
    });

    test('parses unquoted string as fuzzy search', () => {
        expect(parseSearchQuery('hello world')).toEqual({
            type: 'fuzzy',
            term: 'hello world'
        });
    });

    test('handles partial quotes as fuzzy', () => {
        expect(parseSearchQuery('"hello')).toEqual({
            type: 'fuzzy',
            term: '"hello'
        });
    });

    test('handles empty quotes', () => {
        expect(parseSearchQuery('""')).toEqual({
            type: 'fuzzy',
            term: '""'
        });
    });
});

describe('librarySortKey', () => {
    test('removes leading "The"', () => {
        expect(librarySortKey('The Beatles')).toBe('beatles');
    });

    test('removes leading "A"', () => {
        expect(librarySortKey('A Day in the Life')).toBe('day in the life');
    });

    test('removes leading "An"', () => {
        expect(librarySortKey('An Apple')).toBe('apple');
    });

    test('converts to lowercase', () => {
        expect(librarySortKey('Hello World')).toBe('hello world');
    });

    test('handles no article', () => {
        expect(librarySortKey('Chariots')).toBe('chariots');
    });

    test('is case insensitive for articles', () => {
        expect(librarySortKey('THE Beatles')).toBe('beatles');
    });
});

describe('sortSongs', () => {
    test('sorts songs alphabetically', () => {
        const songs = [
            { title: 'Zebra' },
            { title: 'Apple' },
            { title: 'Banana' }
        ];
        const sorted = sortSongs(songs);
        expect(sorted.map(s => s.title)).toEqual(['Apple', 'Banana', 'Zebra']);
    });

    test('sorts ignoring articles', () => {
        const songs = [
            { title: 'The Beatles' },
            { title: 'Apple Tree' },
            { title: 'A Day' }
        ];
        const sorted = sortSongs(songs);
        expect(sorted.map(s => s.title)).toEqual(['Apple Tree', 'The Beatles', 'A Day']);
    });

    test('does not modify original array', () => {
        const songs = [
            { title: 'Zebra' },
            { title: 'Apple' }
        ];
        sortSongs(songs);
        expect(songs[0].title).toBe('Zebra');
    });

    test('handles empty array', () => {
        expect(sortSongs([])).toEqual([]);
    });
});

describe('generateId', () => {
    test('generates unique IDs', () => {
        const id1 = generateId();
        const id2 = generateId();
        expect(id1).not.toBe(id2);
    });

    test('generates string IDs', () => {
        const id = generateId();
        expect(typeof id).toBe('string');
    });

    test('generates non-empty IDs', () => {
        const id = generateId();
        expect(id.length).toBeGreaterThan(0);
    });
});

describe('hashPassword', () => {
    test('produces consistent hash with same salt', () => {
        const salt = 'testsalt123';
        const hash1 = hashPassword('password', salt);
        const hash2 = hashPassword('password', salt);
        expect(hash1).toBe(hash2);
    });

    test('produces different hash with different salt', () => {
        const hash1 = hashPassword('password', 'salt1');
        const hash2 = hashPassword('password', 'salt2');
        expect(hash1).not.toBe(hash2);
    });

    test('produces different hash for different passwords', () => {
        const salt = 'testsalt123';
        const hash1 = hashPassword('password1', salt);
        const hash2 = hashPassword('password2', salt);
        expect(hash1).not.toBe(hash2);
    });

    test('produces hex string', () => {
        const hash = hashPassword('password', 'salt');
        expect(hash).toMatch(/^[0-9a-f]+$/);
    });
});

describe('generateSalt', () => {
    test('generates unique salts', () => {
        const salt1 = generateSalt();
        const salt2 = generateSalt();
        expect(salt1).not.toBe(salt2);
    });

    test('generates hex string', () => {
        const salt = generateSalt();
        expect(salt).toMatch(/^[0-9a-f]+$/);
    });

    test('generates 32-character hex string (16 bytes)', () => {
        const salt = generateSalt();
        expect(salt.length).toBe(32);
    });
});

describe('rate limiting', () => {
    beforeEach(() => {
        loginAttempts.clear();
    });

    test('allows first attempt', () => {
        const result = checkRateLimit('192.168.1.1');
        expect(result.allowed).toBe(true);
    });

    test('allows attempts under limit', () => {
        const ip = '192.168.1.2';
        for (let i = 0; i < MAX_ATTEMPTS - 1; i++) {
            recordFailedAttempt(ip);
        }
        const result = checkRateLimit(ip);
        expect(result.allowed).toBe(true);
    });

    test('blocks after max attempts', () => {
        const ip = '192.168.1.3';
        for (let i = 0; i < MAX_ATTEMPTS; i++) {
            recordFailedAttempt(ip);
        }
        const result = checkRateLimit(ip);
        expect(result.allowed).toBe(false);
        expect(result.remaining).toBeGreaterThan(0);
    });

    test('tracks different IPs separately', () => {
        const ip1 = '192.168.1.4';
        const ip2 = '192.168.1.5';

        for (let i = 0; i < MAX_ATTEMPTS; i++) {
            recordFailedAttempt(ip1);
        }

        expect(checkRateLimit(ip1).allowed).toBe(false);
        expect(checkRateLimit(ip2).allowed).toBe(true);
    });
});

describe('ensureStats', () => {
    test('adds stats structure to data without stats', () => {
        const data = {
            songs: [],
            lists: []
        };
        const result = ensureStats(data);
        expect(result.stats).toBeDefined();
        expect(result.stats.songViews).toEqual({});
        expect(result.stats.listViews).toEqual({});
    });

    test('does not overwrite existing stats', () => {
        const data = {
            songs: [],
            lists: [],
            stats: {
                songViews: { song1: 5 },
                listViews: { list1: 3 }
            }
        };
        const result = ensureStats(data);
        expect(result.stats.songViews.song1).toBe(5);
        expect(result.stats.listViews.list1).toBe(3);
    });

    test('adds missing songViews to existing stats', () => {
        const data = {
            songs: [],
            lists: [],
            stats: {
                listViews: { list1: 3 }
            }
        };
        const result = ensureStats(data);
        expect(result.stats.songViews).toEqual({});
        expect(result.stats.listViews.list1).toBe(3);
    });

    test('adds missing listViews to existing stats', () => {
        const data = {
            songs: [],
            lists: [],
            stats: {
                songViews: { song1: 5 }
            }
        };
        const result = ensureStats(data);
        expect(result.stats.songViews.song1).toBe(5);
        expect(result.stats.listViews).toEqual({});
    });

    test('returns the same data object (mutates in place)', () => {
        const data = {
            songs: [],
            lists: []
        };
        const result = ensureStats(data);
        expect(result).toBe(data);
    });
});
