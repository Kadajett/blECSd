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

import { z } from 'zod';
import { setContent } from '../components/content';
import { setDimensions } from '../components/dimensions';
import { setPosition } from '../components/position';
import { markDirty, setStyle } from '../components/renderable';
import { addEntity, removeEntity } from '../core/ecs';
import type { Entity, World } from '../core/types';

// =============================================================================
// TYPES
// =============================================================================

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

// =============================================================================
// SCHEMA
// =============================================================================

/**
 * Zod schema for AgentWorkflowConfig validation.
 */
export const AgentWorkflowConfigSchema = z.object({
	x: z.number().default(0),
	y: z.number().default(0),
	width: z.number().positive().default(60),
	height: z.number().positive().default(20),
	showTimestamps: z.boolean().default(true),
	showDuration: z.boolean().default(true),
	showAgentName: z.boolean().default(true),
	fg: z.union([z.string(), z.number()]).optional(),
	bg: z.union([z.string(), z.number()]).optional(),
	statusColors: z
		.object({
			pending: z.union([z.string(), z.number()]).optional(),
			running: z.union([z.string(), z.number()]).optional(),
			complete: z.union([z.string(), z.number()]).optional(),
			failed: z.union([z.string(), z.number()]).optional(),
			waiting: z.union([z.string(), z.number()]).optional(),
		})
		.optional(),
});

// =============================================================================
// CONSTANTS
// =============================================================================

const STATUS_ICONS: Record<WorkflowStepStatus, string> = {
	pending: '\u25cb', // ○
	running: '\u25c9', // ◉
	complete: '\u2713', // ✓
	failed: '\u2717', // ✗
	waiting: '\u25cc', // ◌
};

/** Default status colors for reference (used when configuring statusColors). */
export const DEFAULT_STATUS_COLORS: Record<WorkflowStepStatus, number> = {
	pending: 0x888888, // gray
	running: 0x3388ff, // blue
	complete: 0x33cc33, // green
	failed: 0xff3333, // red
	waiting: 0xcccc33, // yellow
};

const TREE_CHARS = {
	vertical: '\u2502', // │
	branch: '\u251c', // ├
	lastBranch: '\u2514', // └
	horizontal: '\u2500', // ─
};

// =============================================================================
// STATE MANAGEMENT
// =============================================================================

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

	for (let i = 0; i < visible.length; i++) {
		const entry = visible[i];
		if (!entry) continue;
		const { step, depth } = entry;

		// Build tree prefix
		const isLast = isLastSibling(state, step);
		const prefix = buildTreePrefix(state, step, depth, isLast);

		// Status icon
		const icon = STATUS_ICONS[step.status];

		// Label parts
		const parts: string[] = [icon, step.label];

		if (showAgent && step.agent) {
			parts.push(`[${step.agent}]`);
		}

		if (showDuration && step.startTime !== undefined) {
			const duration = getStepDuration(step);
			if (duration !== null) {
				parts.push(formatDuration(duration));
			}
		}

		// Children indicator
		const childCount = getStepChildren(state, step.id).length;
		if (childCount > 0 && step.collapsed) {
			parts.push(`(+${childCount})`);
		}

		const line = `${prefix}${parts.join(' ')}`;
		lines.push(line.length > width ? line.slice(0, width) : line);

		// Show error or result on next line if present
		if (step.error) {
			const errorLine = `${' '.repeat(depth * 2 + 4)}\x1b[31m\u2514 ${step.error}\x1b[0m`;
			lines.push(errorLine.length > width ? errorLine.slice(0, width) : errorLine);
		} else if (step.result && !step.collapsed) {
			const resultLine = `${' '.repeat(depth * 2 + 4)}\x1b[90m\u2514 ${step.result}\x1b[0m`;
			lines.push(resultLine.length > width ? resultLine.slice(0, width) : resultLine);
		}
	}

	return lines;
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

/**
 * Gets the workflow statistics.
 *
 * @param state - Current state
 * @returns Object with step counts by status
 */
export function getWorkflowStats(state: AgentWorkflowState): Record<WorkflowStepStatus, number> {
	const stats: Record<WorkflowStepStatus, number> = {
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

// =============================================================================
// WIDGET STORE
// =============================================================================

const workflowStore = new Map<Entity, AgentWorkflowState>();

/**
 * Resets the workflow store (for testing).
 */
export function resetWorkflowStore(): void {
	workflowStore.clear();
}

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

// =============================================================================
// NAMESPACE
// =============================================================================

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

// =============================================================================
// WIDGET FACTORY
// =============================================================================

/**
 * Creates an agent workflow visualizer widget.
 *
 * @param world - The ECS world
 * @param config - Widget configuration
 * @returns Agent workflow widget
 *
 * @example
 * ```typescript
 * import { createWorld, createAgentWorkflow } from 'blecsd';
 *
 * const world = createWorld();
 * const wf = createAgentWorkflow(world, { width: 80, height: 30 });
 *
 * // Build a workflow tree
 * wf.addStep({ id: 'plan', label: 'Planning', status: 'complete',
 *   parentId: null, agent: 'planner', startTime: Date.now() - 5000, endTime: Date.now() - 3000 });
 * wf.addStep({ id: 'code', label: 'Write code', status: 'running',
 *   parentId: 'plan', agent: 'coder', startTime: Date.now() - 3000 });
 * wf.addStep({ id: 'test', label: 'Run tests', status: 'pending',
 *   parentId: 'plan' });
 *
 * // Update status
 * wf.updateStep('code', { status: 'complete', endTime: Date.now() });
 * wf.updateStep('test', { status: 'running', startTime: Date.now() });
 *
 * // Get rendered output
 * const lines = wf.getDisplayLines();
 * ```
 */
export function createAgentWorkflow(
	world: World,
	config: AgentWorkflowConfig = {},
): AgentWorkflowWidget {
	const eid = addEntity(world);
	const x = config.x ?? 0;
	const y = config.y ?? 0;
	const width = config.width ?? 60;
	const height = config.height ?? 20;

	setPosition(world, eid, x, y);
	setDimensions(world, eid, width, height);

	if (config.fg !== undefined || config.bg !== undefined) {
		setStyle(world, eid, { fg: config.fg, bg: config.bg });
	}

	let state = createWorkflowState(height);
	workflowStore.set(eid, state);

	const updateStore = (): void => {
		workflowStore.set(eid, state);
	};

	const updateContent = (): void => {
		const lines = formatWorkflowDisplay(state, config);
		setContent(world, eid, lines.join('\n'));
		markDirty(world, eid);
	};

	const widget: AgentWorkflowWidget = {
		eid,

		addStep(step): AgentWorkflowWidget {
			state = addWorkflowStep(state, step);
			updateStore();
			updateContent();
			return widget;
		},

		updateStep(id, updates): AgentWorkflowWidget {
			state = updateWorkflowStep(state, id, updates);
			updateStore();
			updateContent();
			return widget;
		},

		toggleCollapse(id): AgentWorkflowWidget {
			state = toggleWorkflowCollapse(state, id);
			updateStore();
			updateContent();
			return widget;
		},

		select(index): AgentWorkflowWidget {
			const visible = getVisibleSteps(state);
			const clamped = Math.max(0, Math.min(index, visible.length - 1));
			state = { ...state, selectedIndex: clamped };
			updateStore();
			return widget;
		},

		selectPrev(): AgentWorkflowWidget {
			return widget.select(state.selectedIndex - 1);
		},

		selectNext(): AgentWorkflowWidget {
			return widget.select(state.selectedIndex + 1);
		},

		getSelected(): WorkflowStep | undefined {
			const visible = getVisibleSteps(state);
			return visible[state.selectedIndex]?.step;
		},

		getSteps(): readonly WorkflowStep[] {
			return state.steps;
		},

		getState(): AgentWorkflowState {
			return state;
		},

		getDisplayLines(): readonly string[] {
			return formatWorkflowDisplay(state, config);
		},

		clear(): AgentWorkflowWidget {
			state = createWorkflowState(state.viewportHeight);
			updateStore();
			updateContent();
			return widget;
		},

		scrollTo(index): AgentWorkflowWidget {
			const maxScroll = Math.max(0, getVisibleSteps(state).length - state.viewportHeight);
			const scrollTop = Math.max(0, Math.min(index, maxScroll));
			state = { ...state, scrollTop };
			updateStore();
			return widget;
		},

		destroy(): void {
			workflowStore.delete(eid);
			removeEntity(world, eid);
		},
	};

	return widget;
}
