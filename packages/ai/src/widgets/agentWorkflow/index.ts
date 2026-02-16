/**
 * Agent Workflow Visualizer Widget
 *
 * Renders AI agent workflows as a tree/graph of steps. Each node
 * represents an agent action: what it did, what it decided, what
 * it delegated. Supports expand/collapse of subtrees, color-coding
 * by status, and real-time updates as the workflow progresses.
 *
 * @module widgets/agentWorkflow
 */

import type { Entity, World } from 'blecsd/core';

// Re-export schema
export { AgentWorkflowConfigSchema, DEFAULT_STATUS_COLORS } from './config';
// Re-export factory
export { createAgentWorkflow } from './factory';
// Re-export state management
export {
	addWorkflowStep,
	createWorkflowState,
	formatDuration,
	formatWorkflowDisplay,
	getStepChildren,
	getStepDepth,
	getStepDuration,
	getVisibleSteps,
	getWorkflowStats,
	resetWorkflowStore,
	toggleWorkflowCollapse,
	updateWorkflowStep,
	workflowStore,
} from './state';
// Re-export types
export type {
	AgentWorkflowConfig,
	AgentWorkflowState,
	AgentWorkflowWidget,
	WorkflowStep,
	WorkflowStepStatus,
} from './types';

import { workflowStore } from './state';

/**
 * Checks if an entity is a workflow widget.
 *
 * @param _world - The ECS world (unused, for API consistency)
 * @param eid - Entity ID to check
 * @returns True if the entity has workflow state
 */
export function isAgentWorkflow(_world: World, eid: Entity): boolean {
	return workflowStore.has(eid);
}

/**
 * Agent workflow widget namespace.
 *
 * @example
 * ```typescript
 * import { AgentWorkflow } from 'blecsd';
 *
 * const wf = AgentWorkflow.create(world, { width: 80, height: 30 });
 * wf.addStep({ id: '1', label: 'Plan', status: 'complete', parentId: null });
 * wf.addStep({ id: '2', label: 'Execute', status: 'running', parentId: '1' });
 * ```
 */
export const AgentWorkflow = {
	create: createAgentWorkflow,
	is: isAgentWorkflow,
	resetStore: resetWorkflowStore,
};

import { createAgentWorkflow } from './factory';
import { resetWorkflowStore } from './state';
