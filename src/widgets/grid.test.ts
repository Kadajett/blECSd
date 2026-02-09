/**
 * Tests for Grid widget
 */

import { describe, expect, it } from 'vitest';
import { getDimensions } from '../components/dimensions';
import { getPosition } from '../components/position';
import { addEntity, createWorld } from '../core/ecs';
import type { World } from '../core/types';
import { createGrid, type GridConfig } from './grid';

describe('Grid widget', () => {
	let world: World;

	function setup(config: GridConfig = {}) {
		world = createWorld();
		const eid = addEntity(world);
		return createGrid(world, eid, config);
	}

	describe('creation', () => {
		it('creates a grid with default values', () => {
			const grid = setup();
			expect(grid.eid).toBeGreaterThanOrEqual(0);
			expect(grid.getCells()).toEqual([]);
		});

		it('creates a grid with specified rows and columns', () => {
			const grid = setup({ rows: 3, cols: 4 });
			expect(grid.eid).toBeGreaterThanOrEqual(0);
		});

		it('creates a grid with gap', () => {
			const grid = setup({ rows: 2, cols: 2, gap: 2 });
			expect(grid.eid).toBeGreaterThanOrEqual(0);
		});

		it('creates a grid with custom dimensions', () => {
			const grid = setup({
				rows: 2,
				cols: 2,
				width: 80,
				height: 24,
				left: 10,
				top: 5,
			});
			expect(grid.eid).toBeGreaterThanOrEqual(0);

			const dims = getDimensions(world, grid.eid);
			expect(dims?.width).toBe(80);
			expect(dims?.height).toBe(24);

			const pos = getPosition(world, grid.eid);
			expect(pos?.x).toBe(10);
			expect(pos?.y).toBe(5);
		});

		it('creates a grid with fixed cell widths', () => {
			const grid = setup({
				rows: 1,
				cols: 3,
				cellWidths: [20, 30, 50],
			});
			expect(grid.eid).toBeGreaterThanOrEqual(0);
		});

		it('creates a grid with percentage cell widths', () => {
			const grid = setup({
				rows: 1,
				cols: 3,
				cellWidths: ['25%', '25%', '50%'],
			});
			expect(grid.eid).toBeGreaterThanOrEqual(0);
		});

		it('creates a grid with mixed cell sizes', () => {
			const grid = setup({
				rows: 2,
				cols: 3,
				cellWidths: [100, '25%', '75%'],
				cellHeights: ['50%', '50%'],
			});
			expect(grid.eid).toBeGreaterThanOrEqual(0);
		});

		it('creates a grid with uniform cell size', () => {
			const grid = setup({
				rows: 2,
				cols: 2,
				cellWidths: 50,
				cellHeights: 25,
			});
			expect(grid.eid).toBeGreaterThanOrEqual(0);
		});

		it('creates a grid with padding', () => {
			const grid = setup({
				rows: 2,
				cols: 2,
				padding: 2,
			});
			expect(grid.eid).toBeGreaterThanOrEqual(0);
		});

		it('creates a grid with custom colors', () => {
			const grid = setup({
				rows: 2,
				cols: 2,
				fg: '#FFFFFF',
				bg: '#000000',
			});
			expect(grid.eid).toBeGreaterThanOrEqual(0);
		});
	});

	describe('visibility', () => {
		it('shows the grid', () => {
			const grid = setup({ rows: 2, cols: 2 });
			const result = grid.show();
			expect(result).toBe(grid); // chainable
		});

		it('hides the grid', () => {
			const grid = setup({ rows: 2, cols: 2 });
			const result = grid.hide();
			expect(result).toBe(grid); // chainable
		});
	});

	describe('focus', () => {
		it('focuses the grid', () => {
			const grid = setup({ rows: 2, cols: 2 });
			const result = grid.focus();
			expect(result).toBe(grid); // chainable
		});

		it('blurs the grid', () => {
			const grid = setup({ rows: 2, cols: 2 });
			const result = grid.blur();
			expect(result).toBe(grid); // chainable
		});

		it('checks if grid is focused', () => {
			const grid = setup({ rows: 2, cols: 2 });
			expect(grid.isFocused()).toBe(false);
			grid.focus();
			expect(grid.isFocused()).toBe(true);
		});
	});

	describe('cell management', () => {
		it('adds a child to a cell', () => {
			const grid = setup({ rows: 2, cols: 2, width: 100, height: 50 });
			const child = addEntity(world);

			grid.addToCell(child, 0, 0);

			const cells = grid.getCells();
			expect(cells).toHaveLength(1);
			expect(cells[0]?.entity).toBe(child);
			expect(cells[0]?.row).toBe(0);
			expect(cells[0]?.col).toBe(0);
			expect(cells[0]?.rowSpan).toBe(1);
			expect(cells[0]?.colSpan).toBe(1);
		});

		it('adds multiple children to different cells', () => {
			const grid = setup({ rows: 2, cols: 2, width: 100, height: 50 });
			const child1 = addEntity(world);
			const child2 = addEntity(world);
			const child3 = addEntity(world);

			grid.addToCell(child1, 0, 0);
			grid.addToCell(child2, 0, 1);
			grid.addToCell(child3, 1, 0);

			const cells = grid.getCells();
			expect(cells).toHaveLength(3);
		});

		it('adds a child with row span', () => {
			const grid = setup({ rows: 3, cols: 2, width: 100, height: 60 });
			const child = addEntity(world);

			grid.addToCell(child, 0, 0, 2, 1);

			const cells = grid.getCells();
			expect(cells[0]?.rowSpan).toBe(2);
			expect(cells[0]?.colSpan).toBe(1);
		});

		it('adds a child with column span', () => {
			const grid = setup({ rows: 2, cols: 3, width: 120, height: 50 });
			const child = addEntity(world);

			grid.addToCell(child, 0, 0, 1, 2);

			const cells = grid.getCells();
			expect(cells[0]?.rowSpan).toBe(1);
			expect(cells[0]?.colSpan).toBe(2);
		});

		it('adds a child with both row and column span', () => {
			const grid = setup({ rows: 3, cols: 3, width: 120, height: 90 });
			const child = addEntity(world);

			grid.addToCell(child, 0, 0, 2, 2);

			const cells = grid.getCells();
			expect(cells[0]?.rowSpan).toBe(2);
			expect(cells[0]?.colSpan).toBe(2);
		});

		it('removes a child from the grid', () => {
			const grid = setup({ rows: 2, cols: 2, width: 100, height: 50 });
			const child = addEntity(world);

			grid.addToCell(child, 0, 0);
			expect(grid.getCells()).toHaveLength(1);

			grid.removeFromGrid(child);
			expect(grid.getCells()).toHaveLength(0);
		});

		it('moves a child to a different cell', () => {
			const grid = setup({ rows: 2, cols: 2, width: 100, height: 50 });
			const child = addEntity(world);

			grid.addToCell(child, 0, 0);
			const cells1 = grid.getCells();
			expect(cells1[0]?.row).toBe(0);
			expect(cells1[0]?.col).toBe(0);

			grid.addToCell(child, 1, 1);
			const cells2 = grid.getCells();
			expect(cells2).toHaveLength(1); // Still just one cell
			expect(cells2[0]?.row).toBe(1);
			expect(cells2[0]?.col).toBe(1);
		});

		it('chains cell operations', () => {
			const grid = setup({ rows: 2, cols: 2, width: 100, height: 50 });
			const child1 = addEntity(world);
			const child2 = addEntity(world);

			const result = grid.addToCell(child1, 0, 0).addToCell(child2, 1, 1);
			expect(result).toBe(grid);
			expect(grid.getCells()).toHaveLength(2);
		});

		it('throws error for out-of-bounds row', () => {
			const grid = setup({ rows: 2, cols: 2 });
			const child = addEntity(world);

			expect(() => grid.addToCell(child, 2, 0)).toThrow('Row 2 out of bounds');
		});

		it('throws error for out-of-bounds column', () => {
			const grid = setup({ rows: 2, cols: 2 });
			const child = addEntity(world);

			expect(() => grid.addToCell(child, 0, 2)).toThrow('Column 2 out of bounds');
		});

		it('throws error for row span exceeding bounds', () => {
			const grid = setup({ rows: 2, cols: 2 });
			const child = addEntity(world);

			expect(() => grid.addToCell(child, 1, 0, 2, 1)).toThrow('Row span 2 exceeds grid bounds');
		});

		it('throws error for column span exceeding bounds', () => {
			const grid = setup({ rows: 2, cols: 2 });
			const child = addEntity(world);

			expect(() => grid.addToCell(child, 0, 1, 1, 2)).toThrow('Column span 2 exceeds grid bounds');
		});
	});

	describe('layout calculation', () => {
		it('positions child in top-left cell', () => {
			const grid = setup({
				rows: 2,
				cols: 2,
				width: 100,
				height: 50,
				gap: 0,
				left: 10,
				top: 5,
			});
			const child = addEntity(world);

			grid.addToCell(child, 0, 0);

			const childPos = getPosition(world, child);
			expect(childPos?.x).toBe(10); // Grid left
			expect(childPos?.y).toBe(5); // Grid top

			const childDims = getDimensions(world, child);
			expect(childDims?.width).toBe(50); // 100 / 2 cols
			expect(childDims?.height).toBe(25); // 50 / 2 rows
		});

		it('positions child in bottom-right cell', () => {
			const grid = setup({
				rows: 2,
				cols: 2,
				width: 100,
				height: 50,
				gap: 0,
				left: 10,
				top: 5,
			});
			const child = addEntity(world);

			grid.addToCell(child, 1, 1);

			const childPos = getPosition(world, child);
			expect(childPos?.x).toBe(60); // Grid left + 50 (col width)
			expect(childPos?.y).toBe(30); // Grid top + 25 (row height)
		});

		it('positions child with gap between cells', () => {
			const grid = setup({
				rows: 2,
				cols: 2,
				width: 102,
				height: 52,
				gap: 2,
				left: 0,
				top: 0,
			});
			const child = addEntity(world);

			grid.addToCell(child, 1, 1);

			const childPos = getPosition(world, child);
			expect(childPos?.x).toBe(52); // 50 (col 0) + 2 (gap)
			expect(childPos?.y).toBe(27); // 25 (row 0) + 2 (gap)
		});

		it('positions child with padding', () => {
			const grid = setup({
				rows: 1,
				cols: 1,
				width: 104,
				height: 54,
				padding: 2,
				left: 10,
				top: 5,
			});
			const child = addEntity(world);

			grid.addToCell(child, 0, 0);

			const childPos = getPosition(world, child);
			expect(childPos?.x).toBe(12); // Grid left + padding
			expect(childPos?.y).toBe(7); // Grid top + padding

			const childDims = getDimensions(world, child);
			expect(childDims?.width).toBe(100); // 104 - 2*2 padding
			expect(childDims?.height).toBe(50); // 54 - 2*2 padding
		});

		it('handles spanning cells correctly', () => {
			const grid = setup({
				rows: 2,
				cols: 2,
				width: 100,
				height: 50,
				gap: 0,
				left: 0,
				top: 0,
			});
			const child = addEntity(world);

			grid.addToCell(child, 0, 0, 2, 1); // Span 2 rows

			const childDims = getDimensions(world, child);
			expect(childDims?.width).toBe(50); // 1 column
			expect(childDims?.height).toBe(50); // 2 rows (full height)
		});

		it('handles spanning with gaps', () => {
			const grid = setup({
				rows: 2,
				cols: 2,
				width: 102,
				height: 52,
				gap: 2,
				left: 0,
				top: 0,
			});
			const child = addEntity(world);

			grid.addToCell(child, 0, 0, 2, 2); // Span full grid

			const childDims = getDimensions(world, child);
			expect(childDims?.width).toBe(102); // Full width including gap
			expect(childDims?.height).toBe(52); // Full height including gap
		});

		it('calculates layout for mixed fixed and percentage widths', () => {
			const grid = setup({
				rows: 1,
				cols: 3,
				width: 200,
				height: 50,
				cellWidths: [50, '25%', '75%'],
				gap: 0,
				left: 0,
				top: 0,
			});
			const child1 = addEntity(world);
			const child2 = addEntity(world);
			const child3 = addEntity(world);

			grid.addToCell(child1, 0, 0);
			grid.addToCell(child2, 0, 1);
			grid.addToCell(child3, 0, 2);

			// Col 0: 50 (fixed)
			// Remaining: 200 - 50 = 150
			// Col 1: 25% of 150 = 37.5
			// Col 2: 75% of 150 = 112.5

			const dims1 = getDimensions(world, child1);
			expect(dims1?.width).toBe(50);

			const dims2 = getDimensions(world, child2);
			expect(dims2?.width).toBe(37.5);

			const dims3 = getDimensions(world, child3);
			expect(dims3?.width).toBe(112.5);
		});

		it('recalculates layout when calling layout()', () => {
			const grid = setup({
				rows: 1,
				cols: 2,
				width: 100,
				height: 50,
				gap: 0,
				left: 0,
				top: 0,
			});
			const child = addEntity(world);

			grid.addToCell(child, 0, 0);

			const result = grid.layout();
			expect(result).toBe(grid); // chainable

			const childDims = getDimensions(world, child);
			expect(childDims?.width).toBe(50);
		});
	});

	describe('configuration updates', () => {
		it('updates gap and recalculates layout', () => {
			const grid = setup({
				rows: 1,
				cols: 2,
				width: 102,
				height: 50,
				gap: 0,
				left: 0,
				top: 0,
			});
			const child1 = addEntity(world);
			const child2 = addEntity(world);

			grid.addToCell(child1, 0, 0);
			grid.addToCell(child2, 0, 1);

			// Initial: no gap
			let dims1 = getDimensions(world, child1);
			expect(dims1?.width).toBe(51); // 102 / 2

			// Update gap
			grid.setGap(2);

			// After gap: (102 - 2) / 2 = 50 each
			dims1 = getDimensions(world, child1);
			expect(dims1?.width).toBe(50);

			const pos2 = getPosition(world, child2);
			expect(pos2?.x).toBe(52); // 50 + 2 gap
		});

		it('updates cell widths', () => {
			const grid = setup({
				rows: 1,
				cols: 2,
				width: 100,
				height: 50,
				gap: 0,
			});
			const child1 = addEntity(world);
			const child2 = addEntity(world);

			grid.addToCell(child1, 0, 0);
			grid.addToCell(child2, 0, 1);

			grid.setCellWidths(['25%', '75%']);

			const dims1 = getDimensions(world, child1);
			expect(dims1?.width).toBe(25);

			const dims2 = getDimensions(world, child2);
			expect(dims2?.width).toBe(75);
		});

		it('updates cell heights', () => {
			const grid = setup({
				rows: 2,
				cols: 1,
				width: 100,
				height: 100,
				gap: 0,
			});
			const child1 = addEntity(world);
			const child2 = addEntity(world);

			grid.addToCell(child1, 0, 0);
			grid.addToCell(child2, 1, 0);

			grid.setCellHeights([30, 70]);

			const dims1 = getDimensions(world, child1);
			expect(dims1?.height).toBe(30);

			const dims2 = getDimensions(world, child2);
			expect(dims2?.height).toBe(70);
		});

		it('chains configuration updates', () => {
			const grid = setup({ rows: 2, cols: 2, width: 100, height: 100 });
			const result = grid.setGap(2).setCellWidths(['50%', '50%']).setCellHeights([40, 60]);
			expect(result).toBe(grid);
		});
	});

	describe('lifecycle', () => {
		it('destroys the widget', () => {
			const grid = setup({ rows: 2, cols: 2 });

			expect(() => grid.destroy()).not.toThrow();

			// After destroy, state should be cleaned up
			expect(grid.getCells()).toEqual([]);
		});
	});

	describe('integration scenarios', () => {
		it('creates a dashboard layout', () => {
			const grid = setup({
				rows: 3,
				cols: 4,
				width: 200,
				height: 100,
				gap: 2,
				cellWidths: [100, '25%', '25%', '50%'],
				cellHeights: ['33%', '33%', '34%'],
				padding: 2,
			});

			const header = addEntity(world);
			const sidebar = addEntity(world);
			const main = addEntity(world);
			const footer = addEntity(world);

			grid
				.addToCell(header, 0, 0, 1, 4) // Full width header
				.addToCell(sidebar, 1, 0, 2, 1) // Left sidebar (2 rows)
				.addToCell(main, 1, 1, 2, 3) // Main content (2 rows, 3 cols)
				.addToCell(footer, 2, 1, 1, 3); // Removed duplicate footer

			const cells = grid.getCells();
			expect(cells).toHaveLength(4);
		});

		it('handles nested grids', () => {
			const outer = setup({
				rows: 1,
				cols: 2,
				width: 200,
				height: 100,
			});

			const innerEid = addEntity(world);
			createGrid(world, innerEid, {
				rows: 2,
				cols: 1,
			});

			outer.addToCell(innerEid, 0, 0);

			expect(outer.getCells()).toHaveLength(1);
		});

		it('handles empty grid', () => {
			const grid = setup({ rows: 2, cols: 2 });
			expect(grid.getCells()).toEqual([]);
			expect(() => grid.layout()).not.toThrow();
		});

		it('handles grid with only one cell', () => {
			const grid = setup({
				rows: 1,
				cols: 1,
				width: 100,
				height: 50,
			});
			const child = addEntity(world);

			grid.addToCell(child, 0, 0);

			const childDims = getDimensions(world, child);
			expect(childDims?.width).toBe(100);
			expect(childDims?.height).toBe(50);
		});
	});
});
