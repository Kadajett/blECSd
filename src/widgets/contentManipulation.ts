/**
 * Content line manipulation methods for text content.
 * @module widgets/contentManipulation
 */

import { getContent, setContent } from '../components/content';
import { markDirty } from '../components/renderable';
import { getScroll, hasScrollable, setScroll } from '../systems/scrollableSystem';
import type { Entity, World } from '../core/types';

/**
 * Splits content into lines.
 * @internal
 */
function splitLines(text: string): string[] {
	if (text === '') {
		return [];
	}
	return text.split('\n');
}

/**
 * Joins lines into content.
 * @internal
 */
function joinLines(lines: string[]): string {
	return lines.join('\n');
}

/**
 * Gets the content of an entity as an array of lines.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns Array of content lines
 *
 * @example
 * ```typescript
 * import { setContent, getLines } from 'blecsd';
 *
 * setContent(world, entity, 'Line 1\nLine 2\nLine 3');
 * const lines = getLines(world, entity);
 * // lines = ['Line 1', 'Line 2', 'Line 3']
 * ```
 */
export function getLines(world: World, eid: Entity): string[] {
	const content = getContent(world, eid);
	return splitLines(content);
}

/**
 * Gets the number of lines in an entity's content.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns Number of lines
 *
 * @example
 * ```typescript
 * import { setContent, contentGetLineCount } from 'blecsd';
 *
 * setContent(world, entity, 'Line 1\nLine 2\nLine 3');
 * console.log(contentGetLineCount(world, entity)); // 3
 * ```
 */
export function contentGetLineCount(world: World, eid: Entity): number {
	const content = getContent(world, eid);
	if (content === '') {
		return 0;
	}
	// Count newlines + 1 (or just count if ends with newline)
	let count = 1;
	for (const char of content) {
		if (char === '\n') {
			count++;
		}
	}
	return count;
}

/**
 * Gets a specific line from an entity's content.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param index - Line index (0-based)
 * @returns The line content or empty string if index out of bounds
 *
 * @example
 * ```typescript
 * import { setContent, contentGetLine } from 'blecsd';
 *
 * setContent(world, entity, 'Line 1\nLine 2\nLine 3');
 * console.log(contentGetLine(world, entity, 1)); // 'Line 2'
 * ```
 */
export function contentGetLine(world: World, eid: Entity, index: number): string {
	const lines = getLines(world, eid);
	if (index < 0 || index >= lines.length) {
		return '';
	}
	return lines[index] ?? '';
}

/**
 * Sets a specific line in an entity's content.
 * Marks the entity dirty for re-rendering.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param index - Line index (0-based)
 * @param line - The new line content
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { setContent, setLine, getContent } from 'blecsd';
 *
 * setContent(world, entity, 'Line 1\nLine 2\nLine 3');
 * setLine(world, entity, 1, 'Modified Line');
 * // Content is now 'Line 1\nModified Line\nLine 3'
 * ```
 */
export function setLine(world: World, eid: Entity, index: number, line: string): Entity {
	const lines = getLines(world, eid);
	if (index < 0 || index >= lines.length) {
		return eid;
	}
	lines[index] = line;
	setContent(world, eid, joinLines(lines));
	markDirty(world, eid);
	return eid;
}

/**
 * Gets a line from the base content (before scroll adjustment).
 * The "base" line is the same as the regular line in this implementation,
 * as scroll offset is handled separately during rendering.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param index - Line index (0-based)
 * @returns The line content or empty string if index out of bounds
 *
 * @example
 * ```typescript
 * import { setContent, getBaseLine } from 'blecsd';
 *
 * setContent(world, entity, 'Line 1\nLine 2\nLine 3');
 * console.log(getBaseLine(world, entity, 0)); // 'Line 1'
 * ```
 */
export function getBaseLine(world: World, eid: Entity, index: number): string {
	// Base content is the same as regular content
	// Scroll offset is applied during rendering, not storage
	return contentGetLine(world, eid, index);
}

/**
 * Sets a line in the base content (before scroll adjustment).
 * Equivalent to setLine as scroll is handled during rendering.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param index - Line index (0-based)
 * @param line - The new line content
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { setBaseLine, getContent } from 'blecsd';
 *
 * setBaseLine(world, entity, 0, 'New first line');
 * ```
 */
export function setBaseLine(world: World, eid: Entity, index: number, line: string): Entity {
	return setLine(world, eid, index, line);
}

/**
 * Inserts a line at a specific position.
 * Marks the entity dirty and adjusts scroll if needed.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param index - Position to insert (0-based)
 * @param line - The line to insert
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { setContent, insertLine, getContent } from 'blecsd';
 *
 * setContent(world, entity, 'Line 1\nLine 3');
 * insertLine(world, entity, 1, 'Line 2');
 * // Content is now 'Line 1\nLine 2\nLine 3'
 * ```
 */
export function insertLine(world: World, eid: Entity, index: number, line: string): Entity {
	const lines = getLines(world, eid);

	// Clamp index to valid range
	const insertIndex = Math.max(0, Math.min(index, lines.length));
	lines.splice(insertIndex, 0, line);

	setContent(world, eid, joinLines(lines));
	markDirty(world, eid);

	// Adjust scroll if inserting above current scroll position
	if (hasScrollable(world, eid)) {
		const scroll = getScroll(world, eid);
		if (insertIndex <= scroll.y) {
			setScroll(world, eid, scroll.x, scroll.y + 1);
		}
	}

	return eid;
}

/**
 * Inserts a line at the top of the content.
 * Marks the entity dirty and adjusts scroll.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param line - The line to insert
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { setContent, insertTop, getContent } from 'blecsd';
 *
 * setContent(world, entity, 'Line 2\nLine 3');
 * insertTop(world, entity, 'Line 1');
 * // Content is now 'Line 1\nLine 2\nLine 3'
 * ```
 */
export function insertTop(world: World, eid: Entity, line: string): Entity {
	return insertLine(world, eid, 0, line);
}

/**
 * Inserts a line at the bottom of the content.
 * Marks the entity dirty.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param line - The line to insert
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { setContent, insertBottom, getContent } from 'blecsd';
 *
 * setContent(world, entity, 'Line 1\nLine 2');
 * insertBottom(world, entity, 'Line 3');
 * // Content is now 'Line 1\nLine 2\nLine 3'
 * ```
 */
export function insertBottom(world: World, eid: Entity, line: string): Entity {
	const lines = getLines(world, eid);
	return insertLine(world, eid, lines.length, line);
}

/**
 * Deletes lines starting at a specific position.
 * Marks the entity dirty and adjusts scroll if needed.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param index - Starting line index (0-based)
 * @param count - Number of lines to delete (default: 1)
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { setContent, deleteLine, getContent } from 'blecsd';
 *
 * setContent(world, entity, 'Line 1\nLine 2\nLine 3\nLine 4');
 * deleteLine(world, entity, 1, 2);
 * // Content is now 'Line 1\nLine 4'
 * ```
 */
export function deleteLine(world: World, eid: Entity, index: number, count = 1): Entity {
	const lines = getLines(world, eid);

	if (index < 0 || index >= lines.length || count <= 0) {
		return eid;
	}

	// Clamp count to available lines
	const deleteCount = Math.min(count, lines.length - index);
	lines.splice(index, deleteCount);

	setContent(world, eid, joinLines(lines));
	markDirty(world, eid);

	// Adjust scroll if deleting above or at current scroll position
	if (hasScrollable(world, eid)) {
		const scroll = getScroll(world, eid);
		const maxScroll = Math.max(0, lines.length - 1);
		let newScrollY = scroll.y;

		if (index < scroll.y) {
			// Deleted lines above scroll position
			const adjustment = Math.min(deleteCount, scroll.y - index);
			newScrollY = scroll.y - adjustment;
		}

		// Always clamp to valid range
		newScrollY = Math.max(0, Math.min(newScrollY, maxScroll));
		setScroll(world, eid, scroll.x, newScrollY);
	}

	return eid;
}

/**
 * Deletes lines from the top of the content.
 * Marks the entity dirty and adjusts scroll.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param count - Number of lines to delete (default: 1)
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { setContent, deleteTop, getContent } from 'blecsd';
 *
 * setContent(world, entity, 'Line 1\nLine 2\nLine 3');
 * deleteTop(world, entity, 1);
 * // Content is now 'Line 2\nLine 3'
 * ```
 */
export function deleteTop(world: World, eid: Entity, count = 1): Entity {
	return deleteLine(world, eid, 0, count);
}

/**
 * Deletes lines from the bottom of the content.
 * Marks the entity dirty and adjusts scroll if needed.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param count - Number of lines to delete (default: 1)
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { setContent, deleteBottom, getContent } from 'blecsd';
 *
 * setContent(world, entity, 'Line 1\nLine 2\nLine 3');
 * deleteBottom(world, entity, 1);
 * // Content is now 'Line 1\nLine 2'
 * ```
 */
export function deleteBottom(world: World, eid: Entity, count = 1): Entity {
	const lines = getLines(world, eid);
	if (lines.length === 0) {
		return eid;
	}
	const startIndex = Math.max(0, lines.length - count);
	return deleteLine(world, eid, startIndex, count);
}

/**
 * Clears all lines from the content.
 * Marks the entity dirty and resets scroll.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { setContent, clearLines, getContent } from 'blecsd';
 *
 * setContent(world, entity, 'Line 1\nLine 2\nLine 3');
 * clearLines(world, entity);
 * // Content is now ''
 * ```
 */
export function clearLines(world: World, eid: Entity): Entity {
	setContent(world, eid, '');
	markDirty(world, eid);

	// Reset scroll position
	if (hasScrollable(world, eid)) {
		setScroll(world, eid, 0, 0);
	}

	return eid;
}

/**
 * Sets all content lines at once.
 * Marks the entity dirty and adjusts scroll if needed.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param lines - Array of lines to set
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { setLines, getContent } from 'blecsd';
 *
 * setLines(world, entity, ['Line 1', 'Line 2', 'Line 3']);
 * // Content is now 'Line 1\nLine 2\nLine 3'
 * ```
 */
export function setLines(world: World, eid: Entity, lines: string[]): Entity {
	setContent(world, eid, joinLines(lines));
	markDirty(world, eid);

	// Clamp scroll position if content is now shorter
	if (hasScrollable(world, eid)) {
		const scroll = getScroll(world, eid);
		const maxScroll = Math.max(0, lines.length - 1);
		if (scroll.y > maxScroll) {
			setScroll(world, eid, scroll.x, maxScroll);
		}
	}

	return eid;
}

/**
 * Pushes a line to the bottom (same as insertBottom).
 * Convenience alias for log-style content.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param line - The line to push
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { pushLine, getLines } from 'blecsd';
 *
 * pushLine(world, entity, 'Log entry 1');
 * pushLine(world, entity, 'Log entry 2');
 * // Lines: ['Log entry 1', 'Log entry 2']
 * ```
 */
export function pushLine(world: World, eid: Entity, line: string): Entity {
	return insertBottom(world, eid, line);
}

/**
 * Pops the last line from the content.
 * Returns the removed line.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns The removed line or empty string if content is empty
 *
 * @example
 * ```typescript
 * import { setContent, popLine, getContent } from 'blecsd';
 *
 * setContent(world, entity, 'Line 1\nLine 2\nLine 3');
 * const removed = popLine(world, entity);
 * // removed = 'Line 3'
 * // Content is now 'Line 1\nLine 2'
 * ```
 */
export function popLine(world: World, eid: Entity): string {
	const lines = getLines(world, eid);
	if (lines.length === 0) {
		return '';
	}
	const removed = lines.pop() ?? '';
	setContent(world, eid, joinLines(lines));
	markDirty(world, eid);

	// Adjust scroll if needed
	if (hasScrollable(world, eid)) {
		const scroll = getScroll(world, eid);
		const maxScroll = Math.max(0, lines.length - 1);
		if (scroll.y > maxScroll) {
			setScroll(world, eid, scroll.x, maxScroll);
		}
	}

	return removed;
}

/**
 * Shifts the first line from the content.
 * Returns the removed line.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns The removed line or empty string if content is empty
 *
 * @example
 * ```typescript
 * import { setContent, shiftLine, getContent } from 'blecsd';
 *
 * setContent(world, entity, 'Line 1\nLine 2\nLine 3');
 * const removed = shiftLine(world, entity);
 * // removed = 'Line 1'
 * // Content is now 'Line 2\nLine 3'
 * ```
 */
export function shiftLine(world: World, eid: Entity): string {
	const lines = getLines(world, eid);
	if (lines.length === 0) {
		return '';
	}
	const removed = lines.shift() ?? '';
	setContent(world, eid, joinLines(lines));
	markDirty(world, eid);

	// Adjust scroll (line removed from top)
	if (hasScrollable(world, eid)) {
		const scroll = getScroll(world, eid);
		if (scroll.y > 0) {
			setScroll(world, eid, scroll.x, scroll.y - 1);
		}
	}

	return removed;
}

/**
 * Unshifts a line to the top (same as insertTop).
 * Convenience method for stack-like operations.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param line - The line to add
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { unshiftLine, getLines } from 'blecsd';
 *
 * unshiftLine(world, entity, 'New first line');
 * ```
 */
export function unshiftLine(world: World, eid: Entity, line: string): Entity {
	return insertTop(world, eid, line);
}

/**
 * Replaces multiple lines starting at an index.
 * Marks the entity dirty.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param startIndex - Starting line index
 * @param newLines - Array of replacement lines
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { setContent, replaceLines, getContent } from 'blecsd';
 *
 * setContent(world, entity, 'A\nB\nC\nD\nE');
 * replaceLines(world, entity, 1, ['X', 'Y']);
 * // Content is now 'A\nX\nY\nD\nE'
 * ```
 */
export function replaceLines(
	world: World,
	eid: Entity,
	startIndex: number,
	newLines: string[],
): Entity {
	const lines = getLines(world, eid);

	if (startIndex < 0 || startIndex >= lines.length) {
		return eid;
	}

	for (let i = 0; i < newLines.length; i++) {
		const targetIndex = startIndex + i;
		if (targetIndex >= lines.length) {
			break;
		}
		lines[targetIndex] = newLines[i] ?? '';
	}

	setContent(world, eid, joinLines(lines));
	markDirty(world, eid);
	return eid;
}

/**
 * Splices lines (delete and/or insert at position).
 * Similar to Array.splice but for content lines.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param start - Starting index
 * @param deleteCount - Number of lines to delete
 * @param insertLines - Optional lines to insert
 * @returns Array of deleted lines
 *
 * @example
 * ```typescript
 * import { setContent, spliceLines, getContent } from 'blecsd';
 *
 * setContent(world, entity, 'A\nB\nC\nD');
 * const deleted = spliceLines(world, entity, 1, 2, ['X', 'Y', 'Z']);
 * // deleted = ['B', 'C']
 * // Content is now 'A\nX\nY\nZ\nD'
 * ```
 */
export function spliceLines(
	world: World,
	eid: Entity,
	start: number,
	deleteCount: number,
	insertLines?: string[],
): string[] {
	const lines = getLines(world, eid);

	const deleted = insertLines
		? lines.splice(start, deleteCount, ...insertLines)
		: lines.splice(start, deleteCount);

	setContent(world, eid, joinLines(lines));
	markDirty(world, eid);

	// Adjust scroll based on net line change
	if (hasScrollable(world, eid)) {
		const netChange = (insertLines?.length ?? 0) - deleted.length;
		const scroll = getScroll(world, eid);

		if (start <= scroll.y && netChange !== 0) {
			const newScroll = Math.max(0, scroll.y + netChange);
			const maxScroll = Math.max(0, lines.length - 1);
			setScroll(world, eid, scroll.x, Math.min(newScroll, maxScroll));
		} else {
			// Clamp scroll if content shortened
			const maxScroll = Math.max(0, lines.length - 1);
			if (scroll.y > maxScroll) {
				setScroll(world, eid, scroll.x, maxScroll);
			}
		}
	}

	return deleted;
}
