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

// =============================================================================
// SMART CSR - AUTOMATIC DETECTION AND OPTIMIZATION
// =============================================================================

/**
 * Smart CSR configuration options.
 */
export interface SmartCSRConfig {
	/** Enable smart CSR detection (default: true) */
	readonly enabled?: boolean;
	/** Minimum region height to consider for CSR (default: 4) */
	readonly minRegionHeight?: number;
	/** Maximum scroll amount relative to region height (default: 0.5 = 50%) */
	readonly maxScrollRatio?: number;
	/** Minimum lines preserved to benefit from CSR (default: 2) */
	readonly minLinesPreserved?: number;
	/** Cost factor for each preserved line (default: 10 bytes/cell) */
	readonly bytesPerCell?: number;
	/** Fixed CSR overhead in bytes (default: 30) */
	readonly csrOverhead?: number;
	/** Require clean sides for CSR (no content at edges) */
	readonly requireCleanSides?: boolean;
}

/**
 * Default smart CSR configuration.
 */
export const DEFAULT_SMART_CSR_CONFIG: Required<SmartCSRConfig> = {
	enabled: true,
	minRegionHeight: 4,
	maxScrollRatio: 0.5,
	minLinesPreserved: 2,
	bytesPerCell: 10,
	csrOverhead: 30,
	requireCleanSides: false,
};

/**
 * Result of smart CSR analysis.
 */
export interface SmartCSRAnalysis {
	/** Whether CSR should be used */
	readonly shouldUseCSR: boolean;
	/** Reason for the decision */
	readonly reason: SmartCSRReason;
	/** Estimated cost of CSR approach in bytes */
	readonly csrCost: number;
	/** Estimated cost of full redraw in bytes */
	readonly redrawCost: number;
	/** Estimated bytes saved by using CSR */
	readonly bytesSaved: number;
	/** Number of lines that would be preserved */
	readonly linesPreserved: number;
	/** Detected scroll operation (if any) */
	readonly scrollOperation: ScrollOperation | null;
}

/**
 * Reasons for smart CSR decisions.
 */
export type SmartCSRReason =
	| 'csr_disabled'
	| 'terminal_no_csr'
	| 'region_too_small'
	| 'scroll_too_large'
	| 'too_few_lines_preserved'
	| 'edges_not_clean'
	| 'no_scroll_detected'
	| 'csr_more_expensive'
	| 'csr_beneficial';

/**
 * Smart CSR context combining terminal capabilities with configuration.
 */
export interface SmartCSRContext extends CSRContext {
	/** Smart CSR configuration */
	readonly config: Required<SmartCSRConfig>;
}

/**
 * Creates a smart CSR context.
 *
 * @param options - CSR context options
 * @param config - Smart CSR configuration
 * @returns Smart CSR context
 *
 * @example
 * ```typescript
 * import { createSmartCSRContext } from 'blecsd';
 *
 * const ctx = createSmartCSRContext(
 *   { width: 80, height: 24, supportsCSR: true },
 *   { minRegionHeight: 5 }
 * );
 * ```
 */
export function createSmartCSRContext(
	options: CSRContextOptions,
	config: SmartCSRConfig = {},
): SmartCSRContext {
	return {
		...createCSRContext(options),
		config: {
			...DEFAULT_SMART_CSR_CONFIG,
			...config,
		},
	};
}

/**
 * Cell interface for smart CSR edge detection.
 */
export interface SmartCSRCell {
	/** Character content */
	readonly char: string;
	/** Whether the cell is empty/default */
	readonly isEmpty: boolean;
}

/**
 * Buffer interface for smart CSR analysis.
 */
export interface SmartCSRBuffer {
	/** Buffer width */
	readonly width: number;
	/** Buffer height */
	readonly height: number;
	/** Get cell at position */
	getCell(x: number, y: number): SmartCSRCell | undefined;
	/** Get line content as string for hashing */
	getLineContent(y: number): string;
}

/**
 * Checks if the edges of a scroll region are clean (empty cells).
 *
 * @param buffer - Buffer to check
 * @param top - Top row (0-indexed)
 * @param bottom - Bottom row (0-indexed, exclusive)
 * @returns Object with leftClean and rightClean flags
 *
 * @example
 * ```typescript
 * import { checkEdges } from 'blecsd';
 *
 * const edges = checkEdges(buffer, 5, 15);
 * if (edges.leftClean && edges.rightClean) {
 *   // Safe to use CSR
 * }
 * ```
 */
export function checkEdges(
	buffer: SmartCSRBuffer,
	top: number,
	bottom: number,
): { leftClean: boolean; rightClean: boolean } {
	let leftClean = true;
	let rightClean = true;

	for (let y = top; y < bottom; y++) {
		const leftCell = buffer.getCell(0, y);
		const rightCell = buffer.getCell(buffer.width - 1, y);

		if (leftCell && !leftCell.isEmpty) {
			leftClean = false;
		}
		if (rightCell && !rightCell.isEmpty) {
			rightClean = false;
		}

		if (!leftClean && !rightClean) {
			break;
		}
	}

	return { leftClean, rightClean };
}

/**
 * Analyzes whether smart CSR should be used for a scroll operation.
 *
 * This function considers:
 * - Terminal capabilities
 * - Region size and scroll amount
 * - Cost comparison (CSR vs full redraw)
 * - Edge content (clean sides)
 *
 * @param ctx - Smart CSR context
 * @param top - Top row of scroll region (0-indexed)
 * @param bottom - Bottom row of scroll region (0-indexed, exclusive)
 * @param lines - Number of lines to scroll
 * @param direction - Scroll direction
 * @param edgesClean - Whether edges are clean (optional, assumed true)
 * @returns Analysis result with recommendation
 *
 * @example
 * ```typescript
 * import { createSmartCSRContext, analyzeCSR } from 'blecsd';
 *
 * const ctx = createSmartCSRContext({ width: 80, height: 24, supportsCSR: true });
 * const analysis = analyzeCSR(ctx, 5, 20, 3, 'up');
 *
 * if (analysis.shouldUseCSR) {
 *   console.log(`CSR saves ${analysis.bytesSaved} bytes`);
 * } else {
 *   console.log(`Skipping CSR: ${analysis.reason}`);
 * }
 * ```
 */
export function analyzeCSR(
	ctx: SmartCSRContext,
	top: number,
	bottom: number,
	lines: number,
	direction: CSRScrollDirection,
	edgesClean = true,
): SmartCSRAnalysis {
	const { config } = ctx;
	const regionHeight = bottom - top;
	const linesPreserved = Math.max(0, regionHeight - lines);

	// Base result for rejections
	const baseResult = {
		csrCost: config.csrOverhead,
		redrawCost: linesPreserved * ctx.width * config.bytesPerCell,
		bytesSaved: 0,
		linesPreserved,
		scrollOperation: { top, bottom, lines, direction } as ScrollOperation,
	};

	// Check if smart CSR is enabled
	if (!config.enabled) {
		return {
			...baseResult,
			shouldUseCSR: false,
			reason: 'csr_disabled',
		};
	}

	// Check terminal support
	if (!ctx.supportsCSR) {
		return {
			...baseResult,
			shouldUseCSR: false,
			reason: 'terminal_no_csr',
		};
	}

	// Check minimum region height
	if (regionHeight < config.minRegionHeight) {
		return {
			...baseResult,
			shouldUseCSR: false,
			reason: 'region_too_small',
		};
	}

	// Check scroll ratio
	if (lines / regionHeight > config.maxScrollRatio) {
		return {
			...baseResult,
			shouldUseCSR: false,
			reason: 'scroll_too_large',
		};
	}

	// Check minimum lines preserved
	if (linesPreserved < config.minLinesPreserved) {
		return {
			...baseResult,
			shouldUseCSR: false,
			reason: 'too_few_lines_preserved',
		};
	}

	// Check clean edges if required
	if (config.requireCleanSides && !edgesClean) {
		return {
			...baseResult,
			shouldUseCSR: false,
			reason: 'edges_not_clean',
		};
	}

	// Calculate costs
	const csrCost = config.csrOverhead;
	const redrawCost = linesPreserved * ctx.width * config.bytesPerCell;
	const bytesSaved = redrawCost - csrCost;

	// Compare costs
	if (bytesSaved <= 0) {
		return {
			shouldUseCSR: false,
			reason: 'csr_more_expensive',
			csrCost,
			redrawCost,
			bytesSaved,
			linesPreserved,
			scrollOperation: baseResult.scrollOperation,
		};
	}

	return {
		shouldUseCSR: true,
		reason: 'csr_beneficial',
		csrCost,
		redrawCost,
		bytesSaved,
		linesPreserved,
		scrollOperation: baseResult.scrollOperation,
	};
}

/**
 * Analyzes buffer changes to detect scroll and determine if CSR should be used.
 *
 * This is the main entry point for smart CSR. It:
 * 1. Compares old and new buffer states
 * 2. Detects scroll patterns
 * 3. Checks edge conditions
 * 4. Returns a recommendation with full analysis
 *
 * @param ctx - Smart CSR context
 * @param oldBuffer - Previous buffer state
 * @param newBuffer - New buffer state
 * @param regionTop - Top of region to analyze (default: 0)
 * @param regionBottom - Bottom of region to analyze (default: full height)
 * @returns Analysis result with scroll detection
 *
 * @example
 * ```typescript
 * import { createSmartCSRContext, analyzeBufferForCSR } from 'blecsd';
 *
 * const ctx = createSmartCSRContext({ width: 80, height: 24, supportsCSR: true });
 * const analysis = analyzeBufferForCSR(ctx, oldBuffer, newBuffer);
 *
 * if (analysis.shouldUseCSR && analysis.scrollOperation) {
 *   const result = scrollWithCSR(ctx, analysis.scrollOperation);
 *   // ... apply result
 * }
 * ```
 */
export function analyzeBufferForCSR(
	ctx: SmartCSRContext,
	oldBuffer: SmartCSRBuffer,
	newBuffer: SmartCSRBuffer,
	regionTop = 0,
	regionBottom?: number,
): SmartCSRAnalysis {
	const bottom = regionBottom ?? ctx.height;
	const { config } = ctx;

	// Check if smart CSR is enabled
	if (!config.enabled) {
		return {
			shouldUseCSR: false,
			reason: 'csr_disabled',
			csrCost: 0,
			redrawCost: 0,
			bytesSaved: 0,
			linesPreserved: 0,
			scrollOperation: null,
		};
	}

	// Check terminal support
	if (!ctx.supportsCSR) {
		return {
			shouldUseCSR: false,
			reason: 'terminal_no_csr',
			csrCost: 0,
			redrawCost: 0,
			bytesSaved: 0,
			linesPreserved: 0,
			scrollOperation: null,
		};
	}

	// Get line hashes for both buffers
	const oldHashes: string[] = [];
	const newHashes: string[] = [];

	for (let y = regionTop; y < bottom; y++) {
		oldHashes.push(hashLine(oldBuffer.getLineContent(y)));
		newHashes.push(hashLine(newBuffer.getLineContent(y)));
	}

	// Detect scroll operation
	const scrollOp = detectScrollOperation(oldHashes, newHashes, 0, bottom - regionTop);

	if (!scrollOp) {
		return {
			shouldUseCSR: false,
			reason: 'no_scroll_detected',
			csrCost: 0,
			redrawCost: 0,
			bytesSaved: 0,
			linesPreserved: 0,
			scrollOperation: null,
		};
	}

	// Adjust scroll operation to screen coordinates
	const adjustedOp: ScrollOperation = {
		top: scrollOp.top + regionTop,
		bottom: scrollOp.bottom + regionTop,
		lines: scrollOp.lines,
		direction: scrollOp.direction,
	};

	// Check edges if required
	let edgesClean = true;
	if (config.requireCleanSides) {
		const edges = checkEdges(newBuffer, adjustedOp.top, adjustedOp.bottom);
		edgesClean = edges.leftClean && edges.rightClean;
	}

	// Analyze whether to use CSR
	return analyzeCSR(ctx, adjustedOp.top, adjustedOp.bottom, adjustedOp.lines, adjustedOp.direction, edgesClean);
}

/**
 * Performs smart CSR scroll if beneficial, returning sequences and redraw info.
 *
 * @param ctx - Smart CSR context
 * @param oldBuffer - Previous buffer state
 * @param newBuffer - New buffer state
 * @param regionTop - Top of region to analyze (default: 0)
 * @param regionBottom - Bottom of region to analyze (default: full height)
 * @returns CSR scroll result with sequences and lines to redraw
 *
 * @example
 * ```typescript
 * import { createSmartCSRContext, smartScroll } from 'blecsd';
 *
 * const ctx = createSmartCSRContext({ width: 80, height: 24, supportsCSR: true });
 * const result = smartScroll(ctx, oldBuffer, newBuffer);
 *
 * if (result.usedCSR) {
 *   process.stdout.write(result.sequences.join(''));
 *   for (const line of result.linesToRedraw) {
 *     redrawLine(line);
 *   }
 * }
 * ```
 */
export function smartScroll(
	ctx: SmartCSRContext,
	oldBuffer: SmartCSRBuffer,
	newBuffer: SmartCSRBuffer,
	regionTop = 0,
	regionBottom?: number,
): CSRScrollResult {
	const analysis = analyzeBufferForCSR(ctx, oldBuffer, newBuffer, regionTop, regionBottom);

	if (!analysis.shouldUseCSR || !analysis.scrollOperation) {
		return {
			usedCSR: false,
			sequences: [],
			linesToRedraw: [],
		};
	}

	return scrollWithCSR(ctx, analysis.scrollOperation);
}

/**
 * Checks if smart CSR is enabled in a context.
 *
 * @param ctx - Smart CSR context
 * @returns true if smart CSR is enabled
 */
export function isSmartCSREnabled(ctx: SmartCSRContext): boolean {
	return ctx.config.enabled && ctx.supportsCSR;
}

/**
 * Updates smart CSR configuration.
 *
 * @param ctx - Smart CSR context
 * @param config - New configuration options
 * @returns Updated context
 *
 * @example
 * ```typescript
 * import { createSmartCSRContext, updateSmartCSRConfig } from 'blecsd';
 *
 * let ctx = createSmartCSRContext({ width: 80, height: 24, supportsCSR: true });
 * ctx = updateSmartCSRConfig(ctx, { minRegionHeight: 6 });
 * ```
 */
export function updateSmartCSRConfig(ctx: SmartCSRContext, config: SmartCSRConfig): SmartCSRContext {
	return {
		...ctx,
		config: {
			...ctx.config,
			...config,
		},
	};
}

/**
 * Calculates the efficiency of CSR for a given scroll operation.
 * Returns a ratio: 1.0 = break-even, >1.0 = CSR is better, <1.0 = redraw is better.
 *
 * @param ctx - Smart CSR context
 * @param regionHeight - Height of the scroll region
 * @param scrollLines - Number of lines being scrolled
 * @returns Efficiency ratio
 *
 * @example
 * ```typescript
 * import { createSmartCSRContext, calculateCSREfficiency } from 'blecsd';
 *
 * const ctx = createSmartCSRContext({ width: 80, height: 24, supportsCSR: true });
 * const efficiency = calculateCSREfficiency(ctx, 20, 3);
 * // efficiency > 1.0 means CSR is more efficient
 * ```
 */
export function calculateCSREfficiency(ctx: SmartCSRContext, regionHeight: number, scrollLines: number): number {
	const { config } = ctx;
	const linesPreserved = Math.max(0, regionHeight - scrollLines);
	const redrawCost = linesPreserved * ctx.width * config.bytesPerCell;
	const csrCost = config.csrOverhead;

	if (csrCost === 0) return Number.POSITIVE_INFINITY;
	return redrawCost / csrCost;
}
