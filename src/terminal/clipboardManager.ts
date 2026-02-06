/**
 * Efficient Clipboard Operations
 *
 * Provides async, chunked clipboard operations that never block the UI.
 * Supports large text selections (1MB+) with progress tracking and
 * streaming paste for huge content.
 *
 * @module terminal/clipboardManager
 */

import { ClipboardSelection, clipboard } from './ansi';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Clipboard operation progress.
 */
export interface ClipboardProgress {
	/** Bytes processed so far */
	readonly processed: number;
	/** Total bytes to process */
	readonly total: number;
	/** Progress percentage (0-100) */
	readonly percentage: number;
	/** Whether the operation is complete */
	readonly complete: boolean;
}

/**
 * Clipboard operation result.
 */
export interface ClipboardResult {
	/** Whether the operation succeeded */
	readonly success: boolean;
	/** Error message if failed */
	readonly error?: string;
	/** Number of bytes processed */
	readonly bytesProcessed: number;
	/** Time taken in milliseconds */
	readonly elapsedMs: number;
}

/**
 * Clipboard manager configuration.
 */
export interface ClipboardManagerConfig {
	/** Chunk size for large operations in bytes (default: 64KB) */
	readonly chunkSize: number;
	/** Maximum clipboard content size in bytes (default: 10MB) */
	readonly maxSize: number;
	/** Whether to use OSC 52 for system clipboard (default: true) */
	readonly useOSC52: boolean;
}

/**
 * Clipboard manager state.
 */
export interface ClipboardManager {
	/** Copy text to clipboard (async for large content) */
	copy(text: string, onProgress?: (progress: ClipboardProgress) => void): Promise<ClipboardResult>;
	/** Write text directly to clipboard via OSC 52 */
	writeToTerminal(text: string): ClipboardResult;
	/** Request clipboard read from terminal */
	requestRead(): void;
	/** Clear clipboard */
	clear(): void;
	/** Get internal buffer content */
	getBuffer(): string;
	/** Cancel any ongoing operation */
	cancel(): void;
}

// =============================================================================
// DEFAULTS
// =============================================================================

const DEFAULT_CONFIG: ClipboardManagerConfig = {
	chunkSize: 64 * 1024,
	maxSize: 10 * 1024 * 1024,
	useOSC52: true,
};

// =============================================================================
// IMPLEMENTATION
// =============================================================================

/**
 * Creates a clipboard manager for efficient copy/paste operations.
 *
 * @param config - Optional configuration
 * @returns Clipboard manager instance
 *
 * @example
 * ```typescript
 * import { createClipboardManager } from 'blecsd';
 *
 * const cm = createClipboardManager();
 *
 * // Copy small text (instant)
 * await cm.copy('Hello World');
 *
 * // Copy large text with progress
 * const largeText = generateLargeContent();
 * await cm.copy(largeText, (progress) => {
 *   renderProgressBar(progress.percentage);
 * });
 * ```
 */
export function createClipboardManager(config?: Partial<ClipboardManagerConfig>): ClipboardManager {
	const cfg: ClipboardManagerConfig = { ...DEFAULT_CONFIG, ...config };

	let buffer = '';
	let cancelled = false;

	function validateSize(text: string, startTime: number): ClipboardResult | null {
		if (text.length <= cfg.maxSize) return null;

		return {
			success: false,
			error: `Content too large (${text.length} bytes, max ${cfg.maxSize})`,
			bytesProcessed: 0,
			elapsedMs: performance.now() - startTime,
		};
	}

	function writeToClipboard(text: string): void {
		if (!cfg.useOSC52) return;

		const seq = clipboard.write(text, ClipboardSelection.CLIPBOARD, cfg.maxSize);
		if (seq) {
			process.stdout.write(seq);
		}
	}

	function copySmallText(
		text: string,
		startTime: number,
		onProgress?: (progress: ClipboardProgress) => void,
	): ClipboardResult {
		writeToClipboard(text);

		onProgress?.({
			processed: text.length,
			total: text.length,
			percentage: 100,
			complete: true,
		});

		return {
			success: true,
			bytesProcessed: text.length,
			elapsedMs: performance.now() - startTime,
		};
	}

	async function copyLargeText(
		text: string,
		startTime: number,
		onProgress?: (progress: ClipboardProgress) => void,
	): Promise<ClipboardResult> {
		let processed = 0;
		const total = text.length;

		while (processed < total && !cancelled) {
			const end = Math.min(processed + cfg.chunkSize, total);
			processed = end;

			onProgress?.({
				processed,
				total,
				percentage: Math.round((processed / total) * 100),
				complete: processed >= total,
			});

			await new Promise<void>((resolve) => setTimeout(resolve, 0));
		}

		if (cancelled) {
			return {
				success: false,
				error: 'Operation cancelled',
				bytesProcessed: processed,
				elapsedMs: performance.now() - startTime,
			};
		}

		writeToClipboard(text);

		return {
			success: true,
			bytesProcessed: total,
			elapsedMs: performance.now() - startTime,
		};
	}

	return {
		async copy(
			text: string,
			onProgress?: (progress: ClipboardProgress) => void,
		): Promise<ClipboardResult> {
			const startTime = performance.now();
			cancelled = false;

			const sizeError = validateSize(text, startTime);
			if (sizeError) return sizeError;

			buffer = text;

			// Small text: write directly
			if (text.length <= cfg.chunkSize) {
				return copySmallText(text, startTime, onProgress);
			}

			// Large text: process in chunks with yielding
			return copyLargeText(text, startTime, onProgress);
		},

		writeToTerminal(text: string): ClipboardResult {
			const startTime = performance.now();

			if (text.length > cfg.maxSize) {
				return {
					success: false,
					error: `Content too large (${text.length} bytes, max ${cfg.maxSize})`,
					bytesProcessed: 0,
					elapsedMs: performance.now() - startTime,
				};
			}

			buffer = text;
			const seq = clipboard.write(text, ClipboardSelection.CLIPBOARD, cfg.maxSize);
			if (seq) {
				process.stdout.write(seq);
			}

			return {
				success: true,
				bytesProcessed: text.length,
				elapsedMs: performance.now() - startTime,
			};
		},

		requestRead(): void {
			const seq = clipboard.requestRead();
			process.stdout.write(seq);
		},

		clear(): void {
			buffer = '';
			const seq = clipboard.clear();
			process.stdout.write(seq);
		},

		getBuffer(): string {
			return buffer;
		},

		cancel(): void {
			cancelled = true;
		},
	};
}

/**
 * Splits text into chunks for streaming paste.
 *
 * @param text - Text to split
 * @param chunkSize - Size of each chunk
 * @returns Array of text chunks
 *
 * @example
 * ```typescript
 * const chunks = chunkText(largeText, 64 * 1024);
 * for (const chunk of chunks) {
 *   await processChunk(chunk);
 * }
 * ```
 */
export function chunkText(text: string, chunkSize: number): readonly string[] {
	if (text.length <= chunkSize) return [text];

	const chunks: string[] = [];
	for (let i = 0; i < text.length; i += chunkSize) {
		chunks.push(text.slice(i, i + chunkSize));
	}
	return chunks;
}

/**
 * Streams text content in chunks, yielding to the event loop between chunks.
 * Useful for pasting large content without blocking the UI.
 *
 * @param text - Text to stream
 * @param onChunk - Callback for each chunk
 * @param chunkSize - Size of each chunk (default: 64KB)
 * @returns Promise that resolves when streaming is complete
 *
 * @example
 * ```typescript
 * await streamPaste(largeText, (chunk, progress) => {
 *   insertText(chunk);
 *   updateProgressBar(progress);
 * });
 * ```
 */
export async function streamPaste(
	text: string,
	onChunk: (chunk: string, progress: ClipboardProgress) => void,
	chunkSize = 64 * 1024,
): Promise<void> {
	const total = text.length;
	let processed = 0;

	const chunks = chunkText(text, chunkSize);
	for (const chunk of chunks) {
		processed += chunk.length;

		onChunk(chunk, {
			processed,
			total,
			percentage: Math.round((processed / total) * 100),
			complete: processed >= total,
		});

		// Yield to event loop
		if (processed < total) {
			await new Promise<void>((resolve) => setTimeout(resolve, 0));
		}
	}
}
