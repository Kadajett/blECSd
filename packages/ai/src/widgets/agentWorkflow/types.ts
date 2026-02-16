/**
 * Type definitions for Agent Workflow widget.
 * @module widgets/agentWorkflow/types
 */

import type { Entity } from 'blecsd/core';

/**
 * Status of a workflow step.
 */
export type WorkflowStepStatus = 'pending' | 'running' | 'complete' | 'failed' | 'waiting';

/**
 * A single step in an agent workflow.
 */
export interface WorkflowStep {
	/** Unique step identifier */
	readonly id: string;
	/** Display label for the step */
	readonly label: string;
	/** Detailed description of what this step does */
	readonly description?: string;
	/** Current status */
	readonly status: WorkflowStepStatus;
	/** ID of the parent step (null for root) */
	readonly parentId: string | null;
	/** Whether the subtree is collapsed */
	readonly collapsed: boolean;
	/** Start timestamp */
	readonly startTime?: number;
	/** End timestamp */
	readonly endTime?: number;
	/** Step result or output summary */
	readonly result?: string;
	/** Error message if failed */
	readonly error?: string;
	/** Agent or tool name that executed this step */
	readonly agent?: string;
}

/**
 * Workflow visualizer state.
 */
export interface AgentWorkflowState {
	/** All workflow steps */
	readonly steps: readonly WorkflowStep[];
	/** Currently selected step index in the flattened visible list */
	readonly selectedIndex: number;
	/** Scroll position */
	readonly scrollTop: number;
	/** Viewport height */
	readonly viewportHeight: number;
}

/**
 * Configuration for the agent workflow widget.
 */
export interface AgentWorkflowConfig {
	/** X position (default: 0) */
	readonly x?: number;
	/** Y position (default: 0) */
	readonly y?: number;
	/** Width in columns (default: 60) */
	readonly width?: number;
	/** Height in rows (default: 20) */
	readonly height?: number;
	/** Show timestamps (default: true) */
	readonly showTimestamps?: boolean;
	/** Show duration (default: true) */
	readonly showDuration?: boolean;
	/** Show agent names (default: true) */
	readonly showAgentName?: boolean;
	/** Foreground color */
	readonly fg?: string | number;
	/** Background color */
	readonly bg?: string | number;
	/** Colors for each status */
	readonly statusColors?: Partial<Record<WorkflowStepStatus, string | number>>;
}

/**
 * Agent workflow widget interface.
 */
export interface AgentWorkflowWidget {
	/** The underlying entity ID */
	readonly eid: Entity;
	/** Add a step to the workflow */
	addStep(step: Omit<WorkflowStep, 'collapsed'>): AgentWorkflowWidget;
	/** Update a step's status */
	updateStep(
		id: string,
		updates: Partial<Pick<WorkflowStep, 'status' | 'result' | 'error' | 'endTime'>>,
	): AgentWorkflowWidget;
	/** Toggle collapse/expand of a step's children */
	toggleCollapse(id: string): AgentWorkflowWidget;
	/** Select a step by index */
	select(index: number): AgentWorkflowWidget;
	/** Move selection up */
	selectPrev(): AgentWorkflowWidget;
	/** Move selection down */
	selectNext(): AgentWorkflowWidget;
	/** Get the currently selected step */
	getSelected(): WorkflowStep | undefined;
	/** Get all steps */
	getSteps(): readonly WorkflowStep[];
	/** Get the workflow state */
	getState(): AgentWorkflowState;
	/** Get rendered display lines */
	getDisplayLines(): readonly string[];
	/** Clear all steps */
	clear(): AgentWorkflowWidget;
	/** Scroll to a step */
	scrollTo(index: number): AgentWorkflowWidget;
	/** Destroy the widget */
	destroy(): void;
}
