/**
 * Factory function for creating Agent Workflow widgets.
 * @module widgets/agentWorkflow/factory
 */

import { markDirty, setContent, setDimensions, setPosition, setStyle } from 'blecsd/components';
import type { World } from 'blecsd/core';
import { addEntity, removeEntity } from 'blecsd/core';
import {
	addWorkflowStep,
	createWorkflowState,
	formatWorkflowDisplay,
	getVisibleSteps,
	toggleWorkflowCollapse,
	updateWorkflowStep,
	workflowStore,
} from './state';
import type { AgentWorkflowConfig, AgentWorkflowWidget } from './types';

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

		getSelected() {
			const visible = getVisibleSteps(state);
			return visible[state.selectedIndex]?.step;
		},

		getSteps(): readonly import('./types').WorkflowStep[] {
			return state.steps;
		},

		getState() {
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
