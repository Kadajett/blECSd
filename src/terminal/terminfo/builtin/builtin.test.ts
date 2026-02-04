/**
 * Tests for builtin terminfo data.
 *
 * @module terminal/terminfo/builtin/builtin.test
 */

import { describe, expect, it } from 'vitest';
import {
	BUILTIN_TERMINALS,
	getBestBuiltinTerminfo,
	getBuiltinTerminfo,
	hasBuiltinTerminfo,
	LINUX,
	listBuiltinTerminals,
	SCREEN,
	SCREEN_256COLOR,
	TMUX,
	TMUX_256COLOR,
	VT100,
	VT220,
	XTERM,
	XTERM_16COLOR,
	XTERM_256COLOR,
} from './index';

describe('builtin terminfo', () => {
	describe('XTERM_256COLOR', () => {
		it('has correct name', () => {
			expect(XTERM_256COLOR.name).toBe('xterm-256color');
		});

		it('has 256 colors', () => {
			expect(XTERM_256COLOR.numbers.max_colors).toBe(256);
		});

		it('has standard cursor movement', () => {
			expect(XTERM_256COLOR.strings.cursor_address).toBe('\x1b[%i%p1%d;%p2%dH');
			expect(XTERM_256COLOR.strings.cursor_home).toBe('\x1b[H');
			expect(XTERM_256COLOR.strings.cursor_up).toBe('\x1b[A');
		});

		it('has color sequences', () => {
			expect(XTERM_256COLOR.strings.set_a_foreground).toContain('38;5;');
			expect(XTERM_256COLOR.strings.set_a_background).toContain('48;5;');
			expect(XTERM_256COLOR.strings.orig_pair).toBe('\x1b[39;49m');
		});

		it('has alternate screen', () => {
			expect(XTERM_256COLOR.strings.enter_ca_mode).toContain('\x1b[?1049h');
			expect(XTERM_256COLOR.strings.exit_ca_mode).toContain('\x1b[?1049l');
		});

		it('has text attributes', () => {
			expect(XTERM_256COLOR.strings.enter_bold_mode).toBe('\x1b[1m');
			expect(XTERM_256COLOR.strings.enter_underline_mode).toBe('\x1b[4m');
			expect(XTERM_256COLOR.strings.enter_reverse_mode).toBe('\x1b[7m');
		});

		it('has function keys', () => {
			expect(XTERM_256COLOR.strings.key_f1).toBe('\x1bOP');
			expect(XTERM_256COLOR.strings.key_f12).toBe('\x1b[24~');
		});

		it('has ACS characters', () => {
			expect(XTERM_256COLOR.strings.acs_chars).toBeDefined();
			expect(XTERM_256COLOR.strings.enter_alt_charset_mode).toBe('\x1b(0');
			expect(XTERM_256COLOR.strings.exit_alt_charset_mode).toBe('\x1b(B');
		});
	});

	describe('XTERM', () => {
		it('has 8 colors', () => {
			expect(XTERM.numbers.max_colors).toBe(8);
		});

		it('has simpler color sequences', () => {
			expect(XTERM.strings.set_a_foreground).toBe('\x1b[3%p1%dm');
			expect(XTERM.strings.set_a_background).toBe('\x1b[4%p1%dm');
		});
	});

	describe('XTERM_16COLOR', () => {
		it('has 16 colors', () => {
			expect(XTERM_16COLOR.numbers.max_colors).toBe(16);
		});
	});

	describe('VT100', () => {
		it('has correct name', () => {
			expect(VT100.name).toBe('vt100');
		});

		it('has no colors', () => {
			expect(VT100.numbers.max_colors).toBeUndefined();
		});

		it('has basic cursor movement', () => {
			expect(VT100.strings.cursor_address).toBe('\x1b[%i%p1%d;%p2%dH');
			expect(VT100.strings.cursor_home).toBe('\x1b[H');
		});

		it('has basic attributes', () => {
			expect(VT100.strings.enter_bold_mode).toBe('\x1b[1m');
			expect(VT100.strings.enter_reverse_mode).toBe('\x1b[7m');
		});
	});

	describe('VT220', () => {
		it('extends VT100', () => {
			expect(VT220.strings.cursor_address).toBe(VT100.strings.cursor_address);
		});

		it('has cursor visibility', () => {
			expect(VT220.strings.cursor_invisible).toBe('\x1b[?25l');
			expect(VT220.strings.cursor_normal).toBe('\x1b[?25h');
		});

		it('has insert/delete', () => {
			expect(VT220.strings.insert_character).toBe('\x1b[@');
			expect(VT220.strings.delete_character).toBe('\x1b[P');
		});
	});

	describe('SCREEN_256COLOR', () => {
		it('has correct name', () => {
			expect(SCREEN_256COLOR.name).toBe('screen-256color');
		});

		it('has 256 colors', () => {
			expect(SCREEN_256COLOR.numbers.max_colors).toBe(256);
		});

		it('has alternate screen', () => {
			expect(SCREEN_256COLOR.strings.enter_ca_mode).toBe('\x1b[?1049h');
		});
	});

	describe('SCREEN', () => {
		it('has 8 colors', () => {
			expect(SCREEN.numbers.max_colors).toBe(8);
		});
	});

	describe('TMUX_256COLOR', () => {
		it('has correct name', () => {
			expect(TMUX_256COLOR.name).toBe('tmux-256color');
		});

		it('has 256 colors', () => {
			expect(TMUX_256COLOR.numbers.max_colors).toBe(256);
		});
	});

	describe('TMUX', () => {
		it('has 256 colors (default)', () => {
			expect(TMUX.numbers.max_colors).toBe(256);
		});
	});

	describe('LINUX', () => {
		it('has correct name', () => {
			expect(LINUX.name).toBe('linux');
		});

		it('has 8 colors', () => {
			expect(LINUX.numbers.max_colors).toBe(8);
		});

		it('has 25 lines (standard console)', () => {
			expect(LINUX.numbers.lines).toBe(25);
		});

		it('has Linux-specific cursor sequences', () => {
			expect(LINUX.strings.cursor_invisible).toContain('\x1b[?1c');
		});

		it('has Linux function key sequences', () => {
			expect(LINUX.strings.key_f1).toBe('\x1b[[A');
			expect(LINUX.strings.key_f5).toBe('\x1b[[E');
		});
	});

	describe('BUILTIN_TERMINALS', () => {
		it('contains xterm variants', () => {
			expect(BUILTIN_TERMINALS.has('xterm')).toBe(true);
			expect(BUILTIN_TERMINALS.has('xterm-16color')).toBe(true);
			expect(BUILTIN_TERMINALS.has('xterm-256color')).toBe(true);
		});

		it('contains VT100 variants', () => {
			expect(BUILTIN_TERMINALS.has('vt100')).toBe(true);
			expect(BUILTIN_TERMINALS.has('vt220')).toBe(true);
		});

		it('contains screen variants', () => {
			expect(BUILTIN_TERMINALS.has('screen')).toBe(true);
			expect(BUILTIN_TERMINALS.has('screen-256color')).toBe(true);
		});

		it('contains tmux variants', () => {
			expect(BUILTIN_TERMINALS.has('tmux')).toBe(true);
			expect(BUILTIN_TERMINALS.has('tmux-256color')).toBe(true);
		});

		it('contains linux', () => {
			expect(BUILTIN_TERMINALS.has('linux')).toBe(true);
		});

		it('contains common aliases', () => {
			expect(BUILTIN_TERMINALS.has('konsole')).toBe(true);
			expect(BUILTIN_TERMINALS.has('gnome')).toBe(true);
			expect(BUILTIN_TERMINALS.has('putty')).toBe(true);
			expect(BUILTIN_TERMINALS.has('iterm2')).toBe(true);
			expect(BUILTIN_TERMINALS.has('alacritty')).toBe(true);
			expect(BUILTIN_TERMINALS.has('wezterm')).toBe(true);
		});
	});

	describe('getBuiltinTerminfo', () => {
		it('returns terminfo for known terminals', () => {
			const data = getBuiltinTerminfo('xterm-256color');
			expect(data).not.toBeNull();
			expect(data?.name).toBe('xterm-256color');
		});

		it('returns null for unknown terminals', () => {
			expect(getBuiltinTerminfo('unknown-terminal')).toBeNull();
		});
	});

	describe('hasBuiltinTerminfo', () => {
		it('returns true for known terminals', () => {
			expect(hasBuiltinTerminfo('xterm-256color')).toBe(true);
			expect(hasBuiltinTerminfo('linux')).toBe(true);
		});

		it('returns false for unknown terminals', () => {
			expect(hasBuiltinTerminfo('unknown-terminal')).toBe(false);
		});
	});

	describe('getBestBuiltinTerminfo', () => {
		it('returns exact match when available', () => {
			const data = getBestBuiltinTerminfo('xterm-256color');
			expect(data.name).toBe('xterm-256color');
		});

		it('falls back to base terminal for variants', () => {
			const data = getBestBuiltinTerminfo('xterm-256color-italic');
			expect(data.name).toBe('xterm-256color');
		});

		it('falls back to simpler variant', () => {
			const data = getBestBuiltinTerminfo('xterm-256color-something-extra');
			expect(data.name).toBe('xterm-256color');
		});

		it('falls back to base name', () => {
			const data = getBestBuiltinTerminfo('xterm-unknown-variant');
			expect(data.name).toBe('xterm');
		});

		it('falls back to xterm-256color for completely unknown', () => {
			const data = getBestBuiltinTerminfo('completely-unknown-terminal');
			expect(data.name).toBe('xterm-256color');
		});
	});

	describe('listBuiltinTerminals', () => {
		it('returns array of terminal names', () => {
			const list = listBuiltinTerminals();
			expect(Array.isArray(list)).toBe(true);
			expect(list.length).toBeGreaterThan(0);
		});

		it('includes common terminals', () => {
			const list = listBuiltinTerminals();
			expect(list).toContain('xterm');
			expect(list).toContain('xterm-256color');
			expect(list).toContain('linux');
		});
	});

	describe('data consistency', () => {
		it('all terminals have required fields', () => {
			for (const [, data] of BUILTIN_TERMINALS) {
				expect(data.name).toBeDefined();
				expect(data.names).toBeDefined();
				expect(Array.isArray(data.names)).toBe(true);
				expect(data.booleans).toBeDefined();
				expect(data.numbers).toBeDefined();
				expect(data.strings).toBeDefined();
			}
		});

		it('all terminals have cursor_address', () => {
			for (const [, data] of BUILTIN_TERMINALS) {
				expect(data.strings.cursor_address).toBeDefined();
			}
		});

		it('all terminals have clear_screen', () => {
			for (const [, data] of BUILTIN_TERMINALS) {
				expect(data.strings.clear_screen).toBeDefined();
			}
		});

		it('color terminals have color sequences', () => {
			const colorTerminals = ['xterm-256color', 'xterm-16color', 'xterm', 'linux'];
			for (const name of colorTerminals) {
				const data = BUILTIN_TERMINALS.get(name);
				expect(data?.strings.set_a_foreground).toBeDefined();
				expect(data?.strings.set_a_background).toBeDefined();
			}
		});
	});
});
