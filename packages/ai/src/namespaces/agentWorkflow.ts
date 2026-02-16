/**
 * Agent workflow namespace for visualizing AI agent workflows.
 *
 * @example
 * ```typescript
 * import { agentWorkflow } from '@blecsd/ai';
 *
 * const wf = agentWorkflow.createAgentWorkflow(world, { width: 80, height: 30 });
 * agentWorkflow.addWorkflowStep({ id: '1', label: 'Plan', status: 'complete', parentId: null });
 * const stats = agentWorkflow.getWorkflowStats();
 * ```
 */

import {
	addWorkflowStep,
	createAgentWorkflow,
	createWorkflowState,
	formatDuration,
	formatWorkflowDisplay,
	getStepChildren,
	getStepDepth,
	getStepDuration,
	getVisibleSteps,
	getWorkflowStats,
	isAgentWorkflow,
	resetWorkflowStore,
	toggleWorkflowCollapse,
	updateWorkflowStep,
	workflowStore,
} from '../widgets/agentWorkflow';

export const agentWorkflow = Object.freeze({
	createAgentWorkflow,
	isAgentWorkflow,
	createWorkflowState,
	addWorkflowStep,
	updateWorkflowStep,
	toggleWorkflowCollapse,
	getVisibleSteps,
	getStepChildren,
	getStepDepth,
	getStepDuration,
	getWorkflowStats,
	formatWorkflowDisplay,
	formatDuration,
	workflowStore,
	resetWorkflowStore,
});

export type AgentWorkflowModule = typeof agentWorkflow;
