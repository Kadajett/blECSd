/**
 * Snapshot testing utilities for visual regression testing.
 *
 * Provides helpers to render entities to strings and compare against
 * Vitest inline snapshots for visual regression detection.
 *
 * @module testing/snapshot
 *
 * @example
 * ```typescript
 * import { renderToString, renderEntityToString, createTestBuffer } from 'blecsd/testing';
 *
 * const { world, db } = createTestBuffer(40, 10);
 * const entity = addEntity(world);
 * setPosition(world, entity, 0, 0);
 * setDimensions(world, entity, 10, 3);
 * setStyle(world, entity, { bg: '#ff0000' });
 *
 * layoutSystem(world);
 * renderSystem(world);
 *
 * const text = renderToString(db);
 * expect(text).toMatchSnapshot();
 * ```
 */

import { setDimensions } from '../components/dimensions';
import { setPosition } from '../components/position';
import { setStyle } from '../components/renderable';
import { createDirtyTracker, type DirtyTracker } from '../core/dirtyTracking';
import { addEntity, createWorld } from '../core/ecs';
import { createScreenEntity } from '../core/entities';
import type { Entity, World } from '../core/types';
import { layoutSystem } from '../systems/layoutSystem';
import { clearRenderBuffer, renderSystem, setRenderBuffer } from '../systems/renderSystem';
import { createScreenBuffer, getCell, type ScreenBufferData } from '../terminal/screen/cell';
import type { Screenshot } from '../terminal/screen/screenshot';
import { captureRegion, captureScreen, screenshotToText } from '../terminal/screen/screenshot';

/**
 * Result from createTestBuffer — contains all objects needed for render testing.
 */
export interface TestBufferContext {
	/** The ECS world */
	readonly world: World;
	/** The dirty tracker for rendering */
	readonly tracker: DirtyTracker;
	/** The screen buffer for rendering */
	readonly buffer: ScreenBufferData;
	/** The screen entity ID */
	readonly screenEid: Entity;
}

/**
 * Creates a test buffer context with world, double buffer, and screen entity.
 *
 * Sets up all the infrastructure needed for snapshot testing:
 * a world, a screen entity, and a double buffer registered as the render target.
 *
 * @param width - Buffer width in columns
 * @param height - Buffer height in rows
 * @returns A TestBufferContext ready for rendering
 *
 * @example
 * ```typescript
 * import { createTestBuffer } from 'blecsd/testing';
 *
 * const { world, buffer } = createTestBuffer(40, 10);
 * ```
 */
export function createTestBuffer(width: number, height: number): TestBufferContext {
	const world = createWorld() as World;
	const screenEid = createScreenEntity(world, { width, height });
	const tracker = createDirtyTracker(width, height);
	const buffer = createScreenBuffer(width, height);
	setRenderBuffer(tracker, buffer);
	return { world, tracker, buffer, screenEid };
}

/**
 * Renders the current buffer state to a plain text string.
 *
 * Captures the buffer as a screenshot and converts it to text,
 * trimming trailing whitespace per line and trailing empty lines.
 *
 * @param buffer - The screen buffer to capture
 * @returns Plain text representation of the buffer
 *
 * @example
 * ```typescript
 * import { createTestBuffer, renderToString } from 'blecsd/testing';
 *
 * const { world, buffer } = createTestBuffer(40, 10);
 * // ... set up entities, run layout + render ...
 *
 * const text = renderToString(buffer);
 * expect(text).toMatchSnapshot();
 * ```
 */
export function renderToString(buffer: ScreenBufferData): string {
	const screenshot = captureScreen(buffer);
	const text = screenshotToText(screenshot);
	// Trim trailing empty lines
	const lines = text.split('\n');
	while (lines.length > 0 && lines[lines.length - 1]?.trim() === '') {
		lines.pop();
	}
	return lines.join('\n');
}

/**
 * Renders a specific region of the buffer to a plain text string.
 *
 * @param buffer - The screen buffer to capture
 * @param x - Left edge column
 * @param y - Top edge row
 * @param width - Width to capture
 * @param height - Height to capture
 * @returns Plain text representation of the region
 *
 * @example
 * ```typescript
 * import { createTestBuffer, renderRegionToString } from 'blecsd/testing';
 *
 * const { world, buffer } = createTestBuffer(80, 24);
 * // ... render ...
 *
 * const region = renderRegionToString(buffer, 10, 5, 20, 10);
 * expect(region).toMatchSnapshot();
 * ```
 */
export function renderRegionToString(
	buffer: ScreenBufferData,
	x: number,
	y: number,
	width: number,
	height: number,
): string {
	const screenshot = captureRegion(buffer, x, y, width, height);
	return screenshotToText(screenshot);
}

/**
 * Captures a Screenshot from the current buffer state.
 *
 * @param buffer - The screen buffer to capture
 * @returns A Screenshot object for comparison or serialization
 *
 * @example
 * ```typescript
 * import { createTestBuffer, captureTestScreen } from 'blecsd/testing';
 *
 * const { world, buffer } = createTestBuffer(40, 10);
 * // ... render ...
 *
 * const screenshot = captureTestScreen(buffer);
 * expect(screenshot.width).toBe(40);
 * ```
 */
export function captureTestScreen(buffer: ScreenBufferData): Screenshot {
	return captureScreen(buffer);
}

/**
 * Gets the text content of a specific row from the buffer.
 *
 * @param buffer - The screen buffer
 * @param row - Row index (0-based)
 * @returns The text content of the row, trimmed
 *
 * @example
 * ```typescript
 * const row = getRowText(buffer, 0);
 * expect(row).toBe('Hello World');
 * ```
 */
export function getRowText(buffer: ScreenBufferData, row: number): string {
	let text = '';
	for (let x = 0; x < buffer.width; x++) {
		const cell = getCell(buffer, x, row);
		text += cell?.char ?? ' ';
	}
	return text.trimEnd();
}

/**
 * Gets the foreground color of a cell in the buffer.
 *
 * @param buffer - The screen buffer
 * @param x - Column
 * @param y - Row
 * @returns The packed RGBA foreground color, or undefined if out of bounds
 */
export function getCellFg(buffer: ScreenBufferData, x: number, y: number): number | undefined {
	return getCell(buffer, x, y)?.fg;
}

/**
 * Gets the background color of a cell in the buffer.
 *
 * @param buffer - The screen buffer
 * @param x - Column
 * @param y - Row
 * @returns The packed RGBA background color, or undefined if out of bounds
 */
export function getCellBg(buffer: ScreenBufferData, x: number, y: number): number | undefined {
	return getCell(buffer, x, y)?.bg;
}

/**
 * Gets the character at a specific cell in the buffer.
 *
 * @param buffer - The screen buffer
 * @param x - Column
 * @param y - Row
 * @returns The character, or undefined if out of bounds
 */
export function getCellChar(buffer: ScreenBufferData, x: number, y: number): string | undefined {
	return getCell(buffer, x, y)?.char;
}

/**
 * Creates a simple entity with position, dimensions, and style, then runs layout + render.
 *
 * Convenience function for snapshot tests that need a single rendered entity.
 *
 * @param ctx - The test buffer context
 * @param x - X position
 * @param y - Y position
 * @param width - Width in cells
 * @param height - Height in cells
 * @param options - Optional style overrides
 * @returns The entity ID
 *
 * @example
 * ```typescript
 * const { world, db } = createTestBuffer(40, 10);
 * const eid = renderBox(ctx, 5, 2, 10, 3, { bg: '#ff0000' });
 * const text = renderToString(db);
 * ```
 */
export function renderBox(
	ctx: TestBufferContext,
	x: number,
	y: number,
	width: number,
	height: number,
	options?: { fg?: string; bg?: string },
): Entity {
	const entity = addEntity(ctx.world);
	setPosition(ctx.world, entity, x, y);
	setDimensions(ctx.world, entity, width, height);
	if (options) {
		setStyle(ctx.world, entity, options);
	}
	return entity;
}

/**
 * Runs layout and render systems on the world.
 *
 * @param world - The ECS world
 *
 * @example
 * ```typescript
 * const { world, db } = createTestBuffer(40, 10);
 * // ... add entities ...
 * runRender(world);
 * const text = renderToString(db);
 * ```
 */
export function runRender(world: World): void {
	layoutSystem(world);
	renderSystem(world);
}

/**
 * Cleans up the test render buffer.
 * Call this in afterEach() to avoid leaking state between tests.
 *
 * @example
 * ```typescript
 * afterEach(() => {
 *   cleanupTestBuffer();
 * });
 * ```
 */
export function cleanupTestBuffer(): void {
	clearRenderBuffer();
}

/**
 * Compares two rendered outputs and returns a visual diff report.
 *
 * Creates a character-by-character comparison showing differences between
 * expected and actual output. Useful for debugging snapshot failures.
 *
 * @param expected - The expected output string
 * @param actual - The actual output string
 * @returns A diff report showing line-by-line differences
 *
 * @example
 * ```typescript
 * import { compareSnapshots } from 'blecsd/testing';
 *
 * const expected = renderToString(expectedBuffer);
 * const actual = renderToString(actualBuffer);
 * const diff = compareSnapshots(expected, actual);
 *
 * if (diff.hasDifferences) {
 *   console.log(diff.report);
 * }
 * ```
 */
export function compareSnapshots(
	expected: string,
	actual: string,
): { hasDifferences: boolean; report: string; diffCount: number } {
	const expectedLines = expected.split('\n');
	const actualLines = actual.split('\n');
	const maxLines = Math.max(expectedLines.length, actualLines.length);

	let diffCount = 0;
	const reportLines: string[] = [];
	reportLines.push('Snapshot Comparison:');
	reportLines.push('');

	for (let i = 0; i < maxLines; i++) {
		const expLine = expectedLines[i] ?? '';
		const actLine = actualLines[i] ?? '';

		if (expLine === actLine) {
			reportLines.push(`  ${i + 1} | ${expLine}`);
		} else {
			diffCount++;
			reportLines.push(`- ${i + 1} | ${expLine}`);
			reportLines.push(`+ ${i + 1} | ${actLine}`);
		}
	}

	reportLines.push('');
	reportLines.push(`Total differences: ${diffCount} lines`);

	return {
		hasDifferences: diffCount > 0,
		report: reportLines.join('\n'),
		diffCount,
	};
}

/**
 * Compares a single cell for differences.
 * Helper to reduce cognitive complexity.
 */
function compareCells(
	expCell: { char: string; fg: number; bg: number },
	actCell: { char: string; fg: number; bg: number },
	x: number,
	y: number,
	differences: Array<{
		x: number;
		y: number;
		type: 'char' | 'fg' | 'bg';
		expected: string | number;
		actual: string | number;
	}>,
): void {
	if (expCell.char !== actCell.char) {
		differences.push({ x, y, type: 'char', expected: expCell.char, actual: actCell.char });
	}

	if (expCell.fg !== actCell.fg) {
		differences.push({ x, y, type: 'fg', expected: expCell.fg, actual: actCell.fg });
	}

	if (expCell.bg !== actCell.bg) {
		differences.push({ x, y, type: 'bg', expected: expCell.bg, actual: actCell.bg });
	}
}

/**
 * Compares two screenshots for visual differences.
 *
 * Performs pixel-by-pixel comparison of character, foreground, and background
 * values. Returns detailed information about differences.
 *
 * @param expected - The expected screenshot
 * @param actual - The actual screenshot
 * @returns Comparison result with difference details
 *
 * @example
 * ```typescript
 * import { compareScreenshots, captureTestScreen } from 'blecsd/testing';
 *
 * const expected = captureTestScreen(expectedBuffer);
 * const actual = captureTestScreen(actualBuffer);
 * const result = compareScreenshots(expected, actual);
 *
 * expect(result.pixelDifferences).toBe(0);
 * ```
 */
export function compareScreenshots(
	expected: Screenshot,
	actual: Screenshot,
): {
	isIdentical: boolean;
	pixelDifferences: number;
	dimensionMismatch: boolean;
	differences: Array<{
		x: number;
		y: number;
		type: 'char' | 'fg' | 'bg';
		expected: string | number;
		actual: string | number;
	}>;
} {
	const differences: Array<{
		x: number;
		y: number;
		type: 'char' | 'fg' | 'bg';
		expected: string | number;
		actual: string | number;
	}> = [];

	const dimensionMismatch = expected.width !== actual.width || expected.height !== actual.height;

	if (dimensionMismatch) {
		return {
			isIdentical: false,
			pixelDifferences: -1,
			dimensionMismatch: true,
			differences: [],
		};
	}

	for (let y = 0; y < expected.height; y++) {
		for (let x = 0; x < expected.width; x++) {
			const expCell = expected.cells[y]?.[x];
			const actCell = actual.cells[y]?.[x];

			if (expCell && actCell) {
				compareCells(expCell, actCell, x, y, differences);
			}
		}
	}

	return {
		isIdentical: differences.length === 0,
		pixelDifferences: differences.length,
		dimensionMismatch: false,
		differences,
	};
}

/**
 * Gets the diff character for a cell comparison.
 * Helper to reduce cognitive complexity.
 */
function getDiffChar(
	expCell: { char: string; fg: number; bg: number },
	actCell: { char: string; fg: number; bg: number },
): { char: string; hasDiff: boolean } {
	if (expCell.char !== actCell.char) {
		return { char: '!', hasDiff: true };
	}
	if (expCell.fg !== actCell.fg) {
		return { char: 'F', hasDiff: true };
	}
	if (expCell.bg !== actCell.bg) {
		return { char: 'B', hasDiff: true };
	}
	return { char: actCell.char, hasDiff: false };
}

/**
 * Creates a visual diff string showing character differences between buffers.
 *
 * Marks differences with color indicators: '!' for different chars, 'F' for
 * foreground differences, 'B' for background differences.
 *
 * @param expected - The expected screenshot
 * @param actual - The actual screenshot
 * @returns A visual representation of differences
 *
 * @example
 * ```typescript
 * import { createVisualDiff, captureTestScreen } from 'blecsd/testing';
 *
 * const expected = captureTestScreen(expectedBuffer);
 * const actual = captureTestScreen(actualBuffer);
 * const diff = createVisualDiff(expected, actual);
 * console.log(diff);
 * ```
 */
export function createVisualDiff(expected: Screenshot, actual: Screenshot): string {
	if (expected.width !== actual.width || expected.height !== actual.height) {
		return `Dimension mismatch: expected ${expected.width}x${expected.height}, got ${actual.width}x${actual.height}`;
	}

	const lines: string[] = [];
	lines.push('Visual Diff (! = char diff, F = fg diff, B = bg diff):');
	lines.push('');

	for (let y = 0; y < expected.height; y++) {
		let diffLine = '';
		let hasDiff = false;

		for (let x = 0; x < expected.width; x++) {
			const expCell = expected.cells[y]?.[x];
			const actCell = actual.cells[y]?.[x];

			if (!expCell || !actCell) {
				diffLine += ' ';
				continue;
			}

			const diff = getDiffChar(expCell, actCell);
			diffLine += diff.char;
			if (diff.hasDiff) {
				hasDiff = true;
			}
		}

		if (hasDiff) {
			lines.push(`${y.toString().padStart(3, ' ')} | ${diffLine}`);
		}
	}

	if (lines.length === 2) {
		lines.push('  (no differences)');
	}

	return lines.join('\n');
}

/**
 * Asserts that two rendered outputs match exactly.
 *
 * Throws an error with a detailed diff report if they don't match.
 * Useful for custom snapshot assertion logic.
 *
 * @param expected - The expected output
 * @param actual - The actual output
 * @param message - Optional custom error message
 *
 * @example
 * ```typescript
 * import { assertSnapshotMatch, renderToString } from 'blecsd/testing';
 *
 * const expected = renderToString(expectedBuffer);
 * const actual = renderToString(actualBuffer);
 *
 * assertSnapshotMatch(expected, actual, 'Box widget rendering');
 * ```
 */
export function assertSnapshotMatch(expected: string, actual: string, message?: string): void {
	if (expected === actual) {
		return;
	}

	const diff = compareSnapshots(expected, actual);
	const errorMessage = message
		? `${message}\n\n${diff.report}`
		: `Snapshot mismatch\n\n${diff.report}`;

	throw new Error(errorMessage);
}

/**
 * Normalizes rendered output for stable snapshot comparisons.
 *
 * Removes trailing whitespace from lines, removes trailing empty lines,
 * and normalizes line endings to LF.
 *
 * @param output - The raw output string
 * @returns Normalized output
 *
 * @example
 * ```typescript
 * import { normalizeSnapshot, renderToString } from 'blecsd/testing';
 *
 * const raw = renderToString(buffer);
 * const normalized = normalizeSnapshot(raw);
 * expect(normalized).toMatchSnapshot();
 * ```
 */
export function normalizeSnapshot(output: string): string {
	// Normalize line endings to LF
	const normalized = output.replace(/\r\n/g, '\n');

	// Trim trailing whitespace from each line
	const lines = normalized.split('\n').map((line) => line.trimEnd());

	// Remove trailing empty lines
	while (lines.length > 0 && lines[lines.length - 1] === '') {
		lines.pop();
	}

	return lines.join('\n');
}

/**
 * Creates a color-accurate representation for snapshot testing.
 *
 * Converts packed RGBA colors to hex strings for readable snapshots.
 * Returns a structured representation of the buffer with colors.
 *
 * @param buffer - The screen buffer
 * @returns A JSON-serializable object with color information
 *
 * @example
 * ```typescript
 * import { renderWithColors, createTestBuffer } from 'blecsd/testing';
 *
 * const { buffer } = createTestBuffer(20, 5);
 * // ... render ...
 * const colorSnapshot = renderWithColors(buffer);
 * expect(colorSnapshot).toMatchSnapshot();
 * ```
 */
export function renderWithColors(
	buffer: ScreenBufferData,
): Array<Array<{ char: string; fg: string; bg: string }>> {
	const rows: Array<Array<{ char: string; fg: string; bg: string }>> = [];

	for (let y = 0; y < buffer.height; y++) {
		const row: Array<{ char: string; fg: string; bg: string }> = [];

		for (let x = 0; x < buffer.width; x++) {
			const cell = getCell(buffer, x, y);

			if (!cell) {
				row.push({ char: ' ', fg: '#000000', bg: '#000000' });
				continue;
			}

			// Convert ARGB packed colors to hex strings
			const fgHex = `#${((cell.fg >>> 0) & 0xffffff).toString(16).padStart(6, '0')}`;
			const bgHex = `#${((cell.bg >>> 0) & 0xffffff).toString(16).padStart(6, '0')}`;

			row.push({
				char: cell.char,
				fg: fgHex,
				bg: bgHex,
			});
		}

		rows.push(row);
	}

	return rows;
}
