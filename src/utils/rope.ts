/**
 * Rope Data Structure for Large Text Buffers
 *
 * A rope is a binary tree where leaf nodes contain text strings and internal
 * nodes contain the total length of text in their left subtree. This allows
 * for O(log n) insert, delete, and index operations.
 *
 * @module utils/rope
 *
 * @example
 * ```typescript
 * import { createRope, insert, deleteRange, getLine, getText } from 'blecsd';
 *
 * // Create a rope from text
 * let rope = createRope('Hello, World!');
 *
 * // Insert at position
 * rope = insert(rope, 7, 'Beautiful ');
 * // Result: "Hello, Beautiful World!"
 *
 * // Delete a range
 * rope = deleteRange(rope, 0, 7);
 * // Result: "Beautiful World!"
 *
 * // Get specific line
 * const line = getLine(rope, 0);
 * ```
 */

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Maximum characters in a leaf node.
 * Smaller values give better balance but more nodes.
 * Larger values reduce overhead but slower operations.
 */
export const LEAF_MAX_SIZE = 512;

/**
 * Minimum characters in a leaf node before merging.
 */
export const LEAF_MIN_SIZE = 256;

/**
 * Maximum depth before forcing rebalance.
 */
export const MAX_DEPTH = 48;

// =============================================================================
// TYPES
// =============================================================================

/**
 * A leaf node containing actual text content.
 */
export interface RopeLeaf {
	readonly type: 'leaf';
	/** The text content of this leaf */
	readonly text: string;
	/** Total number of characters */
	readonly length: number;
	/** Number of newlines in this leaf */
	readonly newlines: number;
	/** Line break positions within this leaf (relative to start) */
	readonly lineBreaks: readonly number[];
}

/**
 * An internal node containing two subtrees.
 */
export interface RopeNode {
	readonly type: 'node';
	/** Left subtree */
	readonly left: Rope;
	/** Right subtree */
	readonly right: Rope;
	/** Total length of left subtree (weight) */
	readonly leftLength: number;
	/** Total length of entire subtree */
	readonly length: number;
	/** Total newlines in entire subtree */
	readonly newlines: number;
	/** Depth of tree from this node */
	readonly depth: number;
}

/**
 * A rope is either a leaf or an internal node.
 */
export type Rope = RopeLeaf | RopeNode;

/**
 * Result of a split operation.
 */
interface SplitResult {
	readonly left: Rope | null;
	readonly right: Rope | null;
}

/**
 * Line information returned by getLine.
 */
export interface LineInfo {
	/** Line content (without newline) */
	readonly text: string;
	/** Start index in rope */
	readonly start: number;
	/** End index in rope (exclusive) */
	readonly end: number;
	/** Line number (0-based) */
	readonly lineNumber: number;
}

/**
 * Statistics about a rope.
 */
export interface RopeStats {
	/** Total characters */
	readonly length: number;
	/** Total newlines */
	readonly newlines: number;
	/** Number of leaf nodes */
	readonly leafCount: number;
	/** Maximum depth */
	readonly depth: number;
	/** Average leaf size */
	readonly avgLeafSize: number;
}

// =============================================================================
// LEAF CREATION
// =============================================================================

/**
 * Counts newlines in a string.
 */
function countNewlines(text: string): number {
	let count = 0;
	for (let i = 0; i < text.length; i++) {
		if (text.charCodeAt(i) === 10) {
			// \n
			count++;
		}
	}
	return count;
}

/**
 * Finds positions of all line breaks in a string.
 */
function findLineBreaks(text: string): number[] {
	const breaks: number[] = [];
	for (let i = 0; i < text.length; i++) {
		if (text.charCodeAt(i) === 10) {
			breaks.push(i);
		}
	}
	return breaks;
}

/**
 * Creates a leaf node from text.
 */
function createLeaf(text: string): RopeLeaf {
	const lineBreaks = findLineBreaks(text);
	return {
		type: 'leaf',
		text,
		length: text.length,
		newlines: lineBreaks.length,
		lineBreaks,
	};
}

/**
 * Creates an empty leaf.
 */
function createEmptyLeaf(): RopeLeaf {
	return {
		type: 'leaf',
		text: '',
		length: 0,
		newlines: 0,
		lineBreaks: [],
	};
}

// =============================================================================
// NODE CREATION
// =============================================================================

/**
 * Creates an internal node from two subtrees.
 */
function createNode(left: Rope, right: Rope): RopeNode {
	const leftDepth = left.type === 'node' ? left.depth : 0;
	const rightDepth = right.type === 'node' ? right.depth : 0;

	return {
		type: 'node',
		left,
		right,
		leftLength: left.length,
		length: left.length + right.length,
		newlines: left.newlines + right.newlines,
		depth: Math.max(leftDepth, rightDepth) + 1,
	};
}

// =============================================================================
// BALANCING
// =============================================================================

/**
 * Checks if a node needs rebalancing.
 */
function needsRebalance(node: RopeNode): boolean {
	const leftDepth = node.left.type === 'node' ? node.left.depth : 0;
	const rightDepth = node.right.type === 'node' ? node.right.depth : 0;
	return Math.abs(leftDepth - rightDepth) > 1 || node.depth > MAX_DEPTH;
}

/**
 * Collects all leaf text into an array.
 */
function collectLeaves(rope: Rope, leaves: string[]): void {
	if (rope.type === 'leaf') {
		if (rope.length > 0) {
			leaves.push(rope.text);
		}
		return;
	}

	collectLeaves(rope.left, leaves);
	collectLeaves(rope.right, leaves);
}

/**
 * Builds a balanced rope from an array of text chunks.
 */
function buildBalanced(chunks: string[]): Rope {
	if (chunks.length === 0) {
		return createEmptyLeaf();
	}

	if (chunks.length === 1) {
		const text = chunks[0];
		if (text === undefined) {
			return createEmptyLeaf();
		}
		return createLeaf(text);
	}

	const mid = Math.floor(chunks.length / 2);
	const left = buildBalanced(chunks.slice(0, mid));
	const right = buildBalanced(chunks.slice(mid));

	return createNode(left, right);
}

/**
 * Rebalances a rope if needed.
 */
function rebalance(rope: Rope): Rope {
	if (rope.type === 'leaf') {
		return rope;
	}

	if (!needsRebalance(rope)) {
		return rope;
	}

	// Collect all leaves and rebuild balanced
	const leaves: string[] = [];
	collectLeaves(rope, leaves);

	// Split long strings
	const chunks: string[] = [];
	for (const leaf of leaves) {
		if (leaf.length <= LEAF_MAX_SIZE) {
			chunks.push(leaf);
		} else {
			// Split into chunks
			for (let i = 0; i < leaf.length; i += LEAF_MAX_SIZE) {
				chunks.push(leaf.slice(i, i + LEAF_MAX_SIZE));
			}
		}
	}

	return buildBalanced(chunks);
}

// =============================================================================
// PUBLIC API - CREATION
// =============================================================================

/**
 * Creates a rope from a string.
 *
 * @param text - Initial text content
 * @returns A new Rope
 *
 * @example
 * ```typescript
 * import { createRope } from 'blecsd';
 *
 * const rope = createRope('Hello, World!');
 * ```
 */
export function createRope(text: string = ''): Rope {
	if (text.length === 0) {
		return createEmptyLeaf();
	}

	if (text.length <= LEAF_MAX_SIZE) {
		return createLeaf(text);
	}

	// Split into balanced chunks
	const chunks: string[] = [];
	for (let i = 0; i < text.length; i += LEAF_MAX_SIZE) {
		chunks.push(text.slice(i, i + LEAF_MAX_SIZE));
	}

	return buildBalanced(chunks);
}

/**
 * Creates an empty rope.
 *
 * @returns An empty Rope
 */
export function createEmptyRope(): Rope {
	return createEmptyLeaf();
}

// =============================================================================
// PUBLIC API - QUERIES
// =============================================================================

/**
 * Gets the total length of the rope.
 *
 * @param rope - The rope to measure
 * @returns Total character count
 *
 * @example
 * ```typescript
 * import { createRope, getLength } from 'blecsd';
 *
 * const rope = createRope('Hello');
 * console.log(getLength(rope)); // 5
 * ```
 */
export function getLength(rope: Rope): number {
	return rope.length;
}

/**
 * Gets the total number of newlines in the rope.
 *
 * @param rope - The rope to measure
 * @returns Total newline count
 */
export function getNewlineCount(rope: Rope): number {
	return rope.newlines;
}

/**
 * Gets the total number of lines (newlines + 1).
 *
 * @param rope - The rope to measure
 * @returns Line count
 */
export function getLineCount(rope: Rope): number {
	return rope.newlines + 1;
}

/**
 * Checks if the rope is empty.
 *
 * @param rope - The rope to check
 * @returns true if empty
 */
export function isEmpty(rope: Rope): boolean {
	return rope.length === 0;
}

/**
 * Gets the character at a specific index.
 *
 * @param rope - The rope to query
 * @param index - Character index (0-based)
 * @returns Character at index, or undefined if out of bounds
 *
 * @example
 * ```typescript
 * import { createRope, charAt } from 'blecsd';
 *
 * const rope = createRope('Hello');
 * console.log(charAt(rope, 0)); // 'H'
 * ```
 */
export function charAt(rope: Rope, index: number): string | undefined {
	if (index < 0 || index >= rope.length) {
		return undefined;
	}

	if (rope.type === 'leaf') {
		return rope.text.charAt(index);
	}

	if (index < rope.leftLength) {
		return charAt(rope.left, index);
	}

	return charAt(rope.right, index - rope.leftLength);
}

/**
 * Gets a substring from the rope.
 *
 * @param rope - The rope to query
 * @param start - Start index (inclusive)
 * @param end - End index (exclusive), defaults to end of rope
 * @returns Substring
 *
 * @example
 * ```typescript
 * import { createRope, substring } from 'blecsd';
 *
 * const rope = createRope('Hello, World!');
 * console.log(substring(rope, 0, 5)); // 'Hello'
 * ```
 */
export function substring(rope: Rope, start: number, end?: number): string {
	const actualEnd = end ?? rope.length;

	if (start < 0) {
		start = 0;
	}
	if (actualEnd > rope.length) {
		return substring(rope, start, rope.length);
	}
	if (start >= actualEnd) {
		return '';
	}

	if (rope.type === 'leaf') {
		return rope.text.slice(start, actualEnd);
	}

	const leftLength = rope.leftLength;

	if (actualEnd <= leftLength) {
		// Entirely in left subtree
		return substring(rope.left, start, actualEnd);
	}

	if (start >= leftLength) {
		// Entirely in right subtree
		return substring(rope.right, start - leftLength, actualEnd - leftLength);
	}

	// Spans both subtrees
	const leftPart = substring(rope.left, start, leftLength);
	const rightPart = substring(rope.right, 0, actualEnd - leftLength);
	return leftPart + rightPart;
}

/**
 * Converts entire rope to string.
 *
 * @param rope - The rope to convert
 * @returns Full text content
 *
 * @example
 * ```typescript
 * import { createRope, getText } from 'blecsd';
 *
 * const rope = createRope('Hello');
 * console.log(getText(rope)); // 'Hello'
 * ```
 */
export function getText(rope: Rope): string {
	if (rope.type === 'leaf') {
		return rope.text;
	}

	// Use a more efficient approach for large ropes
	const parts: string[] = [];
	collectLeaves(rope, parts);
	return parts.join('');
}

// =============================================================================
// PUBLIC API - LINE OPERATIONS
// =============================================================================

/**
 * Gets the line index for a character position.
 *
 * @param rope - The rope to query
 * @param index - Character index
 * @returns Line number (0-based)
 *
 * @example
 * ```typescript
 * import { createRope, getLineForIndex } from 'blecsd';
 *
 * const rope = createRope('Line 1\nLine 2\nLine 3');
 * console.log(getLineForIndex(rope, 7)); // 1 (start of 'Line 2')
 * ```
 */
export function getLineForIndex(rope: Rope, index: number): number {
	if (index <= 0) {
		return 0;
	}
	if (index >= rope.length) {
		return rope.newlines;
	}

	if (rope.type === 'leaf') {
		let line = 0;
		for (const breakPos of rope.lineBreaks) {
			if (breakPos >= index) {
				break;
			}
			line++;
		}
		return line;
	}

	if (index < rope.leftLength) {
		return getLineForIndex(rope.left, index);
	}

	const leftLines = rope.left.newlines;
	return leftLines + getLineForIndex(rope.right, index - rope.leftLength);
}

/**
 * Gets the start index of a line.
 *
 * @param rope - The rope to query
 * @param lineNumber - Line number (0-based)
 * @returns Start index of line, or -1 if out of bounds
 */
export function getLineStart(rope: Rope, lineNumber: number): number {
	if (lineNumber < 0) {
		return -1;
	}
	if (lineNumber === 0) {
		return 0;
	}
	if (lineNumber > rope.newlines) {
		return -1;
	}

	return getLineStartHelper(rope, lineNumber, 0);
}

function getLineStartHelper(rope: Rope, targetLine: number, offset: number): number {
	if (rope.type === 'leaf') {
		let lineCount = 0;
		for (const breakPos of rope.lineBreaks) {
			lineCount++;
			if (lineCount === targetLine) {
				return offset + breakPos + 1;
			}
		}
		return -1;
	}

	const leftLines = rope.left.newlines;

	if (targetLine <= leftLines) {
		return getLineStartHelper(rope.left, targetLine, offset);
	}

	return getLineStartHelper(rope.right, targetLine - leftLines, offset + rope.leftLength);
}

/**
 * Gets the end index of a line (position of newline or end of rope).
 *
 * @param rope - The rope to query
 * @param lineNumber - Line number (0-based)
 * @returns End index of line, or -1 if out of bounds
 */
export function getLineEnd(rope: Rope, lineNumber: number): number {
	if (lineNumber < 0 || lineNumber > rope.newlines) {
		return -1;
	}

	if (lineNumber === rope.newlines) {
		// Last line ends at end of rope
		return rope.length;
	}

	return getLineEndHelper(rope, lineNumber, 0);
}

function getLineEndHelper(rope: Rope, targetLine: number, offset: number): number {
	if (rope.type === 'leaf') {
		let lineCount = 0;
		for (const breakPos of rope.lineBreaks) {
			if (lineCount === targetLine) {
				return offset + breakPos;
			}
			lineCount++;
		}
		// Line extends past this leaf
		return -1;
	}

	const leftLines = rope.left.newlines;

	if (targetLine < leftLines) {
		return getLineEndHelper(rope.left, targetLine, offset);
	}

	return getLineEndHelper(rope.right, targetLine - leftLines, offset + rope.leftLength);
}

/**
 * Gets a specific line's content.
 *
 * @param rope - The rope to query
 * @param lineNumber - Line number (0-based)
 * @returns Line info or undefined if out of bounds
 *
 * @example
 * ```typescript
 * import { createRope, getLine } from 'blecsd';
 *
 * const rope = createRope('Line 1\nLine 2\nLine 3');
 * const line = getLine(rope, 1);
 * console.log(line?.text); // 'Line 2'
 * ```
 */
export function getLine(rope: Rope, lineNumber: number): LineInfo | undefined {
	if (lineNumber < 0 || lineNumber > rope.newlines) {
		return undefined;
	}

	const start = getLineStart(rope, lineNumber);
	const end = getLineEnd(rope, lineNumber);

	if (start === -1) {
		// Line 0
		return {
			text: substring(rope, 0, end === -1 ? rope.length : end),
			start: 0,
			end: end === -1 ? rope.length : end,
			lineNumber,
		};
	}

	return {
		text: substring(rope, start, end === -1 ? rope.length : end),
		start,
		end: end === -1 ? rope.length : end,
		lineNumber,
	};
}

/**
 * Gets a range of lines.
 *
 * @param rope - The rope to query
 * @param startLine - Start line (inclusive)
 * @param endLine - End line (exclusive)
 * @returns Array of line info
 *
 * @example
 * ```typescript
 * import { createRope, getLines } from 'blecsd';
 *
 * const rope = createRope('Line 1\nLine 2\nLine 3');
 * const lines = getLines(rope, 0, 2);
 * // lines = [{ text: 'Line 1', ... }, { text: 'Line 2', ... }]
 * ```
 */
export function getLines(rope: Rope, startLine: number, endLine: number): LineInfo[] {
	const result: LineInfo[] = [];
	const maxLine = rope.newlines + 1;

	for (let i = startLine; i < endLine && i < maxLine; i++) {
		const line = getLine(rope, i);
		if (line) {
			result.push(line);
		}
	}

	return result;
}

// =============================================================================
// PUBLIC API - MUTATIONS
// =============================================================================

/**
 * Splits a rope at the given index.
 *
 * @param rope - The rope to split
 * @param index - Position to split at
 * @returns Tuple of [left, right] ropes
 */
function split(rope: Rope, index: number): SplitResult {
	if (index <= 0) {
		return { left: null, right: rope };
	}
	if (index >= rope.length) {
		return { left: rope, right: null };
	}

	if (rope.type === 'leaf') {
		const leftText = rope.text.slice(0, index);
		const rightText = rope.text.slice(index);
		return {
			left: leftText.length > 0 ? createLeaf(leftText) : null,
			right: rightText.length > 0 ? createLeaf(rightText) : null,
		};
	}

	if (index <= rope.leftLength) {
		const { left, right } = split(rope.left, index);
		if (right === null) {
			return { left, right: rope.right };
		}
		return { left, right: createNode(right, rope.right) };
	}

	const { left, right } = split(rope.right, index - rope.leftLength);
	if (left === null) {
		return { left: rope.left, right };
	}
	return { left: createNode(rope.left, left), right };
}

/**
 * Concatenates two ropes.
 *
 * @param left - Left rope
 * @param right - Right rope
 * @returns Combined rope
 */
function concat(left: Rope | null, right: Rope | null): Rope {
	if (left === null || left.length === 0) {
		return right ?? createEmptyLeaf();
	}
	if (right === null || right.length === 0) {
		return left;
	}

	// Merge small adjacent leaves
	if (left.type === 'leaf' && right.type === 'leaf') {
		if (left.length + right.length <= LEAF_MAX_SIZE) {
			return createLeaf(left.text + right.text);
		}
	}

	const node = createNode(left, right);
	return rebalance(node);
}

/**
 * Inserts text at a position.
 *
 * @param rope - The rope to modify
 * @param index - Position to insert at
 * @param text - Text to insert
 * @returns New rope with text inserted
 *
 * @example
 * ```typescript
 * import { createRope, insert } from 'blecsd';
 *
 * let rope = createRope('Hello World');
 * rope = insert(rope, 6, 'Beautiful ');
 * // Result: 'Hello Beautiful World'
 * ```
 */
export function insert(rope: Rope, index: number, text: string): Rope {
	if (text.length === 0) {
		return rope;
	}

	if (index < 0) {
		index = 0;
	}
	if (index > rope.length) {
		index = rope.length;
	}

	const newRope = createRope(text);
	const { left, right } = split(rope, index);

	return concat(concat(left, newRope), right);
}

/**
 * Appends text to the end.
 *
 * @param rope - The rope to modify
 * @param text - Text to append
 * @returns New rope with text appended
 *
 * @example
 * ```typescript
 * import { createRope, append } from 'blecsd';
 *
 * let rope = createRope('Hello');
 * rope = append(rope, ' World');
 * // Result: 'Hello World'
 * ```
 */
export function append(rope: Rope, text: string): Rope {
	return insert(rope, rope.length, text);
}

/**
 * Prepends text to the start.
 *
 * @param rope - The rope to modify
 * @param text - Text to prepend
 * @returns New rope with text prepended
 */
export function prepend(rope: Rope, text: string): Rope {
	return insert(rope, 0, text);
}

/**
 * Deletes a range of text.
 *
 * @param rope - The rope to modify
 * @param start - Start index (inclusive)
 * @param end - End index (exclusive)
 * @returns New rope with range deleted
 *
 * @example
 * ```typescript
 * import { createRope, deleteRange } from 'blecsd';
 *
 * let rope = createRope('Hello Beautiful World');
 * rope = deleteRange(rope, 6, 16);
 * // Result: 'Hello World'
 * ```
 */
export function deleteRange(rope: Rope, start: number, end: number): Rope {
	if (start < 0) {
		start = 0;
	}
	if (end > rope.length) {
		end = rope.length;
	}
	if (start >= end) {
		return rope;
	}

	const { left } = split(rope, start);
	const { right } = split(rope, end);

	return concat(left, right);
}

/**
 * Replaces a range of text.
 *
 * @param rope - The rope to modify
 * @param start - Start index (inclusive)
 * @param end - End index (exclusive)
 * @param text - Replacement text
 * @returns New rope with range replaced
 *
 * @example
 * ```typescript
 * import { createRope, replaceRange } from 'blecsd';
 *
 * let rope = createRope('Hello World');
 * rope = replaceRange(rope, 6, 11, 'Universe');
 * // Result: 'Hello Universe'
 * ```
 */
export function replaceRange(rope: Rope, start: number, end: number, text: string): Rope {
	const deleted = deleteRange(rope, start, end);
	return insert(deleted, start, text);
}

// =============================================================================
// PUBLIC API - STATISTICS
// =============================================================================

/**
 * Gets statistics about the rope structure.
 *
 * @param rope - The rope to analyze
 * @returns Rope statistics
 */
export function getStats(rope: Rope): RopeStats {
	let leafCount = 0;
	let totalLeafSize = 0;
	let maxDepth = 0;

	function traverse(node: Rope, depth: number): void {
		if (node.type === 'leaf') {
			leafCount++;
			totalLeafSize += node.length;
			maxDepth = Math.max(maxDepth, depth);
			return;
		}

		traverse(node.left, depth + 1);
		traverse(node.right, depth + 1);
	}

	traverse(rope, 0);

	return {
		length: rope.length,
		newlines: rope.newlines,
		leafCount,
		depth: maxDepth,
		avgLeafSize: leafCount > 0 ? totalLeafSize / leafCount : 0,
	};
}

/**
 * Verifies rope integrity (for testing/debugging).
 *
 * @param rope - The rope to verify
 * @returns true if valid
 */
export function verify(rope: Rope): boolean {
	if (rope.type === 'leaf') {
		return (
			rope.length === rope.text.length &&
			rope.newlines === countNewlines(rope.text) &&
			rope.lineBreaks.length === rope.newlines
		);
	}

	if (rope.leftLength !== rope.left.length) {
		return false;
	}
	if (rope.length !== rope.left.length + rope.right.length) {
		return false;
	}
	if (rope.newlines !== rope.left.newlines + rope.right.newlines) {
		return false;
	}

	return verify(rope.left) && verify(rope.right);
}
