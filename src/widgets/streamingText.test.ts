import { describe, expect, it } from 'vitest';
import {
	appendToState,
	clearState,
	createStreamingState,
	getStreamVisibleLines,
	scrollByLines,
	scrollToLine,
	stripAnsiSequences,
	wrapLine,
} from './streamingText';

describe('StreamingText', () => {
	describe('wrapLine', () => {
		it('returns short lines unchanged', () => {
			expect(wrapLine('Hello', 80)).toEqual(['Hello']);
		});

		it('wraps long lines at width boundary', () => {
			expect(wrapLine('Hello World!', 5)).toEqual(['Hello', ' Worl', 'd!']);
		});

		it('handles exact width', () => {
			expect(wrapLine('12345', 5)).toEqual(['12345']);
		});

		it('handles empty string', () => {
			expect(wrapLine('', 80)).toEqual(['']);
		});
	});

	describe('stripAnsiSequences', () => {
		it('strips CSI sequences', () => {
			expect(stripAnsiSequences('\x1b[31mRed\x1b[0m')).toBe('Red');
		});

		it('returns clean text unchanged', () => {
			expect(stripAnsiSequences('Hello')).toBe('Hello');
		});
	});

	describe('createStreamingState', () => {
		it('creates empty state with defaults', () => {
			const state = createStreamingState();
			expect(state.lines).toEqual([]);
			expect(state.scrollTop).toBe(0);
			expect(state.totalBytes).toBe(0);
			expect(state.isStreaming).toBe(false);
			expect(state.config.maxLines).toBe(10000);
		});

		it('accepts custom config', () => {
			const state = createStreamingState({ maxLines: 100, wrapWidth: 40 });
			expect(state.config.maxLines).toBe(100);
			expect(state.config.wrapWidth).toBe(40);
		});
	});

	describe('appendToState', () => {
		it('appends a single line', () => {
			const state = createStreamingState();
			const updated = appendToState(state, 'Hello\n');
			expect(updated.lines).toEqual(['Hello']);
		});

		it('appends multiple lines', () => {
			const state = createStreamingState();
			const updated = appendToState(state, 'Line 1\nLine 2\nLine 3\n');
			expect(updated.lines).toEqual(['Line 1', 'Line 2', 'Line 3']);
		});

		it('handles partial lines (no trailing newline)', () => {
			const state = createStreamingState();
			const updated = appendToState(state, 'Hello');
			expect(updated.lines).toEqual([]);
			expect(updated.partialLine).toBe('Hello');
		});

		it('combines partial line with next append', () => {
			let state = createStreamingState();
			state = appendToState(state, 'Hello');
			state = appendToState(state, ' World\n');
			expect(state.lines).toEqual(['Hello World']);
			expect(state.partialLine).toBe('');
		});

		it('wraps long lines', () => {
			const state = createStreamingState({ wrapWidth: 10 });
			const updated = appendToState(state, 'Hello World, this is long\n');
			expect(updated.lines.length).toBeGreaterThan(1);
			for (const line of updated.lines) {
				expect(line.length).toBeLessThanOrEqual(10);
			}
		});

		it('tracks total bytes', () => {
			let state = createStreamingState();
			state = appendToState(state, 'Hello\n');
			expect(state.totalBytes).toBe(6);
			state = appendToState(state, 'World\n');
			expect(state.totalBytes).toBe(12);
		});

		it('evicts old lines when maxLines reached', () => {
			const state = createStreamingState({ maxLines: 3 });
			let updated = state;
			for (let i = 0; i < 5; i++) {
				updated = appendToState(updated, `Line ${i}\n`);
			}
			expect(updated.lines.length).toBe(3);
			expect(updated.lines[0]).toBe('Line 2');
		});

		it('auto-scrolls to bottom', () => {
			const state = createStreamingState(undefined, 3);
			let updated = state;
			for (let i = 0; i < 10; i++) {
				updated = appendToState(updated, `Line ${i}\n`);
			}
			expect(updated.scrollTop).toBe(7); // 10 lines - 3 viewport
		});

		it('strips ANSI when configured', () => {
			const state = createStreamingState({ stripAnsi: true });
			const updated = appendToState(state, '\x1b[31mRed\x1b[0m Text\n');
			expect(updated.lines[0]).toBe('Red Text');
		});

		it('sets dirty region', () => {
			const state = createStreamingState();
			const updated = appendToState(state, 'Line 1\nLine 2\n');
			expect(updated.dirty).not.toBeNull();
			expect(updated.dirty?.lineCount).toBe(2);
		});
	});

	describe('clearState', () => {
		it('resets all content', () => {
			let state = createStreamingState();
			state = appendToState(state, 'Hello\nWorld\n');
			const cleared = clearState(state);
			expect(cleared.lines).toEqual([]);
			expect(cleared.scrollTop).toBe(0);
			expect(cleared.totalBytes).toBe(0);
			expect(cleared.partialLine).toBe('');
		});

		it('marks full redraw', () => {
			let state = createStreamingState();
			state = appendToState(state, 'Hello\n');
			const cleared = clearState(state);
			expect(cleared.dirty?.fullRedraw).toBe(true);
		});
	});

	describe('getStreamVisibleLines', () => {
		it('returns all lines when fewer than viewport', () => {
			let state = createStreamingState(undefined, 10);
			state = appendToState(state, 'Line 1\nLine 2\n');
			const visible = getStreamVisibleLines(state);
			expect(visible).toEqual(['Line 1', 'Line 2']);
		});

		it('returns viewport-sized slice when scrolled', () => {
			let state = createStreamingState(undefined, 2);
			for (let i = 0; i < 5; i++) {
				state = appendToState(state, `Line ${i}\n`);
			}
			// Auto-scroll puts us at the bottom
			const visible = getStreamVisibleLines(state);
			expect(visible.length).toBe(2);
			expect(visible[0]).toBe('Line 3');
			expect(visible[1]).toBe('Line 4');
		});
	});

	describe('scrollToLine', () => {
		it('scrolls to specified line', () => {
			let state = createStreamingState({ autoScroll: false }, 2);
			for (let i = 0; i < 10; i++) {
				state = appendToState(state, `Line ${i}\n`);
			}
			const scrolled = scrollToLine(state, 5);
			expect(scrolled.scrollTop).toBe(5);
		});

		it('clamps to valid range', () => {
			let state = createStreamingState({ autoScroll: false }, 5);
			for (let i = 0; i < 10; i++) {
				state = appendToState(state, `Line ${i}\n`);
			}
			const scrolled = scrollToLine(state, 100);
			expect(scrolled.scrollTop).toBe(5); // 10 lines - 5 viewport
		});

		it('clamps to 0 for negative values', () => {
			const state = createStreamingState(undefined, 5);
			const scrolled = scrollToLine(state, -10);
			expect(scrolled.scrollTop).toBe(0);
		});

		it('returns same state if already at position', () => {
			const state = createStreamingState();
			const scrolled = scrollToLine(state, 0);
			expect(scrolled).toBe(state);
		});
	});

	describe('scrollByLines', () => {
		it('scrolls down by delta', () => {
			let state = createStreamingState({ autoScroll: false }, 2);
			for (let i = 0; i < 10; i++) {
				state = appendToState(state, `Line ${i}\n`);
			}
			state = { ...state, scrollTop: 0 };
			const scrolled = scrollByLines(state, 3);
			expect(scrolled.scrollTop).toBe(3);
		});

		it('scrolls up by negative delta', () => {
			let state = createStreamingState({ autoScroll: false }, 2);
			for (let i = 0; i < 10; i++) {
				state = appendToState(state, `Line ${i}\n`);
			}
			state = { ...state, scrollTop: 5 };
			const scrolled = scrollByLines(state, -2);
			expect(scrolled.scrollTop).toBe(3);
		});
	});

	describe('streaming workflow', () => {
		it('handles character-by-character streaming', () => {
			let state = createStreamingState(undefined, 5);
			const text = 'Hello World\n';
			for (const char of text) {
				state = appendToState(state, char);
			}
			expect(state.lines).toEqual(['Hello World']);
		});

		it('handles chunk-based streaming', () => {
			let state = createStreamingState(undefined, 5);
			state = appendToState(state, 'Hello ');
			state = appendToState(state, 'World\nFoo ');
			state = appendToState(state, 'Bar\n');
			expect(state.lines).toEqual(['Hello World', 'Foo Bar']);
		});

		it('handles rapid streaming (simulated)', () => {
			let state = createStreamingState({ wrapWidth: 40 }, 10);
			// Simulate 1000 characters arriving rapidly
			for (let i = 0; i < 100; i++) {
				state = appendToState(state, `Chunk ${i} data. `);
			}
			// Flush remaining
			state = appendToState(state, '\n');
			expect(state.totalBytes).toBeGreaterThan(0);
			expect(state.lines.length).toBeGreaterThan(0);
		});
	});
});
