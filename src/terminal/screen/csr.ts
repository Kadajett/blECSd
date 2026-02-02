/**
 * CSR (Change Scroll Region) Optimization
 *
 * Uses terminal hardware scrolling for efficient scrolling operations.
 * Hardware scrolling is much faster than redrawing all cells because
 * the terminal can shift existing content without receiving new data.
 *
 * @module terminal/screen/csr
 *
 * @example
 * ```typescript
 * import {
 *   createCSRContext,
 *   canUseCSR,
 *   getScrollSequence,
 *   CSRScrollDirection,
 * } from 'blecsd';
 *
 * // Create context with terminal capabilities
 * const ctx = createCSRContext({ width: 80, height: 24, supportsCSR: true });
 *
 * // Check if CSR can be used for a scroll operation
 * if (canUseCSR(ctx, 5, 15, 3, 'up')) {
 *   // Get the escape sequences to perform hardware scroll
 *   const sequences = getScrollSequence(ctx, 5, 15, 3, 'up');
 *   // Write sequences to terminal
 *   process.stdout.write(sequences.join(''));
 * }
 * ```
 */

import { CSI } from '../ansi';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Scroll direction for CSR operations.
 */
export type CSRScrollDirection = 'up' | 'down';

/**
 * CSR context containing terminal capabilities and dimensions.
 */
export interface CSRContext {
	/** Terminal width in columns */
	readonly width: number;
	/** Terminal height in rows */
	readonly height: number;
	/** Whether the terminal supports CSR (change_scroll_region) */
	readonly supportsCSR: boolean;
	/** Whether the terminal supports insert/delete line */
	readonly supportsInsertDelete: boolean;
	/** Whether scrolling destroys content outside the region (most terminals do) */
	readonly destroysOutsideContent: boolean;
}

/**
 * Options for creating a CSR context.
 */
export interface CSRContextOptions {
	/** Terminal width in columns */
	readonly width: number;
	/** Terminal height in rows */
	readonly height: number;
	/** Whether the terminal supports CSR (default: true for most terminals) */
	readonly supportsCSR?: boolean;
	/** Whether the terminal supports insert/delete line (default: true) */
	readonly supportsInsertDelete?: boolean;
	/** Whether scrolling destroys content outside the region (default: false) */
	readonly destroysOutsideContent?: boolean;
}

/**
 * Result of a CSR scroll operation.
 */
export interface CSRScrollResult {
	/** Whether CSR was used */
	readonly usedCSR: boolean;
	/** Escape sequences to send (if usedCSR is true) */
	readonly sequences: readonly string[];
	/** Lines that need redrawing after the scroll (fill lines) */
	readonly linesToRedraw: readonly number[];
}

/**
 * Scroll operation descriptor.
 */
export interface ScrollOperation {
	/** Top row of scroll region (0-indexed) */
	readonly top: number;
	/** Bottom row of scroll region (0-indexed, exclusive) */
	readonly bottom: number;
	/** Number of lines to scroll */
	readonly lines: number;
	/** Scroll direction */
	readonly direction: CSRScrollDirection;
}

// =============================================================================
// CONTEXT CREATION
// =============================================================================

/**
 * Creates a CSR context with terminal capabilities.
 *
 * @param options - CSR context options
 * @returns A new CSRContext
 *
 * @example
 * ```typescript
 * import { createCSRContext } from 'blecsd';
 *
 * const ctx = createCSRContext({
 *   width: 80,
 *   height: 24,
 *   supportsCSR: true,
 * });
 * ```
 */
export function createCSRContext(options: CSRContextOptions): CSRContext {
	return {
		width: options.width,
		height: options.height,
		supportsCSR: options.supportsCSR ?? true,
		supportsInsertDelete: options.supportsInsertDelete ?? true,
		destroysOutsideContent: options.destroysOutsideContent ?? false,
	};
}

/**
 * Updates CSR context with new dimensions.
 *
 * @param ctx - Existing context
 * @param width - New width
 * @param height - New height
 * @returns Updated context
 */
export function resizeCSRContext(ctx: CSRContext, width: number, height: number): CSRContext {
	return {
		...ctx,
		width,
		height,
	};
}

// =============================================================================
// ESCAPE SEQUENCE GENERATION
// =============================================================================

/**
 * Generate escape sequence to set scroll region.
 * Uses DECSTBM (DEC Set Top and Bottom Margins).
 *
 * @param top - Top row (1-indexed for terminal)
 * @param bottom - Bottom row (1-indexed for terminal)
 * @returns Escape sequence string
 *
 * @example
 * ```typescript
 * import { setScrollRegion } from 'blecsd';
 *
 * // Set scroll region to lines 5-20 (1-indexed)
 * const seq = setScrollRegion(5, 20);
 * // Returns: '\x1b[5;20r'
 * ```
 */
export function setScrollRegion(top: number, bottom: number): string {
	return `${CSI}${top};${bottom}r`;
}

/**
 * Generate escape sequence to reset scroll region to full screen.
 *
 * @returns Escape sequence string
 *
 * @example
 * ```typescript
 * import { resetScrollRegion } from 'blecsd';
 *
 * const seq = resetScrollRegion();
 * // Returns: '\x1b[r'
 * ```
 */
export function resetScrollRegion(): string {
	return `${CSI}r`;
}

/**
 * Generate escape sequence to scroll up within current scroll region.
 *
 * @param lines - Number of lines to scroll (default: 1)
 * @returns Escape sequence string
 *
 * @example
 * ```typescript
 * import { scrollUp } from 'blecsd';
 *
 * const seq = scrollUp(3);
 * // Returns: '\x1b[3S'
 * ```
 */
export function scrollUp(lines = 1): string {
	if (lines <= 0) return '';
	if (lines === 1) return `${CSI}S`;
	return `${CSI}${lines}S`;
}

/**
 * Generate escape sequence to scroll down within current scroll region.
 *
 * @param lines - Number of lines to scroll (default: 1)
 * @returns Escape sequence string
 *
 * @example
 * ```typescript
 * import { scrollDown } from 'blecsd';
 *
 * const seq = scrollDown(3);
 * // Returns: '\x1b[3T'
 * ```
 */
export function scrollDown(lines = 1): string {
	if (lines <= 0) return '';
	if (lines === 1) return `${CSI}T`;
	return `${CSI}${lines}T`;
}

/**
 * Generate escape sequence to insert lines at cursor position.
 * Lines below are pushed down.
 *
 * @param count - Number of lines to insert (default: 1)
 * @returns Escape sequence string
 */
export function insertLine(count = 1): string {
	if (count <= 0) return '';
	if (count === 1) return `${CSI}L`;
	return `${CSI}${count}L`;
}

/**
 * Generate escape sequence to delete lines at cursor position.
 * Lines below are pulled up.
 *
 * @param count - Number of lines to delete (default: 1)
 * @returns Escape sequence string
 */
export function deleteLine(count = 1): string {
	if (count <= 0) return '';
	if (count === 1) return `${CSI}M`;
	return `${CSI}${count}M`;
}

/**
 * Generate escape sequence to move cursor to position.
 *
 * @param row - Row (1-indexed)
 * @param col - Column (1-indexed)
 * @returns Escape sequence string
 */
export function moveCursor(row: number, col: number): string {
	return `${CSI}${row};${col}H`;
}

// =============================================================================
// CSR DETECTION AND OPTIMIZATION
// =============================================================================

/**
 * Determines if CSR can be used for a scroll operation.
 *
 * CSR is beneficial when:
 * 1. Terminal supports CSR
 * 2. The scroll region spans the full width (no content on sides to preserve)
 * 3. The number of lines to scroll is less than the region height
 * 4. Hardware scrolling would be faster than cell-by-cell redraw
 *
 * @param ctx - CSR context
 * @param top - Top row of scroll region (0-indexed)
 * @param bottom - Bottom row of scroll region (0-indexed, exclusive)
 * @param lines - Number of lines to scroll
 * @param direction - Scroll direction
 * @returns true if CSR can be used
 *
 * @example
 * ```typescript
 * import { createCSRContext, canUseCSR } from 'blecsd';
 *
 * const ctx = createCSRContext({ width: 80, height: 24, supportsCSR: true });
 *
 * if (canUseCSR(ctx, 5, 15, 3, 'up')) {
 *   // Hardware scroll is beneficial
 * }
 * ```
 */
export function canUseCSR(
	ctx: CSRContext,
	top: number,
	bottom: number,
	lines: number,
	_direction: CSRScrollDirection,
): boolean {
	// Terminal must support CSR
	if (!ctx.supportsCSR) {
		return false;
	}

	// Validate bounds
	if (top < 0 || bottom > ctx.height || top >= bottom) {
		return false;
	}

	// Must scroll at least 1 line
	if (lines <= 0) {
		return false;
	}

	const regionHeight = bottom - top;

	// Don't use CSR if scrolling entire region (just clear)
	if (lines >= regionHeight) {
		return false;
	}

	// Calculate cost comparison
	// CSR cost: ~20 bytes (set region + scroll + reset)
	// Redraw cost: lines_preserved * width * ~10 bytes per cell
	const csrCost = 20;
	const linesPreserved = regionHeight - lines;
	const redrawCost = linesPreserved * ctx.width * 10;

	// CSR is beneficial if it costs less than redrawing
	return csrCost < redrawCost;
}

/**
 * Checks if the sides of a region are "clean" (empty/default).
 * CSR works best when the full width is being scrolled.
 *
 * @param leftEdgeClean - Whether left edge cells are empty
 * @param rightEdgeClean - Whether right edge cells are empty
 * @returns true if sides are clean for CSR
 *
 * @example
 * ```typescript
 * import { hasCleanSides } from 'blecsd';
 *
 * // Check if edges are suitable for CSR
 * const clean = hasCleanSides(true, true);
 * ```
 */
export function hasCleanSides(leftEdgeClean: boolean, rightEdgeClean: boolean): boolean {
	return leftEdgeClean && rightEdgeClean;
}

/**
 * Gets the escape sequences needed to perform a hardware scroll.
 *
 * The sequence:
 * 1. Save cursor position (optional)
 * 2. Set scroll region
 * 3. Move cursor to appropriate position
 * 4. Perform scroll
 * 5. Reset scroll region
 * 6. Restore cursor position (optional)
 *
 * @param ctx - CSR context
 * @param top - Top row of scroll region (0-indexed)
 * @param bottom - Bottom row of scroll region (0-indexed, exclusive)
 * @param lines - Number of lines to scroll
 * @param direction - Scroll direction
 * @returns CSR scroll result with sequences and lines to redraw
 *
 * @example
 * ```typescript
 * import { createCSRContext, getScrollSequence } from 'blecsd';
 *
 * const ctx = createCSRContext({ width: 80, height: 24, supportsCSR: true });
 * const result = getScrollSequence(ctx, 5, 20, 3, 'up');
 *
 * if (result.usedCSR) {
 *   // Write escape sequences
 *   process.stdout.write(result.sequences.join(''));
 *   // Redraw the newly exposed lines
 *   for (const line of result.linesToRedraw) {
 *     redrawLine(line);
 *   }
 * }
 * ```
 */
export function getScrollSequence(
	ctx: CSRContext,
	top: number,
	bottom: number,
	lines: number,
	direction: CSRScrollDirection,
): CSRScrollResult {
	if (!canUseCSR(ctx, top, bottom, lines, direction)) {
		return {
			usedCSR: false,
			sequences: [],
			linesToRedraw: [],
		};
	}

	const sequences: string[] = [];

	// Convert to 1-indexed for terminal
	const termTop = top + 1;
	const termBottom = bottom; // bottom is exclusive, so this is the last line

	// Set scroll region
	sequences.push(setScrollRegion(termTop, termBottom));

	// Move cursor to appropriate position and scroll
	if (direction === 'up') {
		// For scroll up, cursor should be at bottom of region
		sequences.push(moveCursor(termBottom, 1));
		sequences.push(scrollUp(lines));
	} else {
		// For scroll down, cursor should be at top of region
		sequences.push(moveCursor(termTop, 1));
		sequences.push(scrollDown(lines));
	}

	// Reset scroll region
	sequences.push(resetScrollRegion());

	// Calculate which lines need redrawing (the newly exposed lines)
	const linesToRedraw: number[] = [];
	if (direction === 'up') {
		// When scrolling up, bottom lines are exposed
		for (let i = 0; i < lines; i++) {
			linesToRedraw.push(bottom - lines + i);
		}
	} else {
		// When scrolling down, top lines are exposed
		for (let i = 0; i < lines; i++) {
			linesToRedraw.push(top + i);
		}
	}

	return {
		usedCSR: true,
		sequences,
		linesToRedraw,
	};
}

/**
 * Performs a full-width scroll operation with CSR optimization.
 *
 * This is a convenience function that combines detection and sequence
 * generation for the common case of scrolling the full width of the screen.
 *
 * @param ctx - CSR context
 * @param op - Scroll operation descriptor
 * @returns CSR scroll result
 *
 * @example
 * ```typescript
 * import { createCSRContext, scrollWithCSR } from 'blecsd';
 *
 * const ctx = createCSRContext({ width: 80, height: 24, supportsCSR: true });
 * const result = scrollWithCSR(ctx, {
 *   top: 5,
 *   bottom: 20,
 *   lines: 3,
 *   direction: 'up',
 * });
 * ```
 */
export function scrollWithCSR(ctx: CSRContext, op: ScrollOperation): CSRScrollResult {
	return getScrollSequence(ctx, op.top, op.bottom, op.lines, op.direction);
}

// =============================================================================
// ALTERNATE STRATEGIES
// =============================================================================

/**
 * Gets escape sequences for insert line operation.
 * Use this when scrolling down within a region using insert line.
 *
 * @param ctx - CSR context
 * @param row - Row to insert at (0-indexed)
 * @param count - Number of lines to insert
 * @param regionBottom - Bottom of scroll region (0-indexed, exclusive)
 * @returns Array of escape sequences
 */
export function getInsertLineSequence(
	ctx: CSRContext,
	row: number,
	count: number,
	regionBottom: number,
): string[] {
	if (!ctx.supportsInsertDelete) {
		return [];
	}

	if (row < 0 || row >= ctx.height || count <= 0) {
		return [];
	}

	const sequences: string[] = [];

	// Set scroll region if not full screen
	if (row !== 0 || regionBottom !== ctx.height) {
		sequences.push(setScrollRegion(row + 1, regionBottom));
	}

	// Move to insertion point
	sequences.push(moveCursor(row + 1, 1));

	// Insert lines
	sequences.push(insertLine(count));

	// Reset scroll region if we changed it
	if (row !== 0 || regionBottom !== ctx.height) {
		sequences.push(resetScrollRegion());
	}

	return sequences;
}

/**
 * Gets escape sequences for delete line operation.
 * Use this when scrolling up within a region using delete line.
 *
 * @param ctx - CSR context
 * @param row - Row to delete from (0-indexed)
 * @param count - Number of lines to delete
 * @param regionBottom - Bottom of scroll region (0-indexed, exclusive)
 * @returns Array of escape sequences
 */
export function getDeleteLineSequence(
	ctx: CSRContext,
	row: number,
	count: number,
	regionBottom: number,
): string[] {
	if (!ctx.supportsInsertDelete) {
		return [];
	}

	if (row < 0 || row >= ctx.height || count <= 0) {
		return [];
	}

	const sequences: string[] = [];

	// Set scroll region if not full screen
	if (row !== 0 || regionBottom !== ctx.height) {
		sequences.push(setScrollRegion(row + 1, regionBottom));
	}

	// Move to deletion point
	sequences.push(moveCursor(row + 1, 1));

	// Delete lines
	sequences.push(deleteLine(count));

	// Reset scroll region if we changed it
	if (row !== 0 || regionBottom !== ctx.height) {
		sequences.push(resetScrollRegion());
	}

	return sequences;
}

// =============================================================================
// DETECTION UTILITIES
// =============================================================================

/**
 * Detects scroll operations by comparing old and new buffer states.
 * Looks for patterns that indicate a scroll occurred.
 *
 * @param oldLines - Array of old line hashes/signatures
 * @param newLines - Array of new line hashes/signatures
 * @param regionTop - Top of region to check (0-indexed)
 * @param regionBottom - Bottom of region to check (0-indexed, exclusive)
 * @returns Detected scroll operation, or null if no scroll detected
 *
 * @example
 * ```typescript
 * import { detectScrollOperation } from 'blecsd';
 *
 * // Compare line hashes before and after change
 * const op = detectScrollOperation(oldHashes, newHashes, 0, 24);
 * if (op) {
 *   console.log(`Detected scroll ${op.direction} by ${op.lines} lines`);
 * }
 * ```
 */
export function detectScrollOperation(
	oldLines: readonly string[],
	newLines: readonly string[],
	regionTop: number,
	regionBottom: number,
): ScrollOperation | null {
	const regionHeight = regionBottom - regionTop;

	if (regionHeight < 2) {
		return null;
	}

	// Check for scroll up: old[i+n] matches new[i]
	for (let scrollAmount = 1; scrollAmount < regionHeight; scrollAmount++) {
		let matchCount = 0;
		const linesToCheck = regionHeight - scrollAmount;

		for (let i = 0; i < linesToCheck; i++) {
			const oldIdx = regionTop + i + scrollAmount;
			const newIdx = regionTop + i;

			if (oldIdx < oldLines.length && newIdx < newLines.length) {
				if (oldLines[oldIdx] === newLines[newIdx]) {
					matchCount++;
				}
			}
		}

		// If most lines match, it's likely a scroll up
		if (matchCount >= linesToCheck * 0.8) {
			return {
				top: regionTop,
				bottom: regionBottom,
				lines: scrollAmount,
				direction: 'up',
			};
		}
	}

	// Check for scroll down: old[i] matches new[i+n]
	for (let scrollAmount = 1; scrollAmount < regionHeight; scrollAmount++) {
		let matchCount = 0;
		const linesToCheck = regionHeight - scrollAmount;

		for (let i = 0; i < linesToCheck; i++) {
			const oldIdx = regionTop + i;
			const newIdx = regionTop + i + scrollAmount;

			if (oldIdx < oldLines.length && newIdx < newLines.length) {
				if (oldLines[oldIdx] === newLines[newIdx]) {
					matchCount++;
				}
			}
		}

		// If most lines match, it's likely a scroll down
		if (matchCount >= linesToCheck * 0.8) {
			return {
				top: regionTop,
				bottom: regionBottom,
				lines: scrollAmount,
				direction: 'down',
			};
		}
	}

	return null;
}

/**
 * Computes a simple hash for a line to use in scroll detection.
 * Uses a fast non-cryptographic hash.
 *
 * @param content - Line content string
 * @returns Hash string
 */
export function hashLine(content: string): string {
	// Simple DJB2 hash
	let hash = 5381;
	for (let i = 0; i < content.length; i++) {
		hash = ((hash << 5) + hash) ^ content.charCodeAt(i);
	}
	return hash.toString(36);
}

/**
 * Computes line hashes for a buffer for scroll detection.
 *
 * @param lines - Array of line content strings
 * @returns Array of hash strings
 */
export function computeLineHashes(lines: readonly string[]): string[] {
	return lines.map(hashLine);
}
