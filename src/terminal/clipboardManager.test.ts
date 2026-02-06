import { describe, expect, it, vi } from 'vitest';
import { chunkText, streamPaste } from './clipboardManager';

describe('ClipboardManager', () => {
	describe('chunkText', () => {
		it('returns single chunk for small text', () => {
			const chunks = chunkText('hello', 100);
			expect(chunks.length).toBe(1);
			expect(chunks[0]).toBe('hello');
		});

		it('splits text into chunks of specified size', () => {
			const text = 'a'.repeat(250);
			const chunks = chunkText(text, 100);
			expect(chunks.length).toBe(3);
			expect(chunks[0]!.length).toBe(100);
			expect(chunks[1]!.length).toBe(100);
			expect(chunks[2]!.length).toBe(50);
		});

		it('handles exact chunk size boundaries', () => {
			const text = 'a'.repeat(200);
			const chunks = chunkText(text, 100);
			expect(chunks.length).toBe(2);
			expect(chunks[0]!.length).toBe(100);
			expect(chunks[1]!.length).toBe(100);
		});
	});

	describe('streamPaste', () => {
		it('calls onChunk for each chunk', async () => {
			const onChunk = vi.fn();
			const text = 'a'.repeat(150);

			await streamPaste(text, onChunk, 100);

			expect(onChunk).toHaveBeenCalledTimes(2);
		});

		it('provides progress information', async () => {
			const progresses: number[] = [];
			const text = 'a'.repeat(300);

			await streamPaste(
				text,
				(_, progress) => {
					progresses.push(progress.percentage);
				},
				100,
			);

			expect(progresses.length).toBe(3);
			expect(progresses[progresses.length - 1]).toBe(100);
		});

		it('marks last chunk as complete', async () => {
			let lastComplete = false;
			const text = 'hello world';

			await streamPaste(
				text,
				(_, progress) => {
					lastComplete = progress.complete;
				},
				100,
			);

			expect(lastComplete).toBe(true);
		});
	});
});
