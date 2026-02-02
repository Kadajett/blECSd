/**
 * Tput module tests.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
	createTput,
	getDefaultTput,
	getDefaultXtermData,
	resetDefaultTput,
	type TerminfoData,
	type Tput,
} from './tput';

describe('tput', () => {
	describe('createTput', () => {
		it('should create a tput instance with default config', () => {
			const tput = createTput();

			expect(tput).toBeDefined();
			expect(tput.terminal).toBe(process.env.TERM ?? 'xterm-256color');
			expect(tput.data).toBeDefined();
		});

		it('should create a tput instance with custom terminal', () => {
			const tput = createTput({ terminal: 'vt100' });

			expect(tput.terminal).toBe('vt100');
		});

		it('should create a tput instance with custom data', () => {
			const customData: TerminfoData = {
				name: 'custom',
				names: ['custom'],
				description: 'Custom terminal',
				booleans: { auto_right_margin: true },
				numbers: { max_colors: 16 },
				strings: { clear_screen: '\x1b[2J' },
			};

			const tput = createTput({ data: customData });

			expect(tput.data.name).toBe('custom');
			expect(tput.getNumber('max_colors')).toBe(16);
		});
	});

	describe('has', () => {
		let tput: Tput;

		beforeEach(() => {
			tput = createTput();
		});

		it('should return true for present boolean capabilities', () => {
			expect(tput.has('auto_right_margin')).toBe(true);
			expect(tput.has('has_meta_key')).toBe(true);
		});

		it('should return false for absent boolean capabilities', () => {
			expect(tput.has('auto_left_margin')).toBe(false);
		});
	});

	describe('getNumber', () => {
		let tput: Tput;

		beforeEach(() => {
			tput = createTput();
		});

		it('should return numeric capability value', () => {
			expect(tput.getNumber('max_colors')).toBe(256);
			expect(tput.getNumber('columns')).toBe(80);
			expect(tput.getNumber('lines')).toBe(24);
		});

		it('should return null for absent numeric capabilities', () => {
			expect(tput.getNumber('buttons')).toBeNull();
		});
	});

	describe('getString', () => {
		let tput: Tput;

		beforeEach(() => {
			tput = createTput();
		});

		it('should return string capability value', () => {
			const clearScreen = tput.getString('clear_screen');
			expect(clearScreen).toBeDefined();
			expect(clearScreen).toContain('\x1b[');
		});

		it('should return cursor movement sequences', () => {
			expect(tput.getString('cursor_home')).toBe('\x1b[H');
			expect(tput.getString('cursor_down')).toBe('\n');
			expect(tput.getString('cursor_left')).toBe('\b');
		});

		it('should return attribute sequences', () => {
			expect(tput.getString('enter_bold_mode')).toBe('\x1b[1m');
			expect(tput.getString('enter_underline_mode')).toBe('\x1b[4m');
			expect(tput.getString('enter_reverse_mode')).toBe('\x1b[7m');
		});

		it('should return null for absent string capabilities', () => {
			// Using a capability not in our data
			const customData: TerminfoData = {
				name: 'minimal',
				names: ['minimal'],
				description: 'Minimal',
				booleans: {},
				numbers: {},
				strings: {},
			};
			const minimalTput = createTput({ data: customData });

			expect(minimalTput.getString('clear_screen')).toBeNull();
		});
	});

	describe('tparm', () => {
		let tput: Tput;

		beforeEach(() => {
			tput = createTput();
		});

		it('should process cursor_address with %i', () => {
			// cursor_address uses %i to increment params by 1
			const seq = tput.tparm('cursor_address', 0, 0);
			expect(seq).toBe('\x1b[1;1H');

			const seq2 = tput.tparm('cursor_address', 10, 20);
			expect(seq2).toBe('\x1b[11;21H');
		});

		it('should return null for absent capability', () => {
			const customData: TerminfoData = {
				name: 'minimal',
				names: ['minimal'],
				description: 'Minimal',
				booleans: {},
				numbers: {},
				strings: {},
			};
			const minimalTput = createTput({ data: customData });

			expect(minimalTput.tparm('cursor_address', 0, 0)).toBeNull();
		});

		it('should process parm_insert_line', () => {
			const seq = tput.tparm('parm_insert_line', 5);
			expect(seq).toBe('\x1b[5L');
		});

		it('should process parm_delete_line', () => {
			const seq = tput.tparm('parm_delete_line', 3);
			expect(seq).toBe('\x1b[3M');
		});
	});

	describe('cup', () => {
		let tput: Tput;

		beforeEach(() => {
			tput = createTput();
		});

		it('should generate cursor position sequence', () => {
			const seq = tput.cup(0, 0);
			expect(seq).toBe('\x1b[1;1H');
		});

		it('should handle non-zero positions', () => {
			const seq = tput.cup(10, 20);
			expect(seq).toBe('\x1b[11;21H');
		});

		it('should fallback when capability missing', () => {
			const customData: TerminfoData = {
				name: 'minimal',
				names: ['minimal'],
				description: 'Minimal',
				booleans: {},
				numbers: {},
				strings: {},
			};
			const minimalTput = createTput({ data: customData });

			// Fallback should work
			const seq = minimalTput.cup(5, 10);
			expect(seq).toBe('\x1b[6;11H');
		});
	});

	describe('sgr', () => {
		let tput: Tput;

		beforeEach(() => {
			tput = createTput();
		});

		it('should generate SGR sequence', () => {
			expect(tput.sgr(0)).toBe('\x1b[0m');
			expect(tput.sgr(1)).toBe('\x1b[1m');
			expect(tput.sgr(4)).toBe('\x1b[4m');
		});
	});

	describe('setaf', () => {
		let tput: Tput;

		beforeEach(() => {
			tput = createTput();
		});

		it('should generate foreground color for basic colors', () => {
			// Basic colors (0-7) should use 3x format
			expect(tput.setaf(0)).toContain('0');
			expect(tput.setaf(1)).toContain('1');
		});

		it('should generate foreground color for 256 colors', () => {
			// 256-color mode should use 38;5;x format
			const seq = tput.setaf(100);
			expect(seq).toContain('100');
		});

		it('should fallback when capability missing', () => {
			const customData: TerminfoData = {
				name: 'minimal',
				names: ['minimal'],
				description: 'Minimal',
				booleans: {},
				numbers: {},
				strings: {},
			};
			const minimalTput = createTput({ data: customData });

			// Fallback should work for basic colors
			expect(minimalTput.setaf(1)).toBe('\x1b[31m');
			expect(minimalTput.setaf(9)).toBe('\x1b[91m');
			expect(minimalTput.setaf(100)).toBe('\x1b[38;5;100m');
		});
	});

	describe('setab', () => {
		let tput: Tput;

		beforeEach(() => {
			tput = createTput();
		});

		it('should generate background color for basic colors', () => {
			// Basic colors (0-7) should use 4x format
			expect(tput.setab(0)).toContain('0');
			expect(tput.setab(1)).toContain('1');
		});

		it('should generate background color for 256 colors', () => {
			const seq = tput.setab(200);
			expect(seq).toContain('200');
		});

		it('should fallback when capability missing', () => {
			const customData: TerminfoData = {
				name: 'minimal',
				names: ['minimal'],
				description: 'Minimal',
				booleans: {},
				numbers: {},
				strings: {},
			};
			const minimalTput = createTput({ data: customData });

			// Fallback should work for basic colors
			expect(minimalTput.setab(1)).toBe('\x1b[41m');
			expect(minimalTput.setab(9)).toBe('\x1b[101m');
			expect(minimalTput.setab(200)).toBe('\x1b[48;5;200m');
		});
	});

	describe('getDefaultTput', () => {
		afterEach(() => {
			resetDefaultTput();
		});

		it('should return same instance on multiple calls', () => {
			const tput1 = getDefaultTput();
			const tput2 = getDefaultTput();

			expect(tput1).toBe(tput2);
		});

		it('should return new instance after reset', () => {
			const tput1 = getDefaultTput();
			resetDefaultTput();
			const tput2 = getDefaultTput();

			expect(tput1).not.toBe(tput2);
		});
	});

	describe('getDefaultXtermData', () => {
		it('should return default xterm data', () => {
			const data = getDefaultXtermData();

			expect(data.name).toBe('xterm-256color');
			expect(data.numbers.max_colors).toBe(256);
			expect(data.strings.clear_screen).toBeDefined();
		});
	});

	describe('parameter processing', () => {
		let tput: Tput;

		beforeEach(() => {
			const customData: TerminfoData = {
				name: 'test',
				names: ['test'],
				description: 'Test terminal',
				booleans: {},
				numbers: {},
				strings: {
					// Simple parameter
					simple: 'value=%p1%d',
					// Multiple parameters
					multi: 'a=%p1%d,b=%p2%d',
					// Increment
					incr: '%i%p1%d;%p2%d',
					// Integer constant
					const_add: '%p1%{10}%+%d',
					// Conditional
					cond: '%?%p1%{5}%<%ttrue%efalse%;',
					// Character output
					char: '%p1%c',
					// Literal percent
					percent: '%%',
				},
			};
			tput = createTput({ data: customData });
		});

		it('should handle simple parameter substitution', () => {
			expect(tput.tparm('simple' as never, 42)).toBe('value=42');
		});

		it('should handle multiple parameters', () => {
			expect(tput.tparm('multi' as never, 1, 2)).toBe('a=1,b=2');
		});

		it('should handle %i increment', () => {
			expect(tput.tparm('incr' as never, 0, 0)).toBe('1;1');
		});

		it('should handle integer constant and addition', () => {
			expect(tput.tparm('const_add' as never, 5)).toBe('15');
		});

		it('should handle conditional', () => {
			expect(tput.tparm('cond' as never, 3)).toBe('true');
			expect(tput.tparm('cond' as never, 10)).toBe('false');
		});

		it('should handle character output', () => {
			expect(tput.tparm('char' as never, 65)).toBe('A');
		});

		it('should handle literal percent', () => {
			expect(tput.tparm('percent' as never)).toBe('%');
		});
	});
});
