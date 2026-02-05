/**
 * Tree Widget Tests
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { addEntity, createWorld } from '../core/ecs';
import type { Entity, World } from '../core/types';
import { createTree, isTreeWidget, resetTreeStore, type TreeWidget } from './tree';

describe('Tree Widget', () => {
	let world: World;
	let eid: Entity;
	let widget: TreeWidget;

	beforeEach(() => {
		resetTreeStore();
		world = createWorld() as World;
		eid = addEntity(world) as Entity;
	});

	describe('createTree', () => {
		it('should create a tree widget', () => {
			widget = createTree(world, eid, {
				nodes: [{ label: 'Root' }],
			});

			expect(widget.eid).toBe(eid);
			expect(isTreeWidget(world, eid)).toBe(true);
		});

		it('should initialize with default values', () => {
			widget = createTree(world, eid);

			expect(widget.getNodes()).toEqual([]);
			expect(widget.getSelectedPath()).toBe('');
		});

		it('should initialize with provided nodes', () => {
			widget = createTree(world, eid, {
				nodes: [
					{
						label: 'Root',
						children: [{ label: 'Child 1' }, { label: 'Child 2' }],
					},
				],
			});

			const nodes = widget.getNodes();
			expect(nodes).toHaveLength(1);
			expect(nodes[0]?.label).toBe('Root');
			expect(nodes[0]?.children).toHaveLength(2);
		});

		it('should set initial selection', () => {
			widget = createTree(world, eid, {
				nodes: [{ label: 'Root' }],
				selected: '0',
			});

			expect(widget.getSelectedPath()).toBe('0');
		});
	});

	describe('visibility', () => {
		beforeEach(() => {
			widget = createTree(world, eid, {
				nodes: [{ label: 'Root' }],
			});
		});

		it('should show the widget', () => {
			const result = widget.hide().show();
			expect(result).toBe(widget);
		});

		it('should hide the widget', () => {
			const result = widget.show().hide();
			expect(result).toBe(widget);
		});
	});

	describe('position', () => {
		beforeEach(() => {
			widget = createTree(world, eid, {
				x: 10,
				y: 20,
				nodes: [{ label: 'Root' }],
			});
		});

		it('should set position', () => {
			const result = widget.setPosition(5, 10);
			expect(result).toBe(widget);
		});

		it('should move by delta', () => {
			const result = widget.move(5, -5);
			expect(result).toBe(widget);
		});
	});

	describe('focus', () => {
		beforeEach(() => {
			widget = createTree(world, eid, {
				nodes: [{ label: 'Root' }],
			});
		});

		it('should focus the widget', () => {
			const result = widget.focus();
			expect(result).toBe(widget);
			expect(widget.getState()).toBe('focused');
		});

		it('should blur the widget', () => {
			widget.focus();
			const result = widget.blur();
			expect(result).toBe(widget);
			expect(widget.getState()).toBe('idle');
		});
	});

	describe('nodes', () => {
		it('should set nodes', () => {
			widget = createTree(world, eid);
			const result = widget.setNodes([{ label: 'New Root', children: [{ label: 'Child' }] }]);

			expect(result).toBe(widget);
			expect(widget.getNodes()).toHaveLength(1);
			expect(widget.getNodes()[0]?.label).toBe('New Root');
		});

		it('should get node by path', () => {
			widget = createTree(world, eid, {
				nodes: [
					{
						label: 'Root',
						children: [{ label: 'Child 1' }, { label: 'Child 2' }],
					},
				],
			});

			widget.expand('0');
			const node = widget.getNode('0.1');
			expect(node?.label).toBe('Child 2');
		});

		it('should get visible nodes', () => {
			widget = createTree(world, eid, {
				nodes: [
					{
						label: 'Root',
						expanded: true,
						children: [{ label: 'Child 1' }, { label: 'Child 2' }],
					},
				],
			});

			const visible = widget.getVisibleNodes();
			expect(visible).toHaveLength(3);
			expect(visible[0]?.node.label).toBe('Root');
			expect(visible[1]?.node.label).toBe('Child 1');
			expect(visible[2]?.node.label).toBe('Child 2');
		});
	});

	describe('selection', () => {
		beforeEach(() => {
			widget = createTree(world, eid, {
				nodes: [
					{
						label: 'Root',
						expanded: true,
						children: [{ label: 'Child 1' }, { label: 'Child 2' }, { label: 'Child 3' }],
					},
				],
			});
		});

		it('should select by path', () => {
			const result = widget.select('0.1');
			expect(result).toBe(widget);
			expect(widget.getSelectedPath()).toBe('0.1');
		});

		it('should get selected node', () => {
			widget.select('0.2');
			const node = widget.getSelectedNode();
			expect(node?.label).toBe('Child 3');
		});

		it('should select previous', () => {
			widget.select('0.1');
			const result = widget.selectPrev();
			expect(result).toBe(widget);
			expect(widget.getSelectedPath()).toBe('0.0');
		});

		it('should select next', () => {
			widget.select('0.0');
			const result = widget.selectNext();
			expect(result).toBe(widget);
			expect(widget.getSelectedPath()).toBe('0.1');
		});

		it('should select first', () => {
			widget.select('0.2');
			const result = widget.selectFirst();
			expect(result).toBe(widget);
			expect(widget.getSelectedPath()).toBe('0');
		});

		it('should select last', () => {
			widget.select('0');
			const result = widget.selectLast();
			expect(result).toBe(widget);
			expect(widget.getSelectedPath()).toBe('0.2');
		});

		it('should select parent', () => {
			widget.select('0.1');
			const result = widget.selectParent();
			expect(result).toBe(widget);
			expect(widget.getSelectedPath()).toBe('0');
		});
	});

	describe('expand/collapse', () => {
		beforeEach(() => {
			widget = createTree(world, eid, {
				nodes: [
					{
						label: 'Root',
						children: [
							{
								label: 'Child',
								children: [{ label: 'Grandchild' }],
							},
						],
					},
				],
			});
		});

		it('should expand a node', () => {
			const result = widget.expand('0');
			expect(result).toBe(widget);
			expect(widget.isExpanded('0')).toBe(true);
		});

		it('should collapse a node', () => {
			widget.expand('0');
			const result = widget.collapse('0');
			expect(result).toBe(widget);
			expect(widget.isExpanded('0')).toBe(false);
		});

		it('should toggle a node', () => {
			expect(widget.isExpanded('0')).toBe(false);

			widget.toggle('0');
			expect(widget.isExpanded('0')).toBe(true);

			widget.toggle('0');
			expect(widget.isExpanded('0')).toBe(false);
		});

		it('should expand all nodes', () => {
			const result = widget.expandAll();
			expect(result).toBe(widget);
			expect(widget.isExpanded('0')).toBe(true);
			// Child should also be expanded
		});

		it('should collapse all nodes', () => {
			widget.expandAll();
			const result = widget.collapseAll();
			expect(result).toBe(widget);
			expect(widget.isExpanded('0')).toBe(false);
		});
	});

	describe('display', () => {
		beforeEach(() => {
			widget = createTree(world, eid, {
				nodes: [{ label: 'Root' }],
			});
		});

		it('should set style', () => {
			const result = widget.setStyle({
				selected: { fg: 0xffffffff, bg: 0x333333ff },
			});
			expect(result).toBe(widget);
		});

		it('should set and get show lines', () => {
			expect(widget.getShowLines()).toBe(true); // default

			widget.setShowLines(false);
			expect(widget.getShowLines()).toBe(false);
		});
	});

	describe('scrolling', () => {
		beforeEach(() => {
			widget = createTree(world, eid, {
				nodes: [
					{
						label: 'Root',
						expanded: true,
						children: [
							{ label: 'Child 1' },
							{ label: 'Child 2' },
							{ label: 'Child 3' },
							{ label: 'Child 4' },
							{ label: 'Child 5' },
						],
					},
				],
				height: 3,
			});
		});

		it('should get and set first visible', () => {
			expect(widget.getFirstVisible()).toBe(0);

			widget.setFirstVisible(2);
			expect(widget.getFirstVisible()).toBe(2);
		});

		it('should get visible count', () => {
			expect(widget.getVisibleCount()).toBe(3);
		});
	});

	describe('rendering', () => {
		it('should render tree with lines', () => {
			widget = createTree(world, eid, {
				nodes: [
					{
						label: 'Root',
						expanded: true,
						children: [{ label: 'Child 1' }, { label: 'Child 2' }],
					},
				],
				showLines: true,
			});

			const lines = widget.renderLines(40);
			expect(lines).toHaveLength(3);
			expect(lines[0]).toContain('Root');
			expect(lines[1]).toContain('Child 1');
			expect(lines[2]).toContain('Child 2');
		});

		it('should render tree without lines', () => {
			widget = createTree(world, eid, {
				nodes: [
					{
						label: 'Root',
						expanded: true,
						children: [{ label: 'Child' }],
					},
				],
				showLines: false,
			});

			const lines = widget.renderLines(40);
			expect(lines).toHaveLength(2);
		});

		it('should show expand/collapse indicators', () => {
			widget = createTree(world, eid, {
				nodes: [
					{
						label: 'Collapsed',
						children: [{ label: 'Hidden' }],
					},
				],
			});

			const lines = widget.renderLines(40);
			// Collapsed node should show ▶
			expect(lines[0]).toContain('▶');

			widget.expand('0');
			const expandedLines = widget.renderLines(40);
			// Expanded node should show ▼
			expect(expandedLines[0]).toContain('▼');
		});
	});

	describe('events', () => {
		beforeEach(() => {
			widget = createTree(world, eid, {
				nodes: [
					{
						label: 'Root',
						expanded: true,
						children: [{ label: 'Child' }],
					},
				],
			});
		});

		it('should register select callback', () => {
			const callback = vi.fn();
			const unsubscribe = widget.onSelect(callback);

			widget.select('0.0');

			expect(callback).toHaveBeenCalledWith('0.0', expect.objectContaining({ label: 'Child' }));

			unsubscribe();
		});

		it('should register toggle callback', () => {
			const callback = vi.fn();
			const unsubscribe = widget.onToggle(callback);

			widget.toggle('0');

			expect(callback).toHaveBeenCalledWith('0', false); // Was expanded, now collapsed

			unsubscribe();
		});

		it('should unsubscribe callback', () => {
			const callback = vi.fn();
			const unsubscribe = widget.onSelect(callback);
			unsubscribe();

			widget.select('0.0');

			expect(callback).not.toHaveBeenCalled();
		});
	});

	describe('key handling', () => {
		beforeEach(() => {
			widget = createTree(world, eid, {
				nodes: [
					{
						label: 'Root',
						expanded: true,
						children: [
							{
								label: 'Child 1',
								children: [{ label: 'Grandchild' }],
							},
							{ label: 'Child 2' },
						],
					},
				],
			});
			widget.focus();
		});

		it('should handle down key', () => {
			widget.select('0');
			const action = widget.handleKey('down');
			expect(action?.type).toBe('selectNext');
			expect(widget.getSelectedPath()).toBe('0.0');
		});

		it('should handle up key', () => {
			widget.select('0.0');
			const action = widget.handleKey('up');
			expect(action?.type).toBe('selectPrev');
			expect(widget.getSelectedPath()).toBe('0');
		});

		it('should handle left key to collapse', () => {
			widget.select('0');
			widget.expand('0');
			const action = widget.handleKey('left');
			expect(action?.type).toBe('collapse');
			expect(widget.isExpanded('0')).toBe(false);
		});

		it('should handle left key to select parent when collapsed', () => {
			widget.select('0.0');
			const action = widget.handleKey('left');
			expect(action?.type).toBe('selectParent');
			expect(widget.getSelectedPath()).toBe('0');
		});

		it('should handle right key to expand', () => {
			widget.select('0.0');
			const action = widget.handleKey('right');
			expect(action?.type).toBe('expand');
			expect(widget.isExpanded('0.0')).toBe(true);
		});

		it('should handle enter key on parent to toggle', () => {
			widget.select('0.0');
			const action = widget.handleKey('enter');
			expect(action?.type).toBe('toggle');
		});

		it('should handle g key for first', () => {
			widget.select('0.1');
			const action = widget.handleKey('g');
			expect(action?.type).toBe('selectFirst');
			expect(widget.getSelectedPath()).toBe('0');
		});

		it('should handle G key for last', () => {
			widget.select('0');
			const action = widget.handleKey('G');
			expect(action?.type).toBe('selectLast');
		});

		it('should handle escape key', () => {
			const action = widget.handleKey('escape');
			expect(action?.type).toBe('cancel');
			expect(widget.getState()).toBe('idle');
		});

		it('should not respond when blurred', () => {
			widget.blur();
			const action = widget.handleKey('down');
			expect(action).toBeNull();
		});

		it('should not respond when keys disabled', () => {
			widget = createTree(world, eid, {
				nodes: [{ label: 'Root' }],
				keys: false,
			});
			widget.focus();

			const action = widget.handleKey('down');
			expect(action).toBeNull();
		});
	});

	describe('lifecycle', () => {
		it('should destroy the widget', () => {
			widget = createTree(world, eid, {
				nodes: [{ label: 'Root' }],
			});
			expect(isTreeWidget(world, eid)).toBe(true);

			widget.destroy();
			expect(isTreeWidget(world, eid)).toBe(false);
		});
	});
});
