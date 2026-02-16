/**
 * State management for Tool Use widget.
 * @module widgets/toolUse/state
 */

import type { Entity } from 'blecsd/core';
import { DEFAULT_CAPACITY } from './config';
import type { ToolCallEntry, ToolCallStatus, ToolUseState } from './types';

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
export interface ToolUseInternalState {
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
export const toolUseStateMap = new Map<Entity, ToolUseInternalState>();

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
export function createToolUseState(config?: Partial<{ height: number }>): ToolUseState {
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
