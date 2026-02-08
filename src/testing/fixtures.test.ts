/**
 * Tests for test fixtures to ensure they have expected values.
 */

import { describe, expect, it } from 'vitest';
import {
	ANSI,
	ANSI_TEXT,
	BORDER_CONFIG_DEFAULT,
	BORDER_CONFIG_HORIZONTAL,
	BORDER_CONFIG_VERTICAL,
	COLOR_PAIRS,
	COLORS,
	COLORS_RGBA,
	KEYS,
	MOUSE_POSITIONS,
	PADDING_CONFIG_DEFAULT,
	PADDING_CONFIG_HORIZONTAL,
	PADDING_CONFIG_SYMMETRIC,
	PADDING_CONFIG_VERTICAL,
	POSITION_CENTER,
	POSITION_ORIGIN,
	SCREEN_10X5,
	SCREEN_40X12,
	SCREEN_80X24,
	SCREEN_120X40,
	SCROLLABLE_CONFIG_DEFAULT,
	SIZE_BUTTON,
	SIZE_LARGE_BOX,
	SIZE_MEDIUM_BOX,
	SIZE_SMALL_BOX,
	TEXT_EMPTY,
	TEXT_HELLO,
	TEXT_HELLO_WORLD,
	TEXT_HELLO_WORLD_ALT,
	TEXT_LONG_WRAP,
	TEXT_LOREM_IPSUM,
	TEXT_MULTILINE,
	TEXT_MULTILINE_VARIED,
	TEXT_SINGLE_LINE,
	TEXT_TEST,
	TEXT_UNICODE_CJK,
	TEXT_UNICODE_EMOJI,
	TIMEOUTS,
} from './fixtures';

describe('Test Fixtures', () => {
	describe('Screen Dimensions', () => {
		it('defines standard 80x24 screen', () => {
			expect(SCREEN_80X24).toEqual({ width: 80, height: 24 });
		});

		it('defines small screen', () => {
			expect(SCREEN_40X12).toEqual({ width: 40, height: 12 });
		});

		it('defines large screen', () => {
			expect(SCREEN_120X40).toEqual({ width: 120, height: 40 });
		});

		it('defines minimal screen', () => {
			expect(SCREEN_10X5).toEqual({ width: 10, height: 5 });
		});
	});

	describe('Positions and Sizes', () => {
		it('defines origin position', () => {
			expect(POSITION_ORIGIN).toEqual({ x: 0, y: 0 });
		});

		it('defines center position', () => {
			expect(POSITION_CENTER).toEqual({ x: 40, y: 12 });
		});

		it('defines small box size', () => {
			expect(SIZE_SMALL_BOX).toEqual({ width: 10, height: 5 });
		});

		it('defines medium box size', () => {
			expect(SIZE_MEDIUM_BOX).toEqual({ width: 20, height: 10 });
		});

		it('defines large box size', () => {
			expect(SIZE_LARGE_BOX).toEqual({ width: 40, height: 20 });
		});

		it('defines button size', () => {
			expect(SIZE_BUTTON).toEqual({ width: 10, height: 3 });
		});
	});

	describe('Text Content', () => {
		it('defines hello text', () => {
			expect(TEXT_HELLO).toBe('Hello');
		});

		it('defines hello world text', () => {
			expect(TEXT_HELLO_WORLD).toBe('Hello, World!');
		});

		it('defines alternative hello world', () => {
			expect(TEXT_HELLO_WORLD_ALT).toBe('Hello World');
		});

		it('defines test text', () => {
			expect(TEXT_TEST).toBe('Test');
		});

		it('defines single line text', () => {
			expect(TEXT_SINGLE_LINE).toBe('This is a single line of text');
		});

		it('defines multiline text', () => {
			expect(TEXT_MULTILINE).toBe('Line 1\nLine 2\nLine 3');
			expect(TEXT_MULTILINE.split('\n')).toHaveLength(3);
		});

		it('defines multiline varied text', () => {
			expect(TEXT_MULTILINE_VARIED).toBe('Hi\nHello World\nBye');
		});

		it('defines lorem ipsum', () => {
			expect(TEXT_LOREM_IPSUM).toContain('Lorem ipsum');
		});

		it('defines long wrap text', () => {
			expect(TEXT_LONG_WRAP.length).toBeGreaterThan(80);
		});

		it('defines unicode emoji text', () => {
			expect(TEXT_UNICODE_EMOJI).toBe('Hello 👋 World 🌍');
		});

		it('defines unicode CJK text', () => {
			expect(TEXT_UNICODE_CJK).toBe('你好世界');
		});

		it('defines empty text', () => {
			expect(TEXT_EMPTY).toBe('');
		});
	});

	describe('Colors', () => {
		it('defines standard colors', () => {
			expect(COLORS.WHITE).toBe(0xffffff);
			expect(COLORS.BLACK).toBe(0x000000);
			expect(COLORS.RED).toBe(0xff0000);
			expect(COLORS.GREEN).toBe(0x00ff00);
			expect(COLORS.BLUE).toBe(0x0000ff);
		});

		it('defines RGBA colors', () => {
			expect(COLORS_RGBA.WHITE).toBe(0xffffffff);
			expect(COLORS_RGBA.TRANSPARENT).toBe(0x00000000);
		});

		it('defines color pairs', () => {
			expect(COLOR_PAIRS.WHITE_ON_BLACK).toEqual({
				fg: 0xffffff,
				bg: 0x000000,
			});
			expect(COLOR_PAIRS.GREEN_ON_BLACK).toEqual({
				fg: 0x00ff00,
				bg: 0x000000,
			});
		});
	});

	describe('Widget Configurations', () => {
		it('defines default border config', () => {
			expect(BORDER_CONFIG_DEFAULT).toEqual({
				type: 0,
				left: true,
				right: true,
				top: true,
				bottom: true,
			});
		});

		it('defines horizontal border config', () => {
			expect(BORDER_CONFIG_HORIZONTAL).toEqual({
				type: 0,
				left: false,
				right: false,
				top: true,
				bottom: true,
			});
		});

		it('defines vertical border config', () => {
			expect(BORDER_CONFIG_VERTICAL).toEqual({
				type: 0,
				left: true,
				right: true,
				top: false,
				bottom: false,
			});
		});

		it('defines default padding config', () => {
			expect(PADDING_CONFIG_DEFAULT).toEqual({
				left: 1,
				right: 1,
				top: 1,
				bottom: 1,
			});
		});

		it('defines symmetric padding config', () => {
			expect(PADDING_CONFIG_SYMMETRIC).toEqual({
				left: 2,
				right: 2,
				top: 2,
				bottom: 2,
			});
		});

		it('defines horizontal padding config', () => {
			expect(PADDING_CONFIG_HORIZONTAL).toEqual({
				left: 2,
				right: 2,
				top: 0,
				bottom: 0,
			});
		});

		it('defines vertical padding config', () => {
			expect(PADDING_CONFIG_VERTICAL).toEqual({
				left: 0,
				right: 0,
				top: 1,
				bottom: 1,
			});
		});

		it('defines default scrollable config', () => {
			expect(SCROLLABLE_CONFIG_DEFAULT).toEqual({
				scrollable: true,
				scrollX: 0,
				scrollY: 0,
			});
		});
	});

	describe('Input/Interaction', () => {
		it('defines common keys', () => {
			expect(KEYS.ENTER).toBe('\r');
			expect(KEYS.ESC).toBe('\x1b');
			expect(KEYS.TAB).toBe('\t');
			expect(KEYS.SPACE).toBe(' ');
		});

		it('defines arrow keys', () => {
			expect(KEYS.ARROW_UP).toBe('\x1b[A');
			expect(KEYS.ARROW_DOWN).toBe('\x1b[B');
			expect(KEYS.ARROW_RIGHT).toBe('\x1b[C');
			expect(KEYS.ARROW_LEFT).toBe('\x1b[D');
		});

		it('defines mouse positions', () => {
			expect(MOUSE_POSITIONS.TOP_LEFT).toEqual({ x: 0, y: 0 });
			expect(MOUSE_POSITIONS.CENTER).toEqual({ x: 40, y: 12 });
			expect(MOUSE_POSITIONS.BOTTOM_RIGHT).toEqual({ x: 79, y: 23 });
		});
	});

	describe('ANSI / Terminal Codes', () => {
		it('defines ANSI control codes', () => {
			expect(ANSI.RESET).toBe('\x1b[0m');
			expect(ANSI.BOLD).toBe('\x1b[1m');
			expect(ANSI.UNDERLINE).toBe('\x1b[4m');
		});

		it('defines ANSI colored text', () => {
			expect(ANSI_TEXT.RED_TEXT).toContain('Red Text');
			expect(ANSI_TEXT.RED_TEXT).toContain('\x1b[31m');
			expect(ANSI_TEXT.GREEN_TEXT).toContain('Green Text');
		});
	});

	describe('Timing', () => {
		it('defines timeout values', () => {
			expect(TIMEOUTS.VERY_SHORT).toBe(10);
			expect(TIMEOUTS.SHORT).toBe(50);
			expect(TIMEOUTS.MEDIUM).toBe(100);
			expect(TIMEOUTS.LONG).toBe(500);
			expect(TIMEOUTS.VERY_LONG).toBe(1000);
		});
	});

	describe('Fixture Types', () => {
		it('fixtures are properly typed', () => {
			// TypeScript enforces readonly at compile time
			// Runtime tests would require Object.freeze() which we skip for performance
			expect(typeof SCREEN_80X24.width).toBe('number');
			expect(typeof COLORS.WHITE).toBe('number');
			expect(typeof TEXT_HELLO).toBe('string');
		});
	});
});
