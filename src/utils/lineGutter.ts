/**
 * Efficient line number gutter rendering.
 *
 * Provides virtualized line number rendering with dynamic width,
 * relative numbering (vim-style), and synchronized scrolling.
 * Only computes visible line numbers for sub-millisecond performance.
 *
 * @module utils/lineGutter
 */

// =============================================================================
// TYPES
// =============================================================================

/**
 * Line numbering mode.
 */
export type LineNumberMode = 'absolute' | 'relative' | 'hybrid';

/**
 * Configuration for gutter rendering.
 */
export interface GutterConfig {
	/** Line numbering mode (default: 'absolute') */
	readonly mode: LineNumberMode;
	/** Minimum gutter width in characters (default: 3) */
	readonly minWidth: number;
	/** Right padding characters after number (default: 1) */
	readonly rightPadding: number;
	/** Character used for padding (default: ' ') */
	readonly padChar: string;
	/** Separator character between gutter and content (default: '│') */
	readonly separator: string;
	/** Whether to highlight the current line number (default: true) */
	readonly highlightCurrent: boolean;
}

/**
 * A single rendered gutter line.
 */
export interface GutterLine {
	/** The rendered text for this gutter cell */
	readonly text: string;
	/** Whether this is the current/active line */
	readonly isCurrent: boolean;
	/** The absolute line number (1-based) */
	readonly lineNumber: number;
	/** Width in characters of this gutter cell */
	readonly width: number;
}

/**
 * Result of computing visible gutter lines.
 */
export interface GutterResult {
	/** Rendered gutter lines for the visible range */
	readonly lines: readonly GutterLine[];
	/** Computed gutter width (including separator and padding) */
	readonly gutterWidth: number;
	/** The digit width used (number of digit columns) */
	readonly digitWidth: number;
	/** Total lines in the document */
	readonly totalLines: number;
}

// =============================================================================
// DEFAULTS
// =============================================================================

const DEFAULT_GUTTER_CONFIG: GutterConfig = {
	mode: 'absolute',
	minWidth: 3,
	rightPadding: 1,
	padChar: ' ',
	separator: '\u2502',
	highlightCurrent: true,
};

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Computes the number of digit columns needed for a given line count.
 *
 * @param totalLines - Total number of lines in the document
 * @param minWidth - Minimum digit width
 * @returns Number of digit columns
 */
export function computeDigitWidth(totalLines: number, minWidth: number): number {
	if (totalLines <= 0) return minWidth;
	const digits = Math.floor(Math.log10(totalLines)) + 1;
	return Math.max(digits, minWidth);
}

/**
 * Computes the total gutter width including padding and separator.
 *
 * @param digitWidth - Number of digit columns
 * @param config - Gutter configuration
 * @returns Total gutter width in characters
 */
export function computeGutterWidth(digitWidth: number, config?: Partial<GutterConfig>): number {
	const cfg = { ...DEFAULT_GUTTER_CONFIG, ...config };
	// digits + right padding + separator
	return digitWidth + cfg.rightPadding + 1;
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Creates a merged gutter configuration with defaults.
 *
 * @param config - Partial configuration overrides
 * @returns Full gutter configuration
 *
 * @example
 * ```typescript
 * import { createGutterConfig } from 'blecsd';
 *
 * const config = createGutterConfig({ mode: 'relative' });
 * ```
 */
export function createGutterConfig(config?: Partial<GutterConfig>): GutterConfig {
	return { ...DEFAULT_GUTTER_CONFIG, ...config };
}

/**
 * Formats a single line number for the gutter.
 *
 * @param lineNumber - The absolute line number (1-based)
 * @param cursorLine - The current cursor line (1-based)
 * @param digitWidth - Width to pad the number to
 * @param mode - Line numbering mode
 * @returns The formatted number string
 *
 * @example
 * ```typescript
 * import { formatLineNumber } from 'blecsd';
 *
 * formatLineNumber(42, 42, 4, 'absolute');  // ' 42'
 * formatLineNumber(40, 42, 4, 'relative');  // '  2'
 * formatLineNumber(42, 42, 4, 'hybrid');    // '  42'
 * ```
 */
export function formatLineNumber(
	lineNumber: number,
	cursorLine: number,
	digitWidth: number,
	mode: LineNumberMode,
): string {
	const isCurrent = lineNumber === cursorLine;

	if (mode === 'absolute') {
		return String(lineNumber).padStart(digitWidth, ' ');
	}

	if (mode === 'relative') {
		if (isCurrent) return String(lineNumber).padStart(digitWidth, ' ');
		const rel = Math.abs(lineNumber - cursorLine);
		return String(rel).padStart(digitWidth, ' ');
	}

	// hybrid: current line shows absolute, others show relative
	if (isCurrent) return String(lineNumber).padStart(digitWidth, ' ');
	const rel = Math.abs(lineNumber - cursorLine);
	return String(rel).padStart(digitWidth, ' ');
}

/**
 * Computes the visible gutter lines for a viewport.
 *
 * Only processes lines within the visible range for O(viewportHeight)
 * performance regardless of total document size.
 *
 * @param totalLines - Total number of lines in the document
 * @param viewportStart - First visible line index (0-based)
 * @param viewportHeight - Number of visible lines
 * @param cursorLine - Current cursor line (1-based)
 * @param config - Optional gutter configuration
 * @returns Computed gutter result
 *
 * @example
 * ```typescript
 * import { computeVisibleGutter } from 'blecsd';
 *
 * const result = computeVisibleGutter(100000, 500, 40, 520);
 * for (const line of result.lines) {
 *   process.stdout.write(line.text + '\n');
 * }
 * ```
 */
export function computeVisibleGutter(
	totalLines: number,
	viewportStart: number,
	viewportHeight: number,
	cursorLine: number,
	config?: Partial<GutterConfig>,
): GutterResult {
	const cfg = { ...DEFAULT_GUTTER_CONFIG, ...config };
	const digitWidth = computeDigitWidth(totalLines, cfg.minWidth);
	const gutterWidth = computeGutterWidth(digitWidth, cfg);

	const lines: GutterLine[] = [];
	const end = Math.min(viewportStart + viewportHeight, totalLines);

	for (let i = viewportStart; i < end; i++) {
		const lineNum = i + 1; // 1-based
		const isCurrent = lineNum === cursorLine;
		const numStr = formatLineNumber(lineNum, cursorLine, digitWidth, cfg.mode);
		const text = numStr + cfg.padChar.repeat(cfg.rightPadding) + cfg.separator;

		lines.push({
			text,
			isCurrent,
			lineNumber: lineNum,
			width: gutterWidth,
		});
	}

	return { lines, gutterWidth, digitWidth, totalLines };
}

/**
 * Checks if the gutter width would change at a new line count.
 * Useful for detecting when the gutter needs to be resized
 * (e.g., going from 999 to 1000 lines).
 *
 * @param oldTotal - Previous total line count
 * @param newTotal - New total line count
 * @param minWidth - Minimum digit width
 * @returns Whether the gutter width changed
 *
 * @example
 * ```typescript
 * import { gutterWidthChanged } from 'blecsd';
 *
 * if (gutterWidthChanged(999, 1000, 3)) {
 *   // Re-layout needed - gutter grew from 3 to 4 digits
 * }
 * ```
 */
export function gutterWidthChanged(oldTotal: number, newTotal: number, minWidth = 3): boolean {
	return computeDigitWidth(oldTotal, minWidth) !== computeDigitWidth(newTotal, minWidth);
}

/**
 * Renders a batch of gutter lines as a single string block.
 * Convenience function for terminal output.
 *
 * @param result - A computed gutter result
 * @param currentHighlight - ANSI prefix for the current line (e.g., '\\x1b[1;33m')
 * @param normalStyle - ANSI prefix for normal lines (e.g., '\\x1b[90m')
 * @param reset - ANSI reset sequence (default: '\\x1b[0m')
 * @returns Array of styled gutter strings
 *
 * @example
 * ```typescript
 * import { computeVisibleGutter, renderGutterBlock } from 'blecsd';
 *
 * const gutter = computeVisibleGutter(1000, 0, 40, 1);
 * const styled = renderGutterBlock(gutter, '\x1b[1;33m', '\x1b[90m');
 * ```
 */
export function renderGutterBlock(
	result: GutterResult,
	currentHighlight: string,
	normalStyle: string,
	reset = '\x1b[0m',
): readonly string[] {
	return result.lines.map((line) => {
		const style = line.isCurrent ? currentHighlight : normalStyle;
		return `${style}${line.text}${reset}`;
	});
}
