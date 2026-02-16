/**
 * Tool use namespace for visualizing AI agent tool calls.
 *
 * @example
 * ```typescript
 * import { toolUse } from '@blecsd/ai';
 *
 * const tu = toolUse.createToolUse(world, { width: 80, height: 30 });
 * toolUse.addToolCall({ toolName: 'search', params: { query: 'AI' } });
 * toolUse.updateToolCallStatus(callId, 'running');
 * toolUse.setToolCallError(callId, 'Connection timeout');
 * const timeline = toolUse.getToolCallTimeline();
 * ```
 */

import {
	addToolCall,
	createToolUse,
	createToolUseState,
	formatToolCallDisplay,
	getToolCallDuration,
	getToolCallTimeline,
	isToolUse,
	resetToolUseStore,
	setToolCallError,
	toggleToolCallExpand,
	toolUseStateMap,
	updateToolCallStatus,
} from '../widgets/toolUse';

export const toolUse = Object.freeze({
	createToolUse,
	isToolUse,
	createToolUseState,
	addToolCall,
	updateToolCallStatus,
	setToolCallError,
	toggleToolCallExpand,
	getToolCallDuration,
	getToolCallTimeline,
	formatToolCallDisplay,
	toolUseStateMap,
	resetToolUseStore,
});

export type ToolUseModule = typeof toolUse;
