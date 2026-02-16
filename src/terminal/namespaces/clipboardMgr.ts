/**
 * Clipboard manager namespace.
 *
 * Functions for managing terminal clipboard operations including
 * text chunking for large pastes and streaming paste operations.
 *
 * @example
 * ```typescript
 * import { clipboardMgr } from 'blecsd/terminal';
 *
 * // Create clipboard manager
 * const manager = clipboardMgr.createClipboardManager(program, config);
 *
 * // Copy text to clipboard
 * const result = await manager.copy('Large text content...');
 *
 * // Stream large paste operations
 * const chunks = clipboardMgr.chunkText(largeText, 4096);
 * for await (const progress of clipboardMgr.streamPaste(program, chunks)) {
 *   console.log(`Pasted ${progress.bytesWritten} bytes`);
 * }
 * ```
 */

import { chunkText, createClipboardManager, streamPaste } from '../clipboardManager';

/**
 * Clipboard manager namespace.
 */
export const clipboardMgr = Object.freeze({
	chunkText,
	createClipboardManager,
	streamPaste,
});

export type ClipboardMgrModule = typeof clipboardMgr;
