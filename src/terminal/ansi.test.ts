/**
 * Tests for ANSI escape code generator
 */

import { describe, expect, it } from 'vitest';
import {
	BEL,
	boxDrawing,
	ClipboardSelection,
	CSI,
	CursorShape,
	charset,
	clipboard,
	cursor,
	DCS,
	DEC_SPECIAL_GRAPHICS,
	DEFAULT_CLIPBOARD_MAX_SIZE,
	ESC,
	HYPERLINK_ALLOWED_PROTOCOLS,
	hyperlink,
	isHyperlinkAllowed,
	LocatorButton,
	LocatorEvent,
	locator,
	MediaCopyMode,
	MouseMode,
	mediaCopy,
	mouse,
	OSC,
	rectangle,
	SGR,
	ST,
	screen,
	style,
	title,
	tmux,
	UNICODE_TO_ASCII,
	windowOps,
} from './ansi';

describe('ANSI constants', () => {
	it('defines CSI correctly', () => {
		expect(CSI).toBe('\x1b[');
	});

	it('defines OSC correctly', () => {
		expect(OSC).toBe('\x1b]');
	});

	it('defines DCS correctly', () => {
		expect(DCS).toBe('\x1bP');
	});

	it('defines ST correctly', () => {
		expect(ST).toBe('\x1b\\');
	});

	it('defines BEL correctly', () => {
		expect(BEL).toBe('\x07');
	});

	it('defines ESC correctly', () => {
		expect(ESC).toBe('\x1b');
	});
});

describe('SGR codes', () => {
	it('defines RESET as 0', () => {
		expect(SGR.RESET).toBe(0);
	});

	it('defines text style codes', () => {
		expect(SGR.BOLD).toBe(1);
		expect(SGR.DIM).toBe(2);
		expect(SGR.ITALIC).toBe(3);
		expect(SGR.UNDERLINE).toBe(4);
		expect(SGR.BLINK).toBe(5);
		expect(SGR.INVERSE).toBe(7);
		expect(SGR.HIDDEN).toBe(8);
		expect(SGR.STRIKETHROUGH).toBe(9);
	});

	it('defines foreground colors', () => {
		expect(SGR.FG_BLACK).toBe(30);
		expect(SGR.FG_RED).toBe(31);
		expect(SGR.FG_GREEN).toBe(32);
		expect(SGR.FG_YELLOW).toBe(33);
		expect(SGR.FG_BLUE).toBe(34);
		expect(SGR.FG_MAGENTA).toBe(35);
		expect(SGR.FG_CYAN).toBe(36);
		expect(SGR.FG_WHITE).toBe(37);
		expect(SGR.FG_DEFAULT).toBe(39);
	});

	it('defines bright foreground colors', () => {
		expect(SGR.FG_BRIGHT_BLACK).toBe(90);
		expect(SGR.FG_BRIGHT_WHITE).toBe(97);
	});

	it('defines background colors', () => {
		expect(SGR.BG_BLACK).toBe(40);
		expect(SGR.BG_RED).toBe(41);
		expect(SGR.BG_DEFAULT).toBe(49);
	});

	it('defines bright background colors', () => {
		expect(SGR.BG_BRIGHT_BLACK).toBe(100);
		expect(SGR.BG_BRIGHT_WHITE).toBe(107);
	});

	it('defines extended color codes', () => {
		expect(SGR.FG_256).toBe(38);
		expect(SGR.BG_256).toBe(48);
	});
});

describe('cursor namespace', () => {
	describe('move', () => {
		it('moves cursor to absolute position', () => {
			expect(cursor.move(10, 5)).toBe('\x1b[5;10H');
		});

		it('handles position 1,1', () => {
			expect(cursor.move(1, 1)).toBe('\x1b[1;1H');
		});

		it('handles large positions', () => {
			expect(cursor.move(200, 100)).toBe('\x1b[100;200H');
		});
	});

	describe('column', () => {
		it('moves to column on current row', () => {
			expect(cursor.column(1)).toBe('\x1b[1G');
			expect(cursor.column(50)).toBe('\x1b[50G');
		});
	});

	describe('up', () => {
		it('moves cursor up with default value', () => {
			expect(cursor.up()).toBe('\x1b[1A');
		});

		it('moves cursor up n rows', () => {
			expect(cursor.up(3)).toBe('\x1b[3A');
		});
	});

	describe('down', () => {
		it('moves cursor down with default value', () => {
			expect(cursor.down()).toBe('\x1b[1B');
		});

		it('moves cursor down n rows', () => {
			expect(cursor.down(5)).toBe('\x1b[5B');
		});
	});

	describe('forward', () => {
		it('moves cursor forward with default value', () => {
			expect(cursor.forward()).toBe('\x1b[1C');
		});

		it('moves cursor forward n columns', () => {
			expect(cursor.forward(10)).toBe('\x1b[10C');
		});
	});

	describe('back', () => {
		it('moves cursor back with default value', () => {
			expect(cursor.back()).toBe('\x1b[1D');
		});

		it('moves cursor back n columns', () => {
			expect(cursor.back(7)).toBe('\x1b[7D');
		});
	});

	describe('nextLine', () => {
		it('moves to next line start', () => {
			expect(cursor.nextLine()).toBe('\x1b[1E');
			expect(cursor.nextLine(3)).toBe('\x1b[3E');
		});
	});

	describe('prevLine', () => {
		it('moves to previous line start', () => {
			expect(cursor.prevLine()).toBe('\x1b[1F');
			expect(cursor.prevLine(2)).toBe('\x1b[2F');
		});
	});

	describe('save', () => {
		it('saves cursor position', () => {
			expect(cursor.save()).toBe('\x1b[s');
		});
	});

	describe('restore', () => {
		it('restores cursor position', () => {
			expect(cursor.restore()).toBe('\x1b[u');
		});
	});

	describe('show', () => {
		it('shows cursor', () => {
			expect(cursor.show()).toBe('\x1b[?25h');
		});
	});

	describe('hide', () => {
		it('hides cursor', () => {
			expect(cursor.hide()).toBe('\x1b[?25l');
		});
	});

	describe('requestPosition', () => {
		it('requests cursor position report', () => {
			expect(cursor.requestPosition()).toBe('\x1b[6n');
		});
	});

	describe('home', () => {
		it('moves cursor to home position', () => {
			expect(cursor.home()).toBe('\x1b[H');
		});
	});

	describe('setShape', () => {
		it('sets cursor shape by number', () => {
			expect(cursor.setShape(0)).toBe('\x1b[0 q');
			expect(cursor.setShape(2)).toBe('\x1b[2 q');
			expect(cursor.setShape(6)).toBe('\x1b[6 q');
		});
	});

	describe('cursor shapes', () => {
		it('sets blinking block', () => {
			expect(cursor.blinkingBlock()).toBe('\x1b[1 q');
		});

		it('sets steady block', () => {
			expect(cursor.steadyBlock()).toBe('\x1b[2 q');
		});

		it('sets blinking underline', () => {
			expect(cursor.blinkingUnderline()).toBe('\x1b[3 q');
		});

		it('sets steady underline', () => {
			expect(cursor.steadyUnderline()).toBe('\x1b[4 q');
		});

		it('sets blinking bar', () => {
			expect(cursor.blinkingBar()).toBe('\x1b[5 q');
		});

		it('sets steady bar', () => {
			expect(cursor.steadyBar()).toBe('\x1b[6 q');
		});

		it('resets shape to default', () => {
			expect(cursor.resetShape()).toBe('\x1b[0 q');
		});
	});

	describe('cursor color', () => {
		it('sets cursor color with hex', () => {
			expect(cursor.setColor('#ff0000')).toBe('\x1b]12;#ff0000\x07');
		});

		it('sets cursor color with name', () => {
			expect(cursor.setColor('green')).toBe('\x1b]12;green\x07');
		});

		it('resets cursor color', () => {
			expect(cursor.resetColor()).toBe('\x1b]112\x07');
		});
	});

	describe('cursor style save/restore', () => {
		it('saves cursor style', () => {
			expect(cursor.saveStyle()).toBe('\x1b[s');
		});

		it('restores cursor style', () => {
			expect(cursor.restoreStyle()).toBe('\x1b[u');
		});
	});
});

describe('CursorShape constants', () => {
	it('defines correct shape values', () => {
		expect(CursorShape.DEFAULT).toBe(0);
		expect(CursorShape.BLINKING_BLOCK).toBe(1);
		expect(CursorShape.STEADY_BLOCK).toBe(2);
		expect(CursorShape.BLINKING_UNDERLINE).toBe(3);
		expect(CursorShape.STEADY_UNDERLINE).toBe(4);
		expect(CursorShape.BLINKING_BAR).toBe(5);
		expect(CursorShape.STEADY_BAR).toBe(6);
	});

	it('works with cursor.setShape', () => {
		expect(cursor.setShape(CursorShape.STEADY_BAR)).toBe('\x1b[6 q');
		expect(cursor.setShape(CursorShape.BLINKING_UNDERLINE)).toBe('\x1b[3 q');
	});
});

describe('style namespace', () => {
	describe('reset', () => {
		it('resets all attributes', () => {
			expect(style.reset()).toBe('\x1b[0m');
		});
	});

	describe('text styles', () => {
		it('enables bold', () => {
			expect(style.bold()).toBe('\x1b[1m');
		});

		it('enables dim', () => {
			expect(style.dim()).toBe('\x1b[2m');
		});

		it('enables italic', () => {
			expect(style.italic()).toBe('\x1b[3m');
		});

		it('enables underline', () => {
			expect(style.underline()).toBe('\x1b[4m');
		});

		it('enables blink', () => {
			expect(style.blink()).toBe('\x1b[5m');
		});

		it('enables inverse', () => {
			expect(style.inverse()).toBe('\x1b[7m');
		});

		it('enables hidden', () => {
			expect(style.hidden()).toBe('\x1b[8m');
		});

		it('enables strikethrough', () => {
			expect(style.strikethrough()).toBe('\x1b[9m');
		});
	});

	describe('fg (foreground color)', () => {
		it('sets basic foreground colors', () => {
			expect(style.fg('red')).toBe('\x1b[31m');
			expect(style.fg('green')).toBe('\x1b[32m');
			expect(style.fg('blue')).toBe('\x1b[34m');
			expect(style.fg('default')).toBe('\x1b[39m');
		});

		it('sets bright foreground colors', () => {
			expect(style.fg('brightRed')).toBe('\x1b[91m');
			expect(style.fg('brightBlue')).toBe('\x1b[94m');
		});

		it('sets 256-color foreground', () => {
			expect(style.fg(196)).toBe('\x1b[38;5;196m');
			expect(style.fg(0)).toBe('\x1b[38;5;0m');
			expect(style.fg(255)).toBe('\x1b[38;5;255m');
		});

		it('sets RGB foreground', () => {
			expect(style.fg({ r: 255, g: 0, b: 0 })).toBe('\x1b[38;2;255;0;0m');
			expect(style.fg({ r: 0, g: 255, b: 128 })).toBe('\x1b[38;2;0;255;128m');
		});
	});

	describe('bg (background color)', () => {
		it('sets basic background colors', () => {
			expect(style.bg('red')).toBe('\x1b[41m');
			expect(style.bg('green')).toBe('\x1b[42m');
			expect(style.bg('blue')).toBe('\x1b[44m');
			expect(style.bg('default')).toBe('\x1b[49m');
		});

		it('sets bright background colors', () => {
			expect(style.bg('brightRed')).toBe('\x1b[101m');
			expect(style.bg('brightBlue')).toBe('\x1b[104m');
		});

		it('sets 256-color background', () => {
			expect(style.bg(21)).toBe('\x1b[48;5;21m');
			expect(style.bg(0)).toBe('\x1b[48;5;0m');
		});

		it('sets RGB background', () => {
			expect(style.bg({ r: 0, g: 0, b: 255 })).toBe('\x1b[48;2;0;0;255m');
		});
	});

	describe('combine', () => {
		it('combines multiple SGR codes', () => {
			expect(style.combine(SGR.BOLD, SGR.FG_RED)).toBe('\x1b[1;31m');
			expect(style.combine(SGR.BOLD, SGR.UNDERLINE, SGR.FG_GREEN)).toBe('\x1b[1;4;32m');
		});
	});
});

describe('screen namespace', () => {
	describe('clear', () => {
		it('clears entire screen', () => {
			expect(screen.clear()).toBe('\x1b[2J');
		});
	});

	describe('clearDown', () => {
		it('clears from cursor to end of screen', () => {
			expect(screen.clearDown()).toBe('\x1b[J');
		});
	});

	describe('clearUp', () => {
		it('clears from cursor to beginning of screen', () => {
			expect(screen.clearUp()).toBe('\x1b[1J');
		});
	});

	describe('clearLine', () => {
		it('clears entire line', () => {
			expect(screen.clearLine()).toBe('\x1b[2K');
		});
	});

	describe('clearLineRight', () => {
		it('clears from cursor to end of line', () => {
			expect(screen.clearLineRight()).toBe('\x1b[K');
		});
	});

	describe('clearLineLeft', () => {
		it('clears from cursor to beginning of line', () => {
			expect(screen.clearLineLeft()).toBe('\x1b[1K');
		});
	});

	describe('eraseChars', () => {
		it('erases characters with default value', () => {
			expect(screen.eraseChars()).toBe('\x1b[1X');
		});

		it('erases n characters', () => {
			expect(screen.eraseChars(5)).toBe('\x1b[5X');
		});
	});

	describe('alternateOn', () => {
		it('enables alternate screen buffer', () => {
			expect(screen.alternateOn()).toBe('\x1b[?1049h');
		});
	});

	describe('alternateOff', () => {
		it('disables alternate screen buffer', () => {
			expect(screen.alternateOff()).toBe('\x1b[?1049l');
		});
	});

	describe('scrollUp', () => {
		it('scrolls up with default value', () => {
			expect(screen.scrollUp()).toBe('\x1b[1S');
		});

		it('scrolls up n lines', () => {
			expect(screen.scrollUp(5)).toBe('\x1b[5S');
		});
	});

	describe('scrollDown', () => {
		it('scrolls down with default value', () => {
			expect(screen.scrollDown()).toBe('\x1b[1T');
		});

		it('scrolls down n lines', () => {
			expect(screen.scrollDown(3)).toBe('\x1b[3T');
		});
	});

	describe('setScrollRegion', () => {
		it('sets scroll region', () => {
			expect(screen.setScrollRegion(1, 24)).toBe('\x1b[1;24r');
		});
	});

	describe('resetScrollRegion', () => {
		it('resets scroll region', () => {
			expect(screen.resetScrollRegion()).toBe('\x1b[r');
		});
	});
});

describe('title namespace', () => {
	describe('set', () => {
		it('sets window title', () => {
			expect(title.set('My App')).toBe('\x1b]2;My App\x07');
		});
	});

	describe('setIcon', () => {
		it('sets icon name', () => {
			expect(title.setIcon('app')).toBe('\x1b]1;app\x07');
		});
	});

	describe('setBoth', () => {
		it('sets both title and icon', () => {
			expect(title.setBoth('My App')).toBe('\x1b]0;My App\x07');
		});
	});
});

describe('mouse namespace', () => {
	describe('X10 mode', () => {
		it('enables X10 tracking', () => {
			expect(mouse.enableX10()).toBe('\x1b[?9h');
		});

		it('disables X10 tracking', () => {
			expect(mouse.disableX10()).toBe('\x1b[?9l');
		});
	});

	describe('Normal mode', () => {
		it('enables normal tracking', () => {
			expect(mouse.enableNormal()).toBe('\x1b[?1000h');
		});

		it('disables normal tracking', () => {
			expect(mouse.disableNormal()).toBe('\x1b[?1000l');
		});
	});

	describe('Button-event mode', () => {
		it('enables button-event tracking', () => {
			expect(mouse.enableButtonEvent()).toBe('\x1b[?1002h');
		});

		it('disables button-event tracking', () => {
			expect(mouse.disableButtonEvent()).toBe('\x1b[?1002l');
		});
	});

	describe('Any-event mode', () => {
		it('enables any-event tracking', () => {
			expect(mouse.enableAnyEvent()).toBe('\x1b[?1003h');
		});

		it('disables any-event tracking', () => {
			expect(mouse.disableAnyEvent()).toBe('\x1b[?1003l');
		});
	});

	describe('Focus tracking', () => {
		it('enables focus tracking', () => {
			expect(mouse.enableFocus()).toBe('\x1b[?1004h');
		});

		it('disables focus tracking', () => {
			expect(mouse.disableFocus()).toBe('\x1b[?1004l');
		});
	});

	describe('SGR mode', () => {
		it('enables SGR extended mode', () => {
			expect(mouse.enableSGR()).toBe('\x1b[?1006h');
		});

		it('disables SGR extended mode', () => {
			expect(mouse.disableSGR()).toBe('\x1b[?1006l');
		});
	});

	describe('URXVT mode', () => {
		it('enables URXVT extended mode', () => {
			expect(mouse.enableURXVT()).toBe('\x1b[?1015h');
		});

		it('disables URXVT extended mode', () => {
			expect(mouse.disableURXVT()).toBe('\x1b[?1015l');
		});
	});

	describe('UTF8 mode', () => {
		it('enables UTF8 extended mode', () => {
			expect(mouse.enableUTF8()).toBe('\x1b[?1005h');
		});

		it('disables UTF8 extended mode', () => {
			expect(mouse.disableUTF8()).toBe('\x1b[?1005l');
		});
	});

	describe('disableAll', () => {
		it('disables all mouse modes', () => {
			const result = mouse.disableAll();
			expect(result).toContain('\x1b[?9l'); // X10
			expect(result).toContain('\x1b[?1000l'); // Normal
			expect(result).toContain('\x1b[?1002l'); // Button-event
			expect(result).toContain('\x1b[?1003l'); // Any-event
			expect(result).toContain('\x1b[?1004l'); // Focus
			expect(result).toContain('\x1b[?1005l'); // UTF8
			expect(result).toContain('\x1b[?1006l'); // SGR
			expect(result).toContain('\x1b[?1015l'); // URXVT
		});
	});

	describe('enableRecommended', () => {
		it('enables SGR and any-event tracking', () => {
			const result = mouse.enableRecommended();
			expect(result).toContain('\x1b[?1006h'); // SGR
			expect(result).toContain('\x1b[?1003h'); // Any-event
		});
	});
});

describe('MouseMode constants', () => {
	it('defines correct mode values', () => {
		expect(MouseMode.X10).toBe(9);
		expect(MouseMode.NORMAL).toBe(1000);
		expect(MouseMode.BUTTON_EVENT).toBe(1002);
		expect(MouseMode.ANY_EVENT).toBe(1003);
		expect(MouseMode.FOCUS).toBe(1004);
		expect(MouseMode.UTF8).toBe(1005);
		expect(MouseMode.SGR).toBe(1006);
		expect(MouseMode.URXVT).toBe(1015);
	});
});

describe('escape sequence composition', () => {
	it('can compose cursor movement and style', () => {
		const sequence = `${cursor.move(10, 5)}${style.fg('red')}Hello${style.reset()}`;
		expect(sequence).toBe('\x1b[5;10H\x1b[31mHello\x1b[0m');
	});

	it('can compose screen operations', () => {
		const sequence = `${screen.alternateOn()}${cursor.hide()}${screen.clear()}`;
		expect(sequence).toBe('\x1b[?1049h\x1b[?25l\x1b[2J');
	});

	it('can compose multiple styles', () => {
		const sequence = `${style.bold()}${style.underline()}${style.fg('brightCyan')}`;
		expect(sequence).toBe('\x1b[1m\x1b[4m\x1b[96m');
	});
});

describe('ClipboardSelection constants', () => {
	it('defines correct selection values', () => {
		expect(ClipboardSelection.CLIPBOARD).toBe('c');
		expect(ClipboardSelection.PRIMARY).toBe('p');
		expect(ClipboardSelection.SECONDARY).toBe('s');
		expect(ClipboardSelection.CUT0).toBe('0');
	});
});

describe('DEFAULT_CLIPBOARD_MAX_SIZE', () => {
	it('is 1MB', () => {
		expect(DEFAULT_CLIPBOARD_MAX_SIZE).toBe(1024 * 1024);
	});
});

describe('clipboard namespace', () => {
	describe('write', () => {
		it('generates OSC 52 write sequence', () => {
			const result = clipboard.write('Hello');
			// "Hello" in base64 is "SGVsbG8="
			expect(result).toBe('\x1b]52;c;SGVsbG8=\x1b\\');
		});

		it('uses default clipboard selection', () => {
			const result = clipboard.write('test');
			expect(result).toContain(';c;');
		});

		it('supports primary selection', () => {
			const result = clipboard.write('test', ClipboardSelection.PRIMARY);
			expect(result).toContain(';p;');
		});

		it('handles empty string', () => {
			const result = clipboard.write('');
			// Empty string base64 is empty
			expect(result).toBe('\x1b]52;c;\x1b\\');
		});

		it('handles unicode text', () => {
			const result = clipboard.write('Hello 世界');
			// Expected base64 encoding of "Hello 世界"
			const expected = Buffer.from('Hello 世界', 'utf8').toString('base64');
			expect(result).toBe(`\x1b]52;c;${expected}\x1b\\`);
		});

		it('enforces default size limit', () => {
			// Create a string larger than 1MB
			const largeText = 'x'.repeat(DEFAULT_CLIPBOARD_MAX_SIZE + 1);
			const result = clipboard.write(largeText);
			expect(result).toBe('');
		});

		it('enforces custom size limit', () => {
			const text = 'x'.repeat(100);
			const result = clipboard.write(text, ClipboardSelection.CLIPBOARD, 50);
			expect(result).toBe('');
		});

		it('allows content within size limit', () => {
			const text = 'x'.repeat(50);
			const result = clipboard.write(text, ClipboardSelection.CLIPBOARD, 100);
			expect(result).not.toBe('');
		});
	});

	describe('requestRead', () => {
		it('generates OSC 52 read request', () => {
			const result = clipboard.requestRead();
			expect(result).toBe('\x1b]52;c;?\x1b\\');
		});

		it('uses default clipboard selection', () => {
			const result = clipboard.requestRead();
			expect(result).toContain(';c;');
		});

		it('supports primary selection', () => {
			const result = clipboard.requestRead(ClipboardSelection.PRIMARY);
			expect(result).toBe('\x1b]52;p;?\x1b\\');
		});
	});

	describe('clear', () => {
		it('generates OSC 52 clear sequence', () => {
			const result = clipboard.clear();
			expect(result).toBe('\x1b]52;c;\x1b\\');
		});

		it('supports different selections', () => {
			const result = clipboard.clear(ClipboardSelection.PRIMARY);
			expect(result).toBe('\x1b]52;p;\x1b\\');
		});
	});

	describe('decodeResponse', () => {
		it('decodes valid response', () => {
			const response = '\x1b]52;c;SGVsbG8=\x1b\\';
			const result = clipboard.decodeResponse(response);
			expect(result).toBe('Hello');
		});

		it('decodes empty response', () => {
			const response = '\x1b]52;c;\x1b\\';
			const result = clipboard.decodeResponse(response);
			expect(result).toBe('');
		});

		it('returns null for invalid response', () => {
			const result = clipboard.decodeResponse('not a valid response');
			expect(result).toBeNull();
		});

		it('returns null for malformed response', () => {
			const result = clipboard.decodeResponse('\x1b]52;');
			expect(result).toBeNull();
		});

		it('decodes unicode content', () => {
			// "Hello 世界" in base64
			const encoded = Buffer.from('Hello 世界', 'utf8').toString('base64');
			const response = `\x1b]52;c;${encoded}\x1b\\`;
			const result = clipboard.decodeResponse(response);
			expect(result).toBe('Hello 世界');
		});
	});

	describe('isClipboardResponse', () => {
		it('returns true for valid clipboard response', () => {
			expect(clipboard.isClipboardResponse('\x1b]52;c;SGVsbG8=\x1b\\')).toBe(true);
		});

		it('returns false for other OSC sequences', () => {
			expect(clipboard.isClipboardResponse('\x1b]0;title\x07')).toBe(false);
		});

		it('returns false for CSI sequences', () => {
			expect(clipboard.isClipboardResponse('\x1b[1m')).toBe(false);
		});

		it('returns false for plain text', () => {
			expect(clipboard.isClipboardResponse('hello')).toBe(false);
		});
	});

	describe('round-trip', () => {
		it('write and decodeResponse are inverses', () => {
			const original = 'Test clipboard content';
			const writeSeq = clipboard.write(original);

			// Simulate terminal echoing back the content
			// The terminal would respond with the same format
			const simulatedResponse = writeSeq;
			const decoded = clipboard.decodeResponse(simulatedResponse);

			expect(decoded).toBe(original);
		});
	});
});

describe('tmux namespace', () => {
	describe('wrap', () => {
		it('wraps a simple escape sequence', () => {
			const seq = '\x1b]0;Title\x07';
			const wrapped = tmux.wrap(seq);
			// ESC should be doubled: \x1b -> \x1b\x1b
			expect(wrapped).toBe('\x1bPtmux;\x1b\x1b]0;Title\x07\x1b\\');
		});

		it('wraps a sequence with multiple ESC characters', () => {
			const seq = '\x1b[1m\x1b[31m';
			const wrapped = tmux.wrap(seq);
			expect(wrapped).toBe('\x1bPtmux;\x1b\x1b[1m\x1b\x1b[31m\x1b\\');
		});

		it('handles sequences without ESC characters', () => {
			const seq = 'plain text';
			const wrapped = tmux.wrap(seq);
			expect(wrapped).toBe('\x1bPtmux;plain text\x1b\\');
		});

		it('wraps empty string', () => {
			const wrapped = tmux.wrap('');
			expect(wrapped).toBe('\x1bPtmux;\x1b\\');
		});
	});

	describe('unwrap', () => {
		it('unwraps a wrapped sequence', () => {
			const wrapped = '\x1bPtmux;\x1b\x1b]0;Title\x07\x1b\\';
			const unwrapped = tmux.unwrap(wrapped);
			expect(unwrapped).toBe('\x1b]0;Title\x07');
		});

		it('unwraps a sequence with multiple ESC characters', () => {
			const wrapped = '\x1bPtmux;\x1b\x1b[1m\x1b\x1b[31m\x1b\\';
			const unwrapped = tmux.unwrap(wrapped);
			expect(unwrapped).toBe('\x1b[1m\x1b[31m');
		});

		it('returns null for non-tmux sequences', () => {
			const seq = '\x1b[1m';
			const unwrapped = tmux.unwrap(seq);
			expect(unwrapped).toBeNull();
		});

		it('returns null for incomplete tmux sequences', () => {
			const incomplete = '\x1bPtmux;content';
			const unwrapped = tmux.unwrap(incomplete);
			expect(unwrapped).toBeNull();
		});

		it('handles empty content', () => {
			const wrapped = '\x1bPtmux;\x1b\\';
			const unwrapped = tmux.unwrap(wrapped);
			expect(unwrapped).toBe('');
		});
	});

	describe('isWrapped', () => {
		it('returns true for wrapped sequences', () => {
			const wrapped = '\x1bPtmux;content\x1b\\';
			expect(tmux.isWrapped(wrapped)).toBe(true);
		});

		it('returns false for unwrapped sequences', () => {
			const seq = '\x1b[1m';
			expect(tmux.isWrapped(seq)).toBe(false);
		});

		it('returns false for partial match (missing ST)', () => {
			const partial = '\x1bPtmux;content';
			expect(tmux.isWrapped(partial)).toBe(false);
		});

		it('returns false for partial match (missing DCS)', () => {
			const partial = 'tmux;content\x1b\\';
			expect(tmux.isWrapped(partial)).toBe(false);
		});
	});

	describe('wrapIf', () => {
		it('wraps when inTmux is true', () => {
			const seq = '\x1b]0;Title\x07';
			const result = tmux.wrapIf(seq, true);
			expect(result).toBe('\x1bPtmux;\x1b\x1b]0;Title\x07\x1b\\');
		});

		it('does not wrap when inTmux is false', () => {
			const seq = '\x1b]0;Title\x07';
			const result = tmux.wrapIf(seq, false);
			expect(result).toBe(seq);
		});

		it('does not double-wrap already wrapped sequences', () => {
			const wrapped = '\x1bPtmux;\x1b\x1b]0;Title\x07\x1b\\';
			const result = tmux.wrapIf(wrapped, true);
			expect(result).toBe(wrapped);
		});
	});

	describe('begin and end', () => {
		it('begin returns DCS tmux; prefix', () => {
			expect(tmux.begin()).toBe('\x1bPtmux;');
		});

		it('end returns ST', () => {
			expect(tmux.end()).toBe('\x1b\\');
		});

		it('begin and end can manually wrap content', () => {
			// biome-ignore lint/suspicious/noControlCharactersInRegex: ESC character is intentional
			const content = 'test'.replace(/\x1b/g, '\x1b\x1b');
			const manual = tmux.begin() + content + tmux.end();
			const auto = tmux.wrap('test');
			expect(manual).toBe(auto);
		});
	});

	describe('round-trip', () => {
		it('wrap and unwrap are inverses', () => {
			const original = '\x1b[1m\x1b[31mHello\x1b[0m';
			const wrapped = tmux.wrap(original);
			const unwrapped = tmux.unwrap(wrapped);
			expect(unwrapped).toBe(original);
		});

		it('preserves complex sequences', () => {
			const original = title.set('Test') + cursor.hide() + screen.clear();
			const wrapped = tmux.wrap(original);
			const unwrapped = tmux.unwrap(wrapped);
			expect(unwrapped).toBe(original);
		});
	});

	describe('PT_START constant', () => {
		it('equals DCS tmux;', () => {
			expect(tmux.PT_START).toBe('\x1bPtmux;');
		});
	});
});

describe('charset namespace', () => {
	describe('designate', () => {
		it('designates DEC graphics to G0', () => {
			expect(charset.designate('dec-graphics', 0)).toBe('\x1b(0');
		});

		it('designates US ASCII to G0', () => {
			expect(charset.designate('us-ascii', 0)).toBe('\x1b(B');
		});

		it('designates UK to G0', () => {
			expect(charset.designate('uk', 0)).toBe('\x1b(A');
		});

		it('designates to G1 with ) introducer', () => {
			expect(charset.designate('us-ascii', 1)).toBe('\x1b)B');
		});

		it('designates to G2 with * introducer', () => {
			expect(charset.designate('us-ascii', 2)).toBe('\x1b*B');
		});

		it('designates to G3 with + introducer', () => {
			expect(charset.designate('us-ascii', 3)).toBe('\x1b+B');
		});

		it('defaults to G0', () => {
			expect(charset.designate('german')).toBe('\x1b(K');
		});

		it('handles all character sets', () => {
			expect(charset.designate('dutch', 0)).toBe('\x1b(4');
			expect(charset.designate('finnish', 0)).toBe('\x1b(C');
			expect(charset.designate('french', 0)).toBe('\x1b(R');
			expect(charset.designate('french-canadian', 0)).toBe('\x1b(Q');
			expect(charset.designate('italian', 0)).toBe('\x1b(Y');
			expect(charset.designate('norwegian-danish', 0)).toBe('\x1b(E');
			expect(charset.designate('spanish', 0)).toBe('\x1b(Z');
			expect(charset.designate('swedish', 0)).toBe('\x1b(H');
			expect(charset.designate('swiss', 0)).toBe('\x1b(=');
			expect(charset.designate('iso-latin', 0)).toBe('\x1b(/A');
		});
	});

	describe('locking shifts', () => {
		it('invokeG0 returns SI (Shift In)', () => {
			expect(charset.invokeG0()).toBe('\x0f');
		});

		it('invokeG1 returns SO (Shift Out)', () => {
			expect(charset.invokeG1()).toBe('\x0e');
		});

		it('invokeG2 returns LS2 sequence', () => {
			expect(charset.invokeG2()).toBe('\x1bn');
		});

		it('invokeG3 returns LS3 sequence', () => {
			expect(charset.invokeG3()).toBe('\x1bo');
		});

		it('invokeG1R returns LS1R sequence', () => {
			expect(charset.invokeG1R()).toBe('\x1b~');
		});

		it('invokeG2R returns LS2R sequence', () => {
			expect(charset.invokeG2R()).toBe('\x1b}');
		});

		it('invokeG3R returns LS3R sequence', () => {
			expect(charset.invokeG3R()).toBe('\x1b|');
		});
	});

	describe('single shifts', () => {
		it('singleShiftG2 returns SS2 sequence', () => {
			expect(charset.singleShiftG2()).toBe('\x1bN');
		});

		it('singleShiftG3 returns SS3 sequence', () => {
			expect(charset.singleShiftG3()).toBe('\x1bO');
		});
	});

	describe('alternate character set mode', () => {
		it('enterAcs designates DEC graphics to G0', () => {
			expect(charset.enterAcs()).toBe('\x1b(0');
		});

		it('exitAcs designates US ASCII to G0', () => {
			expect(charset.exitAcs()).toBe('\x1b(B');
		});

		it('smacs is alias for enterAcs', () => {
			expect(charset.smacs()).toBe(charset.enterAcs());
		});

		it('rmacs is alias for exitAcs', () => {
			expect(charset.rmacs()).toBe(charset.exitAcs());
		});
	});

	describe('typical usage patterns', () => {
		it('can bracket content with ACS mode', () => {
			const box = `${charset.enterAcs()}lqk${charset.exitAcs()}`;
			expect(box).toBe('\x1b(0lqk\x1b(B');
		});

		it('can use G1 for alternate charset', () => {
			const setup =
				charset.designate('dec-graphics', 1) + charset.invokeG1() + 'lqk' + charset.invokeG0();
			expect(setup).toBe('\x1b)0\x0elqk\x0f');
		});

		it('can use single shift for individual characters', () => {
			const seq = charset.designate('dec-graphics', 2) + charset.singleShiftG2() + 'q';
			expect(seq).toBe('\x1b*0\x1bNq');
		});
	});
});

describe('DEC_SPECIAL_GRAPHICS', () => {
	it('contains box drawing corners', () => {
		expect(DEC_SPECIAL_GRAPHICS.j).toBe('\u2518'); // ┘
		expect(DEC_SPECIAL_GRAPHICS.k).toBe('\u2510'); // ┐
		expect(DEC_SPECIAL_GRAPHICS.l).toBe('\u250c'); // ┌
		expect(DEC_SPECIAL_GRAPHICS.m).toBe('\u2514'); // └
	});

	it('contains box drawing lines', () => {
		expect(DEC_SPECIAL_GRAPHICS.q).toBe('\u2500'); // ─
		expect(DEC_SPECIAL_GRAPHICS.x).toBe('\u2502'); // │
	});

	it('contains box drawing tees', () => {
		expect(DEC_SPECIAL_GRAPHICS.n).toBe('\u253c'); // ┼
		expect(DEC_SPECIAL_GRAPHICS.t).toBe('\u251c'); // ├
		expect(DEC_SPECIAL_GRAPHICS.u).toBe('\u2524'); // ┤
		expect(DEC_SPECIAL_GRAPHICS.v).toBe('\u2534'); // ┴
		expect(DEC_SPECIAL_GRAPHICS.w).toBe('\u252c'); // ┬
	});

	it('contains scan lines', () => {
		expect(DEC_SPECIAL_GRAPHICS.o).toBe('\u23ba'); // ⎺
		expect(DEC_SPECIAL_GRAPHICS.p).toBe('\u23bb'); // ⎻
		expect(DEC_SPECIAL_GRAPHICS.r).toBe('\u23bc'); // ⎼
		expect(DEC_SPECIAL_GRAPHICS.s).toBe('\u23bd'); // ⎽
	});

	it('contains symbols', () => {
		expect(DEC_SPECIAL_GRAPHICS['`']).toBe('\u25c6'); // ◆
		expect(DEC_SPECIAL_GRAPHICS.a).toBe('\u2592'); // ▒
		expect(DEC_SPECIAL_GRAPHICS.f).toBe('\u00b0'); // °
		expect(DEC_SPECIAL_GRAPHICS.g).toBe('\u00b1'); // ±
		expect(DEC_SPECIAL_GRAPHICS['{']).toBe('\u03c0'); // π
	});
});

describe('UNICODE_TO_ASCII', () => {
	it('maps box corners to +', () => {
		expect(UNICODE_TO_ASCII['\u2518']).toBe('+'); // ┘
		expect(UNICODE_TO_ASCII['\u2510']).toBe('+'); // ┐
		expect(UNICODE_TO_ASCII['\u250c']).toBe('+'); // ┌
		expect(UNICODE_TO_ASCII['\u2514']).toBe('+'); // └
	});

	it('maps horizontal line to -', () => {
		expect(UNICODE_TO_ASCII['\u2500']).toBe('-'); // ─
	});

	it('maps vertical line to |', () => {
		expect(UNICODE_TO_ASCII['\u2502']).toBe('|'); // │
	});

	it('maps comparison symbols', () => {
		expect(UNICODE_TO_ASCII['\u2264']).toBe('<'); // ≤
		expect(UNICODE_TO_ASCII['\u2265']).toBe('>'); // ≥
		expect(UNICODE_TO_ASCII['\u2260']).toBe('!'); // ≠
	});
});

describe('boxDrawing', () => {
	describe('unicode single-line', () => {
		it('contains all corner characters', () => {
			expect(boxDrawing.unicode.topLeft).toBe('\u250c');
			expect(boxDrawing.unicode.topRight).toBe('\u2510');
			expect(boxDrawing.unicode.bottomLeft).toBe('\u2514');
			expect(boxDrawing.unicode.bottomRight).toBe('\u2518');
		});

		it('contains line characters', () => {
			expect(boxDrawing.unicode.horizontal).toBe('\u2500');
			expect(boxDrawing.unicode.vertical).toBe('\u2502');
		});

		it('contains tee and cross characters', () => {
			expect(boxDrawing.unicode.cross).toBe('\u253c');
			expect(boxDrawing.unicode.teeRight).toBe('\u251c');
			expect(boxDrawing.unicode.teeLeft).toBe('\u2524');
			expect(boxDrawing.unicode.teeUp).toBe('\u2534');
			expect(boxDrawing.unicode.teeDown).toBe('\u252c');
		});
	});

	describe('unicode double-line', () => {
		it('contains all corner characters', () => {
			expect(boxDrawing.unicodeDouble.topLeft).toBe('\u2554');
			expect(boxDrawing.unicodeDouble.topRight).toBe('\u2557');
			expect(boxDrawing.unicodeDouble.bottomLeft).toBe('\u255a');
			expect(boxDrawing.unicodeDouble.bottomRight).toBe('\u255d');
		});

		it('contains line characters', () => {
			expect(boxDrawing.unicodeDouble.horizontal).toBe('\u2550');
			expect(boxDrawing.unicodeDouble.vertical).toBe('\u2551');
		});
	});

	describe('unicode rounded', () => {
		it('contains rounded corner characters', () => {
			expect(boxDrawing.unicodeRounded.topLeft).toBe('\u256d');
			expect(boxDrawing.unicodeRounded.topRight).toBe('\u256e');
			expect(boxDrawing.unicodeRounded.bottomLeft).toBe('\u2570');
			expect(boxDrawing.unicodeRounded.bottomRight).toBe('\u256f');
		});

		it('shares line characters with single-line', () => {
			expect(boxDrawing.unicodeRounded.horizontal).toBe(boxDrawing.unicode.horizontal);
			expect(boxDrawing.unicodeRounded.vertical).toBe(boxDrawing.unicode.vertical);
		});
	});

	describe('ascii', () => {
		it('uses + for corners', () => {
			expect(boxDrawing.ascii.topLeft).toBe('+');
			expect(boxDrawing.ascii.topRight).toBe('+');
			expect(boxDrawing.ascii.bottomLeft).toBe('+');
			expect(boxDrawing.ascii.bottomRight).toBe('+');
		});

		it('uses - and | for lines', () => {
			expect(boxDrawing.ascii.horizontal).toBe('-');
			expect(boxDrawing.ascii.vertical).toBe('|');
		});
	});

	describe('decGraphics', () => {
		it('contains VT100 line drawing input characters', () => {
			expect(boxDrawing.decGraphics.topLeft).toBe('l');
			expect(boxDrawing.decGraphics.topRight).toBe('k');
			expect(boxDrawing.decGraphics.bottomLeft).toBe('m');
			expect(boxDrawing.decGraphics.bottomRight).toBe('j');
			expect(boxDrawing.decGraphics.horizontal).toBe('q');
			expect(boxDrawing.decGraphics.vertical).toBe('x');
			expect(boxDrawing.decGraphics.cross).toBe('n');
		});

		it('maps to DEC_SPECIAL_GRAPHICS', () => {
			expect(DEC_SPECIAL_GRAPHICS[boxDrawing.decGraphics.topLeft]).toBe(boxDrawing.unicode.topLeft);
			expect(DEC_SPECIAL_GRAPHICS[boxDrawing.decGraphics.horizontal]).toBe(
				boxDrawing.unicode.horizontal,
			);
		});
	});

	describe('usage patterns', () => {
		it('can draw a simple box with unicode', () => {
			const box = boxDrawing.unicode;
			const topLine = box.topLeft + box.horizontal.repeat(3) + box.topRight;
			expect(topLine).toBe('┌───┐');
		});

		it('can draw a simple box with ascii', () => {
			const box = boxDrawing.ascii;
			const topLine = box.topLeft + box.horizontal.repeat(3) + box.topRight;
			expect(topLine).toBe('+---+');
		});

		it('can draw a box with ACS mode', () => {
			const dec = boxDrawing.decGraphics;
			const topLine =
				charset.enterAcs() +
				dec.topLeft +
				dec.horizontal.repeat(3) +
				dec.topRight +
				charset.exitAcs();
			expect(topLine).toBe('\x1b(0lqqqk\x1b(B');
		});
	});
});

describe('windowOps namespace', () => {
	describe('iconify/deiconify', () => {
		it('deiconify returns CSI 1 t', () => {
			expect(windowOps.deiconify()).toBe('\x1b[1t');
		});

		it('iconify returns CSI 2 t', () => {
			expect(windowOps.iconify()).toBe('\x1b[2t');
		});
	});

	describe('move', () => {
		it('moves to specified position', () => {
			expect(windowOps.move(100, 50)).toBe('\x1b[3;100;50t');
		});

		it('handles origin position', () => {
			expect(windowOps.move(0, 0)).toBe('\x1b[3;0;0t');
		});
	});

	describe('resize', () => {
		it('resizePixels sets pixel dimensions', () => {
			expect(windowOps.resizePixels(800, 600)).toBe('\x1b[4;600;800t');
		});

		it('resizeChars sets character dimensions', () => {
			expect(windowOps.resizeChars(80, 24)).toBe('\x1b[8;24;80t');
		});

		it('resizeChars handles wide mode', () => {
			expect(windowOps.resizeChars(132, 43)).toBe('\x1b[8;43;132t');
		});
	});

	describe('stacking order', () => {
		it('raise brings window to front', () => {
			expect(windowOps.raise()).toBe('\x1b[5t');
		});

		it('lower sends window to back', () => {
			expect(windowOps.lower()).toBe('\x1b[6t');
		});
	});

	describe('refresh', () => {
		it('refreshes the window', () => {
			expect(windowOps.refresh()).toBe('\x1b[7t');
		});
	});

	describe('maximize/restore', () => {
		it('maximize returns CSI 9;1 t', () => {
			expect(windowOps.maximize()).toBe('\x1b[9;1t');
		});

		it('restoreMaximized returns CSI 9;0 t', () => {
			expect(windowOps.restoreMaximized()).toBe('\x1b[9;0t');
		});

		it('maximizeVertical returns CSI 9;2 t', () => {
			expect(windowOps.maximizeVertical()).toBe('\x1b[9;2t');
		});

		it('maximizeHorizontal returns CSI 9;3 t', () => {
			expect(windowOps.maximizeHorizontal()).toBe('\x1b[9;3t');
		});
	});

	describe('full screen', () => {
		it('enterFullScreen returns CSI 10;1 t', () => {
			expect(windowOps.enterFullScreen()).toBe('\x1b[10;1t');
		});

		it('exitFullScreen returns CSI 10;0 t', () => {
			expect(windowOps.exitFullScreen()).toBe('\x1b[10;0t');
		});

		it('toggleFullScreen returns CSI 10;2 t', () => {
			expect(windowOps.toggleFullScreen()).toBe('\x1b[10;2t');
		});
	});

	describe('title stack', () => {
		it('pushTitle saves both by default', () => {
			expect(windowOps.pushTitle()).toBe('\x1b[22;0t');
		});

		it('pushTitle can save icon only', () => {
			expect(windowOps.pushTitle('icon')).toBe('\x1b[22;1t');
		});

		it('pushTitle can save title only', () => {
			expect(windowOps.pushTitle('title')).toBe('\x1b[22;2t');
		});

		it('popTitle restores both by default', () => {
			expect(windowOps.popTitle()).toBe('\x1b[23;0t');
		});

		it('popTitle can restore icon only', () => {
			expect(windowOps.popTitle('icon')).toBe('\x1b[23;1t');
		});

		it('popTitle can restore title only', () => {
			expect(windowOps.popTitle('title')).toBe('\x1b[23;2t');
		});
	});

	describe('setLines (DECSLPP)', () => {
		it('sets page to specified lines', () => {
			expect(windowOps.setLines(50)).toBe('\x1b[50t');
		});

		it('enforces minimum of 24 lines', () => {
			expect(windowOps.setLines(10)).toBe('\x1b[24t');
		});

		it('floors fractional values', () => {
			expect(windowOps.setLines(40.9)).toBe('\x1b[40t');
		});
	});
});

describe('hyperlink namespace', () => {
	describe('link', () => {
		it('creates a complete hyperlink', () => {
			const result = hyperlink.link('https://example.com', 'Click me');
			expect(result).toBe('\x1b]8;;https://example.com\x1b\\Click me\x1b]8;;\x1b\\');
		});

		it('supports optional id parameter', () => {
			const result = hyperlink.link('https://example.com', 'Link', { id: 'my-link' });
			expect(result).toBe('\x1b]8;id=my-link;https://example.com\x1b\\Link\x1b]8;;\x1b\\');
		});
	});

	describe('start/end', () => {
		it('start opens a hyperlink', () => {
			expect(hyperlink.start('https://example.com')).toBe('\x1b]8;;https://example.com\x1b\\');
		});

		it('start with id includes the id parameter', () => {
			expect(hyperlink.start('https://example.com', { id: 'doc' })).toBe(
				'\x1b]8;id=doc;https://example.com\x1b\\',
			);
		});

		it('end closes the hyperlink', () => {
			expect(hyperlink.end()).toBe('\x1b]8;;\x1b\\');
		});

		it('can create multi-line links', () => {
			const result = hyperlink.start('https://example.com') + 'Line 1\nLine 2' + hyperlink.end();
			expect(result).toBe('\x1b]8;;https://example.com\x1b\\Line 1\nLine 2\x1b]8;;\x1b\\');
		});
	});

	describe('safeLink', () => {
		it('allows https URLs', () => {
			const result = hyperlink.safeLink('https://example.com', 'Safe');
			expect(result).toBe('\x1b]8;;https://example.com\x1b\\Safe\x1b]8;;\x1b\\');
		});

		it('allows http URLs', () => {
			const result = hyperlink.safeLink('http://example.com', 'HTTP');
			expect(result).toContain('http://example.com');
		});

		it('allows mailto URLs', () => {
			const result = hyperlink.safeLink('mailto:user@example.com', 'Email');
			expect(result).toContain('mailto:user@example.com');
		});

		it('allows file URLs', () => {
			const result = hyperlink.safeLink('file:///home/user/doc.txt', 'Doc');
			expect(result).toContain('file:///home/user/doc.txt');
		});

		it('allows tel URLs', () => {
			const result = hyperlink.safeLink('tel:+1234567890', 'Call');
			expect(result).toContain('tel:+1234567890');
		});

		it('blocks javascript URLs', () => {
			const result = hyperlink.safeLink('javascript:alert(1)', 'XSS');
			expect(result).toBe('XSS');
		});

		it('blocks data URLs', () => {
			const result = hyperlink.safeLink('data:text/html,<script>alert(1)</script>', 'XSS');
			expect(result).toBe('XSS');
		});

		it('blocks vbscript URLs', () => {
			const result = hyperlink.safeLink('vbscript:msgbox("hi")', 'VBS');
			expect(result).toBe('VBS');
		});

		it('returns text for invalid URLs', () => {
			const result = hyperlink.safeLink('not a valid url', 'Text');
			expect(result).toBe('Text');
		});
	});

	describe('mailto', () => {
		it('creates mailto link with email as text', () => {
			const result = hyperlink.mailto('user@example.com');
			expect(result).toBe('\x1b]8;;mailto:user@example.com\x1b\\user@example.com\x1b]8;;\x1b\\');
		});

		it('creates mailto link with custom text', () => {
			const result = hyperlink.mailto('support@company.com', 'Contact Us');
			expect(result).toBe('\x1b]8;;mailto:support@company.com\x1b\\Contact Us\x1b]8;;\x1b\\');
		});

		it('supports id option', () => {
			const result = hyperlink.mailto('user@example.com', 'Email', { id: 'contact' });
			expect(result).toContain('id=contact');
		});
	});

	describe('file', () => {
		it('creates file link with path as text', () => {
			const result = hyperlink.file('/home/user/doc.txt');
			expect(result).toBe(
				'\x1b]8;;file:///home/user/doc.txt\x1b\\/home/user/doc.txt\x1b]8;;\x1b\\',
			);
		});

		it('creates file link with custom text', () => {
			const result = hyperlink.file('/src/app.ts', 'app.ts');
			expect(result).toBe('\x1b]8;;file:///src/app.ts\x1b\\app.ts\x1b]8;;\x1b\\');
		});
	});
});

describe('isHyperlinkAllowed', () => {
	it('allows https', () => {
		expect(isHyperlinkAllowed('https://example.com')).toBe(true);
	});

	it('allows http', () => {
		expect(isHyperlinkAllowed('http://example.com')).toBe(true);
	});

	it('allows mailto', () => {
		expect(isHyperlinkAllowed('mailto:user@example.com')).toBe(true);
	});

	it('allows file', () => {
		expect(isHyperlinkAllowed('file:///path/to/file')).toBe(true);
	});

	it('allows tel', () => {
		expect(isHyperlinkAllowed('tel:+1234567890')).toBe(true);
	});

	it('blocks javascript', () => {
		expect(isHyperlinkAllowed('javascript:alert(1)')).toBe(false);
	});

	it('blocks data', () => {
		expect(isHyperlinkAllowed('data:text/html,<script>alert(1)</script>')).toBe(false);
	});

	it('blocks vbscript', () => {
		expect(isHyperlinkAllowed('vbscript:msgbox("hi")')).toBe(false);
	});

	it('returns false for invalid URLs', () => {
		expect(isHyperlinkAllowed('not a valid url')).toBe(false);
	});

	it('returns false for empty string', () => {
		expect(isHyperlinkAllowed('')).toBe(false);
	});
});

describe('HYPERLINK_ALLOWED_PROTOCOLS', () => {
	it('includes safe protocols', () => {
		expect(HYPERLINK_ALLOWED_PROTOCOLS).toContain('http:');
		expect(HYPERLINK_ALLOWED_PROTOCOLS).toContain('https:');
		expect(HYPERLINK_ALLOWED_PROTOCOLS).toContain('mailto:');
		expect(HYPERLINK_ALLOWED_PROTOCOLS).toContain('file:');
		expect(HYPERLINK_ALLOWED_PROTOCOLS).toContain('tel:');
	});

	it('does not include dangerous protocols', () => {
		expect(HYPERLINK_ALLOWED_PROTOCOLS).not.toContain('javascript:');
		expect(HYPERLINK_ALLOWED_PROTOCOLS).not.toContain('data:');
		expect(HYPERLINK_ALLOWED_PROTOCOLS).not.toContain('vbscript:');
	});
});

// =============================================================================
// MEDIA COPY (PRINT) TESTS
// =============================================================================

describe('MediaCopyMode constants', () => {
	it('defines mode values', () => {
		expect(MediaCopyMode.PRINT_SCREEN).toBe(0);
		expect(MediaCopyMode.PRINTER_OFF).toBe(4);
		expect(MediaCopyMode.PRINTER_ON).toBe(5);
		expect(MediaCopyMode.PRINT_LINE).toBe(1);
		expect(MediaCopyMode.PRINT_DISPLAY).toBe(10);
		expect(MediaCopyMode.PRINT_ALL_PAGES).toBe(11);
	});
});

describe('mediaCopy namespace', () => {
	describe('mc', () => {
		it('generates media copy sequence with mode', () => {
			expect(mediaCopy.mc(MediaCopyMode.PRINT_SCREEN)).toBe('\x1b[0i');
			expect(mediaCopy.mc(MediaCopyMode.PRINTER_ON)).toBe('\x1b[5i');
			expect(mediaCopy.mc(MediaCopyMode.PRINTER_OFF)).toBe('\x1b[4i');
		});
	});

	describe('printScreen', () => {
		it('generates print screen sequence', () => {
			expect(mediaCopy.printScreen()).toBe('\x1b[0i');
		});
	});

	describe('printLine', () => {
		it('generates print line sequence', () => {
			expect(mediaCopy.printLine()).toBe('\x1b[1i');
		});
	});

	describe('printerOn', () => {
		it('generates printer on sequence', () => {
			expect(mediaCopy.printerOn()).toBe('\x1b[5i');
		});
	});

	describe('printerOff', () => {
		it('generates printer off sequence', () => {
			expect(mediaCopy.printerOff()).toBe('\x1b[4i');
		});
	});

	describe('printerForBytes', () => {
		it('generates printer for n bytes sequence', () => {
			expect(mediaCopy.printerForBytes(100)).toBe('\x1b[5;100i');
			expect(mediaCopy.printerForBytes(1024)).toBe('\x1b[5;1024i');
		});
	});

	describe('printDisplay', () => {
		it('generates print display sequence', () => {
			expect(mediaCopy.printDisplay()).toBe('\x1b[10i');
		});
	});

	describe('printAllPages', () => {
		it('generates print all pages sequence', () => {
			expect(mediaCopy.printAllPages()).toBe('\x1b[11i');
		});
	});

	describe('autoPrintOn', () => {
		it('generates auto print on sequence', () => {
			expect(mediaCopy.autoPrintOn()).toBe('\x1b[?5i');
		});
	});

	describe('autoPrintOff', () => {
		it('generates auto print off sequence', () => {
			expect(mediaCopy.autoPrintOff()).toBe('\x1b[?4i');
		});
	});

	describe('printCursorPosition', () => {
		it('generates print cursor position sequence', () => {
			expect(mediaCopy.printCursorPosition()).toBe('\x1b[?1i');
		});
	});
});

// =============================================================================
// RECTANGULAR AREA OPERATIONS TESTS
// =============================================================================

describe('rectangle namespace', () => {
	describe('setAttrs', () => {
		it('generates DECCARA sequence with attributes', () => {
			expect(rectangle.setAttrs(1, 1, 10, 20, [SGR.BOLD, SGR.UNDERLINE])).toBe(
				'\x1b[1;1;10;20;1;4$r',
			);
		});

		it('generates DECCARA sequence without attributes', () => {
			expect(rectangle.setAttrs(5, 5, 15, 25, [])).toBe('\x1b[5;5;15;25$r');
		});
	});

	describe('reverseAttrs', () => {
		it('generates DECRARA sequence with attributes', () => {
			expect(rectangle.reverseAttrs(1, 1, 10, 20, [SGR.INVERSE])).toBe('\x1b[1;1;10;20;7$t');
		});

		it('generates DECRARA sequence without attributes', () => {
			expect(rectangle.reverseAttrs(5, 5, 15, 25, [])).toBe('\x1b[5;5;15;25$t');
		});
	});

	describe('copy', () => {
		it('generates DECCRA sequence with default pages', () => {
			expect(rectangle.copy(1, 1, 10, 20, 1, 30)).toBe('\x1b[1;1;10;20;1;1;30;1$v');
		});

		it('generates DECCRA sequence with custom pages', () => {
			expect(rectangle.copy(1, 1, 10, 20, 1, 30, 2, 3)).toBe('\x1b[1;1;10;20;2;1;30;3$v');
		});
	});

	describe('fill', () => {
		it('generates DECFRA sequence with character', () => {
			expect(rectangle.fill(1, 1, 10, 20, '#')).toBe('\x1b[35;1;1;10;20$x');
		});

		it('generates DECFRA sequence with character code', () => {
			expect(rectangle.fill(1, 1, 10, 20, 42)).toBe('\x1b[42;1;1;10;20$x');
		});
	});

	describe('erase', () => {
		it('generates DECERA sequence', () => {
			expect(rectangle.erase(5, 5, 15, 25)).toBe('\x1b[5;5;15;25$z');
		});
	});

	describe('selectiveErase', () => {
		it('generates DECSERA sequence', () => {
			expect(rectangle.selectiveErase(5, 5, 15, 25)).toBe('\x1b[5;5;15;25${');
		});
	});

	describe('setProtection', () => {
		it('generates DECSCA protect sequence', () => {
			expect(rectangle.setProtection(true)).toBe('\x1b[1"q');
		});

		it('generates DECSCA unprotect sequence', () => {
			expect(rectangle.setProtection(false)).toBe('\x1b[0"q');
		});
	});

	describe('requestChecksum', () => {
		it('generates DECRQCRA sequence', () => {
			expect(rectangle.requestChecksum(1, 1, 1, 1, 10, 20)).toBe('\x1b[1;1;1;1;10;20*y');
		});
	});
});

// =============================================================================
// DEC LOCATOR TESTS
// =============================================================================

describe('LocatorEvent constants', () => {
	it('defines event values', () => {
		expect(LocatorEvent.NONE).toBe(0);
		expect(LocatorEvent.BUTTON_DOWN).toBe(1);
		expect(LocatorEvent.BUTTON_UP).toBe(2);
		expect(LocatorEvent.BUTTON_DOWN_UP).toBe(3);
	});
});

describe('LocatorButton constants', () => {
	it('defines button values', () => {
		expect(LocatorButton.NONE).toBe(0);
		expect(LocatorButton.RIGHT).toBe(1);
		expect(LocatorButton.MIDDLE).toBe(2);
		expect(LocatorButton.LEFT).toBe(3);
		expect(LocatorButton.M4).toBe(4);
	});
});

describe('locator namespace', () => {
	describe('enable', () => {
		it('generates DECELR enable sequence with defaults', () => {
			expect(locator.enable()).toBe("\x1b[2;2'z");
		});

		it('generates DECELR enable sequence with one-shot mode', () => {
			expect(locator.enable(1, 2)).toBe("\x1b[1;2'z");
		});

		it('generates DECELR enable sequence with pixel units', () => {
			expect(locator.enable(2, 1)).toBe("\x1b[2;1'z");
		});
	});

	describe('disable', () => {
		it('generates DECELR disable sequence', () => {
			expect(locator.disable()).toBe("\x1b[0'z");
		});
	});

	describe('setFilterRectangle', () => {
		it('generates DECEFR sequence', () => {
			expect(locator.setFilterRectangle(1, 1, 100, 200)).toBe("\x1b[1;1;100;200'w");
		});
	});

	describe('clearFilterRectangle', () => {
		it('generates DECEFR clear sequence', () => {
			expect(locator.clearFilterRectangle()).toBe("\x1b['w");
		});
	});

	describe('setEvents', () => {
		it('generates DECSLE sequence for button down and up', () => {
			expect(locator.setEvents([1, 3])).toBe("\x1b[1;3'{");
		});

		it('generates DECSLE sequence for button down only', () => {
			expect(locator.setEvents([1, 4])).toBe("\x1b[1;4'{");
		});

		it('generates DECSLE sequence for explicit requests only', () => {
			expect(locator.setEvents([0])).toBe("\x1b[0'{");
		});
	});

	describe('requestPosition', () => {
		it('generates DECRQLP sequence without button', () => {
			expect(locator.requestPosition()).toBe("\x1b['|");
		});

		it('generates DECRQLP sequence with button', () => {
			expect(locator.requestPosition(LocatorButton.LEFT)).toBe("\x1b[3'|");
		});
	});

	describe('enableKeyMode', () => {
		it('generates enable key mode sequence', () => {
			expect(locator.enableKeyMode()).toBe('\x1b[?99h');
		});
	});

	describe('disableKeyMode', () => {
		it('generates disable key mode sequence', () => {
			expect(locator.disableKeyMode()).toBe('\x1b[?99l');
		});
	});

	describe('enableExtended', () => {
		it('generates enable extended sequence', () => {
			expect(locator.enableExtended()).toBe('\x1b[?1003h');
		});
	});

	describe('disableExtended', () => {
		it('generates disable extended sequence', () => {
			expect(locator.disableExtended()).toBe('\x1b[?1003l');
		});
	});

	describe('enableHighlight', () => {
		it('generates enable highlight sequence', () => {
			expect(locator.enableHighlight()).toBe('\x1b[?1001h');
		});
	});

	describe('disableHighlight', () => {
		it('generates disable highlight sequence', () => {
			expect(locator.disableHighlight()).toBe('\x1b[?1001l');
		});
	});
});
