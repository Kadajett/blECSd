/**
 * Conflict resolution (CRDT) namespace.
 *
 * Functions for managing collaborative text editing with Conflict-free
 * Replicated Data Types (CRDTs). Includes text CRDT for documents and
 * Last-Write-Wins (LWW) registers and maps for metadata.
 *
 * @example
 * ```typescript
 * import { conflictRes } from 'blecsd/terminal';
 *
 * // Create text CRDT for collaborative editing
 * const doc = conflictRes.createTextCRDT('user-1');
 * conflictRes.insertText(doc, 0, 'Hello');
 * conflictRes.insertText(doc, 5, ' world');
 * const text = conflictRes.getTextValue(doc);
 *
 * // Create LWW register for single values
 * const register = conflictRes.createLWWRegister('initial', 'user-1', 1);
 * conflictRes.setLWWValue(register, 'updated', 2);
 * const value = conflictRes.getLWWValue(register);
 *
 * // Create LWW map for key-value pairs
 * const map = conflictRes.createLWWMap('user-1');
 * conflictRes.setLWWMapValue(map, 'key', 'value', 1);
 * ```
 */

import {
	applyRemoteOp,
	compactDocument,
	createLWWMap,
	createLWWRegister,
	createTextCRDT,
	deleteChar,
	deleteText,
	getDocumentOps,
	getLWWMapKeys,
	getLWWMapSize,
	getLWWMapValue,
	getLWWMetadata,
	getLWWValue,
	getTextLength,
	getTextValue,
	getTombstoneCount,
	getTotalNodeCount,
	hasLWWMapKey,
	insertChar,
	insertText,
	mergeLWWMaps,
	mergeLWWRegisters,
	resolveLWWConflict,
	setLWWMapValue,
	setLWWValue,
} from '../conflictResolution';

/**
 * Conflict resolution (CRDT) namespace.
 */
export const conflictRes = Object.freeze({
	applyRemoteOp,
	compactDocument,
	createLWWMap,
	createLWWRegister,
	createTextCRDT,
	deleteChar,
	deleteText,
	getDocumentOps,
	getLWWMapKeys,
	getLWWMapSize,
	getLWWMapValue,
	getLWWMetadata,
	getLWWValue,
	getTextLength,
	getTextValue,
	getTombstoneCount,
	getTotalNodeCount,
	hasLWWMapKey,
	insertChar,
	insertText,
	mergeLWWMaps,
	mergeLWWRegisters,
	resolveLWWConflict,
	setLWWMapValue,
	setLWWValue,
});

export type ConflictResModule = typeof conflictRes;
