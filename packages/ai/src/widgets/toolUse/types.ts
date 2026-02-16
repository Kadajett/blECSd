/**
 * Type definitions for Tool Use widget.
 * @module widgets/toolUse/types
 */

import type { Entity } from 'blecsd/core';

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
