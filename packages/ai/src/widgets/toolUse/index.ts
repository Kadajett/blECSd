/**
 * Tool Use Widget
 *
 * A widget for visualizing AI agent tool calls as expandable cards with
 * status tracking. Displays tool calls with their parameters, results,
 * duration, and status indicators.
 *
 * @module widgets/toolUse
 */

import type { Entity, World } from 'blecsd/core';

// Re-export schema
export { ToolUseConfigSchema } from './config';
// Re-export factory
export { createToolUse } from './factory';
// Re-export helpers
export { formatToolCallDisplay } from './helpers';
// Re-export state management
export {
	addToolCall,
	createToolUseState,
	getToolCallDuration,
	getToolCallTimeline,
	resetToolUseStore,
	setToolCallError,
	ToolUse,
	toggleToolCallExpand,
	toolUseStateMap,
	updateToolCallStatus,
} from './state';
// Re-export types
export type {
	ToolCallEntry,
	ToolCallStatus,
	ToolUseConfig,
	ToolUseState,
	ToolUseWidget,
} from './types';

import { ToolUse } from './state';

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
