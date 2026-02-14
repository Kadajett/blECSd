/**
 * Tests for agent workflow visualizer widget.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { createWorld } from '../core/world';
import type { WorkflowStep } from './agentWorkflow';
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
	resetWorkflowStore,
	toggleWorkflowCollapse,
	updateWorkflowStep,
} from './agentWorkflow';

// =============================================================================
// HELPERS
// =============================================================================

function makeStep(overrides: Partial<WorkflowStep> = {}): WorkflowStep {
	return {
		id: 'step-1',
		label: 'Test Step',
		status: 'pending' as const,
		parentId: null,
		collapsed: false,
		...overrides,
	};
}

// =============================================================================
// TESTS
// =============================================================================

describe('agentWorkflow', () => {
	afterEach(() => {
		resetWorkflowStore();
	});

	describe('createWorkflowState', () => {
		it('creates initial state with defaults', () => {
			const state = createWorkflowState();
			expect(state.steps).toEqual([]);
			expect(state.selectedIndex).toBe(0);
			expect(state.scrollTop).toBe(0);
			expect(state.viewportHeight).toBe(20);
		});

		it('accepts custom viewport height', () => {
			const state = createWorkflowState(40);
			expect(state.viewportHeight).toBe(40);
		});
	});

	describe('addWorkflowStep', () => {
		it('adds a step', () => {
			let state = createWorkflowState();
			state = addWorkflowStep(state, makeStep());
			expect(state.steps).toHaveLength(1);
			expect(state.steps[0]?.label).toBe('Test Step');
			expect(state.steps[0]?.collapsed).toBe(false);
		});

		it('adds multiple steps', () => {
			let state = createWorkflowState();
			state = addWorkflowStep(state, makeStep({ id: '1', label: 'Step 1' }));
			state = addWorkflowStep(state, makeStep({ id: '2', label: 'Step 2' }));
			state = addWorkflowStep(state, makeStep({ id: '3', label: 'Step 3' }));
			expect(state.steps).toHaveLength(3);
		});

		it('adds child steps', () => {
			let state = createWorkflowState();
			state = addWorkflowStep(state, makeStep({ id: 'parent' }));
			state = addWorkflowStep(state, makeStep({ id: 'child', parentId: 'parent' }));
			expect(state.steps[1]?.parentId).toBe('parent');
		});
	});

	describe('updateWorkflowStep', () => {
		it('updates step status', () => {
			let state = createWorkflowState();
			state = addWorkflowStep(state, makeStep({ id: '1' }));
			state = updateWorkflowStep(state, '1', { status: 'complete' });
			expect(state.steps[0]?.status).toBe('complete');
		});

		it('updates step result', () => {
			let state = createWorkflowState();
			state = addWorkflowStep(state, makeStep({ id: '1' }));
			state = updateWorkflowStep(state, '1', { result: 'Done successfully' });
			expect(state.steps[0]?.result).toBe('Done successfully');
		});

		it('updates step error', () => {
			let state = createWorkflowState();
			state = addWorkflowStep(state, makeStep({ id: '1' }));
			state = updateWorkflowStep(state, '1', { status: 'failed', error: 'Connection failed' });
			expect(state.steps[0]?.status).toBe('failed');
			expect(state.steps[0]?.error).toBe('Connection failed');
		});

		it('does not modify other steps', () => {
			let state = createWorkflowState();
			state = addWorkflowStep(state, makeStep({ id: '1', label: 'First' }));
			state = addWorkflowStep(state, makeStep({ id: '2', label: 'Second' }));
			state = updateWorkflowStep(state, '1', { status: 'complete' });
			expect(state.steps[1]?.status).toBe('pending');
		});
	});

	describe('toggleWorkflowCollapse', () => {
		it('collapses a step', () => {
			let state = createWorkflowState();
			state = addWorkflowStep(state, makeStep({ id: '1' }));
			state = toggleWorkflowCollapse(state, '1');
			expect(state.steps[0]?.collapsed).toBe(true);
		});

		it('expands a collapsed step', () => {
			let state = createWorkflowState();
			state = addWorkflowStep(state, makeStep({ id: '1' }));
			state = toggleWorkflowCollapse(state, '1');
			state = toggleWorkflowCollapse(state, '1');
			expect(state.steps[0]?.collapsed).toBe(false);
		});
	});

	describe('getStepChildren', () => {
		it('returns children of a step', () => {
			let state = createWorkflowState();
			state = addWorkflowStep(state, makeStep({ id: 'parent' }));
			state = addWorkflowStep(state, makeStep({ id: 'child1', parentId: 'parent' }));
			state = addWorkflowStep(state, makeStep({ id: 'child2', parentId: 'parent' }));
			state = addWorkflowStep(state, makeStep({ id: 'other', parentId: null }));

			const children = getStepChildren(state, 'parent');
			expect(children).toHaveLength(2);
			expect(children[0]?.id).toBe('child1');
			expect(children[1]?.id).toBe('child2');
		});

		it('returns empty array for steps with no children', () => {
			let state = createWorkflowState();
			state = addWorkflowStep(state, makeStep({ id: '1' }));
			expect(getStepChildren(state, '1')).toEqual([]);
		});
	});

	describe('getStepDepth', () => {
		it('returns 0 for root steps', () => {
			let state = createWorkflowState();
			state = addWorkflowStep(state, makeStep({ id: '1', parentId: null }));
			expect(getStepDepth(state, '1')).toBe(0);
		});

		it('returns correct depth for nested steps', () => {
			let state = createWorkflowState();
			state = addWorkflowStep(state, makeStep({ id: '1', parentId: null }));
			state = addWorkflowStep(state, makeStep({ id: '2', parentId: '1' }));
			state = addWorkflowStep(state, makeStep({ id: '3', parentId: '2' }));
			expect(getStepDepth(state, '2')).toBe(1);
			expect(getStepDepth(state, '3')).toBe(2);
		});
	});

	describe('getVisibleSteps', () => {
		it('returns all steps when none are collapsed', () => {
			let state = createWorkflowState();
			state = addWorkflowStep(state, makeStep({ id: '1' }));
			state = addWorkflowStep(state, makeStep({ id: '2', parentId: '1' }));
			state = addWorkflowStep(state, makeStep({ id: '3', parentId: '1' }));

			const visible = getVisibleSteps(state);
			expect(visible).toHaveLength(3);
		});

		it('hides children of collapsed steps', () => {
			let state = createWorkflowState();
			state = addWorkflowStep(state, makeStep({ id: '1' }));
			state = addWorkflowStep(state, makeStep({ id: '2', parentId: '1' }));
			state = addWorkflowStep(state, makeStep({ id: '3', parentId: '1' }));
			state = toggleWorkflowCollapse(state, '1');

			const visible = getVisibleSteps(state);
			expect(visible).toHaveLength(1);
			expect(visible[0]?.step.id).toBe('1');
		});

		it('hides deeply nested children', () => {
			let state = createWorkflowState();
			state = addWorkflowStep(state, makeStep({ id: '1' }));
			state = addWorkflowStep(state, makeStep({ id: '2', parentId: '1' }));
			state = addWorkflowStep(state, makeStep({ id: '3', parentId: '2' }));
			state = toggleWorkflowCollapse(state, '1');

			const visible = getVisibleSteps(state);
			expect(visible).toHaveLength(1);
		});

		it('includes depth information', () => {
			let state = createWorkflowState();
			state = addWorkflowStep(state, makeStep({ id: '1', parentId: null }));
			state = addWorkflowStep(state, makeStep({ id: '2', parentId: '1' }));

			const visible = getVisibleSteps(state);
			expect(visible[0]?.depth).toBe(0);
			expect(visible[1]?.depth).toBe(1);
		});
	});

	describe('getStepDuration', () => {
		it('returns null for steps without start time', () => {
			expect(getStepDuration(makeStep())).toBeNull();
		});

		it('calculates duration for completed steps', () => {
			const step = makeStep({ startTime: 1000, endTime: 2500 });
			expect(getStepDuration(step)).toBe(1500);
		});

		it('uses current time for running steps', () => {
			const now = Date.now();
			const step = makeStep({ startTime: now - 1000 });
			const duration = getStepDuration(step);
			expect(duration).not.toBeNull();
			expect(duration!).toBeGreaterThanOrEqual(999);
		});
	});

	describe('formatDuration', () => {
		it('formats milliseconds', () => {
			expect(formatDuration(123)).toBe('123ms');
		});

		it('formats seconds', () => {
			expect(formatDuration(1500)).toBe('1.5s');
		});

		it('formats minutes and seconds', () => {
			expect(formatDuration(125000)).toBe('2m 5s');
		});
	});

	describe('formatWorkflowDisplay', () => {
		it('returns placeholder for empty workflow', () => {
			const state = createWorkflowState();
			const lines = formatWorkflowDisplay(state);
			expect(lines).toHaveLength(1);
			expect(lines[0]).toContain('no workflow steps');
		});

		it('renders root steps', () => {
			let state = createWorkflowState();
			state = addWorkflowStep(
				state,
				makeStep({
					id: '1',
					label: 'Analyze',
					status: 'complete',
				}),
			);
			const lines = formatWorkflowDisplay(state);
			expect(lines.length).toBeGreaterThan(0);
			expect(lines[0]).toContain('Analyze');
			expect(lines[0]).toContain('\u2713'); // checkmark
		});

		it('renders nested steps with tree connectors', () => {
			let state = createWorkflowState();
			state = addWorkflowStep(state, makeStep({ id: '1', label: 'Plan' }));
			state = addWorkflowStep(state, makeStep({ id: '2', label: 'Execute', parentId: '1' }));
			const lines = formatWorkflowDisplay(state);
			const childLine = lines.find((l) => l.includes('Execute'));
			expect(childLine).toBeDefined();
			// Should have tree connector
			expect(childLine).toMatch(/[└├]/);
		});

		it('shows duration when configured', () => {
			let state = createWorkflowState();
			state = addWorkflowStep(
				state,
				makeStep({
					id: '1',
					label: 'Step',
					startTime: 1000,
					endTime: 2500,
				}),
			);
			const lines = formatWorkflowDisplay(state, { showDuration: true });
			expect(lines[0]).toContain('1.5s');
		});

		it('shows agent name when configured', () => {
			let state = createWorkflowState();
			state = addWorkflowStep(
				state,
				makeStep({
					id: '1',
					label: 'Step',
					agent: 'coder',
				}),
			);
			const lines = formatWorkflowDisplay(state, { showAgentName: true });
			expect(lines[0]).toContain('[coder]');
		});

		it('shows collapsed indicator', () => {
			let state = createWorkflowState();
			state = addWorkflowStep(state, makeStep({ id: '1', label: 'Parent' }));
			state = addWorkflowStep(state, makeStep({ id: '2', parentId: '1' }));
			state = addWorkflowStep(state, makeStep({ id: '3', parentId: '1' }));
			state = toggleWorkflowCollapse(state, '1');
			const lines = formatWorkflowDisplay(state);
			expect(lines[0]).toContain('(+2)');
		});

		it('shows error messages', () => {
			let state = createWorkflowState();
			state = addWorkflowStep(
				state,
				makeStep({
					id: '1',
					label: 'Failed step',
					status: 'failed',
					error: 'Connection timeout',
				}),
			);
			const lines = formatWorkflowDisplay(state);
			const errorLine = lines.find((l) => l.includes('Connection timeout'));
			expect(errorLine).toBeDefined();
		});

		it('shows result when expanded', () => {
			let state = createWorkflowState();
			state = addWorkflowStep(
				state,
				makeStep({
					id: '1',
					label: 'Done step',
					status: 'complete',
					result: 'Found 3 files',
				}),
			);
			const lines = formatWorkflowDisplay(state);
			const resultLine = lines.find((l) => l.includes('Found 3 files'));
			expect(resultLine).toBeDefined();
		});

		it('truncates long lines to width', () => {
			let state = createWorkflowState();
			state = addWorkflowStep(
				state,
				makeStep({
					id: '1',
					label: 'A'.repeat(100),
				}),
			);
			const lines = formatWorkflowDisplay(state, { width: 40 });
			expect(lines[0]?.length).toBeLessThanOrEqual(40);
		});

		it('uses correct status icons', () => {
			let state = createWorkflowState();
			state = addWorkflowStep(state, makeStep({ id: '1', status: 'pending' }));
			state = addWorkflowStep(state, makeStep({ id: '2', status: 'running' }));
			state = addWorkflowStep(state, makeStep({ id: '3', status: 'complete' }));
			state = addWorkflowStep(state, makeStep({ id: '4', status: 'failed' }));
			state = addWorkflowStep(state, makeStep({ id: '5', status: 'waiting' }));
			const lines = formatWorkflowDisplay(state);
			expect(lines[0]).toContain('\u25cb'); // pending
			expect(lines[1]).toContain('\u25c9'); // running
			expect(lines[2]).toContain('\u2713'); // complete
			expect(lines[3]).toContain('\u2717'); // failed
			expect(lines[4]).toContain('\u25cc'); // waiting
		});
	});

	describe('getWorkflowStats', () => {
		it('counts steps by status', () => {
			let state = createWorkflowState();
			state = addWorkflowStep(state, makeStep({ id: '1', status: 'complete' }));
			state = addWorkflowStep(state, makeStep({ id: '2', status: 'complete' }));
			state = addWorkflowStep(state, makeStep({ id: '3', status: 'running' }));
			state = addWorkflowStep(state, makeStep({ id: '4', status: 'pending' }));
			state = addWorkflowStep(state, makeStep({ id: '5', status: 'failed' }));

			const stats = getWorkflowStats(state);
			expect(stats.complete).toBe(2);
			expect(stats.running).toBe(1);
			expect(stats.pending).toBe(1);
			expect(stats.failed).toBe(1);
			expect(stats.waiting).toBe(0);
		});

		it('returns zeros for empty workflow', () => {
			const stats = getWorkflowStats(createWorkflowState());
			expect(stats.complete).toBe(0);
			expect(stats.running).toBe(0);
			expect(stats.pending).toBe(0);
			expect(stats.failed).toBe(0);
			expect(stats.waiting).toBe(0);
		});
	});

	describe('createAgentWorkflow (widget)', () => {
		it('creates a widget', () => {
			const world = createWorld();
			const widget = createAgentWorkflow(world);
			expect(widget.eid).toBeDefined();
		});

		it('supports chainable API', () => {
			const world = createWorld();
			const widget = createAgentWorkflow(world);
			const result = widget
				.addStep(makeStep({ id: '1' }))
				.updateStep('1', { status: 'running' })
				.addStep(makeStep({ id: '2', parentId: '1' }));
			expect(result).toBe(widget);
		});

		it('renders display lines', () => {
			const world = createWorld();
			const widget = createAgentWorkflow(world, { width: 60 });
			widget.addStep(makeStep({ id: '1', label: 'Plan', status: 'complete' }));
			widget.addStep(makeStep({ id: '2', label: 'Execute', parentId: '1', status: 'running' }));
			const lines = widget.getDisplayLines();
			expect(lines.length).toBeGreaterThan(0);
		});

		it('handles selection', () => {
			const world = createWorld();
			const widget = createAgentWorkflow(world);
			widget.addStep(makeStep({ id: '1', label: 'First' }));
			widget.addStep(makeStep({ id: '2', label: 'Second' }));
			widget.addStep(makeStep({ id: '3', label: 'Third' }));

			widget.select(1);
			expect(widget.getSelected()?.id).toBe('2');

			widget.selectNext();
			expect(widget.getSelected()?.id).toBe('3');

			widget.selectPrev();
			expect(widget.getSelected()?.id).toBe('2');
		});

		it('clamps selection to valid range', () => {
			const world = createWorld();
			const widget = createAgentWorkflow(world);
			widget.addStep(makeStep({ id: '1' }));
			widget.select(100);
			expect(widget.getState().selectedIndex).toBe(0);
		});

		it('handles toggle collapse', () => {
			const world = createWorld();
			const widget = createAgentWorkflow(world);
			widget.addStep(makeStep({ id: '1' }));
			widget.addStep(makeStep({ id: '2', parentId: '1' }));
			widget.toggleCollapse('1');
			expect(widget.getSteps()[0]?.collapsed).toBe(true);
		});

		it('handles clear', () => {
			const world = createWorld();
			const widget = createAgentWorkflow(world);
			widget.addStep(makeStep({ id: '1' }));
			widget.addStep(makeStep({ id: '2' }));
			widget.clear();
			expect(widget.getSteps()).toHaveLength(0);
		});

		it('handles scroll', () => {
			const world = createWorld();
			const widget = createAgentWorkflow(world, { height: 5 });
			for (let i = 0; i < 20; i++) {
				widget.addStep(makeStep({ id: `${i}`, label: `Step ${i}` }));
			}
			widget.scrollTo(5);
			expect(widget.getState().scrollTop).toBe(5);
		});

		it('handles destroy', () => {
			const world = createWorld();
			const widget = createAgentWorkflow(world);
			widget.addStep(makeStep({ id: '1' }));
			widget.destroy();
			// Should not throw after destroy
		});
	});
});
