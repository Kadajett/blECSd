import { describe, expect, it } from 'vitest';
import {
	createPasteState,
	disableBracketedPaste,
	enableBracketedPaste,
	extractPasteContent,
	findPasteEnd,
	isPasteStart,
	mightBePasteStart,
	PasteEventSchema,
	processPasteBuffer,
	sanitizePastedText,
	truncatePaste,
} from './bracketedPaste';

describe('BracketedPaste', () => {
	describe('sanitizePastedText', () => {
		it('strips CSI sequences', () => {
			expect(sanitizePastedText('Hello\x1b[31mRed\x1b[0m World')).toBe('HelloRed World');
		});

		it('strips OSC sequences with BEL', () => {
			expect(sanitizePastedText('Hello\x1b]0;title\x07 World')).toBe('Hello World');
		});

		it('strips simple escape sequences', () => {
			expect(sanitizePastedText('Hello\x1bM World')).toBe('Hello World');
		});

		it('returns text unchanged when no escapes', () => {
			expect(sanitizePastedText('Hello World')).toBe('Hello World');
		});

		it('handles empty string', () => {
			expect(sanitizePastedText('')).toBe('');
		});

		it('strips multiple sequences', () => {
			expect(sanitizePastedText('\x1b[1m\x1b[31mBold Red\x1b[0m Normal')).toBe('Bold Red Normal');
		});
	});

	describe('truncatePaste', () => {
		it('returns text unchanged when within limit', () => {
			expect(truncatePaste('Hello', 100)).toBe('Hello');
		});

		it('truncates text exceeding limit', () => {
			expect(truncatePaste('Hello World', 5)).toBe('Hello');
		});

		it('returns text unchanged when maxLength is 0 (unlimited)', () => {
			expect(truncatePaste('Hello World', 0)).toBe('Hello World');
		});
	});

	describe('isPasteStart', () => {
		it('detects paste start marker', () => {
			const buf = new TextEncoder().encode('\x1b[200~Hello');
			expect(isPasteStart(buf)).toBe(true);
		});

		it('returns false for non-paste sequences', () => {
			const buf = new TextEncoder().encode('\x1b[31m');
			expect(isPasteStart(buf)).toBe(false);
		});

		it('returns false for short buffers', () => {
			const buf = new TextEncoder().encode('\x1b[2');
			expect(isPasteStart(buf)).toBe(false);
		});
	});

	describe('mightBePasteStart', () => {
		it('returns true for partial paste start', () => {
			const buf = new TextEncoder().encode('\x1b[200');
			expect(mightBePasteStart(buf)).toBe(true);
		});

		it('returns true for ESC alone', () => {
			const buf = new TextEncoder().encode('\x1b');
			expect(mightBePasteStart(buf)).toBe(true);
		});

		it('returns false for empty buffer', () => {
			expect(mightBePasteStart(new Uint8Array(0))).toBe(false);
		});

		it('returns false for non-matching prefix', () => {
			const buf = new TextEncoder().encode('abc');
			expect(mightBePasteStart(buf)).toBe(false);
		});
	});

	describe('findPasteEnd', () => {
		it('finds paste end marker', () => {
			const buf = new TextEncoder().encode('Hello\x1b[201~');
			expect(findPasteEnd(buf)).toBe(5);
		});

		it('returns -1 when no end marker', () => {
			const buf = new TextEncoder().encode('Hello World');
			expect(findPasteEnd(buf)).toBe(-1);
		});
	});

	describe('extractPasteContent', () => {
		it('extracts complete paste content', () => {
			const buf = new TextEncoder().encode('\x1b[200~Hello World\x1b[201~');
			const result = extractPasteContent(buf);
			expect(result.pasteStarted).toBe(true);
			expect(result.pasteEnded).toBe(true);
			expect(result.text).toBe('Hello World');
			expect(result.consumed).toBeGreaterThan(0);
		});

		it('detects incomplete paste', () => {
			const buf = new TextEncoder().encode('\x1b[200~Hello');
			const result = extractPasteContent(buf);
			expect(result.pasteStarted).toBe(true);
			expect(result.pasteEnded).toBe(false);
			expect(result.text).toBeNull();
		});

		it('returns no paste for non-paste buffers', () => {
			const buf = new TextEncoder().encode('Hello World');
			const result = extractPasteContent(buf);
			expect(result.pasteStarted).toBe(false);
			expect(result.pasteEnded).toBe(false);
		});

		it('sanitizes paste content when configured', () => {
			const buf = new TextEncoder().encode('\x1b[200~Hello\x1b[31m Red\x1b[0m\x1b[201~');
			const result = extractPasteContent(buf, { sanitize: true });
			expect(result.text).toBe('Hello Red');
		});

		it('preserves escape sequences when sanitize is false', () => {
			const buf = new TextEncoder().encode('\x1b[200~Hello\x1b[31m Red\x1b[0m\x1b[201~');
			const result = extractPasteContent(buf, { sanitize: false });
			expect(result.text).toBe('Hello\x1b[31m Red\x1b[0m');
		});

		it('truncates paste exceeding maxLength', () => {
			const buf = new TextEncoder().encode('\x1b[200~Hello World\x1b[201~');
			const result = extractPasteContent(buf, { maxLength: 5 });
			expect(result.text).toBe('Hello');
		});
	});

	describe('processPasteBuffer (state machine)', () => {
		it('handles complete paste in one buffer', () => {
			const state = createPasteState();
			const buf = new TextEncoder().encode('\x1b[200~Hello\x1b[201~');
			const result = processPasteBuffer(state, buf);

			expect(result.event).not.toBeNull();
			expect(result.event?.text).toBe('Hello');
			expect(result.event?.type).toBe('paste');
			expect(result.state.isPasting).toBe(false);
		});

		it('handles multi-chunk paste', () => {
			let state = createPasteState();

			// First chunk: paste start + partial content
			const buf1 = new TextEncoder().encode('\x1b[200~Hello');
			const result1 = processPasteBuffer(state, buf1);
			expect(result1.event).toBeNull();
			expect(result1.state.isPasting).toBe(true);
			state = result1.state;

			// Second chunk: rest of content + paste end
			const buf2 = new TextEncoder().encode(' World\x1b[201~');
			const result2 = processPasteBuffer(state, buf2);
			expect(result2.event).not.toBeNull();
			expect(result2.event?.text).toBe('Hello World');
			expect(result2.state.isPasting).toBe(false);
		});

		it('returns remaining bytes after paste end', () => {
			const state = createPasteState();
			const buf = new TextEncoder().encode('\x1b[200~Hello\x1b[201~extra');
			const result = processPasteBuffer(state, buf);

			expect(result.event?.text).toBe('Hello');
			expect(new TextDecoder().decode(result.remaining)).toBe('extra');
		});

		it('passes through non-paste buffers', () => {
			const state = createPasteState();
			const buf = new TextEncoder().encode('normal input');
			const result = processPasteBuffer(state, buf);

			expect(result.event).toBeNull();
			expect(result.consumed).toBe(0);
			expect(result.remaining).toBe(buf);
		});

		it('sanitizes multi-chunk paste', () => {
			let state = createPasteState({ sanitize: true });

			const buf1 = new TextEncoder().encode('\x1b[200~Hello\x1b[31m');
			const result1 = processPasteBuffer(state, buf1);
			state = result1.state;

			const buf2 = new TextEncoder().encode(' Red\x1b[0m\x1b[201~');
			const result2 = processPasteBuffer(state, buf2);

			expect(result2.event?.text).toBe('Hello Red');
			expect(result2.event?.sanitized).toBe(true);
		});
	});

	describe('enable/disable helpers', () => {
		it('enableBracketedPaste returns correct sequence', () => {
			expect(enableBracketedPaste()).toBe('\x1b[?2004h');
		});

		it('disableBracketedPaste returns correct sequence', () => {
			expect(disableBracketedPaste()).toBe('\x1b[?2004l');
		});
	});

	describe('PasteEventSchema', () => {
		it('validates valid paste event', () => {
			const result = PasteEventSchema.safeParse({
				type: 'paste',
				text: 'Hello',
				timestamp: Date.now(),
				sanitized: true,
				originalLength: 5,
			});
			expect(result.success).toBe(true);
		});

		it('rejects invalid type', () => {
			const result = PasteEventSchema.safeParse({
				type: 'key',
				text: 'Hello',
				timestamp: Date.now(),
				sanitized: true,
				originalLength: 5,
			});
			expect(result.success).toBe(false);
		});

		it('rejects missing fields', () => {
			const result = PasteEventSchema.safeParse({ type: 'paste' });
			expect(result.success).toBe(false);
		});
	});
});
