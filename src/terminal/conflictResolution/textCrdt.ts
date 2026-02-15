/**
 * Text CRDT implementation for collaborative editing.
 * @module terminal/conflictResolution/textCrdt
 */

import { z } from 'zod';

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
		const char = text.charAt(i);
		const op = insertChar(doc, visiblePos + i, char);
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
