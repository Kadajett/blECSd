/**
 * Tests for key event parser
 */

import { describe, expect, it } from 'vitest';
import { isMouseSequence, KeyEventSchema, parseKeyBuffer, parseKeySequence } from './keyParser';

describe('parseKeySequence', () => {
	describe('regular characters', () => {
		it('parses lowercase letters', () => {
			const event = parseKeySequence(new TextEncoder().encode('a'));
			expect(event).not.toBeNull();
			expect(event?.name).toBe('a');
			expect(event?.ctrl).toBe(false);
			expect(event?.meta).toBe(false);
			expect(event?.shift).toBe(false);
		});

		it('parses uppercase letters with shift', () => {
			const event = parseKeySequence(new TextEncoder().encode('A'));
			expect(event).not.toBeNull();
			expect(event?.name).toBe('a');
			expect(event?.shift).toBe(true);
		});

		it('parses numbers', () => {
			const event = parseKeySequence(new TextEncoder().encode('5'));
			expect(event).not.toBeNull();
			expect(event?.name).toBe('5');
		});

		it('parses punctuation', () => {
			const event = parseKeySequence(new TextEncoder().encode('!'));
			expect(event).not.toBeNull();
			expect(event?.name).toBe('!');
		});
	});

	describe('control characters', () => {
		it('parses Ctrl+A (0x01)', () => {
			const event = parseKeySequence(new Uint8Array([0x01]));
			expect(event).not.toBeNull();
			expect(event?.name).toBe('a');
			expect(event?.ctrl).toBe(true);
		});

		it('parses Ctrl+C (0x03)', () => {
			const event = parseKeySequence(new Uint8Array([0x03]));
			expect(event).not.toBeNull();
			expect(event?.name).toBe('c');
			expect(event?.ctrl).toBe(true);
		});

		it('parses Ctrl+Z (0x1a)', () => {
			const event = parseKeySequence(new Uint8Array([0x1a]));
			expect(event).not.toBeNull();
			expect(event?.name).toBe('z');
			expect(event?.ctrl).toBe(true);
		});
	});

	describe('special keys', () => {
		it('parses carriage return', () => {
			const event = parseKeySequence(new TextEncoder().encode('\r'));
			expect(event).not.toBeNull();
			expect(event?.name).toBe('return');
		});

		it('parses enter/linefeed', () => {
			const event = parseKeySequence(new TextEncoder().encode('\n'));
			expect(event).not.toBeNull();
			expect(event?.name).toBe('enter');
		});

		it('parses tab', () => {
			const event = parseKeySequence(new TextEncoder().encode('\t'));
			expect(event).not.toBeNull();
			expect(event?.name).toBe('tab');
		});

		it('parses backspace (0x7f)', () => {
			const event = parseKeySequence(new Uint8Array([0x7f]));
			expect(event).not.toBeNull();
			expect(event?.name).toBe('backspace');
		});

		it('parses backspace (0x08)', () => {
			const event = parseKeySequence(new Uint8Array([0x08]));
			expect(event).not.toBeNull();
			expect(event?.name).toBe('backspace');
		});

		it('parses escape', () => {
			const event = parseKeySequence(new Uint8Array([0x1b]));
			expect(event).not.toBeNull();
			expect(event?.name).toBe('escape');
		});

		it('parses meta+escape (double escape)', () => {
			const event = parseKeySequence(new Uint8Array([0x1b, 0x1b]));
			expect(event).not.toBeNull();
			expect(event?.name).toBe('escape');
			expect(event?.meta).toBe(true);
		});

		it('parses space', () => {
			const event = parseKeySequence(new TextEncoder().encode(' '));
			expect(event).not.toBeNull();
			expect(event?.name).toBe('space');
		});

		it('parses meta+space', () => {
			const event = parseKeySequence(new TextEncoder().encode('\x1b '));
			expect(event).not.toBeNull();
			expect(event?.name).toBe('space');
			expect(event?.meta).toBe(true);
		});

		it('parses meta+backspace', () => {
			const event = parseKeySequence(new Uint8Array([0x1b, 0x7f]));
			expect(event).not.toBeNull();
			expect(event?.name).toBe('backspace');
			expect(event?.meta).toBe(true);
		});
	});

	describe('arrow keys', () => {
		it('parses up arrow (ESC [ A)', () => {
			const event = parseKeySequence(new Uint8Array([0x1b, 0x5b, 0x41]));
			expect(event).not.toBeNull();
			expect(event?.name).toBe('up');
		});

		it('parses down arrow (ESC [ B)', () => {
			const event = parseKeySequence(new Uint8Array([0x1b, 0x5b, 0x42]));
			expect(event).not.toBeNull();
			expect(event?.name).toBe('down');
		});

		it('parses right arrow (ESC [ C)', () => {
			const event = parseKeySequence(new Uint8Array([0x1b, 0x5b, 0x43]));
			expect(event).not.toBeNull();
			expect(event?.name).toBe('right');
		});

		it('parses left arrow (ESC [ D)', () => {
			const event = parseKeySequence(new Uint8Array([0x1b, 0x5b, 0x44]));
			expect(event).not.toBeNull();
			expect(event?.name).toBe('left');
		});

		it('parses up arrow (ESC O A)', () => {
			const event = parseKeySequence(new Uint8Array([0x1b, 0x4f, 0x41]));
			expect(event).not.toBeNull();
			expect(event?.name).toBe('up');
		});
	});

	describe('function keys', () => {
		it('parses F1 (ESC O P)', () => {
			const event = parseKeySequence(new Uint8Array([0x1b, 0x4f, 0x50]));
			expect(event).not.toBeNull();
			expect(event?.name).toBe('f1');
		});

		it('parses F2 (ESC O Q)', () => {
			const event = parseKeySequence(new Uint8Array([0x1b, 0x4f, 0x51]));
			expect(event).not.toBeNull();
			expect(event?.name).toBe('f2');
		});

		it('parses F3 (ESC O R)', () => {
			const event = parseKeySequence(new Uint8Array([0x1b, 0x4f, 0x52]));
			expect(event).not.toBeNull();
			expect(event?.name).toBe('f3');
		});

		it('parses F4 (ESC O S)', () => {
			const event = parseKeySequence(new Uint8Array([0x1b, 0x4f, 0x53]));
			expect(event).not.toBeNull();
			expect(event?.name).toBe('f4');
		});

		it('parses F5 (ESC [ 1 5 ~)', () => {
			const event = parseKeySequence(new TextEncoder().encode('\x1b[15~'));
			expect(event).not.toBeNull();
			expect(event?.name).toBe('f5');
		});

		it('parses F12 (ESC [ 2 4 ~)', () => {
			const event = parseKeySequence(new TextEncoder().encode('\x1b[24~'));
			expect(event).not.toBeNull();
			expect(event?.name).toBe('f12');
		});
	});

	describe('navigation keys', () => {
		it('parses home (ESC [ H)', () => {
			const event = parseKeySequence(new Uint8Array([0x1b, 0x5b, 0x48]));
			expect(event).not.toBeNull();
			expect(event?.name).toBe('home');
		});

		it('parses end (ESC [ F)', () => {
			const event = parseKeySequence(new Uint8Array([0x1b, 0x5b, 0x46]));
			expect(event).not.toBeNull();
			expect(event?.name).toBe('end');
		});

		it('parses insert (ESC [ 2 ~)', () => {
			const event = parseKeySequence(new TextEncoder().encode('\x1b[2~'));
			expect(event).not.toBeNull();
			expect(event?.name).toBe('insert');
		});

		it('parses delete (ESC [ 3 ~)', () => {
			const event = parseKeySequence(new TextEncoder().encode('\x1b[3~'));
			expect(event).not.toBeNull();
			expect(event?.name).toBe('delete');
		});

		it('parses pageup (ESC [ 5 ~)', () => {
			const event = parseKeySequence(new TextEncoder().encode('\x1b[5~'));
			expect(event).not.toBeNull();
			expect(event?.name).toBe('pageup');
		});

		it('parses pagedown (ESC [ 6 ~)', () => {
			const event = parseKeySequence(new TextEncoder().encode('\x1b[6~'));
			expect(event).not.toBeNull();
			expect(event?.name).toBe('pagedown');
		});
	});

	describe('modifier combinations', () => {
		it('parses meta+letter', () => {
			const event = parseKeySequence(new TextEncoder().encode('\x1ba'));
			expect(event).not.toBeNull();
			expect(event?.name).toBe('a');
			expect(event?.meta).toBe(true);
		});

		it('parses shift+tab (ESC [ Z)', () => {
			const event = parseKeySequence(new Uint8Array([0x1b, 0x5b, 0x5a]));
			expect(event).not.toBeNull();
			expect(event?.name).toBe('tab');
			expect(event?.shift).toBe(true);
		});

		it('parses ctrl+up (ESC O a for rxvt)', () => {
			const event = parseKeySequence(new TextEncoder().encode('\x1bOa'));
			expect(event).not.toBeNull();
			expect(event?.name).toBe('up');
			expect(event?.ctrl).toBe(true);
		});

		it('parses shift+up (ESC [ a for rxvt)', () => {
			const event = parseKeySequence(new TextEncoder().encode('\x1b[a'));
			expect(event).not.toBeNull();
			expect(event?.name).toBe('up');
			expect(event?.shift).toBe(true);
		});
	});

	describe('edge cases', () => {
		it('returns null for empty buffer', () => {
			const event = parseKeySequence(new Uint8Array(0));
			expect(event).toBeNull();
		});

		it('includes raw buffer in event', () => {
			const raw = new Uint8Array([0x1b, 0x5b, 0x41]);
			const event = parseKeySequence(raw);
			expect(event?.raw).toBe(raw);
		});

		it('includes sequence string in event', () => {
			const event = parseKeySequence(new TextEncoder().encode('\x1b[A'));
			expect(event?.sequence).toBe('\x1b[A');
		});
	});
});

describe('parseKeyBuffer', () => {
	it('parses multiple characters', () => {
		const events = parseKeyBuffer(new TextEncoder().encode('abc'));
		expect(events).toHaveLength(3);
		expect(events[0]?.name).toBe('a');
		expect(events[1]?.name).toBe('b');
		expect(events[2]?.name).toBe('c');
	});

	it('handles mixed escape sequences and characters', () => {
		// 'a' + Up arrow + 'b'
		const buffer = new Uint8Array([
			0x61, // 'a'
			0x1b,
			0x5b,
			0x41, // Up
			0x62, // 'b'
		]);
		const events = parseKeyBuffer(buffer);
		expect(events).toHaveLength(3);
		expect(events[0]?.name).toBe('a');
		expect(events[1]?.name).toBe('up');
		expect(events[2]?.name).toBe('b');
	});

	it('returns empty array for empty buffer', () => {
		const events = parseKeyBuffer(new Uint8Array(0));
		expect(events).toHaveLength(0);
	});
});

describe('isMouseSequence', () => {
	it('detects X10/X11 mouse sequence', () => {
		// ESC [ M
		const buffer = new Uint8Array([0x1b, 0x5b, 0x4d, 0x20, 0x30, 0x30]);
		expect(isMouseSequence(buffer)).toBe(true);
	});

	it('detects SGR mouse sequence', () => {
		// ESC [ <
		const buffer = new Uint8Array([0x1b, 0x5b, 0x3c, 0x30, 0x3b, 0x31]);
		expect(isMouseSequence(buffer)).toBe(true);
	});

	it('does not detect regular escape sequence', () => {
		// ESC [ A (up arrow)
		const buffer = new Uint8Array([0x1b, 0x5b, 0x41]);
		expect(isMouseSequence(buffer)).toBe(false);
	});

	it('returns false for short buffer', () => {
		const buffer = new Uint8Array([0x1b, 0x5b]);
		expect(isMouseSequence(buffer)).toBe(false);
	});
});

describe('KeyEventSchema', () => {
	it('validates a valid KeyEvent', () => {
		const event = {
			sequence: 'a',
			name: 'a' as const,
			ctrl: false,
			meta: false,
			shift: false,
			raw: new Uint8Array([0x61]),
		};

		const result = KeyEventSchema.safeParse(event);
		expect(result.success).toBe(true);
	});

	it('validates a KeyEvent with code', () => {
		const event = {
			sequence: '\x1b[A',
			name: 'up' as const,
			ctrl: false,
			meta: false,
			shift: false,
			code: '[A',
			raw: new Uint8Array([0x1b, 0x5b, 0x41]),
		};

		const result = KeyEventSchema.safeParse(event);
		expect(result.success).toBe(true);
	});

	it('rejects invalid key name', () => {
		const event = {
			sequence: 'x',
			name: 'invalid' as never,
			ctrl: false,
			meta: false,
			shift: false,
			raw: new Uint8Array([0x78]),
		};

		const result = KeyEventSchema.safeParse(event);
		expect(result.success).toBe(false);
	});

	it('rejects missing required fields', () => {
		const event = {
			sequence: 'a',
			name: 'a' as const,
		};

		const result = KeyEventSchema.safeParse(event);
		expect(result.success).toBe(false);
	});
});
