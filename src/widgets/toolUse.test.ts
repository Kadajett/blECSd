/**
 * Tests for ToolUse widget
 */

import { beforeEach, describe, expect, it } from 'vitest';
import type { World } from '../core/types';
import { createWorld } from '../core/world';
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
	type ToolCallEntry,
	toggleToolCallExpand,
	updateToolCallStatus,
} from './toolUse';

describe('ToolUse Widget', () => {
	let world: World;

	beforeEach(() => {
		world = createWorld();
		resetToolUseStore();
	});

	describe('State Management', () => {
		it('creates initial state with defaults', () => {
			const state = createToolUseState();

			expect(state.calls).toEqual([]);
			expect(state.selectedIndex).toBe(0);
			expect(state.scrollTop).toBe(0);
			expect(state.viewportHeight).toBe(10);
		});

		it('creates initial state with custom viewport height', () => {
			const state = createToolUseState({ height: 20 });

			expect(state.viewportHeight).toBe(20);
		});

		it('adds a tool call to state', () => {
			const state = createToolUseState();
			const params = { file_path: '/src/index.ts' };

			const newState = addToolCall(state, 'call-1', 'Read', params);

			expect(newState.calls).toHaveLength(1);
			expect(newState.calls[0]?.id).toBe('call-1');
			expect(newState.calls[0]?.toolName).toBe('Read');
			expect(newState.calls[0]?.parameters).toEqual(params);
			expect(newState.calls[0]?.status).toBe('pending');
			expect(newState.calls[0]?.expanded).toBe(false);
			expect(newState.calls[0]?.startTime).toBeGreaterThan(0);
		});

		it('does not mutate original state when adding call', () => {
			const state = createToolUseState();
			const originalCalls = state.calls;

			addToolCall(state, 'call-1', 'Read', {});

			expect(state.calls).toBe(originalCalls);
			expect(state.calls).toHaveLength(0);
		});

		it('updates tool call status', () => {
			let state = createToolUseState();
			state = addToolCall(state, 'call-1', 'Read', {});

			const newState = updateToolCallStatus(state, 'call-1', 'running');

			expect(newState.calls[0]?.status).toBe('running');
			expect(newState.calls[0]?.endTime).toBeUndefined();
		});

		it('sets endTime when status is complete', () => {
			let state = createToolUseState();
			state = addToolCall(state, 'call-1', 'Read', {});

			const newState = updateToolCallStatus(state, 'call-1', 'complete', {
				content: 'file contents',
			});

			expect(newState.calls[0]?.status).toBe('complete');
			expect(newState.calls[0]?.result).toEqual({ content: 'file contents' });
			expect(newState.calls[0]?.endTime).toBeGreaterThan(0);
		});

		it('sets endTime when status is error', () => {
			let state = createToolUseState();
			state = addToolCall(state, 'call-1', 'Read', {});

			const newState = updateToolCallStatus(state, 'call-1', 'error');

			expect(newState.calls[0]?.status).toBe('error');
			expect(newState.calls[0]?.endTime).toBeGreaterThan(0);
		});

		it('sets error on tool call', () => {
			let state = createToolUseState();
			state = addToolCall(state, 'call-1', 'Read', {});

			const newState = setToolCallError(state, 'call-1', 'File not found');

			expect(newState.calls[0]?.status).toBe('error');
			expect(newState.calls[0]?.error).toBe('File not found');
			expect(newState.calls[0]?.endTime).toBeGreaterThan(0);
		});

		it('toggles expand state', () => {
			let state = createToolUseState();
			state = addToolCall(state, 'call-1', 'Read', {});

			expect(state.calls[0]?.expanded).toBe(false);

			let newState = toggleToolCallExpand(state, 'call-1');
			expect(newState.calls[0]?.expanded).toBe(true);

			newState = toggleToolCallExpand(newState, 'call-1');
			expect(newState.calls[0]?.expanded).toBe(false);
		});
	});

	describe('Duration Calculation', () => {
		it('returns null for running calls', () => {
			const call: ToolCallEntry = {
				id: 'call-1',
				toolName: 'Read',
				parameters: {},
				status: 'running',
				startTime: Date.now(),
				expanded: false,
			};

			const duration = getToolCallDuration(call);

			expect(duration).toBeNull();
		});

		it('calculates duration for completed calls', () => {
			const startTime = Date.now();
			const endTime = startTime + 500;

			const call: ToolCallEntry = {
				id: 'call-1',
				toolName: 'Read',
				parameters: {},
				status: 'complete',
				startTime,
				endTime,
				expanded: false,
			};

			const duration = getToolCallDuration(call);

			expect(duration).toBe(500);
		});
	});

	describe('Timeline', () => {
		it('returns calls sorted by start time', () => {
			let state = createToolUseState();

			// Add calls with different start times
			state = addToolCall(state, 'call-3', 'Write', {});
			const calls = [...state.calls];
			calls[0] = { ...calls[0]!, startTime: 3000 };

			state = { ...state, calls };
			state = addToolCall(state, 'call-1', 'Read', {});
			const calls2 = [...state.calls];
			calls2[1] = { ...calls2[1]!, startTime: 1000 };

			state = { ...state, calls: calls2 };
			state = addToolCall(state, 'call-2', 'Edit', {});
			const calls3 = [...state.calls];
			calls3[2] = { ...calls3[2]!, startTime: 2000 };

			const timeline = getToolCallTimeline({ ...state, calls: calls3 });

			expect(timeline.map((c) => c.id)).toEqual(['call-1', 'call-2', 'call-3']);
		});
	});

	describe('Display Formatting', () => {
		it('formats empty state', () => {
			const state = createToolUseState();

			const lines = formatToolCallDisplay(state, {
				width: 40,
				showParameters: true,
				showDuration: true,
			});

			expect(lines).toEqual([]);
		});

		it('formats a pending call without parameters', () => {
			let state = createToolUseState();
			state = addToolCall(state, 'call-1', 'Read', {});

			const lines = formatToolCallDisplay(state, {
				width: 40,
				showParameters: false,
				showDuration: false,
			});

			expect(lines.length).toBeGreaterThan(0);
			expect(lines[0]).toContain('Read');
			expect(lines[0]).toContain('pending');
			expect(lines[0]).toContain('○'); // Pending indicator
		});

		it('formats a call with parameters', () => {
			let state = createToolUseState();
			state = addToolCall(state, 'call-1', 'Read', { file_path: '/src/index.ts', limit: 100 });

			const lines = formatToolCallDisplay(state, {
				width: 50,
				showParameters: true,
				showDuration: false,
			});

			expect(lines.join('\n')).toContain('file_path');
			expect(lines.join('\n')).toContain('/src/index.ts');
			expect(lines.join('\n')).toContain('limit');
		});

		it('formats a completed call with duration', () => {
			let state = createToolUseState();
			state = addToolCall(state, 'call-1', 'Read', {});

			const call = state.calls[0];
			if (call) {
				const completedCall = {
					...call,
					status: 'complete' as const,
					endTime: call.startTime + 234,
				};
				state = { ...state, calls: [completedCall] };
			}

			const lines = formatToolCallDisplay(state, {
				width: 50,
				showParameters: false,
				showDuration: true,
			});

			expect(lines.join('\n')).toContain('234ms');
			expect(lines.join('\n')).toContain('complete');
			expect(lines.join('\n')).toContain('●'); // Complete indicator
		});

		it('formats an error call', () => {
			let state = createToolUseState();
			state = addToolCall(state, 'call-1', 'Read', {});
			state = setToolCallError(state, 'call-1', 'File not found');

			const lines = formatToolCallDisplay(state, {
				width: 50,
				showParameters: false,
				showDuration: false,
			});

			expect(lines.join('\n')).toContain('Error: File not found');
			expect(lines.join('\n')).toContain('error');
			expect(lines.join('\n')).toContain('×'); // Error indicator
		});

		it('formats running call', () => {
			let state = createToolUseState();
			state = addToolCall(state, 'call-1', 'Read', {});
			state = updateToolCallStatus(state, 'call-1', 'running');

			const lines = formatToolCallDisplay(state, {
				width: 50,
				showParameters: false,
				showDuration: false,
			});

			expect(lines.join('\n')).toContain('running');
			expect(lines.join('\n')).toContain('◉'); // Running indicator
		});

		it('formats duration over 1 second', () => {
			let state = createToolUseState();
			state = addToolCall(state, 'call-1', 'Read', {});

			const call = state.calls[0];
			if (call) {
				const completedCall = {
					...call,
					status: 'complete' as const,
					endTime: call.startTime + 2500,
				};
				state = { ...state, calls: [completedCall] };
			}

			const lines = formatToolCallDisplay(state, {
				width: 50,
				showParameters: false,
				showDuration: true,
			});

			expect(lines.join('\n')).toContain('2.5s');
		});
	});

	describe('Widget Creation', () => {
		it('creates widget with defaults', () => {
			const widget = createToolUse(world);

			expect(widget.eid).toBeGreaterThan(0);
			expect(isToolUse(world, widget.eid)).toBe(true);
		});

		it('creates widget with custom config', () => {
			const widget = createToolUse(world, {
				x: 10,
				y: 5,
				width: 60,
				height: 15,
				showParameters: false,
			});

			expect(widget.eid).toBeGreaterThan(0);
			expect(isToolUse(world, widget.eid)).toBe(true);
		});

		it('rejects invalid config', () => {
			expect(() => {
				createToolUse(world, { width: -5 });
			}).toThrow();
		});
	});

	describe('Widget Methods', () => {
		it('adds a call via widget method', () => {
			const widget = createToolUse(world);

			widget.addCall('call-1', 'Read', { file_path: '/src/index.ts' });

			const state = widget.getState();
			expect(state.calls).toHaveLength(1);
			expect(state.calls[0]?.id).toBe('call-1');
		});

		it('supports method chaining', () => {
			const widget = createToolUse(world);

			widget
				.addCall('call-1', 'Read', { file_path: '/src/index.ts' })
				.updateStatus('call-1', 'running')
				.updateStatus('call-1', 'complete', { content: '...' });

			const state = widget.getState();
			expect(state.calls[0]?.status).toBe('complete');
			expect(state.calls[0]?.result).toEqual({ content: '...' });
		});

		it('updates status via widget method', () => {
			const widget = createToolUse(world);
			widget.addCall('call-1', 'Read', {});

			widget.updateStatus('call-1', 'complete', { success: true });

			const state = widget.getState();
			expect(state.calls[0]?.status).toBe('complete');
			expect(state.calls[0]?.result).toEqual({ success: true });
		});

		it('sets error via widget method', () => {
			const widget = createToolUse(world);
			widget.addCall('call-1', 'Read', {});

			widget.setError('call-1', 'Permission denied');

			const state = widget.getState();
			expect(state.calls[0]?.status).toBe('error');
			expect(state.calls[0]?.error).toBe('Permission denied');
		});

		it('toggles expand via widget method', () => {
			const widget = createToolUse(world);
			widget.addCall('call-1', 'Read', {});

			widget.toggleExpand('call-1');

			let state = widget.getState();
			expect(state.calls[0]?.expanded).toBe(true);

			widget.toggleExpand('call-1');

			state = widget.getState();
			expect(state.calls[0]?.expanded).toBe(false);
		});

		it('gets timeline via widget method', () => {
			const widget = createToolUse(world);
			widget.addCall('call-3', 'Write', {});
			widget.addCall('call-1', 'Read', {});
			widget.addCall('call-2', 'Edit', {});

			const timeline = widget.getTimeline();

			expect(timeline).toHaveLength(3);
			// Timeline should be sorted by start time (which is insertion order in this case)
			expect(timeline[0]?.id).toBe('call-3');
			expect(timeline[1]?.id).toBe('call-1');
			expect(timeline[2]?.id).toBe('call-2');
		});

		it('scrolls to index', () => {
			const widget = createToolUse(world);
			widget.addCall('call-1', 'Read', {});
			widget.addCall('call-2', 'Write', {});

			widget.scrollTo(1);

			const state = widget.getState();
			expect(state.scrollTop).toBe(1);
		});

		it('clamps scroll to valid range', () => {
			const widget = createToolUse(world);
			widget.addCall('call-1', 'Read', {});

			widget.scrollTo(100);

			const state = widget.getState();
			expect(state.scrollTop).toBe(0); // Clamped to max valid index
		});

		it('clears all calls', () => {
			const widget = createToolUse(world);
			widget.addCall('call-1', 'Read', {});
			widget.addCall('call-2', 'Write', {});

			widget.clear();

			const state = widget.getState();
			expect(state.calls).toHaveLength(0);
			expect(state.selectedIndex).toBe(0);
			expect(state.scrollTop).toBe(0);
		});

		it('destroys widget and cleans up', () => {
			const widget = createToolUse(world);
			const { eid } = widget;

			widget.addCall('call-1', 'Read', {});
			widget.destroy();

			expect(isToolUse(world, eid)).toBe(false);

			// State should be cleared
			const newWidget = createToolUse(world);
			const state = newWidget.getState();
			expect(state.calls).toHaveLength(0);
		});
	});

	describe('Reset Store', () => {
		it('resets all component arrays', () => {
			const widget1 = createToolUse(world);
			const widget2 = createToolUse(world);

			widget1.addCall('call-1', 'Read', {});
			widget2.addCall('call-2', 'Write', {});

			resetToolUseStore();

			expect(isToolUse(world, widget1.eid)).toBe(false);
			expect(isToolUse(world, widget2.eid)).toBe(false);
		});
	});

	describe('Integration', () => {
		it('handles a complete workflow', () => {
			const widget = createToolUse(world, {
				width: 50,
				height: 20,
				showParameters: true,
				showDuration: true,
			});

			// Add a call
			widget.addCall('call-1', 'Read', { file_path: '/src/index.ts' });

			// Start running
			widget.updateStatus('call-1', 'running');

			// Complete
			widget.updateStatus('call-1', 'complete', { lines: 100, content: '...' });

			// Add another call that fails
			widget.addCall('call-2', 'Write', { file_path: '/out.txt' });
			widget.updateStatus('call-2', 'running');
			widget.setError('call-2', 'Disk full');

			const state = widget.getState();
			expect(state.calls).toHaveLength(2);
			expect(state.calls[0]?.status).toBe('complete');
			expect(state.calls[1]?.status).toBe('error');

			const timeline = widget.getTimeline();
			expect(timeline[0]?.id).toBe('call-1');
			expect(timeline[1]?.id).toBe('call-2');
		});
	});
});
