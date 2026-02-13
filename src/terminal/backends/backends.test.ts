/**
 * Tests for 2D TUI Render Backends.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Attr } from '../screen/cell';
import { createAnsiBackend } from './ansi';
import { createRenderBackendByType, detectRenderBackend, getAvailableBackends } from './detection';
import { createKittyRenderBackend, encodeKittyImage } from './kitty';
import type { RenderCell } from './types';

function makeCell(
	char: string,
	fg = 0xffffffff,
	bg = 0xff000000,
	attrs: number = Attr.NONE,
): RenderCell['cell'] {
	return { char, fg, bg, attrs };
}

function makeChange(
	x: number,
	y: number,
	char: string,
	fg?: number,
	bg?: number,
	attrs?: number,
): RenderCell {
	return { x, y, cell: makeCell(char, fg, bg, attrs ?? Attr.NONE) };
}

describe('ANSI Backend', () => {
	it('creates with default config', () => {
		const backend = createAnsiBackend();
		expect(backend.name).toBe('ansi');
		expect(backend.capabilities.truecolor).toBe(true);
		expect(backend.capabilities.images).toBe(false);
	});

	it('always detects as supported', () => {
		const backend = createAnsiBackend();
		expect(backend.detect()).toBe(true);
	});

	it('generates init sequence with alternate screen and hidden cursor', () => {
		const backend = createAnsiBackend();
		const init = backend.init();
		expect(init).toContain('\x1b[?1049h'); // Alternate screen
		expect(init).toContain('\x1b[?25l'); // Hide cursor
	});

	it('generates cleanup sequence', () => {
		const backend = createAnsiBackend();
		const cleanup = backend.cleanup();
		expect(cleanup).toContain('\x1b[?25h'); // Show cursor
		expect(cleanup).toContain('\x1b[?1049l'); // Leave alternate screen
		expect(cleanup).toContain('\x1b[0m'); // Reset SGR
	});

	it('renders empty changes as empty string', () => {
		const backend = createAnsiBackend();
		backend.init();
		expect(backend.renderBuffer([], 80, 24)).toBe('');
	});

	it('renders a single cell with cursor positioning', () => {
		const backend = createAnsiBackend();
		backend.init();

		const changes: RenderCell[] = [makeChange(5, 3, 'A')];
		const output = backend.renderBuffer(changes, 80, 24);

		// Should contain cursor move to (5, 3) => ESC[4;6H (1-indexed)
		expect(output).toContain('\x1b[4;6H');
		expect(output).toContain('A');
	});

	it('renders cells sorted by row then column', () => {
		const backend = createAnsiBackend();
		backend.init();

		// Pass cells in reverse order
		const changes: RenderCell[] = [makeChange(10, 5, 'B'), makeChange(5, 3, 'A')];

		const output = backend.renderBuffer(changes, 80, 24);

		// A should appear before B in output since row 3 < row 5
		const aIndex = output.indexOf('A');
		const bIndex = output.indexOf('B');
		expect(aIndex).toBeLessThan(bIndex);
	});

	it('generates truecolor fg/bg sequences', () => {
		const backend = createAnsiBackend();
		backend.init();

		// Red fg (0xFFFF0000), blue bg (0xFF0000FF)
		const changes: RenderCell[] = [makeChange(0, 0, 'X', 0xffff0000, 0xff0000ff)];
		const output = backend.renderBuffer(changes, 80, 24);

		// Should contain true color SGR sequences
		expect(output).toContain('\x1b[38;2;255;0;0m'); // FG red
		expect(output).toContain('\x1b[48;2;0;0;255m'); // BG blue
	});

	it('generates bold attribute sequence', () => {
		const backend = createAnsiBackend();
		backend.init();

		const changes: RenderCell[] = [makeChange(0, 0, 'B', 0xffffffff, 0xff000000, Attr.BOLD)];
		const output = backend.renderBuffer(changes, 80, 24);

		expect(output).toContain('\x1b[1m'); // Bold
	});

	it('optimizes cursor movement for adjacent cells', () => {
		const backend = createAnsiBackend();
		backend.init();

		const fg = 0xffffffff;
		const bg = 0xff000000;
		// Two adjacent cells on same row
		const changes: RenderCell[] = [makeChange(5, 0, 'A', fg, bg), makeChange(6, 0, 'B', fg, bg)];
		const output = backend.renderBuffer(changes, 80, 24);

		// The second cell should NOT have a cursor move (implicit advance)
		// Count cursor move sequences
		// biome-ignore lint/suspicious/noControlCharactersInRegex: Testing ANSI escape sequences
		const moves = output.match(/\x1b\[\d+;\d+H/g);
		expect(moves).toHaveLength(1); // Only the initial position
	});

	it('respects truecolor config setting', () => {
		const backend = createAnsiBackend({ truecolor: false });
		expect(backend.capabilities.truecolor).toBe(false);
	});
});

describe('Kitty Backend', () => {
	it('creates with correct capabilities', () => {
		const backend = createKittyRenderBackend();
		expect(backend.name).toBe('kitty');
		expect(backend.capabilities.truecolor).toBe(true);
		expect(backend.capabilities.images).toBe(true);
		expect(backend.capabilities.synchronizedOutput).toBe(true);
	});

	it('detects kitty terminal via TERM_PROGRAM', () => {
		const origTermProgram = process.env.TERM_PROGRAM;

		process.env.TERM_PROGRAM = 'kitty';
		const backend = createKittyRenderBackend();
		expect(backend.detect()).toBe(true);

		process.env.TERM_PROGRAM = origTermProgram ?? '';
	});

	it('detects kitty terminal via KITTY_WINDOW_ID', () => {
		const origId = process.env.KITTY_WINDOW_ID;
		const origTerm = process.env.TERM_PROGRAM;

		process.env.TERM_PROGRAM = '';
		process.env.KITTY_WINDOW_ID = '1';
		const backend = createKittyRenderBackend();
		expect(backend.detect()).toBe(true);

		process.env.KITTY_WINDOW_ID = origId ?? '';
		process.env.TERM_PROGRAM = origTerm ?? '';
	});

	it('init includes synchronized output mode', () => {
		const backend = createKittyRenderBackend();
		const init = backend.init();
		expect(init).toContain('\x1b[?2026h'); // Synchronized output
	});

	it('renderBuffer wraps output in sync sequences', () => {
		const backend = createKittyRenderBackend();
		backend.init();

		const changes: RenderCell[] = [makeChange(0, 0, 'A')];
		const output = backend.renderBuffer(changes, 80, 24);

		// biome-ignore lint/suspicious/noControlCharactersInRegex: Testing ANSI escape sequences
		expect(output).toMatch(/^\x1b\[\?2026h/); // Starts with sync begin
		// biome-ignore lint/suspicious/noControlCharactersInRegex: Testing ANSI escape sequences
		expect(output).toMatch(/\x1b\[\?2026l$/); // Ends with sync end
	});

	it('cleanup includes sync mode disable', () => {
		const backend = createKittyRenderBackend();
		const cleanup = backend.cleanup();
		expect(cleanup).toContain('\x1b[?2026l');
	});
});

describe('encodeKittyImage', () => {
	it('encodes PNG image data', () => {
		const data = Buffer.from('fakepngdata').toString('base64');
		const seq = encodeKittyImage(data);

		// biome-ignore lint/suspicious/noControlCharactersInRegex: Testing ANSI escape sequences
		expect(seq).toMatch(/^\x1b_G/); // APC
		// biome-ignore lint/suspicious/noControlCharactersInRegex: Testing ANSI escape sequences
		expect(seq).toMatch(/\x1b\\$/); // ST
		expect(seq).toContain('a=T'); // Transmit
		expect(seq).toContain('f=100'); // PNG format
		expect(seq).toContain(data);
	});

	it('encodes with dimensions', () => {
		const seq = encodeKittyImage('base64data', { width: 10, height: 5 });
		expect(seq).toContain('c=10');
		expect(seq).toContain('r=5');
	});

	it('supports RGB format', () => {
		const seq = encodeKittyImage('data', { format: 'rgb' });
		expect(seq).toContain('f=24');
	});

	it('supports RGBA format', () => {
		const seq = encodeKittyImage('data', { format: 'rgba' });
		expect(seq).toContain('f=32');
	});
});

describe('Backend Detection', () => {
	let origTermProgram: string | undefined;
	let origTerm: string | undefined;
	let origKittyId: string | undefined;

	beforeEach(() => {
		origTermProgram = process.env.TERM_PROGRAM;
		origTerm = process.env.TERM;
		origKittyId = process.env.KITTY_WINDOW_ID;
	});

	afterEach(() => {
		if (origTermProgram !== undefined) {
			process.env.TERM_PROGRAM = origTermProgram;
		} else {
			process.env.TERM_PROGRAM = '';
		}
		if (origTerm !== undefined) {
			process.env.TERM = origTerm;
		} else {
			process.env.TERM = '';
		}
		if (origKittyId !== undefined) {
			process.env.KITTY_WINDOW_ID = origKittyId;
		} else {
			process.env.KITTY_WINDOW_ID = '';
		}
	});

	it('detects kitty backend when TERM_PROGRAM=kitty', () => {
		process.env.TERM_PROGRAM = 'kitty';
		const backend = detectRenderBackend();
		expect(backend.name).toBe('kitty');
	});

	it('falls back to ansi when no special terminal detected', () => {
		process.env.TERM_PROGRAM = 'xterm';
		process.env.KITTY_WINDOW_ID = '';
		const backend = detectRenderBackend();
		expect(backend.name).toBe('ansi');
	});

	it('respects preferred backend override', () => {
		process.env.TERM_PROGRAM = 'kitty';
		const backend = detectRenderBackend({ preferred: 'ansi' });
		expect(backend.name).toBe('ansi');
	});

	it('creates backend by explicit type', () => {
		expect(createRenderBackendByType('ansi').name).toBe('ansi');
		expect(createRenderBackendByType('kitty').name).toBe('kitty');
	});

	it('lists available backends', () => {
		const backends = getAvailableBackends();
		expect(backends).toContain('ansi');
		expect(backends).toContain('kitty');
	});
});
