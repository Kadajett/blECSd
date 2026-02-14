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

import { z } from 'zod';

// =============================================================================
// LWW REGISTER (Last-Write-Wins)
// =============================================================================

/**
 * Last-Write-Wins register for discrete shared state.
 * The value with the highest timestamp wins. Ties broken by site ID.
 */
export interface LWWRegister<T> {
	/** Current value */
	value: T;
	/** Timestamp of last write */
	timestamp: number;
	/** Site ID of last writer */
	siteId: string;
}

/**
 * Creates a new LWW register with an initial value.
 *
 * @param initialValue - The starting value
 * @param siteId - The initial site ID (default: 'local')
 * @returns New LWW register
 *
 * @example
 * ```typescript
 * const scrollPos = createLWWRegister(0);
 * const selectedIndex = createLWWRegister(-1);
 * const isExpanded = createLWWRegister(false);
 * ```
 */
export function createLWWRegister<T>(initialValue: T, siteId = 'local'): LWWRegister<T> {
	return {
		value: initialValue,
		timestamp: 0,
		siteId,
	};
}

/**
 * Attempts to set the value of an LWW register.
 * The write succeeds if the timestamp is newer than the current one,
 * or if timestamps are equal and siteId is lexicographically greater (tie-breaking).
 *
 * @param register - The LWW register
 * @param value - New value
 * @param siteId - The writer's site ID
 * @param timestamp - The write timestamp
 * @returns true if the write was accepted
 *
 * @example
 * ```typescript
 * const reg = createLWWRegister(0);
 * setLWWValue(reg, 42, 'session-1', Date.now());
 * ```
 */
export function setLWWValue<T>(
	register: LWWRegister<T>,
	value: T,
	siteId: string,
	timestamp: number,
): boolean {
	if (timestamp > register.timestamp) {
		register.value = value;
		register.timestamp = timestamp;
		register.siteId = siteId;
		return true;
	}

	if (timestamp === register.timestamp && siteId > register.siteId) {
		register.value = value;
		register.timestamp = timestamp;
		register.siteId = siteId;
		return true;
	}

	return false;
}

/**
 * Gets the current value of an LWW register.
 *
 * @param register - The LWW register
 * @returns Current value
 */
export function getLWWValue<T>(register: LWWRegister<T>): T {
	return register.value;
}

/**
 * Gets the metadata of an LWW register (timestamp and last writer).
 *
 * @param register - The LWW register
 * @returns Metadata object
 */
export function getLWWMetadata<T>(register: LWWRegister<T>): { timestamp: number; siteId: string } {
	return {
		timestamp: register.timestamp,
		siteId: register.siteId,
	};
}

/**
 * Merges two LWW registers, returning the winning value.
 *
 * @param a - First register
 * @param b - Second register
 * @returns The register with the winning value
 */
export function mergeLWWRegisters<T>(a: LWWRegister<T>, b: LWWRegister<T>): LWWRegister<T> {
	if (b.timestamp > a.timestamp) {
		return { value: b.value, timestamp: b.timestamp, siteId: b.siteId };
	}
	if (b.timestamp === a.timestamp && b.siteId > a.siteId) {
		return { value: b.value, timestamp: b.timestamp, siteId: b.siteId };
	}
	return { value: a.value, timestamp: a.timestamp, siteId: a.siteId };
}

// =============================================================================
// LWW MAP (for key-value state like widget properties)
// =============================================================================

/**
 * LWW Map: a map where each key has LWW semantics.
 * Useful for per-entity state like scroll positions, toggle states, etc.
 */
export interface LWWMap<T> {
	/** Internal map of key to LWW register */
	readonly entries: Map<string, LWWRegister<T>>;
}

/**
 * Creates a new empty LWW map.
 *
 * @returns Empty LWW map
 *
 * @example
 * ```typescript
 * const widgetState = createLWWMap<number>();
 * setLWWMapValue(widgetState, 'scrollY', 100, 'session-1', Date.now());
 * ```
 */
export function createLWWMap<T>(): LWWMap<T> {
	return { entries: new Map() };
}

/**
 * Sets a value in an LWW map.
 *
 * @param map - The LWW map
 * @param key - The key
 * @param value - The value
 * @param siteId - Writer's site ID
 * @param timestamp - Write timestamp
 * @returns true if the write was accepted
 */
export function setLWWMapValue<T>(
	map: LWWMap<T>,
	key: string,
	value: T,
	siteId: string,
	timestamp: number,
): boolean {
	const existing = map.entries.get(key);
	if (!existing) {
		map.entries.set(key, { value, timestamp, siteId });
		return true;
	}
	return setLWWValue(existing, value, siteId, timestamp);
}

/**
 * Gets a value from an LWW map.
 *
 * @param map - The LWW map
 * @param key - The key
 * @returns Value or undefined
 */
export function getLWWMapValue<T>(map: LWWMap<T>, key: string): T | undefined {
	const register = map.entries.get(key);
	if (!register) {
		return undefined;
	}
	return register.value;
}

/**
 * Checks if a key exists in an LWW map.
 *
 * @param map - The LWW map
 * @param key - The key
 * @returns true if exists
 */
export function hasLWWMapKey<T>(map: LWWMap<T>, key: string): boolean {
	return map.entries.has(key);
}

/**
 * Gets all keys in an LWW map.
 *
 * @param map - The LWW map
 * @returns Array of keys
 */
export function getLWWMapKeys<T>(map: LWWMap<T>): readonly string[] {
	return [...map.entries.keys()];
}

/**
 * Gets the size of an LWW map.
 *
 * @param map - The LWW map
 * @returns Number of entries
 */
export function getLWWMapSize<T>(map: LWWMap<T>): number {
	return map.entries.size;
}

/**
 * Merges two LWW maps. For each key present in either map,
 * the register with the winning timestamp is kept.
 *
 * @param a - First map
 * @param b - Second map
 * @returns Merged map
 */
export function mergeLWWMaps<T>(a: LWWMap<T>, b: LWWMap<T>): LWWMap<T> {
	const merged = createLWWMap<T>();

	// Copy all from a
	for (const [key, reg] of a.entries) {
		merged.entries.set(key, { value: reg.value, timestamp: reg.timestamp, siteId: reg.siteId });
	}

	// Merge from b
	for (const [key, bReg] of b.entries) {
		const existing = merged.entries.get(key);
		if (!existing) {
			merged.entries.set(key, {
				value: bReg.value,
				timestamp: bReg.timestamp,
				siteId: bReg.siteId,
			});
		} else {
			const winner = mergeLWWRegisters(existing, bReg);
			merged.entries.set(key, winner);
		}
	}

	return merged;
}

// =============================================================================
// TEXT CRDT (Simplified RGA)
// =============================================================================

/**
 * Unique identifier for a character in the text CRDT.
 * Composed of site ID and a monotonically increasing counter.
 */
export interface CharId {
	/** The site that created this character */
	readonly site: string;
	/** Sequence number within the site */
	readonly seq: number;
}

/**
 * A single character node in the CRDT document.
 */
export interface CharNode {
	/** Unique identifier */
	readonly id: CharId;
	/** The character value */
	readonly char: string;
	/** Whether this character has been deleted (tombstone) */
	deleted: boolean;
}

/**
 * Text CRDT operation types.
 */
export type TextOp =
	| {
			readonly type: 'insert';
			readonly id: CharId;
			readonly char: string;
			readonly afterId: CharId | null;
	  }
	| {
			readonly type: 'delete';
			readonly id: CharId;
	  };

/**
 * Text CRDT document state.
 */
export interface TextCRDT {
	/** Site ID for this replica */
	readonly siteId: string;
	/** Monotonic sequence counter */
	seq: number;
	/** Ordered list of character nodes (including tombstones) */
	readonly nodes: CharNode[];
	/** Index from CharId key to node index for fast lookup */
	readonly idIndex: Map<string, number>;
}

/**
 * Zod schema for text operations (for network validation).
 */
export const TextOpSchema = z.discriminatedUnion('type', [
	z.object({
		type: z.literal('insert'),
		id: z.object({ site: z.string(), seq: z.number().int().nonnegative() }),
		char: z.string().length(1),
		afterId: z.object({ site: z.string(), seq: z.number().int().nonnegative() }).nullable(),
	}),
	z.object({
		type: z.literal('delete'),
		id: z.object({ site: z.string(), seq: z.number().int().nonnegative() }),
	}),
]);

// =============================================================================
// CHAR ID HELPERS
// =============================================================================

/**
 * Creates a string key from a CharId for indexing.
 */
function charIdKey(id: CharId): string {
	return `${id.site}:${id.seq}`;
}

/**
 * Compares two CharIds for ordering.
 * Returns negative if a < b, positive if a > b, 0 if equal.
 */
function compareCharIds(a: CharId, b: CharId): number {
	if (a.seq !== b.seq) {
		return a.seq - b.seq;
	}
	return a.site < b.site ? -1 : a.site > b.site ? 1 : 0;
}

// =============================================================================
// TEXT CRDT FUNCTIONS
// =============================================================================

/**
 * Creates a new text CRDT document.
 *
 * @param siteId - Unique site identifier for this replica
 * @returns Empty text CRDT document
 *
 * @example
 * ```typescript
 * const doc = createTextCRDT('user-1');
 * insertText(doc, 0, 'Hello');
 * ```
 */
export function createTextCRDT(siteId: string): TextCRDT {
	return {
		siteId,
		seq: 0,
		nodes: [],
		idIndex: new Map(),
	};
}

/**
 * Gets the visible text value (excluding tombstones).
 *
 * @param doc - The text CRDT document
 * @returns Current text content
 *
 * @example
 * ```typescript
 * const doc = createTextCRDT('site-1');
 * insertText(doc, 0, 'Hello');
 * console.log(getTextValue(doc)); // "Hello"
 * ```
 */
export function getTextValue(doc: TextCRDT): string {
	const chars: string[] = [];
	for (const node of doc.nodes) {
		if (!node.deleted) {
			chars.push(node.char);
		}
	}
	return chars.join('');
}

/**
 * Gets the visible length of the document.
 *
 * @param doc - The text CRDT document
 * @returns Number of visible characters
 */
export function getTextLength(doc: TextCRDT): number {
	let count = 0;
	for (const node of doc.nodes) {
		if (!node.deleted) {
			count += 1;
		}
	}
	return count;
}

/**
 * Converts a visible position to an internal node index.
 * Position 0 = before first visible char, position N = after Nth visible char.
 */
function visiblePosToNodeIndex(doc: TextCRDT, visiblePos: number): number {
	if (visiblePos <= 0) {
		return -1; // Before everything
	}

	let seen = 0;
	for (let i = 0; i < doc.nodes.length; i++) {
		const node = doc.nodes[i];
		if (node && !node.deleted) {
			seen += 1;
			if (seen === visiblePos) {
				return i;
			}
		}
	}

	// Past the end: return last node index
	return doc.nodes.length - 1;
}

/**
 * Inserts a single character at a visible position.
 * Returns the generated operation for replication.
 *
 * @param doc - The text CRDT document
 * @param visiblePos - Position in visible text (0 = beginning)
 * @param char - Character to insert
 * @returns The insert operation
 */
export function insertChar(doc: TextCRDT, visiblePos: number, char: string): TextOp {
	const newId: CharId = { site: doc.siteId, seq: doc.seq };
	doc.seq += 1;

	const afterIndex = visiblePosToNodeIndex(doc, visiblePos);
	const afterId = afterIndex >= 0 ? (doc.nodes[afterIndex]?.id ?? null) : null;

	const newNode: CharNode = { id: newId, char, deleted: false };

	// Find insertion point: after afterIndex, before any nodes with lower IDs
	const insertAt = findInsertPosition(doc, afterIndex, newId);
	doc.nodes.splice(insertAt, 0, newNode);

	// Rebuild index from insertAt onward
	rebuildIndexFrom(doc, insertAt);

	return { type: 'insert', id: newId, char, afterId };
}

/**
 * Finds the correct insertion position for a new character.
 * After the reference node, but respecting ID ordering among concurrent inserts.
 */
function findInsertPosition(doc: TextCRDT, afterIndex: number, newId: CharId): number {
	let pos = afterIndex + 1;

	// Skip past any existing nodes that should come before this one
	// (concurrent inserts at the same position are ordered by ID)
	while (pos < doc.nodes.length) {
		const existing = doc.nodes[pos];
		if (!existing) {
			break;
		}
		// If existing node has a higher ID, our node goes before it
		if (compareCharIds(existing.id, newId) > 0) {
			break;
		}
		pos += 1;
	}

	return pos;
}

/**
 * Rebuilds the ID index from a given position.
 */
function rebuildIndexFrom(doc: TextCRDT, fromIndex: number): void {
	for (let i = fromIndex; i < doc.nodes.length; i++) {
		const node = doc.nodes[i];
		if (node) {
			doc.idIndex.set(charIdKey(node.id), i);
		}
	}
}

/**
 * Inserts a string of text at a visible position.
 * Returns all generated operations.
 *
 * @param doc - The text CRDT document
 * @param visiblePos - Position in visible text
 * @param text - Text to insert
 * @returns Array of insert operations
 *
 * @example
 * ```typescript
 * const ops = insertText(doc, 0, 'Hello');
 * // Send ops to other replicas for replication
 * ```
 */
export function insertText(doc: TextCRDT, visiblePos: number, text: string): readonly TextOp[] {
	const ops: TextOp[] = [];

	for (let i = 0; i < text.length; i++) {
		const op = insertChar(doc, visiblePos + i, text[i]!);
		ops.push(op);
	}

	return ops;
}

/**
 * Deletes a character at a visible position.
 * Returns the generated operation for replication.
 *
 * @param doc - The text CRDT document
 * @param visiblePos - Position in visible text (0-indexed)
 * @returns The delete operation, or null if position is invalid
 *
 * @example
 * ```typescript
 * const op = deleteChar(doc, 0); // Delete first character
 * ```
 */
export function deleteChar(doc: TextCRDT, visiblePos: number): TextOp | null {
	let seen = 0;

	for (const node of doc.nodes) {
		if (node.deleted) {
			continue;
		}
		if (seen === visiblePos) {
			node.deleted = true;
			return { type: 'delete', id: node.id };
		}
		seen += 1;
	}

	return null;
}

/**
 * Deletes a range of text.
 *
 * @param doc - The text CRDT document
 * @param start - Start position (inclusive)
 * @param count - Number of characters to delete
 * @returns Array of delete operations
 *
 * @example
 * ```typescript
 * const ops = deleteText(doc, 0, 5); // Delete first 5 chars
 * ```
 */
export function deleteText(doc: TextCRDT, start: number, count: number): readonly TextOp[] {
	const ops: TextOp[] = [];

	// Delete from start position, count times
	// Each delete shifts visible positions, so always delete at start
	for (let i = 0; i < count; i++) {
		const op = deleteChar(doc, start);
		if (op) {
			ops.push(op);
		}
	}

	return ops;
}

/**
 * Applies a remote operation to this document.
 * This is how replicas synchronize: the originating site generates ops
 * with insertChar/deleteChar, then sends them to other sites who apply them.
 *
 * @param doc - The text CRDT document
 * @param op - The operation to apply
 * @returns true if applied successfully
 *
 * @example
 * ```typescript
 * // On site A:
 * const op = insertChar(docA, 0, 'H');
 * // Send op to site B
 *
 * // On site B:
 * applyRemoteOp(docB, op);
 * ```
 */
export function applyRemoteOp(doc: TextCRDT, op: TextOp): boolean {
	if (op.type === 'insert') {
		return applyRemoteInsert(doc, op);
	}
	return applyRemoteDelete(doc, op);
}

/**
 * Applies a remote insert operation.
 */
function applyRemoteInsert(doc: TextCRDT, op: Extract<TextOp, { type: 'insert' }>): boolean {
	// Check for duplicate
	if (doc.idIndex.has(charIdKey(op.id))) {
		return false; // Already applied
	}

	// Find the reference node
	let afterIndex = -1;
	if (op.afterId !== null) {
		const idx = doc.idIndex.get(charIdKey(op.afterId));
		if (idx === undefined) {
			return false; // Reference not found, can't apply yet
		}
		afterIndex = idx;
	}

	const newNode: CharNode = { id: op.id, char: op.char, deleted: false };
	const insertAt = findInsertPosition(doc, afterIndex, op.id);
	doc.nodes.splice(insertAt, 0, newNode);
	rebuildIndexFrom(doc, insertAt);

	// Update sequence counter if needed
	if (op.id.site === doc.siteId && op.id.seq >= doc.seq) {
		doc.seq = op.id.seq + 1;
	}

	return true;
}

/**
 * Applies a remote delete operation.
 */
function applyRemoteDelete(doc: TextCRDT, op: Extract<TextOp, { type: 'delete' }>): boolean {
	const key = charIdKey(op.id);
	const idx = doc.idIndex.get(key);

	if (idx === undefined) {
		return false; // Node not found
	}

	const node = doc.nodes[idx];
	if (!node || node.deleted) {
		return false; // Already deleted
	}

	node.deleted = true;
	return true;
}

/**
 * Gets all operations needed to reconstruct the document from scratch.
 * Useful for syncing a new replica.
 *
 * @param doc - The text CRDT document
 * @returns Array of operations
 */
export function getDocumentOps(doc: TextCRDT): readonly TextOp[] {
	const ops: TextOp[] = [];

	for (let i = 0; i < doc.nodes.length; i++) {
		const node = doc.nodes[i];
		if (!node) {
			continue;
		}
		const afterId = i > 0 ? (doc.nodes[i - 1]?.id ?? null) : null;
		ops.push({
			type: 'insert',
			id: node.id,
			char: node.char,
			afterId,
		});

		if (node.deleted) {
			ops.push({ type: 'delete', id: node.id });
		}
	}

	return ops;
}

/**
 * Gets the total node count (including tombstones).
 * Useful for monitoring document growth.
 *
 * @param doc - The text CRDT document
 * @returns Total node count
 */
export function getTotalNodeCount(doc: TextCRDT): number {
	return doc.nodes.length;
}

/**
 * Gets the tombstone count (deleted nodes still in the list).
 *
 * @param doc - The text CRDT document
 * @returns Number of tombstones
 */
export function getTombstoneCount(doc: TextCRDT): number {
	let count = 0;
	for (const node of doc.nodes) {
		if (node.deleted) {
			count += 1;
		}
	}
	return count;
}

/**
 * Compacts the document by removing tombstones.
 * WARNING: This should only be done when all replicas have acknowledged
 * all operations up to the current state. Otherwise, remote deletes
 * might fail to find their target nodes.
 *
 * @param doc - The text CRDT document
 * @returns Number of tombstones removed
 */
export function compactDocument(doc: TextCRDT): number {
	const beforeLength = doc.nodes.length;
	let writeIdx = 0;

	for (let readIdx = 0; readIdx < doc.nodes.length; readIdx++) {
		const node = doc.nodes[readIdx];
		if (node && !node.deleted) {
			doc.nodes[writeIdx] = node;
			writeIdx += 1;
		}
	}

	const removed = beforeLength - writeIdx;
	doc.nodes.length = writeIdx;

	// Rebuild full index after compaction
	doc.idIndex.clear();
	for (let i = 0; i < doc.nodes.length; i++) {
		const node = doc.nodes[i];
		if (node) {
			doc.idIndex.set(charIdKey(node.id), i);
		}
	}

	return removed;
}

// =============================================================================
// CONFLICT RESOLUTION HELPERS
// =============================================================================

/**
 * Result of resolving a conflict between two values.
 */
export interface ConflictResult<T> {
	/** The winning value */
	readonly value: T;
	/** Which side won: 'local', 'remote', or 'merged' */
	readonly winner: 'local' | 'remote' | 'merged';
	/** The winning site ID */
	readonly siteId: string;
}

/**
 * Resolves a conflict between a local and remote LWW value.
 *
 * @param localValue - Local value
 * @param localTimestamp - Local timestamp
 * @param localSiteId - Local site ID
 * @param remoteValue - Remote value
 * @param remoteTimestamp - Remote timestamp
 * @param remoteSiteId - Remote site ID
 * @returns Conflict result
 */
export function resolveLWWConflict<T>(
	localValue: T,
	localTimestamp: number,
	localSiteId: string,
	remoteValue: T,
	remoteTimestamp: number,
	remoteSiteId: string,
): ConflictResult<T> {
	if (remoteTimestamp > localTimestamp) {
		return { value: remoteValue, winner: 'remote', siteId: remoteSiteId };
	}
	if (remoteTimestamp < localTimestamp) {
		return { value: localValue, winner: 'local', siteId: localSiteId };
	}

	// Tie: higher site ID wins
	if (remoteSiteId > localSiteId) {
		return { value: remoteValue, winner: 'remote', siteId: remoteSiteId };
	}
	return { value: localValue, winner: 'local', siteId: localSiteId };
}

/**
 * ConflictResolution namespace for convenient access.
 *
 * @example
 * ```typescript
 * import { ConflictResolution } from 'blecsd';
 *
 * const reg = ConflictResolution.createRegister(0);
 * ConflictResolution.setRegister(reg, 42, 'site-1', Date.now());
 * ```
 */
export const ConflictResolution = {
	// LWW Register
	createRegister: createLWWRegister,
	setRegister: setLWWValue,
	getRegister: getLWWValue,
	getRegisterMetadata: getLWWMetadata,
	mergeRegisters: mergeLWWRegisters,

	// LWW Map
	createMap: createLWWMap,
	setMapValue: setLWWMapValue,
	getMapValue: getLWWMapValue,
	hasMapKey: hasLWWMapKey,
	getMapKeys: getLWWMapKeys,
	getMapSize: getLWWMapSize,
	mergeMaps: mergeLWWMaps,

	// Text CRDT
	createText: createTextCRDT,
	getText: getTextValue,
	getTextLength,
	insertChar,
	insertText,
	deleteChar,
	deleteText,
	applyRemoteOp,
	getDocumentOps,
	getTotalNodeCount,
	getTombstoneCount,
	compactDocument,

	// Helpers
	resolveLWWConflict,
} as const;
