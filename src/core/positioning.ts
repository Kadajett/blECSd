/**
 * Advanced positioning system with percentage and expression support.
 * Resolves position values to absolute coordinates.
 * @module core/positioning
 */

import { z } from 'zod';

/**
 * Position value types supported by the positioning system.
 * - number: absolute position in cells
 * - string: percentage ('50%'), expression ('50%-5'), or keyword ('center', 'half')
 */
export type PositionValue = number | string;

/**
 * Expression operator for position calculations.
 */
type ExpressionOperator = '+' | '-';

/**
 * Parsed position expression result.
 */
interface ParsedExpression {
	/** Base value (percentage or number) */
	base: number;
	/** Whether base is a percentage */
	isPercent: boolean;
	/** Offset to add/subtract */
	offset: number;
}

/**
 * Schema for validating position values.
 * Accepts numbers, percentage strings, expressions, and keywords.
 *
 * @example
 * ```typescript
 * import { PositionValueSchema } from 'blecsd';
 *
 * PositionValueSchema.parse(10);        // Valid: absolute
 * PositionValueSchema.parse('50%');     // Valid: percentage
 * PositionValueSchema.parse('50%-5');   // Valid: expression
 * PositionValueSchema.parse('center');  // Valid: keyword
 * ```
 */
export const PositionValueSchema = z.union([
	z.number(),
	z.string().refine(
		(val) => {
			// Keywords
			if (['center', 'half', 'left', 'right', 'top', 'bottom'].includes(val)) {
				return true;
			}
			// Percentage: '50%'
			if (/^\d+(\.\d+)?%$/.test(val)) {
				return true;
			}
			// Expression: '50%-5', '100%+10', '50-5', '100+10'
			if (/^(\d+(\.\d+)?%?)([-+]\d+(\.\d+)?)?$/.test(val)) {
				return true;
			}
			return false;
		},
		{
			message:
				'Position must be a number, percentage (e.g. "50%"), expression (e.g. "50%-5"), or keyword (center, half)',
		},
	),
]);

/**
 * Position keywords and their meanings.
 */
const POSITION_KEYWORDS: Record<string, 'center' | 'half' | 'start' | 'end'> = {
	center: 'center',
	half: 'half',
	left: 'start',
	right: 'end',
	top: 'start',
	bottom: 'end',
};

/**
 * Parses a position expression string into its components.
 *
 * @param value - Expression string to parse
 * @returns Parsed expression or null if invalid
 */
function parseExpression(value: string): ParsedExpression | null {
	// Match pattern: base[%][+/-offset]
	const match = value.match(/^(\d+(?:\.\d+)?)(%?)(([+-])(\d+(?:\.\d+)?))?$/);
	if (!match) {
		return null;
	}

	const base = Number.parseFloat(match[1] as string);
	const isPercent = match[2] === '%';
	let offset = 0;

	if (match[3]) {
		const operator = match[4] as ExpressionOperator;
		const offsetValue = Number.parseFloat(match[5] as string);
		offset = operator === '-' ? -offsetValue : offsetValue;
	}

	return { base, isPercent, offset };
}

/**
 * Resolves a position value to an absolute coordinate.
 *
 * Supports:
 * - Numbers: returned as-is
 * - Percentages: '50%' → parentSize * 0.5
 * - Expressions: '50%-5' → (parentSize * 0.5) - 5
 * - Keywords:
 *   - 'center': (parentSize - elementSize) / 2
 *   - 'half': parentSize / 2
 *   - 'left'/'top': 0
 *   - 'right'/'bottom': parentSize - elementSize
 *
 * @param value - Position value to resolve
 * @param parentSize - Size of the parent container
 * @param elementSize - Size of the element (for centering)
 * @returns Resolved absolute position
 *
 * @example
 * ```typescript
 * import { parsePosition } from 'blecsd';
 *
 * // Absolute position
 * parsePosition(10, 100, 20); // 10
 *
 * // Percentage
 * parsePosition('50%', 100, 20); // 50
 *
 * // Expression
 * parsePosition('50%-5', 100, 20); // 45
 * parsePosition('100%-10', 100, 20); // 90
 *
 * // Keywords
 * parsePosition('center', 100, 20); // 40 ((100-20)/2)
 * parsePosition('half', 100, 20); // 50 (100/2)
 * parsePosition('right', 100, 20); // 80 (100-20)
 * ```
 */
export function parsePosition(value: PositionValue, parentSize: number, elementSize = 0): number {
	// Direct number (floor to get discrete cell position)
	// Use (x || 0) to normalize -0 to 0
	if (typeof value === 'number') {
		return Math.floor(value) || 0;
	}

	// Keyword
	const keyword = POSITION_KEYWORDS[value];
	if (keyword) {
		switch (keyword) {
			case 'center':
				return Math.floor((parentSize - elementSize) / 2);
			case 'half':
				return Math.floor(parentSize / 2);
			case 'start':
				return 0;
			case 'end':
				return parentSize - elementSize;
		}
	}

	// Parse expression
	const expr = parseExpression(value);
	if (!expr) {
		// Fall back to 0 for invalid values
		return 0;
	}

	// Calculate base value
	let result: number;
	if (expr.isPercent) {
		result = (expr.base / 100) * parentSize;
	} else {
		result = expr.base;
	}

	// Apply offset
	result += expr.offset;

	return Math.floor(result);
}

/**
 * Resolves a position value that may be negative (from right/bottom edge).
 * Negative values are converted to offsets from the opposite edge.
 *
 * @param value - Position value to resolve
 * @param parentSize - Size of the parent container
 * @param elementSize - Size of the element
 * @returns Resolved absolute position
 *
 * @example
 * ```typescript
 * import { parsePositionWithNegative } from 'blecsd';
 *
 * // Positive values work normally
 * parsePositionWithNegative(10, 100, 20); // 10
 *
 * // Negative values are from the right/bottom
 * parsePositionWithNegative(-10, 100, 20); // 70 (100 - 10 - 20)
 * parsePositionWithNegative(-5, 100, 10); // 85 (100 - 5 - 10)
 * ```
 */
export function parsePositionWithNegative(
	value: PositionValue,
	parentSize: number,
	elementSize = 0,
): number {
	// Handle negative numbers
	if (typeof value === 'number' && value < 0) {
		return parentSize + value - elementSize;
	}

	// Handle negative expressions like '-10' (string starting with -)
	if (typeof value === 'string' && value.startsWith('-')) {
		const numMatch = value.match(/^-(\d+(?:\.\d+)?)$/);
		if (numMatch) {
			const offset = Number.parseFloat(numMatch[1] as string);
			return parentSize - offset - elementSize;
		}
	}

	return parsePosition(value, parentSize, elementSize);
}

/**
 * Validates that a position value is within valid bounds.
 *
 * @param value - Resolved position value
 * @param parentSize - Size of the parent container
 * @param elementSize - Size of the element
 * @returns Clamped position value within bounds
 *
 * @example
 * ```typescript
 * import { clampPosition } from 'blecsd';
 *
 * clampPosition(-10, 100, 20); // 0 (can't be negative)
 * clampPosition(90, 100, 20); // 80 (element must fit)
 * clampPosition(50, 100, 20); // 50 (within bounds)
 * ```
 */
export function clampPosition(value: number, parentSize: number, elementSize = 0): number {
	const maxPosition = parentSize - elementSize;
	if (value < 0) {
		return 0;
	}
	if (value > maxPosition) {
		return Math.max(0, maxPosition);
	}
	return value;
}

/**
 * Checks if a position value is a percentage or expression containing a percentage.
 *
 * @param value - Position value to check
 * @returns true if the value contains a percentage
 *
 * @example
 * ```typescript
 * import { isPercentagePosition } from 'blecsd';
 *
 * isPercentagePosition('50%'); // true
 * isPercentagePosition('50%-5'); // true
 * isPercentagePosition(50); // false
 * isPercentagePosition('center'); // false
 * ```
 */
export function isPercentagePosition(value: PositionValue): boolean {
	if (typeof value === 'number') {
		return false;
	}
	return value.includes('%');
}

/**
 * Checks if a position value is a keyword.
 *
 * @param value - Position value to check
 * @returns true if the value is a position keyword
 *
 * @example
 * ```typescript
 * import { isKeywordPosition } from 'blecsd';
 *
 * isKeywordPosition('center'); // true
 * isKeywordPosition('half'); // true
 * isKeywordPosition('50%'); // false
 * isKeywordPosition(50); // false
 * ```
 */
export function isKeywordPosition(value: PositionValue): boolean {
	if (typeof value === 'number') {
		return false;
	}
	return value in POSITION_KEYWORDS;
}

/**
 * Creates a position value that centers an element.
 *
 * @returns 'center' keyword
 *
 * @example
 * ```typescript
 * import { centerPosition, parsePosition } from 'blecsd';
 *
 * const pos = centerPosition();
 * const resolved = parsePosition(pos, 100, 20); // 40
 * ```
 */
export function centerPosition(): 'center' {
	return 'center';
}

/**
 * Creates a percentage position value.
 *
 * @param percent - Percentage value (0-100)
 * @returns Percentage string
 *
 * @example
 * ```typescript
 * import { percentPosition, parsePosition } from 'blecsd';
 *
 * const pos = percentPosition(50);
 * const resolved = parsePosition(pos, 100, 0); // 50
 * ```
 */
export function percentPosition(percent: number): string {
	return `${percent}%`;
}

/**
 * Creates a percentage position with an offset.
 *
 * @param percent - Percentage value (0-100)
 * @param offset - Offset to add (negative to subtract)
 * @returns Expression string
 *
 * @example
 * ```typescript
 * import { percentOffsetPosition, parsePosition } from 'blecsd';
 *
 * const pos = percentOffsetPosition(50, -5);
 * const resolved = parsePosition(pos, 100, 0); // 45
 *
 * const pos2 = percentOffsetPosition(100, -10);
 * const resolved2 = parsePosition(pos2, 100, 0); // 90
 * ```
 */
export function percentOffsetPosition(percent: number, offset: number): string {
	if (offset >= 0) {
		return `${percent}%+${offset}`;
	}
	return `${percent}%${offset}`;
}

/**
 * Resolves both X and Y position values at once.
 *
 * @param x - X position value
 * @param y - Y position value
 * @param parentWidth - Parent container width
 * @param parentHeight - Parent container height
 * @param elementWidth - Element width (for centering)
 * @param elementHeight - Element height (for centering)
 * @returns Resolved { x, y } coordinates
 *
 * @example
 * ```typescript
 * import { resolvePosition } from 'blecsd';
 *
 * const pos = resolvePosition('center', 'center', 100, 80, 20, 10);
 * // pos = { x: 40, y: 35 }
 *
 * const pos2 = resolvePosition('50%-5', '100%-10', 100, 80, 0, 0);
 * // pos2 = { x: 45, y: 70 }
 * ```
 */
export function resolvePosition(
	x: PositionValue,
	y: PositionValue,
	parentWidth: number,
	parentHeight: number,
	elementWidth = 0,
	elementHeight = 0,
): { x: number; y: number } {
	return {
		x: parsePosition(x, parentWidth, elementWidth),
		y: parsePosition(y, parentHeight, elementHeight),
	};
}

/**
 * Resolves position values and clamps them to valid bounds.
 *
 * @param x - X position value
 * @param y - Y position value
 * @param parentWidth - Parent container width
 * @param parentHeight - Parent container height
 * @param elementWidth - Element width
 * @param elementHeight - Element height
 * @returns Resolved and clamped { x, y } coordinates
 *
 * @example
 * ```typescript
 * import { resolvePositionClamped } from 'blecsd';
 *
 * // Position that would go off-screen is clamped
 * const pos = resolvePositionClamped('100%', '100%', 100, 80, 20, 10);
 * // pos = { x: 80, y: 70 } (clamped so element fits)
 * ```
 */
export function resolvePositionClamped(
	x: PositionValue,
	y: PositionValue,
	parentWidth: number,
	parentHeight: number,
	elementWidth = 0,
	elementHeight = 0,
): { x: number; y: number } {
	const resolved = resolvePosition(x, y, parentWidth, parentHeight, elementWidth, elementHeight);
	return {
		x: clampPosition(resolved.x, parentWidth, elementWidth),
		y: clampPosition(resolved.y, parentHeight, elementHeight),
	};
}
