/**
 * Conflict Resolution for Collaborative Terminal Sessions
 *
 * Provides primitives for resolving concurrent edits to shared state:
 * - **LWW (Last-Write-Wins)**: For discrete state (toggles, selections, scroll positions)
 * - **Text CRDT**: For concurrent text editing (character-by-character insert/delete)
 *
 * The text CRDT uses a simplified RGA (Replicated Growable Array) approach where
 * each character has a unique ID (siteId + sequence counter). This gives
 * "good enough" collaboration semantics without full OT complexity.
 *
 * @module terminal/conflictResolution
 *
 * @example
 * ```typescript
 * import {
 *   createLWWRegister,
 *   setLWWValue,
 *   getLWWValue,
 *   createTextCRDT,
 *   insertText,
 *   deleteText,
 *   getTextValue,
 * } from 'blecsd';
 *
 * // LWW for scroll position
 * const scrollReg = createLWWRegister(0);
 * setLWWValue(scrollReg, 42, 'session-1', Date.now());
 *
 * // Text CRDT for shared text input
 * const doc = createTextCRDT('site-1');
 * insertText(doc, 0, 'Hello');
 * ```
 */

// LWW Map
export {
	createLWWMap,
	getLWWMapKeys,
	getLWWMapSize,
	getLWWMapValue,
	hasLWWMapKey,
	type LWWMap,
	mergeLWWMaps,
	setLWWMapValue,
} from './lwwMap';
// LWW Register
export {
	createLWWRegister,
	getLWWMetadata,
	getLWWValue,
	type LWWRegister,
	mergeLWWRegisters,
	setLWWValue,
} from './lwwRegister';

// Text CRDT
export {
	applyRemoteOp,
	type CharId,
	type CharNode,
	compactDocument,
	createTextCRDT,
	deleteChar,
	deleteText,
	getDocumentOps,
	getTextLength,
	getTextValue,
	getTombstoneCount,
	getTotalNodeCount,
	insertChar,
	insertText,
	type TextCRDT,
	type TextOp,
	TextOpSchema,
} from './textCrdt';

// Utilities
export { type ConflictResult, resolveLWWConflict } from './utils';
