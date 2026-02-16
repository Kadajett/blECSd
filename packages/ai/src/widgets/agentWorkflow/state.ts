/**
 * State management for Agent Workflow widget.
 * @module widgets/agentWorkflow/state
 */

import type { Entity } from 'blecsd/core';
import type { AgentWorkflowConfig, AgentWorkflowState, WorkflowStep } from './types';

/**
 * Widget store for workflow state.
 */
export const workflowStore = new Map<Entity, AgentWorkflowState>();

/**
 * Resets the workflow store (for testing).
 */
export function resetWorkflowStore(): void {
	workflowStore.clear();
}

/**
 * Creates initial workflow state.
 *
 * @param viewportHeight - Initial viewport height
 * @returns Initial state
 *
 * @example
 * ```typescript
 * import { createWorkflowState } from 'blecsd';
 *
 * const state = createWorkflowState(20);
 * ```
 */
export function createWorkflowState(viewportHeight = 20): AgentWorkflowState {
	return {
		steps: [],
		selectedIndex: 0,
		scrollTop: 0,
		viewportHeight,
	};
}

/**
 * Adds a step to the workflow state.
 *
 * @param state - Current state
 * @param step - Step to add (collapsed defaults to false)
 * @returns Updated state
 */
export function addWorkflowStep(
	state: AgentWorkflowState,
	step: Omit<WorkflowStep, 'collapsed'>,
): AgentWorkflowState {
	const newStep: WorkflowStep = { ...step, collapsed: false };
	return {
		...state,
		steps: [...state.steps, newStep],
	};
}

/**
 * Updates a step in the workflow.
 *
 * @param state - Current state
 * @param id - Step ID to update
 * @param updates - Fields to update
 * @returns Updated state
 */
export function updateWorkflowStep(
	state: AgentWorkflowState,
	id: string,
	updates: Partial<Pick<WorkflowStep, 'status' | 'result' | 'error' | 'endTime'>>,
): AgentWorkflowState {
	const steps = state.steps.map((step) => {
		if (step.id !== id) return step;
		return { ...step, ...updates };
	});
	return { ...state, steps };
}

/**
 * Toggles the collapse state of a step's children.
 *
 * @param state - Current state
 * @param id - Step ID to toggle
 * @returns Updated state
 */
export function toggleWorkflowCollapse(state: AgentWorkflowState, id: string): AgentWorkflowState {
	const steps = state.steps.map((step) => {
		if (step.id !== id) return step;
		return { ...step, collapsed: !step.collapsed };
	});
	return { ...state, steps };
}

/**
 * Gets the children of a step.
 *
 * @param state - Current state
 * @param parentId - Parent step ID
 * @returns Array of child steps
 */
export function getStepChildren(
	state: AgentWorkflowState,
	parentId: string,
): readonly WorkflowStep[] {
	return state.steps.filter((s) => s.parentId === parentId);
}

/**
 * Gets the depth of a step in the tree.
 *
 * @param state - Current state
 * @param stepId - Step ID
 * @returns Depth (0 for root steps)
 */
export function getStepDepth(state: AgentWorkflowState, stepId: string): number {
	let depth = 0;
	let currentId: string | null = stepId;
	while (currentId !== null) {
		const step = state.steps.find((s) => s.id === currentId);
		if (!step || step.parentId === null) break;
		currentId = step.parentId;
		depth++;
	}
	return depth;
}

/**
 * Gets the visible (non-collapsed) steps in tree order.
 *
 * @param state - Current state
 * @returns Array of visible steps with their depth
 */
export function getVisibleSteps(
	state: AgentWorkflowState,
): readonly { step: WorkflowStep; depth: number }[] {
	const result: { step: WorkflowStep; depth: number }[] = [];
	const collapsedParents = new Set<string>();

	// Build collapsed set
	for (const step of state.steps) {
		if (step.collapsed) {
			collapsedParents.add(step.id);
		}
	}

	// Check if a step is hidden by a collapsed ancestor
	const isHidden = (step: WorkflowStep): boolean => {
		let parentId = step.parentId;
		while (parentId !== null) {
			if (collapsedParents.has(parentId)) return true;
			const parent = state.steps.find((s) => s.id === parentId);
			if (!parent) break;
			parentId = parent.parentId;
		}
		return false;
	};

	for (const step of state.steps) {
		if (isHidden(step)) continue;
		const depth = getStepDepth(state, step.id);
		result.push({ step, depth });
	}

	return result;
}

/**
 * Gets the duration of a step in milliseconds.
 *
 * @param step - The workflow step
 * @returns Duration in ms, or null if not started/finished
 */
export function getStepDuration(step: WorkflowStep): number | null {
	if (step.startTime === undefined) return null;
	const end = step.endTime ?? Date.now();
	return end - step.startTime;
}

/**
 * Formats a duration in ms to a human-readable string.
 *
 * @param ms - Duration in milliseconds
 * @returns Formatted string (e.g., "1.2s", "345ms", "2m 5s")
 */
export function formatDuration(ms: number): string {
	if (ms < 1000) return `${Math.round(ms)}ms`;
	if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
	const minutes = Math.floor(ms / 60000);
	const seconds = Math.round((ms % 60000) / 1000);
	return `${minutes}m ${seconds}s`;
}

/**
 * Gets the workflow statistics.
 *
 * @param state - Current state
 * @returns Object with step counts by status
 */
export function getWorkflowStats(
	state: AgentWorkflowState,
): Record<'pending' | 'running' | 'complete' | 'failed' | 'waiting', number> {
	const stats: Record<'pending' | 'running' | 'complete' | 'failed' | 'waiting', number> = {
		pending: 0,
		running: 0,
		complete: 0,
		failed: 0,
		waiting: 0,
	};
	for (const step of state.steps) {
		stats[step.status]++;
	}
	return stats;
}

/**
 * Formats the workflow display lines for rendering.
 *
 * @param state - Current state
 * @param config - Widget configuration
 * @returns Array of formatted display lines
 *
 * @example
 * ```typescript
 * import { createWorkflowState, addWorkflowStep, formatWorkflowDisplay } from 'blecsd';
 *
 * let state = createWorkflowState();
 * state = addWorkflowStep(state, {
 *   id: '1', label: 'Analyze code', status: 'complete',
 *   parentId: null, startTime: Date.now() - 1000, endTime: Date.now(),
 * });
 * const lines = formatWorkflowDisplay(state, { width: 60 });
 * ```
 */
export function formatWorkflowDisplay(
	state: AgentWorkflowState,
	config: AgentWorkflowConfig = {},
): readonly string[] {
	const width = config.width ?? 60;
	const showDuration = config.showDuration ?? true;
	const showAgent = config.showAgentName ?? true;
	const visible = getVisibleSteps(state);

	if (visible.length === 0) {
		return ['  (no workflow steps)'];
	}

	const lines: string[] = [];

	for (const entry of visible) {
		if (!entry) continue;
		const { step, depth } = entry;

		const isLast = isLastSibling(state, step);
		const prefix = buildTreePrefix(state, step, depth, isLast);
		const parts = buildStepLabelParts(state, step, showAgent, showDuration);
		const line = `${prefix}${parts.join(' ')}`;
		lines.push(line.length > width ? line.slice(0, width) : line);

		for (const detail of buildStepDetailLines(step, depth, width)) {
			lines.push(detail);
		}
	}

	return lines;
}

const STATUS_ICONS: Record<'pending' | 'running' | 'complete' | 'failed' | 'waiting', string> = {
	pending: '\u25cb', // ○
	running: '\u25c9', // ◉
	complete: '\u2713', // ✓
	failed: '\u2717', // ✗
	waiting: '\u25cc', // ◌
};

const TREE_CHARS = {
	vertical: '\u2502', // │
	branch: '\u251c', // ├
	lastBranch: '\u2514', // └
	horizontal: '\u2500', // ─
};

/** Build the label parts array for a single workflow step. */
function buildStepLabelParts(
	state: AgentWorkflowState,
	step: WorkflowStep,
	showAgent: boolean,
	showDuration: boolean,
): readonly string[] {
	const parts: string[] = [STATUS_ICONS[step.status], step.label];

	if (showAgent && step.agent) {
		parts.push(`[${step.agent}]`);
	}
	if (showDuration && step.startTime !== undefined) {
		const duration = getStepDuration(step);
		if (duration !== null) {
			parts.push(formatDuration(duration));
		}
	}
	const childCount = getStepChildren(state, step.id).length;
	if (childCount > 0 && step.collapsed) {
		parts.push(`(+${childCount})`);
	}
	return parts;
}

/** Build detail lines (error or result) for a step. */
function buildStepDetailLines(step: WorkflowStep, depth: number, width: number): readonly string[] {
	const indent = ' '.repeat(depth * 2 + 4);
	if (step.error) {
		const errorLine = `${indent}\x1b[31m\u2514 ${step.error}\x1b[0m`;
		return [errorLine.length > width ? errorLine.slice(0, width) : errorLine];
	}
	if (step.result && !step.collapsed) {
		const resultLine = `${indent}\x1b[90m\u2514 ${step.result}\x1b[0m`;
		return [resultLine.length > width ? resultLine.slice(0, width) : resultLine];
	}
	return [];
}

/**
 * Checks if a step is the last child of its parent.
 */
function isLastSibling(state: AgentWorkflowState, step: WorkflowStep): boolean {
	const siblings = state.steps.filter((s) => s.parentId === step.parentId);
	return siblings[siblings.length - 1]?.id === step.id;
}

/**
 * Builds the tree drawing prefix for a step.
 */
function buildTreePrefix(
	state: AgentWorkflowState,
	step: WorkflowStep,
	depth: number,
	isLast: boolean,
): string {
	if (depth === 0) return '';

	const parts: string[] = [];

	// Build ancestor connectors
	let currentStep: WorkflowStep | undefined = step;
	const connectors: string[] = [];

	for (let d = depth - 1; d >= 0; d--) {
		const parent = state.steps.find((s) => s.id === currentStep?.parentId);
		if (!parent) break;
		const parentIsLast = isLastSibling(state, parent);
		connectors.unshift(parentIsLast ? '  ' : `${TREE_CHARS.vertical} `);
		currentStep = parent;
	}

	for (const c of connectors) {
		parts.push(c);
	}

	// Current branch connector
	parts.push(
		isLast
			? `${TREE_CHARS.lastBranch}${TREE_CHARS.horizontal}`
			: `${TREE_CHARS.branch}${TREE_CHARS.horizontal}`,
	);

	return parts.join('');
}
