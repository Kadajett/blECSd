/**
 * Tests for mouse event parser
 */

import { describe, expect, it } from 'vitest';
import {
	FocusEventSchema,
	isMouseBuffer,
	MouseEventSchema,
	parseMouseSequence,
} from './mouseParser';

describe('parseMouseSequence', () => {
	describe('SGR protocol', () => {
		it('parses left button press', () => {
			// ESC [ < 0 ; 10 ; 20 M
			const buffer = new TextEncoder().encode('\x1b[<0;10;20M');
			const result = parseMouseSequence(buffer);

			expect(result).not.toBeNull();
			expect(result?.type).toBe('mouse');
			if (result?.type === 'mouse') {
				expect(result.event.x).toBe(9); // 0-indexed
				expect(result.event.y).toBe(19);
				expect(result.event.button).toBe('left');
				expect(result.event.action).toBe('press');
				expect(result.event.protocol).toBe('sgr');
			}
		});

		it('parses left button release', () => {
			// ESC [ < 0 ; 10 ; 20 m (lowercase m = release)
			const buffer = new TextEncoder().encode('\x1b[<0;10;20m');
			const result = parseMouseSequence(buffer);

			expect(result).not.toBeNull();
			if (result?.type === 'mouse') {
				expect(result.event.action).toBe('release');
			}
		});

		it('parses middle button press', () => {
			// Button 1 = middle
			const buffer = new TextEncoder().encode('\x1b[<1;5;5M');
			const result = parseMouseSequence(buffer);

			expect(result).not.toBeNull();
			if (result?.type === 'mouse') {
				expect(result.event.button).toBe('middle');
			}
		});

		it('parses right button press', () => {
			// Button 2 = right
			const buffer = new TextEncoder().encode('\x1b[<2;5;5M');
			const result = parseMouseSequence(buffer);

			expect(result).not.toBeNull();
			if (result?.type === 'mouse') {
				expect(result.event.button).toBe('right');
			}
		});

		it('parses wheel up', () => {
			// Button 64 = wheel up
			const buffer = new TextEncoder().encode('\x1b[<64;5;5M');
			const result = parseMouseSequence(buffer);

			expect(result).not.toBeNull();
			if (result?.type === 'mouse') {
				expect(result.event.button).toBe('wheelUp');
				expect(result.event.action).toBe('wheel');
			}
		});

		it('parses wheel down', () => {
			// Button 65 = wheel down
			const buffer = new TextEncoder().encode('\x1b[<65;5;5M');
			const result = parseMouseSequence(buffer);

			expect(result).not.toBeNull();
			if (result?.type === 'mouse') {
				expect(result.event.button).toBe('wheelDown');
				expect(result.event.action).toBe('wheel');
			}
		});

		it('parses with shift modifier', () => {
			// Button 4 = shift + left
			const buffer = new TextEncoder().encode('\x1b[<4;5;5M');
			const result = parseMouseSequence(buffer);

			expect(result).not.toBeNull();
			if (result?.type === 'mouse') {
				expect(result.event.shift).toBe(true);
				expect(result.event.ctrl).toBe(false);
				expect(result.event.meta).toBe(false);
			}
		});

		it('parses with ctrl modifier', () => {
			// Button 16 = ctrl + left
			const buffer = new TextEncoder().encode('\x1b[<16;5;5M');
			const result = parseMouseSequence(buffer);

			expect(result).not.toBeNull();
			if (result?.type === 'mouse') {
				expect(result.event.ctrl).toBe(true);
			}
		});

		it('parses movement', () => {
			// Button 35 = movement
			const buffer = new TextEncoder().encode('\x1b[<35;15;25M');
			const result = parseMouseSequence(buffer);

			expect(result).not.toBeNull();
			if (result?.type === 'mouse') {
				expect(result.event.action).toBe('move');
				expect(result.event.x).toBe(14);
				expect(result.event.y).toBe(24);
			}
		});
	});

	describe('X10 protocol', () => {
		it('parses left button press', () => {
			// ESC [ M button x y (all +32 offset)
			// button 0 + 32 = 32 (' ')
			// x 10 + 32 = 42 ('*')
			// y 20 + 32 = 52 ('4')
			const buffer = new Uint8Array([0x1b, 0x5b, 0x4d, 0x20, 0x2a, 0x34]);
			const result = parseMouseSequence(buffer);

			expect(result).not.toBeNull();
			expect(result?.type).toBe('mouse');
			if (result?.type === 'mouse') {
				expect(result.event.button).toBe('left');
				expect(result.event.action).toBe('press');
				expect(result.event.protocol).toBe('x10');
				expect(result.event.x).toBe(9); // 10 - 1 for 0-index
				expect(result.event.y).toBe(19);
			}
		});

		it('parses button release', () => {
			// button 3 + 32 = 35 ('#')
			const buffer = new Uint8Array([0x1b, 0x5b, 0x4d, 0x23, 0x2a, 0x34]);
			const result = parseMouseSequence(buffer);

			expect(result).not.toBeNull();
			if (result?.type === 'mouse') {
				expect(result.event.action).toBe('release');
				expect(result.event.button).toBe('unknown'); // X10 doesn't report which button
			}
		});
	});

	describe('URXVT protocol', () => {
		it('parses left button press', () => {
			// ESC [ button ; x ; y M
			const buffer = new TextEncoder().encode('\x1b[32;10;20M');
			const result = parseMouseSequence(buffer);

			expect(result).not.toBeNull();
			expect(result?.type).toBe('mouse');
			if (result?.type === 'mouse') {
				expect(result.event.button).toBe('left');
				expect(result.event.action).toBe('press');
				expect(result.event.protocol).toBe('urxvt');
				expect(result.event.x).toBe(9);
				expect(result.event.y).toBe(19);
			}
		});

		it('parses release', () => {
			// button 35 = release
			const buffer = new TextEncoder().encode('\x1b[35;10;20M');
			const result = parseMouseSequence(buffer);

			expect(result).not.toBeNull();
			if (result?.type === 'mouse') {
				expect(result.event.action).toBe('release');
			}
		});
	});

	describe('focus events', () => {
		it('parses focus in', () => {
			const buffer = new TextEncoder().encode('\x1b[I');
			const result = parseMouseSequence(buffer);

			expect(result).not.toBeNull();
			expect(result?.type).toBe('focus');
			if (result?.type === 'focus') {
				expect(result.event.focused).toBe(true);
			}
		});

		it('parses focus out', () => {
			const buffer = new TextEncoder().encode('\x1b[O');
			const result = parseMouseSequence(buffer);

			expect(result).not.toBeNull();
			expect(result?.type).toBe('focus');
			if (result?.type === 'focus') {
				expect(result.event.focused).toBe(false);
			}
		});
	});

	describe('edge cases', () => {
		it('returns null for empty buffer', () => {
			const result = parseMouseSequence(new Uint8Array(0));
			expect(result).toBeNull();
		});

		it('returns null for short buffer', () => {
			const result = parseMouseSequence(new Uint8Array([0x1b, 0x5b]));
			expect(result).toBeNull();
		});

		it('returns null for non-mouse sequence', () => {
			// Up arrow
			const result = parseMouseSequence(new Uint8Array([0x1b, 0x5b, 0x41]));
			expect(result).toBeNull();
		});

		it('returns null for non-escape sequence', () => {
			const result = parseMouseSequence(new TextEncoder().encode('hello'));
			expect(result).toBeNull();
		});

		it('includes raw buffer in event', () => {
			const buffer = new TextEncoder().encode('\x1b[<0;10;20M');
			const result = parseMouseSequence(buffer);

			expect(result).not.toBeNull();
			if (result?.type === 'mouse') {
				expect(result.event.raw).toBe(buffer);
			}
		});
	});
});

describe('isMouseBuffer', () => {
	it('returns true for SGR mouse sequence', () => {
		const buffer = new TextEncoder().encode('\x1b[<0;10;20M');
		expect(isMouseBuffer(buffer)).toBe(true);
	});

	it('returns true for X10 mouse sequence', () => {
		const buffer = new Uint8Array([0x1b, 0x5b, 0x4d, 0x20, 0x2a, 0x34]);
		expect(isMouseBuffer(buffer)).toBe(true);
	});

	it('returns true for focus event', () => {
		const buffer = new TextEncoder().encode('\x1b[I');
		expect(isMouseBuffer(buffer)).toBe(true);
	});

	it('returns false for key sequence', () => {
		const buffer = new Uint8Array([0x1b, 0x5b, 0x41]); // Up arrow
		expect(isMouseBuffer(buffer)).toBe(false);
	});

	it('returns false for regular text', () => {
		const buffer = new TextEncoder().encode('hello');
		expect(isMouseBuffer(buffer)).toBe(false);
	});
});

describe('MouseEventSchema', () => {
	it('validates a valid MouseEvent', () => {
		const event = {
			x: 10,
			y: 20,
			button: 'left' as const,
			action: 'press' as const,
			ctrl: false,
			meta: false,
			shift: false,
			protocol: 'sgr' as const,
			raw: new Uint8Array([0x1b]),
		};

		const result = MouseEventSchema.safeParse(event);
		expect(result.success).toBe(true);
	});

	it('rejects negative coordinates', () => {
		const event = {
			x: -1,
			y: 20,
			button: 'left' as const,
			action: 'press' as const,
			ctrl: false,
			meta: false,
			shift: false,
			protocol: 'sgr' as const,
			raw: new Uint8Array([0x1b]),
		};

		const result = MouseEventSchema.safeParse(event);
		expect(result.success).toBe(false);
	});

	it('rejects invalid button', () => {
		const event = {
			x: 10,
			y: 20,
			button: 'invalid' as never,
			action: 'press' as const,
			ctrl: false,
			meta: false,
			shift: false,
			protocol: 'sgr' as const,
			raw: new Uint8Array([0x1b]),
		};

		const result = MouseEventSchema.safeParse(event);
		expect(result.success).toBe(false);
	});
});

describe('FocusEventSchema', () => {
	it('validates a valid FocusEvent', () => {
		const event = {
			focused: true,
			raw: new Uint8Array([0x1b, 0x5b, 0x49]),
		};

		const result = FocusEventSchema.safeParse(event);
		expect(result.success).toBe(true);
	});

	it('rejects missing focused field', () => {
		const event = {
			raw: new Uint8Array([0x1b]),
		};

		const result = FocusEventSchema.safeParse(event);
		expect(result.success).toBe(false);
	});
});
