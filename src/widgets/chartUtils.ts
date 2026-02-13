/**
 * Chart Utilities
 *
 * Shared utilities for chart widgets including axis rendering,
 * scale calculations, braille character mapping, and number formatting.
 *
 * @module widgets/chartUtils
 */

// =============================================================================
// BRAILLE RENDERING
// =============================================================================

/**
 * Base character for braille patterns.
 * Unicode range: U+2800-U+28FF
 */
export const BRAILLE_BASE = 0x2800;

/**
 * Braille dot positions as bit masks.
 * Each braille character represents a 2x4 dot grid:
 *
 * Column 0  Column 1
 * ┌──────┬──────┐
 * │ 0x01 │ 0x08 │  Row 0
 * │ 0x02 │ 0x10 │  Row 1
 * │ 0x04 │ 0x20 │  Row 2
 * │ 0x40 │ 0x80 │  Row 3
 * └──────┴──────┘
 */
export const BRAILLE_DOTS: readonly (readonly [number, number])[] = [
	[0x01, 0x08], // Row 0: dots 1,4
	[0x02, 0x10], // Row 1: dots 2,5
	[0x04, 0x20], // Row 2: dots 3,6
	[0x40, 0x80], // Row 3: dots 7,8
] as const;

/**
 * Maps a pixel position to a braille character with the dot set.
 *
 * @param col - Column (0 or 1)
 * @param row - Row (0-3)
 * @returns Braille character with the specified dot set
 *
 * @example
 * ```typescript
 * const char = brailleChar(0, 0); // Top-left dot
 * ```
 */
export function brailleChar(col: number, row: number): string {
	if (col < 0 || col > 1 || row < 0 || row > 3) {
		return ' ';
	}
	const dots = BRAILLE_DOTS[row];
	if (!dots) return ' ';
	const dotBit = dots[col] ?? 0;
	return String.fromCharCode(BRAILLE_BASE | dotBit);
}

/**
 * Combines multiple dot positions into a single braille character.
 *
 * @param dots - Array of [col, row] positions
 * @returns Braille character with all specified dots set
 *
 * @example
 * ```typescript
 * const char = combineBrailleDots([[0, 0], [1, 0], [0, 1]]); // Multiple dots
 * ```
 */
export function combineBrailleDots(dots: readonly (readonly [number, number])[]): string {
	let bits = 0;
	for (const [col, row] of dots) {
		if (col >= 0 && col <= 1 && row >= 0 && row <= 3) {
			const rowDots = BRAILLE_DOTS[row];
			if (rowDots) {
				bits |= rowDots[col] ?? 0;
			}
		}
	}
	return String.fromCharCode(BRAILLE_BASE | bits);
}

// =============================================================================
// SCALE CALCULATIONS
// =============================================================================

/**
 * Calculates a nice tick interval for a given range.
 *
 * @param range - The data range (max - min)
 * @param targetTicks - Target number of ticks (default: 5)
 * @returns Nice tick interval
 *
 * @example
 * ```typescript
 * const interval = calculateTickInterval(100, 5); // ~20
 * ```
 */
export function calculateTickInterval(range: number, targetTicks = 5): number {
	if (range === 0) return 1;

	const roughInterval = range / targetTicks;
	const magnitude = 10 ** Math.floor(Math.log10(roughInterval));
	const normalized = roughInterval / magnitude;

	let niceInterval: number;
	if (normalized <= 1) {
		niceInterval = 1;
	} else if (normalized <= 2) {
		niceInterval = 2;
	} else if (normalized <= 5) {
		niceInterval = 5;
	} else {
		niceInterval = 10;
	}

	return niceInterval * magnitude;
}

/**
 * Generates tick positions for an axis.
 *
 * @param min - Minimum value
 * @param max - Maximum value
 * @param targetTicks - Target number of ticks
 * @returns Array of tick values
 *
 * @example
 * ```typescript
 * const ticks = generateTicks(0, 100, 5); // [0, 20, 40, 60, 80, 100]
 * ```
 */
export function generateTicks(min: number, max: number, targetTicks = 5): readonly number[] {
	if (min === max) {
		return [min];
	}

	const range = max - min;
	const interval = calculateTickInterval(range, targetTicks);
	const start = Math.floor(min / interval) * interval;
	const ticks: number[] = [];

	for (let value = start; value <= max; value += interval) {
		if (value >= min) {
			ticks.push(value);
		}
	}

	// Ensure max is included if not already present
	const lastTick = ticks[ticks.length - 1];
	if (ticks.length === 0 || (lastTick !== undefined && lastTick < max)) {
		ticks.push(max);
	}

	return ticks;
}

/**
 * Scales a value from data range to pixel range.
 *
 * @param value - Value to scale
 * @param dataMin - Minimum data value
 * @param dataMax - Maximum data value
 * @param pixelMin - Minimum pixel value
 * @param pixelMax - Maximum pixel value
 * @returns Scaled pixel value
 *
 * @example
 * ```typescript
 * const y = scaleValue(50, 0, 100, 0, 20); // Maps 50 to middle of 0-20 range
 * ```
 */
export function scaleValue(
	value: number,
	dataMin: number,
	dataMax: number,
	pixelMin: number,
	pixelMax: number,
): number {
	if (dataMax === dataMin) {
		return (pixelMin + pixelMax) / 2;
	}

	const dataRange = dataMax - dataMin;
	const pixelRange = pixelMax - pixelMin;
	const normalized = (value - dataMin) / dataRange;

	return pixelMin + normalized * pixelRange;
}

// =============================================================================
// NUMBER FORMATTING
// =============================================================================

/**
 * Formats a number for display in a chart.
 *
 * @param value - Number to format
 * @param maxLength - Maximum length of formatted string (default: 8)
 * @returns Formatted string
 *
 * @example
 * ```typescript
 * formatNumber(1234.5678); // "1234.57"
 * formatNumber(1234567); // "1.23M"
 * ```
 */
export function formatNumber(value: number, maxLength = 8): string {
	if (!Number.isFinite(value)) {
		return 'NaN';
	}

	const absValue = Math.abs(value);

	// Handle very small numbers
	if (absValue < 0.01 && absValue > 0) {
		return value.toExponential(2);
	}

	// Handle large numbers with suffixes
	if (absValue >= 1_000_000_000) {
		return `${(value / 1_000_000_000).toFixed(2)}B`;
	}
	if (absValue >= 1_000_000) {
		return `${(value / 1_000_000).toFixed(2)}M`;
	}
	if (absValue >= 1_000) {
		return `${(value / 1_000).toFixed(2)}K`;
	}

	// Format normally
	const str = value.toFixed(2);
	if (str.length <= maxLength) {
		return str;
	}

	// Reduce precision if too long
	return value.toFixed(0);
}

/**
 * Formats a percentage value.
 *
 * @param value - Value between 0 and 1
 * @returns Formatted percentage string
 *
 * @example
 * ```typescript
 * formatPercentage(0.75); // "75%"
 * ```
 */
export function formatPercentage(value: number): string {
	return `${Math.round(value * 100)}%`;
}

// =============================================================================
// COLOR UTILITIES
// =============================================================================

/**
 * Predefined color palette for chart series.
 */
export const CHART_COLORS: readonly number[] = [
	0xff_64_b5_f6, // Blue
	0xff_81_c7_84, // Green
	0xff_ff_b7_4d, // Orange
	0xff_e5_73_73, // Red
	0xff_ba_68_c8, // Purple
	0xff_ff_d5_4f, // Yellow
	0xff_4d_d0_e1, // Cyan
	0xff_a1_88_7f, // Brown
] as const;

/**
 * Gets a color from the chart palette by index.
 *
 * @param index - Series index
 * @returns Packed color value
 *
 * @example
 * ```typescript
 * const color = getChartColor(0); // First color (blue)
 * ```
 */
export function getChartColor(index: number): number {
	const color = CHART_COLORS[index % CHART_COLORS.length];
	// CHART_COLORS is a const array with known values, so this is safe
	if (color === undefined) {
		// biome-ignore lint/style/noNonNullAssertion: CHART_COLORS always has at least one element
		return CHART_COLORS[0]!; // Default to first color
	}
	return color;
}

/**
 * Interpolates between two colors.
 *
 * @param color1 - Starting color (packed)
 * @param color2 - Ending color (packed)
 * @param t - Interpolation factor (0-1)
 * @returns Interpolated color (packed)
 *
 * @example
 * ```typescript
 * const midColor = interpolateChartColor(red, blue, 0.5);
 * ```
 */
export function interpolateChartColor(color1: number, color2: number, t: number): number {
	const r1 = (color1 >> 16) & 0xff;
	const g1 = (color1 >> 8) & 0xff;
	const b1 = color1 & 0xff;
	const a1 = (color1 >> 24) & 0xff;

	const r2 = (color2 >> 16) & 0xff;
	const g2 = (color2 >> 8) & 0xff;
	const b2 = color2 & 0xff;
	const a2 = (color2 >> 24) & 0xff;

	const r = Math.round(r1 + (r2 - r1) * t);
	const g = Math.round(g1 + (g2 - g1) * t);
	const b = Math.round(b1 + (b2 - b1) * t);
	const a = Math.round(a1 + (a2 - a1) * t);

	return ((a << 24) | (r << 16) | (g << 8) | b) >>> 0;
}

// =============================================================================
// AXIS RENDERING
// =============================================================================

/**
 * Renders a horizontal axis label.
 *
 * @param value - Tick value
 * @param width - Available width
 * @returns Formatted label string
 */
export function renderXAxisLabel(value: number, width: number): string {
	const label = formatNumber(value, width - 1);
	return label.padEnd(width, ' ');
}

/**
 * Renders a vertical axis label.
 *
 * @param value - Tick value
 * @param width - Available width for the label
 * @returns Formatted label string, right-aligned
 */
export function renderYAxisLabel(value: number, width: number): string {
	const label = formatNumber(value, width);
	return label.padStart(width, ' ');
}
