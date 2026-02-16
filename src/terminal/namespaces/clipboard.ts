/**
 * Clipboard manager namespace.
 *
 * Functions for managing terminal clipboard operations including
 * text chunking for large pastes and streaming paste operations.
 *
 * @example
 * ```typescript
 * import { clipboard } from 'blecsd/terminal';
 *
 * // Create clipboard manager
 * const manager = clipboard.createClipboardManager(program, config);
 *
 * // Copy text to clipboard
 * const result = await manager.copy('Large text content...');
 *
 * // Stream large paste operations
 * const chunks = clipboard.chunkText(largeText, 4096);
 * for await (const progress of clipboard.streamPaste(program, chunks)) {
 *   console.log(`Pasted ${progress.bytesWritten} bytes`);
 * }
 * ```
 */

import { chunkText, createClipboardManager, streamPaste } from '../clipboardManager';

/**
 * Clipboard manager namespace.
 */
export const clipboard = Object.freeze({
	chunkText,
	createClipboardManager,
	streamPaste,
});

export type ClipboardModule = typeof clipboard;
