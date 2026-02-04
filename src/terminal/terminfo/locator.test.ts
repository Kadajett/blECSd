/**
 * Tests for terminfo file locator.
 *
 * @module terminal/terminfo/locator.test
 */

import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
	findCurrentTerminfo,
	findTerminfo,
	findTerminfoDetailed,
	getCurrentTerminal,
	getExistingSearchPaths,
	getTerminfoPath,
	getTerminfoSearchPaths,
	listTerminals,
	listTerminalsMatching,
	terminalExists,
} from './locator';

// =============================================================================
// TEST FIXTURES
// =============================================================================

const TEST_DIR = join(tmpdir(), `blecsd-terminfo-test-${process.pid}`);

/**
 * Creates a mock terminfo directory structure.
 */
function createMockTerminfoDir(basePath: string, terminals: string[]): void {
	for (const terminal of terminals) {
		const firstChar = terminal.charAt(0);
		const dirPath = join(basePath, firstChar);

		if (!existsSync(dirPath)) {
			mkdirSync(dirPath, { recursive: true });
		}

		// Write minimal valid terminfo file (just magic number)
		const filePath = join(dirPath, terminal);
		const buffer = Buffer.alloc(20);
		buffer.writeUInt16LE(0x011a, 0); // Legacy magic
		buffer.writeUInt16LE(5, 2); // nameSize
		buffer.write('test', 12, 'latin1');
		writeFileSync(filePath, buffer);
	}
}

// =============================================================================
// TEST SETUP
// =============================================================================

beforeAll(() => {
	// Create test directory with mock terminfo files
	mkdirSync(TEST_DIR, { recursive: true });
	createMockTerminfoDir(TEST_DIR, ['test-term', 'test-256color', 'another-term']);
});

afterAll(() => {
	// Clean up test directory
	try {
		rmSync(TEST_DIR, { recursive: true, force: true });
	} catch {
		// Ignore cleanup errors
	}
});

// =============================================================================
// TESTS
// =============================================================================

describe('terminfo locator', () => {
	describe('getTerminfoSearchPaths', () => {
		it('returns array of paths', () => {
			const paths = getTerminfoSearchPaths();
			expect(Array.isArray(paths)).toBe(true);
			expect(paths.length).toBeGreaterThan(0);
		});

		it('includes system paths by default', () => {
			const paths = getTerminfoSearchPaths();
			const hasSystemPath = paths.some((p) => p.includes('/terminfo'));
			expect(hasSystemPath).toBe(true);
		});

		it('excludes system paths when configured', () => {
			const paths = getTerminfoSearchPaths({ skipSystemPaths: true });
			const systemPaths = paths.filter(
				(p) => p.startsWith('/etc/') || p.startsWith('/lib/') || p.startsWith('/usr/'),
			);
			expect(systemPaths.length).toBe(0);
		});

		it('includes additional paths', () => {
			const additionalPaths = ['/custom/path', '/another/path'];
			const paths = getTerminfoSearchPaths({ additionalPaths, skipSystemPaths: true });
			expect(paths).toContain('/custom/path');
			expect(paths).toContain('/another/path');
		});

		it('includes home terminfo directory', () => {
			const paths = getTerminfoSearchPaths({ homeDir: '/home/testuser' });
			expect(paths).toContain('/home/testuser/.terminfo');
		});

		it('returns unique paths', () => {
			const paths = getTerminfoSearchPaths();
			const unique = [...new Set(paths)];
			expect(paths.length).toBe(unique.length);
		});
	});

	describe('getExistingSearchPaths', () => {
		it('only returns paths that exist', () => {
			const paths = getExistingSearchPaths();
			for (const path of paths) {
				expect(existsSync(path)).toBe(true);
			}
		});

		it('includes test directory when configured', () => {
			const paths = getExistingSearchPaths({
				additionalPaths: [TEST_DIR],
				skipSystemPaths: true,
			});
			expect(paths).toContain(TEST_DIR);
		});
	});

	describe('findTerminfo', () => {
		it('finds terminal in custom path', () => {
			const path = findTerminfo('test-term', {
				additionalPaths: [TEST_DIR],
				skipSystemPaths: true,
			});

			expect(path).not.toBeNull();
			expect(path).toContain('test-term');
		});

		it('returns null for missing terminal', () => {
			const path = findTerminfo('nonexistent-terminal', {
				additionalPaths: [TEST_DIR],
				skipSystemPaths: true,
			});

			expect(path).toBeNull();
		});

		it('returns null for empty terminal name', () => {
			expect(findTerminfo('')).toBeNull();
		});

		it('returns null for null/undefined terminal', () => {
			expect(findTerminfo(null as unknown as string)).toBeNull();
			expect(findTerminfo(undefined as unknown as string)).toBeNull();
		});

		it('finds terminal using first-char directory', () => {
			const path = findTerminfo('test-256color', {
				additionalPaths: [TEST_DIR],
				skipSystemPaths: true,
			});

			expect(path).not.toBeNull();
			expect(path).toContain('/t/test-256color');
		});
	});

	describe('findTerminfoDetailed', () => {
		it('returns detailed result with path', () => {
			const result = findTerminfoDetailed('test-term', {
				additionalPaths: [TEST_DIR],
				skipSystemPaths: true,
			});

			expect(result.path).not.toBeNull();
			expect(result.terminal).toBe('test-term');
			expect(result.searchedPaths.length).toBeGreaterThan(0);
		});

		it('returns searched paths when not found', () => {
			const result = findTerminfoDetailed('nonexistent', {
				additionalPaths: [TEST_DIR],
				skipSystemPaths: true,
			});

			expect(result.path).toBeNull();
			expect(result.terminal).toBe('nonexistent');
			expect(result.searchedPaths.length).toBeGreaterThan(0);
		});

		it('includes both first-char and hex paths', () => {
			const result = findTerminfoDetailed('nonexistent', {
				additionalPaths: [TEST_DIR],
				skipSystemPaths: true,
			});

			// Should have searched both n/nonexistent and 6e/nonexistent
			const hasFirstChar = result.searchedPaths.some((p) => p.includes('/n/nonexistent'));
			const hasHex = result.searchedPaths.some((p) => p.includes('/6e/nonexistent'));

			expect(hasFirstChar).toBe(true);
			expect(hasHex).toBe(true);
		});
	});

	describe('getTerminfoPath', () => {
		it('returns path when terminal exists', () => {
			const path = getTerminfoPath('test-term', {
				additionalPaths: [TEST_DIR],
				skipSystemPaths: true,
			});

			expect(path).toContain('test-term');
		});

		it('throws when terminal not found', () => {
			expect(() => {
				getTerminfoPath('nonexistent', {
					additionalPaths: [TEST_DIR],
					skipSystemPaths: true,
				});
			}).toThrow('Terminfo file not found');
		});
	});

	describe('listTerminals', () => {
		it('lists terminals from test directory', () => {
			const terminals = listTerminals({
				additionalPaths: [TEST_DIR],
				skipSystemPaths: true,
			});

			expect(terminals).toContain('test-term');
			expect(terminals).toContain('test-256color');
			expect(terminals).toContain('another-term');
		});

		it('returns sorted list', () => {
			const terminals = listTerminals({
				additionalPaths: [TEST_DIR],
				skipSystemPaths: true,
			});

			const sorted = [...terminals].sort();
			expect(terminals).toEqual(sorted);
		});

		it('returns unique terminals', () => {
			const terminals = listTerminals({
				additionalPaths: [TEST_DIR],
				skipSystemPaths: true,
			});

			const unique = [...new Set(terminals)];
			expect(terminals.length).toBe(unique.length);
		});

		it('returns empty array for empty directory', () => {
			const emptyDir = join(TEST_DIR, 'empty');
			mkdirSync(emptyDir, { recursive: true });

			const terminals = listTerminals({
				additionalPaths: [emptyDir],
				skipSystemPaths: true,
			});

			expect(terminals).toEqual([]);
		});
	});

	describe('listTerminalsMatching', () => {
		it('matches exact name', () => {
			const matches = listTerminalsMatching('test-term', {
				additionalPaths: [TEST_DIR],
				skipSystemPaths: true,
			});

			expect(matches).toContain('test-term');
		});

		it('matches with wildcard prefix', () => {
			const matches = listTerminalsMatching('*-term', {
				additionalPaths: [TEST_DIR],
				skipSystemPaths: true,
			});

			expect(matches).toContain('test-term');
			expect(matches).toContain('another-term');
		});

		it('matches with wildcard suffix', () => {
			const matches = listTerminalsMatching('test-*', {
				additionalPaths: [TEST_DIR],
				skipSystemPaths: true,
			});

			expect(matches).toContain('test-term');
			expect(matches).toContain('test-256color');
		});

		it('matches with single char wildcard', () => {
			const matches = listTerminalsMatching('test-???color', {
				additionalPaths: [TEST_DIR],
				skipSystemPaths: true,
			});

			expect(matches).toContain('test-256color');
		});

		it('is case insensitive', () => {
			const matches = listTerminalsMatching('TEST-TERM', {
				additionalPaths: [TEST_DIR],
				skipSystemPaths: true,
			});

			expect(matches).toContain('test-term');
		});
	});

	describe('terminalExists', () => {
		it('returns true for existing terminal', () => {
			const exists = terminalExists('test-term', {
				additionalPaths: [TEST_DIR],
				skipSystemPaths: true,
			});

			expect(exists).toBe(true);
		});

		it('returns false for missing terminal', () => {
			const exists = terminalExists('nonexistent', {
				additionalPaths: [TEST_DIR],
				skipSystemPaths: true,
			});

			expect(exists).toBe(false);
		});
	});

	describe('getCurrentTerminal', () => {
		it('returns TERM environment variable', () => {
			const originalTerm = process.env.TERM;
			process.env.TERM = 'test-terminal';

			try {
				expect(getCurrentTerminal()).toBe('test-terminal');
			} finally {
				if (originalTerm) {
					process.env.TERM = originalTerm;
				} else {
					Reflect.deleteProperty(process.env, 'TERM');
				}
			}
		});

		it('returns dumb when TERM not set', () => {
			const originalTerm = process.env.TERM;
			Reflect.deleteProperty(process.env, 'TERM');

			try {
				expect(getCurrentTerminal()).toBe('dumb');
			} finally {
				if (originalTerm) {
					process.env.TERM = originalTerm;
				}
			}
		});
	});

	describe('findCurrentTerminfo', () => {
		it('finds terminfo for current TERM', () => {
			// This test depends on the system having terminfo installed
			// Skip if running in minimal container
			const currentTerm = getCurrentTerminal();
			if (currentTerm === 'dumb') {
				return;
			}

			const path = findCurrentTerminfo();
			// May or may not find it depending on system
			// Just check it doesn't throw
			expect(path === null || typeof path === 'string').toBe(true);
		});
	});

	describe('system integration', () => {
		it('finds xterm if available on system', () => {
			// This test is system-dependent
			const path = findTerminfo('xterm');

			// We don't assert success because xterm may not be installed
			// Just verify the function works without error
			expect(path === null || typeof path === 'string').toBe(true);
		});

		it('can list system terminals', () => {
			const terminals = listTerminals();

			// Should work without error
			expect(Array.isArray(terminals)).toBe(true);
		});
	});
});
