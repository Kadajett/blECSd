/**
 * Tests for terminal feature detection.
 *
 * @module terminal/terminfo/features.test
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TerminfoData } from './tput';
import {
	detect256Color,
	detectAlternateScreen,
	detectBracketedPaste,
	detectBrokenACS,
	detectColors,
	detectFeatures,
	detectFocusEvents,
	detectMagicCookie,
	detectModernProtocols,
	detectMouse,
	detectPadding,
	detectPCRomSet,
	detectSetbuf,
	detectTitle,
	detectTrueColor,
	detectUnicode,
	getFeatureSummary,
} from './features';

// Helper to create minimal TerminfoData
function createTerminfo(overrides: Partial<TerminfoData> = {}): TerminfoData {
	return {
		name: 'xterm-256color',
		names: ['xterm-256color', 'xterm'],
		booleans: {},
		numbers: { max_colors: 256 },
		strings: {},
		...overrides,
	};
}

describe('feature detection', () => {
	const originalEnv = process.env;

	beforeEach(() => {
		// Reset environment before each test
		process.env = { ...originalEnv };
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	describe('detectUnicode', () => {
		it('returns true for UTF-8 locale', () => {
			process.env.LANG = 'en_US.UTF-8';
			expect(detectUnicode()).toBe(true);
		});

		it('returns true for utf8 locale (no hyphen)', () => {
			process.env.LC_ALL = 'en_US.utf8';
			expect(detectUnicode()).toBe(true);
		});

		it('returns false for non-UTF locale', () => {
			process.env.LANG = 'C';
			delete process.env.LC_ALL;
			delete process.env.LC_CTYPE;
			delete process.env.LANGUAGE;
			expect(detectUnicode()).toBe(false);
		});

		it('respects forceUnicode option', () => {
			process.env.LANG = 'C';
			expect(detectUnicode({ forceUnicode: true })).toBe(true);
			expect(detectUnicode({ forceUnicode: false })).toBe(false);
		});

		it('respects NCURSES_FORCE_UNICODE env', () => {
			process.env.NCURSES_FORCE_UNICODE = '1';
			expect(detectUnicode()).toBe(true);

			process.env.NCURSES_FORCE_UNICODE = '0';
			expect(detectUnicode()).toBe(false);
		});
	});

	describe('detectPCRomSet', () => {
		it('returns true when PC and ACS charset modes are identical', () => {
			const info = createTerminfo({
				strings: {
					enter_pc_charset_mode: '\\E(U',
					exit_pc_charset_mode: '\\E(B',
					enter_alt_charset_mode: '\\E(U',
					exit_alt_charset_mode: '\\E(B',
				},
			});
			expect(detectPCRomSet(info)).toBe(true);
		});

		it('returns false when modes differ', () => {
			const info = createTerminfo({
				strings: {
					enter_pc_charset_mode: '\\E(U',
					exit_pc_charset_mode: '\\E(B',
					enter_alt_charset_mode: '\\E(0',
					exit_alt_charset_mode: '\\E(B',
				},
			});
			expect(detectPCRomSet(info)).toBe(false);
		});

		it('returns false when PC charset mode not defined', () => {
			const info = createTerminfo({
				strings: {
					enter_alt_charset_mode: '\\E(0',
					exit_alt_charset_mode: '\\E(B',
				},
			});
			expect(detectPCRomSet(info)).toBe(false);
		});
	});

	describe('detectBrokenACS', () => {
		it('returns true for linux terminal', () => {
			const info = createTerminfo({ name: 'linux' });
			expect(detectBrokenACS(info)).toBe(true);
		});

		it('returns false for xterm', () => {
			const info = createTerminfo({ name: 'xterm' });
			expect(detectBrokenACS(info)).toBe(false);
		});

		it('respects NCURSES_NO_UTF8_ACS env', () => {
			const info = createTerminfo();
			process.env.NCURSES_NO_UTF8_ACS = '1';
			expect(detectBrokenACS(info)).toBe(true);
		});

		it('uses U8 capability when present', () => {
			const info = createTerminfo({
				numbers: { max_colors: 256, U8: 1 },
			});
			expect(detectBrokenACS(info)).toBe(true);

			const info2 = createTerminfo({
				numbers: { max_colors: 256, U8: 0 },
			});
			expect(detectBrokenACS(info2)).toBe(false);
		});
	});

	describe('detectMagicCookie', () => {
		it('returns true by default', () => {
			delete process.env.NCURSES_NO_MAGIC_COOKIE;
			expect(detectMagicCookie()).toBe(true);
		});

		it('returns false when disabled', () => {
			process.env.NCURSES_NO_MAGIC_COOKIE = '1';
			expect(detectMagicCookie()).toBe(false);
		});
	});

	describe('detectPadding', () => {
		it('returns true by default', () => {
			delete process.env.NCURSES_NO_PADDING;
			expect(detectPadding()).toBe(true);
		});

		it('returns false when disabled', () => {
			process.env.NCURSES_NO_PADDING = '1';
			expect(detectPadding()).toBe(false);
		});
	});

	describe('detectSetbuf', () => {
		it('returns true by default', () => {
			delete process.env.NCURSES_NO_SETBUF;
			expect(detectSetbuf()).toBe(true);
		});

		it('returns false when disabled', () => {
			process.env.NCURSES_NO_SETBUF = '1';
			expect(detectSetbuf()).toBe(false);
		});
	});

	describe('detectColors', () => {
		it('returns max_colors from terminfo', () => {
			const info = createTerminfo({ numbers: { max_colors: 256 } });
			expect(detectColors(info)).toBe(256);
		});

		it('returns 0 for monochrome', () => {
			const info = createTerminfo({ numbers: {} });
			expect(detectColors(info)).toBe(0);
		});
	});

	describe('detectTrueColor', () => {
		it('returns true for COLORTERM=truecolor', () => {
			process.env.COLORTERM = 'truecolor';
			const info = createTerminfo();
			expect(detectTrueColor(info)).toBe(true);
		});

		it('returns true for COLORTERM=24bit', () => {
			process.env.COLORTERM = '24bit';
			const info = createTerminfo();
			expect(detectTrueColor(info)).toBe(true);
		});

		it('returns true for known truecolor terminals', () => {
			delete process.env.COLORTERM;
			const kitty = createTerminfo({ name: 'xterm-kitty' });
			expect(detectTrueColor(kitty)).toBe(true);
		});
	});

	describe('detect256Color', () => {
		it('returns true for 256+ colors', () => {
			const info = createTerminfo({ numbers: { max_colors: 256 } });
			expect(detect256Color(info)).toBe(true);
		});

		it('returns false for 8 colors', () => {
			const info = createTerminfo({ numbers: { max_colors: 8 } });
			expect(detect256Color(info)).toBe(false);
		});
	});

	describe('detectAlternateScreen', () => {
		it('returns true when ca_mode capabilities exist', () => {
			const info = createTerminfo({
				strings: {
					enter_ca_mode: '\\E[?1049h',
					exit_ca_mode: '\\E[?1049l',
				},
			});
			expect(detectAlternateScreen(info)).toBe(true);
		});

		it('returns false when capabilities missing', () => {
			const info = createTerminfo({ strings: {} });
			expect(detectAlternateScreen(info)).toBe(false);
		});
	});

	describe('detectMouse', () => {
		it('returns true for xterm', () => {
			const info = createTerminfo({ name: 'xterm' });
			expect(detectMouse(info)).toBe(true);
		});

		it('returns true when key_mouse is defined', () => {
			const info = createTerminfo({
				name: 'custom',
				strings: { key_mouse: '\\E[M' },
			});
			expect(detectMouse(info)).toBe(true);
		});

		it('returns false for vt100', () => {
			const info = createTerminfo({ name: 'vt100' });
			expect(detectMouse(info)).toBe(false);
		});
	});

	describe('detectFocusEvents', () => {
		it('returns true for modern terminals', () => {
			expect(detectFocusEvents(createTerminfo({ name: 'xterm' }))).toBe(true);
			expect(detectFocusEvents(createTerminfo({ name: 'kitty' }))).toBe(true);
		});

		it('returns false for basic terminals', () => {
			expect(detectFocusEvents(createTerminfo({ name: 'vt100' }))).toBe(false);
			expect(detectFocusEvents(createTerminfo({ name: 'linux' }))).toBe(false);
		});
	});

	describe('detectBracketedPaste', () => {
		it('returns true for modern terminals', () => {
			expect(detectBracketedPaste(createTerminfo({ name: 'xterm' }))).toBe(true);
			expect(detectBracketedPaste(createTerminfo({ name: 'tmux' }))).toBe(true);
		});

		it('returns false for basic terminals', () => {
			expect(detectBracketedPaste(createTerminfo({ name: 'vt100' }))).toBe(false);
		});
	});

	describe('detectTitle', () => {
		it('returns true when has_status_line is set', () => {
			const info = createTerminfo({ booleans: { has_status_line: true } });
			expect(detectTitle(info)).toBe(true);
		});

		it('returns true for xterm-like terminals', () => {
			expect(detectTitle(createTerminfo({ name: 'xterm' }))).toBe(true);
		});
	});

	describe('detectFeatures', () => {
		it('returns all feature flags', () => {
			process.env.LANG = 'en_US.UTF-8';
			const info = createTerminfo({
				strings: {
					enter_ca_mode: '\\E[?1049h',
					exit_ca_mode: '\\E[?1049l',
					acs_chars: 'llmmkkjj',
				},
			});

			const features = detectFeatures(info);

			expect(features.unicode).toBe(true);
			expect(features.colors).toBe(256);
			expect(features.alternateScreen).toBe(true);
			expect(features.acsc).toBeInstanceOf(Map);
		});
	});

	describe('detectModernProtocols', () => {
		it('detects Kitty protocols', () => {
			const info = createTerminfo({ name: 'xterm-kitty' });
			const protocols = detectModernProtocols(info);

			expect(protocols.kittyKeyboard).toBe(true);
			expect(protocols.kittyGraphics).toBe(true);
		});

		it('detects iTerm2 via env', () => {
			process.env.ITERM_SESSION_ID = '12345';
			const info = createTerminfo();
			const protocols = detectModernProtocols(info);

			expect(protocols.iterm2Images).toBe(true);
		});

		it('detects hyperlinks for modern terminals', () => {
			const info = createTerminfo({ name: 'wezterm' });
			const protocols = detectModernProtocols(info);

			expect(protocols.hyperlinks).toBe(true);
			expect(protocols.synchronizedOutput).toBe(true);
		});
	});

	describe('getFeatureSummary', () => {
		it('generates readable summary', () => {
			const info = createTerminfo();
			const features = detectFeatures(info);
			const summary = getFeatureSummary(features);

			expect(summary).toContain('Colors: 256');
			expect(summary).toContain('Unicode:');
			expect(summary).toContain('ACS:');
		});

		it('includes protocol info when provided', () => {
			const info = createTerminfo({ name: 'xterm-kitty' });
			const features = detectFeatures(info);
			const protocols = detectModernProtocols(info);
			const summary = getFeatureSummary(features, protocols);

			expect(summary).toContain('Modern protocols:');
			expect(summary).toContain('Kitty keyboard');
		});
	});
});
