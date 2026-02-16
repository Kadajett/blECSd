/**
 * Factory function for creating Tool Use widgets.
 * @module widgets/toolUse/factory
 */

import {
	getDimensions,
	markDirty,
	setContent,
	setDimensions,
	setPosition,
	setStyle,
} from 'blecsd/components';
import type { World } from 'blecsd/core';
import { addEntity, removeEntity } from 'blecsd/core';
import { parseColor } from 'blecsd/utils';
import { ToolUseConfigSchema } from './config';
import { formatToolCallDisplay, parseStatusColors } from './helpers';
import {
	createToolUseState,
	getToolCallTimeline,
	ToolUse,
	type ToolUseInternalState,
	toolUseStateMap,
} from './state';
import type {
	ToolCallEntry,
	ToolCallStatus,
	ToolUseConfig,
	ToolUseState,
	ToolUseWidget,
} from './types';

/**
 * Updates the tool use widget content.
 * @internal
 */
function updateToolUseContent(world: World, eid: number): void {
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

/** Creates widget methods for a ToolUse entity */
function createToolUseWidgetMethods(world: World, eid: number): ToolUseWidget {
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
 * import { createWorld } from 'blecsd/core';
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
	const internalState: ToolUseInternalState = {
		calls: [],
		selectedIndex: 0,
		scrollTop: 0,
		statusColors,
	};
	toolUseStateMap.set(eid, internalState);

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
