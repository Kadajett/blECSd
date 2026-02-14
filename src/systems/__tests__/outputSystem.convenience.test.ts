/**
 * Tests for output system convenience wrapper functions
 */

import { Writable } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
	beginSyncOutput,
	bell,
	cleanup,
	clearOutputStream,
	createOutputState,
	disableBracketedPasteMode,
	disableFocusReporting,
	disableMouseTracking,
	enableBracketedPasteMode,
	enableFocusReporting,
	enableMouseTracking,
	endSyncOutput,
	getOutputState,
	moveTo,
	resetOutputState,
	restoreCursorPosition,
	saveCursorPosition,
	setOutputStream,
	setTerminalCursorShape,
	setWindowTitle,
} from '../outputSystem';

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Creates a writable stream that captures output.
 */
function createCaptureStream(): {
	stream: Writable;
	output: () => string;
	reset: () => void;
} {
	let buffer = '';
	const stream = new Writable({
		write(chunk, _encoding, callback) {
			buffer += chunk.toString();
			callback();
		},
	});
	return {
		stream,
		output: () => buffer,
		reset: () => {
			buffer = '';
		},
	};
}

// =============================================================================
// TESTS
// =============================================================================

describe('outputSystem convenience wrappers', () => {
	let capture: ReturnType<typeof createCaptureStream>;

	beforeEach(() => {
		capture = createCaptureStream();
		setOutputStream(capture.stream);
		resetOutputState();
	});

	afterEach(() => {
		clearOutputStream();
		resetOutputState();
	});

	describe('bell', () => {
		it('should write bell character', () => {
			bell();
			expect(capture.output()).toBe('\x07');
		});
	});

	describe('moveTo', () => {
		it('should move cursor to specified position', () => {
			moveTo(10, 5);
			// 0-indexed input, 1-indexed output
			expect(capture.output()).toBe('\x1b[6;11H');
		});

		it('should update OutputState cursor position', () => {
			const state = getOutputState();
			moveTo(10, 5);
			expect(state.lastX).toBe(10);
			expect(state.lastY).toBe(5);
		});

		it('should handle (0, 0) position', () => {
			moveTo(0, 0);
			expect(capture.output()).toBe('\x1b[1;1H');
		});
	});

	describe('enableMouseTracking', () => {
		it('should enable any motion tracking by default', () => {
			enableMouseTracking();
			expect(capture.output()).toContain('\x1b[?1006h'); // SGR extended
			expect(capture.output()).toContain('\x1b[?1003h'); // Any motion
		});

		it('should enable normal tracking mode', () => {
			enableMouseTracking('normal');
			expect(capture.output()).toContain('\x1b[?1006h'); // SGR extended
			expect(capture.output()).toContain('\x1b[?1000h'); // Normal
		});

		it('should enable button tracking mode', () => {
			enableMouseTracking('button');
			expect(capture.output()).toContain('\x1b[?1006h'); // SGR extended
			expect(capture.output()).toContain('\x1b[?1002h'); // Button
		});

		it('should update OutputState', () => {
			const state = getOutputState();
			enableMouseTracking('any');
			expect(state.mouseTracking).toBe(true);
			expect(state.mouseMode).toBe('any');
		});
	});

	describe('disableMouseTracking', () => {
		it('should disable all tracking modes', () => {
			enableMouseTracking('any');
			capture.reset();

			disableMouseTracking();

			expect(capture.output()).toContain('\x1b[?1000l'); // Normal off
			expect(capture.output()).toContain('\x1b[?1002l'); // Button off
			expect(capture.output()).toContain('\x1b[?1003l'); // Any off
			expect(capture.output()).toContain('\x1b[?1006l'); // SGR off
		});

		it('should update OutputState', () => {
			const state = getOutputState();
			enableMouseTracking('any');
			disableMouseTracking();

			expect(state.mouseTracking).toBe(false);
			expect(state.mouseMode).toBe(null);
		});
	});

	describe('setTerminalCursorShape', () => {
		it('should set block cursor', () => {
			setTerminalCursorShape('block');
			expect(capture.output()).toBe('\x1b[2 q');
		});

		it('should set underline cursor', () => {
			setTerminalCursorShape('underline');
			expect(capture.output()).toBe('\x1b[4 q');
		});

		it('should set bar cursor', () => {
			setTerminalCursorShape('bar');
			expect(capture.output()).toBe('\x1b[6 q');
		});
	});

	describe('setWindowTitle', () => {
		it('should set window title', () => {
			setWindowTitle('My App');
			expect(capture.output()).toBe('\x1b]2;My App\x07');
		});

		it('should handle empty title', () => {
			setWindowTitle('');
			expect(capture.output()).toBe('\x1b]2;\x07');
		});

		it('should handle special characters', () => {
			setWindowTitle('Test: 100% Complete!');
			expect(capture.output()).toBe('\x1b]2;Test: 100% Complete!\x07');
		});
	});

	describe('beginSyncOutput', () => {
		it('should enable synchronized output', () => {
			beginSyncOutput();
			expect(capture.output()).toBe('\x1b[?2026h');
		});

		it('should update OutputState', () => {
			const state = getOutputState();
			beginSyncOutput();
			expect(state.syncOutput).toBe(true);
		});
	});

	describe('endSyncOutput', () => {
		it('should disable synchronized output', () => {
			beginSyncOutput();
			capture.reset();

			endSyncOutput();
			expect(capture.output()).toBe('\x1b[?2026l');
		});

		it('should update OutputState', () => {
			const state = getOutputState();
			beginSyncOutput();
			endSyncOutput();
			expect(state.syncOutput).toBe(false);
		});
	});

	describe('saveCursorPosition', () => {
		it('should save cursor position', () => {
			saveCursorPosition();
			expect(capture.output()).toBe('\x1b7');
		});
	});

	describe('restoreCursorPosition', () => {
		it('should restore cursor position', () => {
			restoreCursorPosition();
			expect(capture.output()).toBe('\x1b8');
		});
	});

	describe('enableBracketedPasteMode', () => {
		it('should enable bracketed paste mode', () => {
			enableBracketedPasteMode();
			expect(capture.output()).toBe('\x1b[?2004h');
		});

		it('should update OutputState', () => {
			const state = getOutputState();
			enableBracketedPasteMode();
			expect(state.bracketedPaste).toBe(true);
		});
	});

	describe('disableBracketedPasteMode', () => {
		it('should disable bracketed paste mode', () => {
			enableBracketedPasteMode();
			capture.reset();

			disableBracketedPasteMode();
			expect(capture.output()).toBe('\x1b[?2004l');
		});

		it('should update OutputState', () => {
			const state = getOutputState();
			enableBracketedPasteMode();
			disableBracketedPasteMode();
			expect(state.bracketedPaste).toBe(false);
		});
	});

	describe('enableFocusReporting', () => {
		it('should enable focus reporting', () => {
			enableFocusReporting();
			expect(capture.output()).toBe('\x1b[?1004h');
		});

		it('should update OutputState', () => {
			const state = getOutputState();
			enableFocusReporting();
			expect(state.focusReporting).toBe(true);
		});
	});

	describe('disableFocusReporting', () => {
		it('should disable focus reporting', () => {
			enableFocusReporting();
			capture.reset();

			disableFocusReporting();
			expect(capture.output()).toBe('\x1b[?1004l');
		});

		it('should update OutputState', () => {
			const state = getOutputState();
			enableFocusReporting();
			disableFocusReporting();
			expect(state.focusReporting).toBe(false);
		});
	});

	describe('cleanup', () => {
		it('should disable bracketed paste if enabled', () => {
			enableBracketedPasteMode();
			capture.reset();

			cleanup();
			expect(capture.output()).toContain('\x1b[?2004l');
		});

		it('should disable focus reporting if enabled', () => {
			enableFocusReporting();
			capture.reset();

			cleanup();
			expect(capture.output()).toContain('\x1b[?1004l');
		});

		it('should disable mouse tracking if enabled', () => {
			enableMouseTracking('any');
			capture.reset();

			cleanup();
			expect(capture.output()).toContain('\x1b[?1000l');
			expect(capture.output()).toContain('\x1b[?1002l');
			expect(capture.output()).toContain('\x1b[?1003l');
			expect(capture.output()).toContain('\x1b[?1006l');
		});

		it('should update OutputState for all modes', () => {
			const state = getOutputState();
			enableBracketedPasteMode();
			enableFocusReporting();
			enableMouseTracking('any');

			cleanup();

			expect(state.bracketedPaste).toBe(false);
			expect(state.focusReporting).toBe(false);
			expect(state.mouseTracking).toBe(false);
		});
	});

	describe('OutputState initialization', () => {
		it('should initialize with correct defaults', () => {
			const state = createOutputState();
			expect(state.mouseTracking).toBe(false);
			expect(state.mouseMode).toBe(null);
			expect(state.syncOutput).toBe(false);
			expect(state.bracketedPaste).toBe(false);
			expect(state.focusReporting).toBe(false);
		});
	});
});
