/**
 * Tool Use Widget
 *
 * A widget for visualizing AI agent tool calls as expandable cards with
 * status tracking. Displays tool calls with their parameters, results,
 * duration, and status indicators.
 *
 * @module widgets/toolUse
 */

import { z } from 'zod';
import { setContent } from '../components/content';
import { getDimensions, setDimensions } from '../components/dimensions';
import { setPosition } from '../components/position';
import { markDirty, setStyle } from '../components/renderable';
import { addEntity, removeEntity } from '../core/ecs';
import type { Entity, World } from '../core/types';
import { parseColor } from '../utils/color';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Status of a tool call.
 */
export type ToolCallStatus = 'pending' | 'running' | 'complete' | 'error';

/**
 * A single tool call entry.
 */
export interface ToolCallEntry {
	/** Unique identifier for this tool call */
	readonly id: string;
	/** Name of the tool being called */
	readonly toolName: string;
	/** Tool parameters */
	readonly parameters: Record<string, unknown>;
	/** Current status */
	readonly status: ToolCallStatus;
	/** Result data (if complete) */
	readonly result?: unknown;
	/** Error message (if error status) */
	readonly error?: string;
	/** Start timestamp (milliseconds) */
	readonly startTime: number;
	/** End timestamp (milliseconds, undefined if still running) */
	readonly endTime?: number;
	/** Whether this call is expanded to show details */
	readonly expanded: boolean;
}

/**
 * Internal state for the tool use widget.
 */
export interface ToolUseState {
	/** All tool calls */
	readonly calls: readonly ToolCallEntry[];
	/** Currently selected call index */
	readonly selectedIndex: number;
	/** Scroll offset for viewport */
	readonly scrollTop: number;
	/** Height of viewport in lines */
	readonly viewportHeight: number;
}

/**
 * Configuration for creating a ToolUse widget.
 */
export interface ToolUseConfig {
	/** X position (default: 0) */
	readonly x?: number;
	/** Y position (default: 0) */
	readonly y?: number;
	/** Width in characters (default: 40) */
	readonly width?: number;
	/** Height in lines (default: 10) */
	readonly height?: number;
	/** Show timeline view (default: true) */
	readonly showTimeline?: boolean;
	/** Show parameters in cards (default: true) */
	readonly showParameters?: boolean;
	/** Show duration in cards (default: true) */
	readonly showDuration?: boolean;
	/** Max visible calls before scrolling (default: 10) */
	readonly maxVisibleCalls?: number;
	/** Foreground color */
	readonly fg?: string | number;
	/** Background color */
	readonly bg?: string | number;
	/** Status-specific colors */
	readonly statusColors?: Partial<Record<ToolCallStatus, string | number>>;
}

/**
 * ToolUse widget interface providing chainable methods.
 */
export interface ToolUseWidget {
	/** The underlying entity ID */
	readonly eid: Entity;

	/** Adds a new tool call */
	addCall(id: string, toolName: string, parameters: Record<string, unknown>): ToolUseWidget;

	/** Updates the status of a tool call */
	updateStatus(id: string, status: ToolCallStatus, result?: unknown): ToolUseWidget;

	/** Sets an error for a tool call */
	setError(id: string, error: string): ToolUseWidget;

	/** Toggles expansion state of a tool call */
	toggleExpand(id: string): ToolUseWidget;

	/** Gets all calls sorted by start time */
	getTimeline(): readonly ToolCallEntry[];

	/** Gets the current state */
	getState(): ToolUseState;

	/** Scrolls to a specific call index */
	scrollTo(index: number): ToolUseWidget;

	/** Clears all tool calls */
	clear(): ToolUseWidget;

	/** Destroys the widget */
	destroy(): void;
}

// =============================================================================
// SCHEMA
// =============================================================================

/**
 * Zod schema for tool use widget configuration.
 */
export const ToolUseConfigSchema = z.object({
	x: z.number().int().default(0),
	y: z.number().int().default(0),
	width: z.number().int().positive().default(40),
	height: z.number().int().positive().default(10),
	showTimeline: z.boolean().default(true),
	showParameters: z.boolean().default(true),
	showDuration: z.boolean().default(true),
	maxVisibleCalls: z.number().int().positive().default(10),
	fg: z.union([z.string(), z.number()]).optional(),
	bg: z.union([z.string(), z.number()]).optional(),
	statusColors: z
		.object({
			pending: z.union([z.string(), z.number()]).optional(),
			running: z.union([z.string(), z.number()]).optional(),
			complete: z.union([z.string(), z.number()]).optional(),
			error: z.union([z.string(), z.number()]).optional(),
		})
		.optional(),
});

// =============================================================================
// COMPONENT TAG
// =============================================================================

/** Default entity capacity for typed arrays */
const DEFAULT_CAPACITY = 10000;

/**
 * ToolUse component marker.
 */
export const ToolUse = {
	/** Tag indicating this is a tool use widget (1 = yes) */
	isToolUse: new Uint8Array(DEFAULT_CAPACITY),
	/** Show timeline (1 = yes) */
	showTimeline: new Uint8Array(DEFAULT_CAPACITY),
	/** Show parameters (1 = yes) */
	showParameters: new Uint8Array(DEFAULT_CAPACITY),
	/** Show duration (1 = yes) */
	showDuration: new Uint8Array(DEFAULT_CAPACITY),
};

/**
 * ToolUse state stored outside ECS.
 */
interface ToolUseInternalState {
	/** Tool call entries (mutable for internal use) */
	calls: ToolCallEntry[];
	/** Selected index */
	selectedIndex: number;
	/** Scroll offset */
	scrollTop: number;
	/** Status colors */
	statusColors: Record<ToolCallStatus, number>;
}

/** Map of entity to tool use state */
const toolUseStateMap = new Map<Entity, ToolUseInternalState>();

// =============================================================================
// STATE FUNCTIONS
// =============================================================================

/**
 * Creates initial tool use state.
 *
 * @param config - Optional configuration
 * @returns Initial state
 *
 * @example
 * ```typescript
 * const state = createToolUseState({ viewportHeight: 10 });
 * ```
 */
export function createToolUseState(config?: Partial<Pick<ToolUseConfig, 'height'>>): ToolUseState {
	return {
		calls: [],
		selectedIndex: 0,
		scrollTop: 0,
		viewportHeight: config?.height ?? 10,
	};
}

/**
 * Adds a new tool call to the state.
 *
 * @param state - Current state
 * @param id - Unique call identifier
 * @param toolName - Name of the tool
 * @param parameters - Tool parameters
 * @returns New state with added call
 *
 * @example
 * ```typescript
 * const newState = addToolCall(state, 'call-1', 'Read', { file_path: 'index.ts' });
 * ```
 */
export function addToolCall(
	state: ToolUseState,
	id: string,
	toolName: string,
	parameters: Record<string, unknown>,
): ToolUseState {
	const newCall: ToolCallEntry = {
		id,
		toolName,
		parameters,
		status: 'pending',
		startTime: Date.now(),
		expanded: false,
	};

	return {
		...state,
		calls: [...state.calls, newCall],
	};
}

/**
 * Updates the status of a tool call.
 *
 * @param state - Current state
 * @param id - Call identifier
 * @param status - New status
 * @param result - Optional result data
 * @returns New state with updated call
 *
 * @example
 * ```typescript
 * const newState = updateToolCallStatus(state, 'call-1', 'complete', { content: '...' });
 * ```
 */
export function updateToolCallStatus(
	state: ToolUseState,
	id: string,
	status: ToolCallStatus,
	result?: unknown,
): ToolUseState {
	const calls = state.calls.map((call) => {
		if (call.id !== id) return call;

		const updatedCall: ToolCallEntry = {
			...call,
			status,
		};

		if (result !== undefined) {
			(updatedCall as { result: unknown }).result = result;
		}

		if (status === 'complete' || status === 'error') {
			(updatedCall as { endTime: number }).endTime = Date.now();
		}

		return updatedCall;
	});

	return {
		...state,
		calls,
	};
}

/**
 * Sets an error on a tool call.
 *
 * @param state - Current state
 * @param id - Call identifier
 * @param error - Error message
 * @returns New state with error set
 *
 * @example
 * ```typescript
 * const newState = setToolCallError(state, 'call-1', 'File not found');
 * ```
 */
export function setToolCallError(state: ToolUseState, id: string, error: string): ToolUseState {
	const calls = state.calls.map((call) => {
		if (call.id !== id) return call;

		return {
			...call,
			status: 'error' as const,
			error,
			endTime: Date.now(),
		};
	});

	return {
		...state,
		calls,
	};
}

/**
 * Toggles the expanded state of a tool call.
 *
 * @param state - Current state
 * @param id - Call identifier
 * @returns New state with toggled expansion
 *
 * @example
 * ```typescript
 * const newState = toggleToolCallExpand(state, 'call-1');
 * ```
 */
export function toggleToolCallExpand(state: ToolUseState, id: string): ToolUseState {
	const calls = state.calls.map((call) => {
		if (call.id !== id) return call;

		return {
			...call,
			expanded: !call.expanded,
		};
	});

	return {
		...state,
		calls,
	};
}

/**
 * Gets the duration of a tool call in milliseconds.
 *
 * @param call - Tool call entry
 * @returns Duration in ms, or null if still running
 *
 * @example
 * ```typescript
 * const duration = getToolCallDuration(call);
 * if (duration !== null) {
 *   console.log(`Took ${duration}ms`);
 * }
 * ```
 */
export function getToolCallDuration(call: ToolCallEntry): number | null {
	if (call.endTime === undefined) return null;
	return call.endTime - call.startTime;
}

/**
 * Gets tool calls sorted by start time (timeline view).
 *
 * @param state - Current state
 * @returns Calls sorted by start time (oldest first)
 *
 * @example
 * ```typescript
 * const timeline = getToolCallTimeline(state);
 * ```
 */
export function getToolCallTimeline(state: ToolUseState): readonly ToolCallEntry[] {
	return [...state.calls].sort((a, b) => a.startTime - b.startTime);
}

// =============================================================================
// RENDERING
// =============================================================================

/** Gets status indicator character */
function getStatusIndicator(status: ToolCallStatus): string {
	switch (status) {
		case 'pending':
			return '○';
		case 'running':
			return '◉';
		case 'complete':
			return '●';
		case 'error':
			return '×';
	}
}

/** Formats duration for display */
function formatDuration(durationMs: number | null): string {
	if (durationMs === null) return '';
	if (durationMs < 1000) return `${durationMs}ms`;
	return `${(durationMs / 1000).toFixed(1)}s`;
}

/** Truncates text to fit width */
function truncate(text: string, width: number): string {
	if (text.length <= width) return text;
	return `${text.slice(0, width - 1)}…`;
}

/** Formats a single parameter line */
function formatParameter(key: string, value: unknown, width: number): string {
	const valueStr = typeof value === 'string' ? `"${value}"` : JSON.stringify(value);
	const line = `${key}: ${valueStr}`;
	return truncate(line, width - 4);
}

/** Renders a tool call card */
function renderToolCallCard(
	call: ToolCallEntry,
	width: number,
	showParameters: boolean,
	showDuration: boolean,
): string[] {
	const lines: string[] = [];
	const contentWidth = width - 4;

	// Status indicator and tool name
	const indicator = getStatusIndicator(call.status);
	const duration = getToolCallDuration(call);
	const durationText = showDuration && duration !== null ? formatDuration(duration) : '';

	const headerLeft = `${indicator} ${call.toolName} [${call.status}]`;
	const headerRight = durationText;
	const padding = Math.max(0, contentWidth - headerLeft.length - headerRight.length);
	const header = `${headerLeft}${' '.repeat(padding)}${headerRight}`;

	lines.push(`┌─ ${truncate(header, contentWidth)} ─┐`);

	// Parameters
	if (showParameters && Object.keys(call.parameters).length > 0) {
		for (const [key, value] of Object.entries(call.parameters)) {
			const paramLine = formatParameter(key, value, width);
			lines.push(`│ ${paramLine.padEnd(contentWidth, ' ')} │`);
		}
		lines.push(`│ ${'─'.repeat(contentWidth)} │`);
	}

	// Result or error
	if (call.status === 'error' && call.error) {
		const errorText = truncate(`Error: ${call.error}`, contentWidth);
		lines.push(`│ ${errorText.padEnd(contentWidth, ' ')} │`);
	} else if (call.status === 'complete') {
		const resultText = call.expanded
			? truncate(JSON.stringify(call.result, null, 2), contentWidth)
			: '(collapsed, click to expand)';
		lines.push(`│ ${resultText.padEnd(contentWidth, ' ')} │`);
	}

	lines.push(`└─${'─'.repeat(contentWidth)}─┘`);

	return lines;
}

/**
 * Formats tool call state for display.
 *
 * @param state - Current state
 * @param config - Display configuration
 * @returns Array of display lines
 *
 * @example
 * ```typescript
 * const lines = formatToolCallDisplay(state, { width: 40, showParameters: true });
 * ```
 */
export function formatToolCallDisplay(
	state: ToolUseState,
	config: Pick<ToolUseConfig, 'width' | 'showParameters' | 'showDuration'>,
): string[] {
	const width = config.width ?? 40;
	const showParameters = config.showParameters ?? true;
	const showDuration = config.showDuration ?? true;

	const lines: string[] = [];

	for (const call of state.calls) {
		const cardLines = renderToolCallCard(call, width, showParameters, showDuration);
		lines.push(...cardLines);
		lines.push(''); // Blank line between cards
	}

	// Remove trailing blank line
	if (lines.length > 0 && lines[lines.length - 1] === '') {
		lines.pop();
	}

	return lines;
}

/**
 * Updates the tool use widget content.
 * @internal
 */
function updateToolUseContent(world: World, eid: Entity): void {
	const state = toolUseStateMap.get(eid);
	if (!state) return;

	const dims = getDimensions(world, eid);
	if (!dims) return;

	const showParameters = ToolUse.showParameters[eid] === 1;
	const showDuration = ToolUse.showDuration[eid] === 1;

	const publicState: ToolUseState = {
		calls: state.calls,
		selectedIndex: state.selectedIndex,
		scrollTop: state.scrollTop,
		viewportHeight: dims.height,
	};

	const lines = formatToolCallDisplay(publicState, {
		width: dims.width,
		showParameters,
		showDuration,
	});

	const content = lines.join('\n');
	setContent(world, eid, content);
	markDirty(world, eid);
}

// =============================================================================
// FACTORY HELPERS
// =============================================================================

/** Parses status colors from config */
function parseStatusColors(
	config:
		| {
				readonly pending: string | number | undefined;
				readonly running: string | number | undefined;
				readonly complete: string | number | undefined;
				readonly error: string | number | undefined;
		  }
		| undefined,
): Record<ToolCallStatus, number> {
	const defaultColors: Record<ToolCallStatus, number> = {
		pending: parseColor('#ffeb3b'), // Yellow
		running: parseColor('#2196f3'), // Blue
		complete: parseColor('#4caf50'), // Green
		error: parseColor('#f44336'), // Red
	};

	if (!config) return defaultColors;

	return {
		pending:
			config.pending !== undefined ? parseColor(config.pending) : defaultColors.pending,
		running:
			config.running !== undefined ? parseColor(config.running) : defaultColors.running,
		complete:
			config.complete !== undefined ? parseColor(config.complete) : defaultColors.complete,
		error: config.error !== undefined ? parseColor(config.error) : defaultColors.error,
	};
}

/** Creates widget methods for a ToolUse entity */
function createToolUseWidgetMethods(world: World, eid: Entity): ToolUseWidget {
	const widget: ToolUseWidget = {
		eid,

		addCall(id: string, toolName: string, parameters: Record<string, unknown>): ToolUseWidget {
			const state = toolUseStateMap.get(eid);
			if (state) {
				const newCall: ToolCallEntry = {
					id,
					toolName,
					parameters,
					status: 'pending',
					startTime: Date.now(),
					expanded: false,
				};
				state.calls.push(newCall);
				updateToolUseContent(world, eid);
			}
			return widget;
		},

		updateStatus(id: string, status: ToolCallStatus, result?: unknown): ToolUseWidget {
			const state = toolUseStateMap.get(eid);
			if (state) {
				const call = state.calls.find((c) => c.id === id);
				if (call) {
					(call as { status: ToolCallStatus }).status = status;
					if (result !== undefined) {
						(call as { result?: unknown }).result = result;
					}
					if (status === 'complete' || status === 'error') {
						(call as { endTime?: number }).endTime = Date.now();
					}
					updateToolUseContent(world, eid);
				}
			}
			return widget;
		},

		setError(id: string, error: string): ToolUseWidget {
			const state = toolUseStateMap.get(eid);
			if (state) {
				const call = state.calls.find((c) => c.id === id);
				if (call) {
					(call as { status: ToolCallStatus }).status = 'error';
					(call as { error?: string }).error = error;
					(call as { endTime?: number }).endTime = Date.now();
					updateToolUseContent(world, eid);
				}
			}
			return widget;
		},

		toggleExpand(id: string): ToolUseWidget {
			const state = toolUseStateMap.get(eid);
			if (state) {
				const call = state.calls.find((c) => c.id === id);
				if (call) {
					(call as { expanded: boolean }).expanded = !call.expanded;
					updateToolUseContent(world, eid);
				}
			}
			return widget;
		},

		getTimeline(): readonly ToolCallEntry[] {
			const state = toolUseStateMap.get(eid);
			if (!state) return [];
			return getToolCallTimeline({
				calls: state.calls,
				selectedIndex: 0,
				scrollTop: 0,
				viewportHeight: 0,
			});
		},

		getState(): ToolUseState {
			const state = toolUseStateMap.get(eid);
			const dims = getDimensions(world, eid);
			if (!state || !dims) {
				return createToolUseState(dims?.height !== undefined ? { height: dims.height } : undefined);
			}
			return {
				calls: state.calls,
				selectedIndex: state.selectedIndex,
				scrollTop: state.scrollTop,
				viewportHeight: dims.height,
			};
		},

		scrollTo(index: number): ToolUseWidget {
			const state = toolUseStateMap.get(eid);
			if (state) {
				state.scrollTop = Math.max(0, Math.min(index, state.calls.length - 1));
				updateToolUseContent(world, eid);
			}
			return widget;
		},

		clear(): ToolUseWidget {
			const state = toolUseStateMap.get(eid);
			if (state) {
				state.calls = [];
				state.selectedIndex = 0;
				state.scrollTop = 0;
				updateToolUseContent(world, eid);
			}
			return widget;
		},

		destroy(): void {
			ToolUse.isToolUse[eid] = 0;
			ToolUse.showTimeline[eid] = 0;
			ToolUse.showParameters[eid] = 0;
			ToolUse.showDuration[eid] = 0;
			toolUseStateMap.delete(eid);
			removeEntity(world, eid);
		},
	};

	return widget;
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Creates a ToolUse widget with the given configuration.
 *
 * The ToolUse widget visualizes AI agent tool calls as expandable cards
 * with status tracking, parameters, results, and duration.
 *
 * @param world - The ECS world
 * @param config - Widget configuration
 * @returns The ToolUse widget instance
 *
 * @example
 * ```typescript
 * import { createWorld } from '../core/ecs';
 * import { createToolUse } from 'blecsd/widgets';
 *
 * const world = createWorld();
 *
 * const toolUse = createToolUse(world, {
 *   x: 0,
 *   y: 0,
 *   width: 50,
 *   height: 20,
 *   showParameters: true,
 *   showDuration: true,
 * });
 *
 * // Add a tool call
 * toolUse.addCall('call-1', 'Read', { file_path: '/src/index.ts' });
 *
 * // Update its status
 * toolUse.updateStatus('call-1', 'running');
 * toolUse.updateStatus('call-1', 'complete', { content: '...' });
 * ```
 */
export function createToolUse(world: World, config: ToolUseConfig = {}): ToolUseWidget {
	const validated = ToolUseConfigSchema.parse(config);
	const eid = addEntity(world);

	// Set position and dimensions
	setPosition(world, eid, validated.x, validated.y);
	setDimensions(world, eid, validated.width, validated.height);

	// Set component flags
	ToolUse.isToolUse[eid] = 1;
	ToolUse.showTimeline[eid] = validated.showTimeline ? 1 : 0;
	ToolUse.showParameters[eid] = validated.showParameters ? 1 : 0;
	ToolUse.showDuration[eid] = validated.showDuration ? 1 : 0;

	// Initialize state
	const statusColors = parseStatusColors(
		validated.statusColors
			? {
					pending: validated.statusColors.pending,
					running: validated.statusColors.running,
					complete: validated.statusColors.complete,
					error: validated.statusColors.error,
				}
			: undefined,
	);
	toolUseStateMap.set(eid, {
		calls: [],
		selectedIndex: 0,
		scrollTop: 0,
		statusColors,
	});

	// Set style
	if (validated.fg !== undefined || validated.bg !== undefined) {
		setStyle(world, eid, {
			fg: validated.fg !== undefined ? parseColor(validated.fg) : undefined,
			bg: validated.bg !== undefined ? parseColor(validated.bg) : undefined,
		});
	}

	// Initial render
	updateToolUseContent(world, eid);

	// Create and return widget methods
	return createToolUseWidgetMethods(world, eid);
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Checks if an entity is a tool use widget.
 *
 * @param _world - The ECS world (unused, for API consistency)
 * @param eid - The entity ID
 * @returns true if the entity is a tool use widget
 */
export function isToolUse(_world: World, eid: Entity): boolean {
	return ToolUse.isToolUse[eid] === 1;
}

/**
 * Resets the ToolUse component store. Useful for testing.
 * @internal
 */
export function resetToolUseStore(): void {
	ToolUse.isToolUse.fill(0);
	ToolUse.showTimeline.fill(0);
	ToolUse.showParameters.fill(0);
	ToolUse.showDuration.fill(0);
	toolUseStateMap.clear();
}
