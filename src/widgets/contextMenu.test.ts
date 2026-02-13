/**
 * Tests for context menu widget.
 */

import { describe, expect, it, vi } from 'vitest';
import { createWorld } from '../core/world';
import {
	type ContextMenuItem,
	createContextMenu,
	getContextMenuSelectedIndex,
	handleContextMenuKey,
} from './contextMenu';

describe('contextMenu', () => {
	describe('createContextMenu', () => {
		it('creates a context menu', () => {
			const world = createWorld();
			const items: ContextMenuItem[] = [
				{ label: 'Item 1', action: () => {} },
				{ label: 'Item 2', action: () => {} },
			];

			const menu = createContextMenu(world, {
				x: 10,
				y: 5,
				items,
			});

			expect(menu).toBeGreaterThan(0);
		});

		it('handles empty items', () => {
			const world = createWorld();

			const menu = createContextMenu(world, {
				x: 0,
				y: 0,
				items: [],
			});

			expect(menu).toBeGreaterThan(0);
		});

		it('auto-adjusts position near right edge', () => {
			const world = createWorld();
			const items: ContextMenuItem[] = [
				{ label: 'Very long menu item text here', action: () => {} },
			];

			const menu = createContextMenu(world, {
				x: 70,
				y: 5,
				items,
				termWidth: 80,
			});

			expect(menu).toBeGreaterThan(0);
		});

		it('auto-adjusts position near bottom edge', () => {
			const world = createWorld();
			const items: ContextMenuItem[] = [
				{ label: 'Item 1', action: () => {} },
				{ label: 'Item 2', action: () => {} },
				{ label: 'Item 3', action: () => {} },
			];

			const menu = createContextMenu(world, {
				x: 10,
				y: 22,
				items,
				termHeight: 24,
			});

			expect(menu).toBeGreaterThan(0);
		});

		it('handles separators', () => {
			const world = createWorld();
			const items: ContextMenuItem[] = [
				{ label: 'Item 1', action: () => {} },
				{ separator: true, label: '' },
				{ label: 'Item 2', action: () => {} },
			];

			const menu = createContextMenu(world, {
				x: 10,
				y: 5,
				items,
			});

			expect(menu).toBeGreaterThan(0);
		});

		it('handles disabled items', () => {
			const world = createWorld();
			const items: ContextMenuItem[] = [
				{ label: 'Enabled', action: () => {} },
				{ label: 'Disabled', action: () => {}, disabled: true },
			];

			const menu = createContextMenu(world, {
				x: 10,
				y: 5,
				items,
			});

			expect(menu).toBeGreaterThan(0);
		});
	});

	describe('handleContextMenuKey', () => {
		it('handles down arrow', () => {
			const world = createWorld();
			const items: ContextMenuItem[] = [
				{ label: 'Item 1', action: () => {} },
				{ label: 'Item 2', action: () => {} },
			];

			const menu = createContextMenu(world, {
				x: 10,
				y: 5,
				items,
			});

			const handled = handleContextMenuKey(world, menu, 'down');
			expect(handled).toBe(true);
		});

		it('handles up arrow', () => {
			const world = createWorld();
			const items: ContextMenuItem[] = [
				{ label: 'Item 1', action: () => {} },
				{ label: 'Item 2', action: () => {} },
			];

			const menu = createContextMenu(world, {
				x: 10,
				y: 5,
				items,
			});

			const handled = handleContextMenuKey(world, menu, 'up');
			expect(handled).toBe(true);
		});

		it('handles enter key', () => {
			const world = createWorld();
			const action = vi.fn();
			const items: ContextMenuItem[] = [{ label: 'Item 1', action }];

			const menu = createContextMenu(world, {
				x: 10,
				y: 5,
				items,
			});

			handleContextMenuKey(world, menu, 'enter');
			expect(action).toHaveBeenCalled();
		});

		it('handles escape key', () => {
			const world = createWorld();
			const items: ContextMenuItem[] = [{ label: 'Item 1', action: () => {} }];

			const menu = createContextMenu(world, {
				x: 10,
				y: 5,
				items,
			});

			const handled = handleContextMenuKey(world, menu, 'escape');
			expect(handled).toBe(true);
		});

		it('supports vim-style navigation', () => {
			const world = createWorld();
			const items: ContextMenuItem[] = [
				{ label: 'Item 1', action: () => {} },
				{ label: 'Item 2', action: () => {} },
			];

			const menu = createContextMenu(world, {
				x: 10,
				y: 5,
				items,
			});

			expect(handleContextMenuKey(world, menu, 'j')).toBe(true);
			expect(handleContextMenuKey(world, menu, 'k')).toBe(true);
		});

		it('wraps selection at boundaries', () => {
			const world = createWorld();
			const items: ContextMenuItem[] = [
				{ label: 'Item 1', action: () => {} },
				{ label: 'Item 2', action: () => {} },
			];

			const menu = createContextMenu(world, {
				x: 10,
				y: 5,
				items,
			});

			// Go up from first item (wraps to last)
			handleContextMenuKey(world, menu, 'up');
			expect(getContextMenuSelectedIndex(menu)).toBe(1);

			// Go down from last item (wraps to first)
			handleContextMenuKey(world, menu, 'down');
			expect(getContextMenuSelectedIndex(menu)).toBe(0);
		});

		it('skips disabled items during navigation', () => {
			const world = createWorld();
			const items: ContextMenuItem[] = [
				{ label: 'Item 1', action: () => {} },
				{ label: 'Disabled', action: () => {}, disabled: true },
				{ label: 'Item 3', action: () => {} },
			];

			const menu = createContextMenu(world, {
				x: 10,
				y: 5,
				items,
			});

			handleContextMenuKey(world, menu, 'down');
			// Should skip disabled item and go to Item 3
			expect(getContextMenuSelectedIndex(menu)).toBe(2);
		});

		it('skips separators during navigation', () => {
			const world = createWorld();
			const items: ContextMenuItem[] = [
				{ label: 'Item 1', action: () => {} },
				{ separator: true, label: '' },
				{ label: 'Item 2', action: () => {} },
			];

			const menu = createContextMenu(world, {
				x: 10,
				y: 5,
				items,
			});

			handleContextMenuKey(world, menu, 'down');
			// Should skip separator
			expect(getContextMenuSelectedIndex(menu)).toBe(2);
		});
	});

	describe('getContextMenuSelectedIndex', () => {
		it('returns current selection', () => {
			const world = createWorld();
			const items: ContextMenuItem[] = [
				{ label: 'Item 1', action: () => {} },
				{ label: 'Item 2', action: () => {} },
			];

			const menu = createContextMenu(world, {
				x: 10,
				y: 5,
				items,
			});

			expect(getContextMenuSelectedIndex(menu)).toBe(0);

			handleContextMenuKey(world, menu, 'down');
			expect(getContextMenuSelectedIndex(menu)).toBe(1);
		});

		it('returns 0 for non-existent menu', () => {
			expect(getContextMenuSelectedIndex(999999)).toBe(0);
		});
	});
});
