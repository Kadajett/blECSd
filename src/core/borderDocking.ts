/**
 * Border Docking System
 *
 * Automatically detects adjacent borders between elements and replaces
 * corner and edge characters with appropriate junction characters
 * (T-junctions, crosses) for a cleaner appearance.
 *
 * @module core/borderDocking
 *
 * @example
 * ```typescript
 * import {
 *   createBorderDockingContext,
 *   detectJunctions,
 *   applyJunctions,
 *   JUNCTION_SINGLE,
 * } from 'blecsd';
 *
 * // Create docking context for the screen
 * const ctx = createBorderDockingContext(80, 24);
 *
 * // Register border positions for all elements
 * for (const entity of entities) {
 *   registerBorderForDocking(ctx, entity, x, y, width, height, borderData);
 * }
 *
 * // Detect and apply junctions
 * const junctions = detectJunctions(ctx);
 * applyJunctions(buffer, junctions);
 * ```
 */

// =============================================================================
// JUNCTION CHARACTER SETS
// =============================================================================

/**
 * Junction characters for a border style.
 */
export interface JunctionCharset {
	/** T-junction pointing right (├) */
	readonly teeRight: number;
	/** T-junction pointing left (┤) */
	readonly teeLeft: number;
	/** T-junction pointing down (┬) */
	readonly teeDown: number;
	/** T-junction pointing up (┴) */
	readonly teeUp: number;
	/** Cross junction (┼) */
	readonly cross: number;
	/** Horizontal line (─) */
	readonly horizontal: number;
	/** Vertical line (│) */
	readonly vertical: number;
}

/**
 * Single line junction characters.
 */
export const JUNCTION_SINGLE: JunctionCharset = {
	teeRight: 0x251c, // ├
	teeLeft: 0x2524, // ┤
	teeDown: 0x252c, // ┬
	teeUp: 0x2534, // ┴
	cross: 0x253c, // ┼
	horizontal: 0x2500, // ─
	vertical: 0x2502, // │
};

/**
 * Double line junction characters.
 */
export const JUNCTION_DOUBLE: JunctionCharset = {
	teeRight: 0x2560, // ╠
	teeLeft: 0x2563, // ╣
	teeDown: 0x2566, // ╦
	teeUp: 0x2569, // ╩
	cross: 0x256c, // ╬
	horizontal: 0x2550, // ═
	vertical: 0x2551, // ║
};

/**
 * Bold/thick line junction characters.
 */
export const JUNCTION_BOLD: JunctionCharset = {
	teeRight: 0x2523, // ┣
	teeLeft: 0x252b, // ┫
	teeDown: 0x2533, // ┳
	teeUp: 0x253b, // ┻
	cross: 0x254b, // ╋
	horizontal: 0x2501, // ━
	vertical: 0x2503, // ┃
};

/**
 * ASCII junction characters.
 */
export const JUNCTION_ASCII: JunctionCharset = {
	teeRight: 0x2b, // +
	teeLeft: 0x2b, // +
	teeDown: 0x2b, // +
	teeUp: 0x2b, // +
	cross: 0x2b, // +
	horizontal: 0x2d, // -
	vertical: 0x7c, // |
};

// =============================================================================
// TYPES
// =============================================================================

/**
 * Direction flags for border connections.
 */
export interface ConnectionFlags {
	/** Connected to the left */
	readonly left: boolean;
	/** Connected above */
	readonly top: boolean;
	/** Connected to the right */
	readonly right: boolean;
	/** Connected below */
	readonly bottom: boolean;
}

/**
 * A detected junction point.
 */
export interface Junction {
	/** X position on screen */
	readonly x: number;
	/** Y position on screen */
	readonly y: number;
	/** The junction character to use (Unicode codepoint) */
	readonly char: number;
	/** Foreground color */
	readonly fg: number;
	/** Background color */
	readonly bg: number;
}

/**
 * A registered border edge.
 */
export interface BorderEdge {
	/** X position */
	readonly x: number;
	/** Y position */
	readonly y: number;
	/** Edge type: 'h' for horizontal, 'v' for vertical, 'c' for corner */
	readonly type: 'h' | 'v' | 'c';
	/** Original character */
	readonly char: number;
	/** Foreground color */
	readonly fg: number;
	/** Background color */
	readonly bg: number;
	/** Border style (for matching junctions) */
	readonly style: BorderStyleType;
}

/**
 * Border style type for junction matching.
 */
export type BorderStyleType = 'single' | 'double' | 'bold' | 'ascii' | 'unknown';

/**
 * Border docking context.
 */
export interface BorderDockingContext {
	/** Screen width */
	readonly width: number;
	/** Screen height */
	readonly height: number;
	/** Map of position key to border edges */
	readonly edges: Map<string, BorderEdge[]>;
	/** Whether docking is enabled */
	enabled: boolean;
}

/**
 * Options for border docking.
 */
export interface BorderDockingOptions {
	/** Enable docking (default: true) */
	readonly enabled?: boolean;
}

// =============================================================================
// CONTEXT MANAGEMENT
// =============================================================================

/**
 * Creates a border docking context.
 *
 * @param width - Screen width
 * @param height - Screen height
 * @param options - Docking options
 * @returns A new BorderDockingContext
 *
 * @example
 * ```typescript
 * import { createBorderDockingContext } from 'blecsd';
 *
 * const ctx = createBorderDockingContext(80, 24);
 * ```
 */
export function createBorderDockingContext(
	width: number,
	height: number,
	options: BorderDockingOptions = {},
): BorderDockingContext {
	return {
		width,
		height,
		edges: new Map(),
		enabled: options.enabled ?? true,
	};
}

/**
 * Clears all registered edges from the context.
 *
 * @param ctx - The docking context
 */
export function clearDockingContext(ctx: BorderDockingContext): void {
	ctx.edges.clear();
}

/**
 * Resizes the docking context.
 *
 * @param ctx - The docking context
 * @param width - New width
 * @param height - New height
 * @returns Updated context
 */
export function resizeDockingContext(
	ctx: BorderDockingContext,
	width: number,
	height: number,
): BorderDockingContext {
	return {
		...ctx,
		width,
		height,
	};
}

// =============================================================================
// POSITION UTILITIES
// =============================================================================

/**
 * Creates a position key for the edges map.
 */
function posKey(x: number, y: number): string {
	return `${x},${y}`;
}

/**
 * Parses a position key.
 */
function parseKey(key: string): { x: number; y: number } {
	const [xStr, yStr] = key.split(',');
	return { x: Number.parseInt(xStr ?? '0', 10), y: Number.parseInt(yStr ?? '0', 10) };
}

// =============================================================================
// STYLE DETECTION
// =============================================================================

/**
 * Detects the border style from a character codepoint.
 *
 * @param char - Unicode codepoint
 * @returns Detected border style
 */
export function detectBorderStyle(char: number): BorderStyleType {
	// Single line characters
	if (
		char === 0x2500 || // ─
		char === 0x2502 || // │
		char === 0x250c || // ┌
		char === 0x2510 || // ┐
		char === 0x2514 || // └
		char === 0x2518 || // ┘
		char === 0x251c || // ├
		char === 0x2524 || // ┤
		char === 0x252c || // ┬
		char === 0x2534 || // ┴
		char === 0x253c // ┼
	) {
		return 'single';
	}

	// Double line characters
	if (
		char === 0x2550 || // ═
		char === 0x2551 || // ║
		char === 0x2554 || // ╔
		char === 0x2557 || // ╗
		char === 0x255a || // ╚
		char === 0x255d || // ╝
		char === 0x2560 || // ╠
		char === 0x2563 || // ╣
		char === 0x2566 || // ╦
		char === 0x2569 || // ╩
		char === 0x256c // ╬
	) {
		return 'double';
	}

	// Bold line characters
	if (
		char === 0x2501 || // ━
		char === 0x2503 || // ┃
		char === 0x250f || // ┏
		char === 0x2513 || // ┓
		char === 0x2517 || // ┗
		char === 0x251b || // ┛
		char === 0x2523 || // ┣
		char === 0x252b || // ┫
		char === 0x2533 || // ┳
		char === 0x253b || // ┻
		char === 0x254b // ╋
	) {
		return 'bold';
	}

	// ASCII characters
	if (char === 0x2d || char === 0x7c || char === 0x2b) {
		return 'ascii';
	}

	return 'unknown';
}

/**
 * Gets the junction charset for a border style.
 *
 * @param style - Border style type
 * @returns Junction charset
 */
export function getJunctionCharset(style: BorderStyleType): JunctionCharset {
	switch (style) {
		case 'single':
			return JUNCTION_SINGLE;
		case 'double':
			return JUNCTION_DOUBLE;
		case 'bold':
			return JUNCTION_BOLD;
		case 'ascii':
			return JUNCTION_ASCII;
		default:
			return JUNCTION_SINGLE;
	}
}

// =============================================================================
// EDGE REGISTRATION
// =============================================================================

/**
 * Registers a border edge at a position.
 *
 * @param ctx - The docking context
 * @param x - X position
 * @param y - Y position
 * @param type - Edge type ('h' for horizontal, 'v' for vertical, 'c' for corner)
 * @param char - The character codepoint
 * @param fg - Foreground color
 * @param bg - Background color
 *
 * @example
 * ```typescript
 * import { registerEdge } from 'blecsd';
 *
 * // Register a horizontal edge
 * registerEdge(ctx, 10, 5, 'h', 0x2500, 0xffffffff, 0x000000ff);
 * ```
 */
export function registerEdge(
	ctx: BorderDockingContext,
	x: number,
	y: number,
	type: 'h' | 'v' | 'c',
	char: number,
	fg: number,
	bg: number,
): void {
	const key = posKey(x, y);
	const edge: BorderEdge = {
		x,
		y,
		type,
		char,
		fg,
		bg,
		style: detectBorderStyle(char),
	};

	const existing = ctx.edges.get(key);
	if (existing) {
		existing.push(edge);
	} else {
		ctx.edges.set(key, [edge]);
	}
}

/**
 * Registers all edges for a rectangular border.
 *
 * @param ctx - The docking context
 * @param x - Left edge X
 * @param y - Top edge Y
 * @param width - Border width
 * @param height - Border height
 * @param horizontalChar - Horizontal edge character
 * @param verticalChar - Vertical edge character
 * @param fg - Foreground color
 * @param bg - Background color
 *
 * @example
 * ```typescript
 * import { registerRectBorder } from 'blecsd';
 *
 * registerRectBorder(ctx, 10, 5, 20, 10, 0x2500, 0x2502, 0xffffffff, 0x000000ff);
 * ```
 */
export function registerRectBorder(
	ctx: BorderDockingContext,
	x: number,
	y: number,
	width: number,
	height: number,
	horizontalChar: number,
	verticalChar: number,
	fg: number,
	bg: number,
): void {
	// Top edge
	for (let i = 1; i < width - 1; i++) {
		registerEdge(ctx, x + i, y, 'h', horizontalChar, fg, bg);
	}

	// Bottom edge
	for (let i = 1; i < width - 1; i++) {
		registerEdge(ctx, x + i, y + height - 1, 'h', horizontalChar, fg, bg);
	}

	// Left edge
	for (let j = 1; j < height - 1; j++) {
		registerEdge(ctx, x, y + j, 'v', verticalChar, fg, bg);
	}

	// Right edge
	for (let j = 1; j < height - 1; j++) {
		registerEdge(ctx, x + width - 1, y + j, 'v', verticalChar, fg, bg);
	}

	// Corners
	registerEdge(ctx, x, y, 'c', 0, fg, bg); // Top-left
	registerEdge(ctx, x + width - 1, y, 'c', 0, fg, bg); // Top-right
	registerEdge(ctx, x, y + height - 1, 'c', 0, fg, bg); // Bottom-left
	registerEdge(ctx, x + width - 1, y + height - 1, 'c', 0, fg, bg); // Bottom-right
}

// =============================================================================
// JUNCTION DETECTION
// =============================================================================

/**
 * Gets connection flags for a position based on registered edges.
 *
 * @param ctx - The docking context
 * @param x - X position
 * @param y - Y position
 * @returns Connection flags
 */
export function getConnectionFlags(
	ctx: BorderDockingContext,
	x: number,
	y: number,
): ConnectionFlags {
	const leftEdges = ctx.edges.get(posKey(x - 1, y));
	const rightEdges = ctx.edges.get(posKey(x + 1, y));
	const topEdges = ctx.edges.get(posKey(x, y - 1));
	const bottomEdges = ctx.edges.get(posKey(x, y + 1));

	return {
		left: leftEdges?.some((e) => e.type === 'h' || e.type === 'c'),
		right: rightEdges?.some((e) => e.type === 'h' || e.type === 'c'),
		top: topEdges?.some((e) => e.type === 'v' || e.type === 'c'),
		bottom: bottomEdges?.some((e) => e.type === 'v' || e.type === 'c'),
	};
}

/**
 * Determines the junction character based on connection flags.
 *
 * @param connections - Connection flags
 * @param charset - Junction charset to use
 * @returns Junction character or null if no junction needed
 */
export function getJunctionChar(
	connections: ConnectionFlags,
	charset: JunctionCharset,
): number | null {
	const { left, top, right, bottom } = connections;
	const count = (left ? 1 : 0) + (top ? 1 : 0) + (right ? 1 : 0) + (bottom ? 1 : 0);

	// Need at least 3 connections for a junction
	if (count < 3) {
		return null;
	}

	// Cross (4 connections)
	if (left && top && right && bottom) {
		return charset.cross;
	}

	// T-junctions (3 connections)
	if (left && top && bottom) {
		return charset.teeLeft; // ┤
	}
	if (right && top && bottom) {
		return charset.teeRight; // ├
	}
	if (left && right && bottom) {
		return charset.teeDown; // ┬
	}
	if (left && right && top) {
		return charset.teeUp; // ┴
	}

	return null;
}

/**
 * Detects all junctions in the docking context.
 *
 * @param ctx - The docking context
 * @returns Array of detected junctions
 *
 * @example
 * ```typescript
 * import { detectJunctions } from 'blecsd';
 *
 * const junctions = detectJunctions(ctx);
 * for (const junction of junctions) {
 *   console.log(`Junction at (${junction.x}, ${junction.y}): ${String.fromCodePoint(junction.char)}`);
 * }
 * ```
 */
export function detectJunctions(ctx: BorderDockingContext): Junction[] {
	if (!ctx.enabled) {
		return [];
	}

	const junctions: Junction[] = [];
	const processed = new Set<string>();

	for (const [key, edges] of ctx.edges) {
		if (processed.has(key)) {
			continue;
		}
		processed.add(key);

		// Skip if only one edge at this position
		if (edges.length < 2) {
			continue;
		}

		const { x, y } = parseKey(key);
		const connections = getConnectionFlags(ctx, x, y);

		// Get the dominant style from the edges
		const edge = edges[0];
		if (!edge) continue;

		const charset = getJunctionCharset(edge.style);
		const junctionChar = getJunctionChar(connections, charset);

		if (junctionChar !== null) {
			junctions.push({
				x,
				y,
				char: junctionChar,
				fg: edge.fg,
				bg: edge.bg,
			});
		}
	}

	return junctions;
}

/**
 * Detects junctions at border intersections even with single edges.
 * This version checks actual cell positions for T-junctions and crosses.
 *
 * @param ctx - The docking context
 * @returns Array of detected junctions
 */
/** Extend connection flags based on edge types at position */
function extendConnectionFlags(
	connections: ConnectionFlags,
	edges: BorderEdge[],
): ConnectionFlags {
	const hasHorizontal = edges.some((e) => e.type === 'h');
	const hasVertical = edges.some((e) => e.type === 'v');
	return {
		left: connections.left || hasHorizontal,
		right: connections.right || hasHorizontal,
		top: connections.top || hasVertical,
		bottom: connections.bottom || hasVertical,
	};
}

/** Try to create a junction at the given position */
function tryCreateJunction(
	edges: BorderEdge[],
	extendedConnections: ConnectionFlags,
	x: number,
	y: number,
): Junction | null {
	const hasCorner = edges.some((e) => e.type === 'c');
	if (!hasCorner || edges.length <= 1) return null;

	const edge = edges[0];
	if (!edge) return null;

	const charset = getJunctionCharset(edge.style);
	const junctionChar = getJunctionChar(extendedConnections, charset);
	if (junctionChar === null) return null;

	return { x, y, char: junctionChar, fg: edge.fg, bg: edge.bg };
}

export function detectAllJunctions(ctx: BorderDockingContext): Junction[] {
	if (!ctx.enabled) return [];

	const junctions: Junction[] = [];
	const processed = new Set<string>();

	for (const [key, edges] of ctx.edges) {
		if (processed.has(key)) continue;
		processed.add(key);

		const { x, y } = parseKey(key);
		const connections = getConnectionFlags(ctx, x, y);
		const extendedConnections = extendConnectionFlags(connections, edges);

		const junction = tryCreateJunction(edges, extendedConnections, x, y);
		if (junction) junctions.push(junction);
	}

	return junctions;
}

// =============================================================================
// JUNCTION APPLICATION
// =============================================================================

/**
 * Cell interface for applying junctions.
 */
export interface DockingCell {
	char: string;
	fg: number;
	bg: number;
}

/**
 * Buffer interface for applying junctions.
 */
export interface DockingBuffer {
	readonly width: number;
	readonly height: number;
	getCell(x: number, y: number): DockingCell | undefined;
	setCell(x: number, y: number, cell: DockingCell): void;
}

/**
 * Applies detected junctions to a buffer.
 *
 * @param buffer - The buffer to modify
 * @param junctions - Array of junctions to apply
 *
 * @example
 * ```typescript
 * import { applyJunctions } from 'blecsd';
 *
 * const junctions = detectJunctions(ctx);
 * applyJunctions(buffer, junctions);
 * ```
 */
export function applyJunctions(buffer: DockingBuffer, junctions: readonly Junction[]): void {
	for (const junction of junctions) {
		if (
			junction.x >= 0 &&
			junction.x < buffer.width &&
			junction.y >= 0 &&
			junction.y < buffer.height
		) {
			buffer.setCell(junction.x, junction.y, {
				char: String.fromCodePoint(junction.char),
				fg: junction.fg,
				bg: junction.bg,
			});
		}
	}
}

/**
 * Creates junction data for rendering.
 *
 * @param junctions - Array of junctions
 * @returns Array of {x, y, char, fg, bg} for rendering
 */
export function getJunctionRenderData(
	junctions: readonly Junction[],
): Array<{ x: number; y: number; char: string; fg: number; bg: number }> {
	return junctions.map((j) => ({
		x: j.x,
		y: j.y,
		char: String.fromCodePoint(j.char),
		fg: j.fg,
		bg: j.bg,
	}));
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Checks if a character is a border character.
 *
 * @param char - Unicode codepoint
 * @returns true if it's a border character
 */
export function isBorderChar(char: number): boolean {
	return detectBorderStyle(char) !== 'unknown';
}

/**
 * Checks if a character is a junction character.
 *
 * @param char - Unicode codepoint
 * @returns true if it's a junction character
 */
export function isJunctionChar(char: number): boolean {
	// T-junctions and crosses for single line
	if (char >= 0x251c && char <= 0x253c) return true;
	// T-junctions and crosses for double line
	if (char >= 0x2560 && char <= 0x256c) return true;
	// T-junctions and crosses for bold line
	if (char >= 0x2523 && char <= 0x254b) return true;
	// ASCII plus
	if (char === 0x2b) return true;

	return false;
}

/**
 * Gets the number of registered edge positions.
 *
 * @param ctx - The docking context
 * @returns Number of unique positions with edges
 */
export function getEdgeCount(ctx: BorderDockingContext): number {
	return ctx.edges.size;
}

/**
 * Gets all edges at a position.
 *
 * @param ctx - The docking context
 * @param x - X position
 * @param y - Y position
 * @returns Array of edges at the position, or empty array
 */
export function getEdgesAt(ctx: BorderDockingContext, x: number, y: number): readonly BorderEdge[] {
	return ctx.edges.get(posKey(x, y)) ?? [];
}
