/**
 * Widget Lifecycle Performance Benchmarks
 *
 * Benchmarks widget creation, updates, and rendering for:
 * - Table widget (various row counts)
 * - ProgressBar widget (creation and value updates)
 * - TextInput widget (creation and text insertion)
 * - List widget (many items, selection changes)
 * - Panel widget (creation, collapse/expand)
 * - Tree widget (nested nodes)
 */

import { bench, describe } from 'vitest';
import { addEntity } from '../src/core/ecs';
import { createScheduler, LoopPhase } from '../src/core/scheduler';
import type { World } from '../src/core/types';
import { createWorld } from '../src/core/world';
import { initializeScreen } from '../src/components/screen';
import { layoutSystem } from '../src/systems/layoutSystem';
import { renderSystem } from '../src/systems/renderSystem';
import { createTable } from '../src/widgets/table';
import { createProgressBar } from '../src/widgets/progressBar';
import { createTextbox } from '../src/widgets/textbox';
import { createList } from '../src/widgets/list';
import { createPanel } from '../src/widgets/panel';
import { createTree } from '../src/widgets/tree';

/**
 * Setup world with screen and scheduler
 */
function setupWorld(): { world: World; scheduler: ReturnType<typeof createScheduler> } {
	const world = createWorld();
	initializeScreen(world, 80, 24);
	const scheduler = createScheduler();
	scheduler.registerSystem(LoopPhase.LAYOUT, layoutSystem);
	scheduler.registerSystem(LoopPhase.RENDER, renderSystem);
	return { world, scheduler };
}

describe('Table Widget', () => {
	bench('create table with 10 rows', () => {
		const { world, scheduler } = setupWorld();
		const eid = addEntity(world);

		const data = Array.from({ length: 10 }, (_, i) => ({
			id: i,
			name: `Row ${i}`,
			value: Math.random() * 100,
		}));

		createTable(world, eid, {
			x: 0,
			y: 0,
			width: 80,
			height: 15,
			data,
			columns: [
				{ key: 'id', header: 'ID', width: 10 },
				{ key: 'name', header: 'Name', width: 30 },
				{ key: 'value', header: 'Value', width: 20 },
			],
		});

		scheduler.run(world, 1 / 60);
	});

	bench('create table with 100 rows', () => {
		const { world, scheduler } = setupWorld();
		const eid = addEntity(world);

		const data = Array.from({ length: 100 }, (_, i) => ({
			id: i,
			name: `Row ${i}`,
			value: Math.random() * 100,
		}));

		createTable(world, eid, {
			x: 0,
			y: 0,
			width: 80,
			height: 20,
			data,
			columns: [
				{ key: 'id', header: 'ID', width: 10 },
				{ key: 'name', header: 'Name', width: 30 },
				{ key: 'value', header: 'Value', width: 20 },
			],
		});

		scheduler.run(world, 1 / 60);
	});

	bench('create table with 1000 rows', () => {
		const { world, scheduler } = setupWorld();
		const eid = addEntity(world);

		const data = Array.from({ length: 1000 }, (_, i) => ({
			id: i,
			name: `Row ${i}`,
			value: Math.random() * 100,
		}));

		createTable(world, eid, {
			x: 0,
			y: 0,
			width: 80,
			height: 20,
			data,
			columns: [
				{ key: 'id', header: 'ID', width: 10 },
				{ key: 'name', header: 'Name', width: 30 },
				{ key: 'value', header: 'Value', width: 20 },
			],
		});

		scheduler.run(world, 1 / 60);
	});

	bench('update table data (100 rows, 60 frames)', () => {
		const { world, scheduler } = setupWorld();
		const eid = addEntity(world);

		const initialData = Array.from({ length: 100 }, (_, i) => ({
			id: i,
			name: `Row ${i}`,
			value: Math.random() * 100,
		}));

		const table = createTable(world, eid, {
			x: 0,
			y: 0,
			width: 80,
			height: 20,
			data: initialData,
			columns: [
				{ key: 'id', header: 'ID', width: 10 },
				{ key: 'name', header: 'Name', width: 30 },
				{ key: 'value', header: 'Value', width: 20 },
			],
		});

		// Simulate 60 frames of data updates
		for (let frame = 0; frame < 60; frame++) {
			const newData = Array.from({ length: 100 }, (_, i) => ({
				id: i,
				name: `Row ${i}`,
				value: Math.sin(frame * 0.1 + i) * 100,
			}));

			table.setData(newData);
			scheduler.run(world, 1 / 60);
		}
	});
});

describe('ProgressBar Widget', () => {
	bench('create 10 progress bars', () => {
		const { world, scheduler } = setupWorld();

		for (let i = 0; i < 10; i++) {
			const eid = addEntity(world);
			createProgressBar(world, eid, {
				x: 0,
				y: i * 2,
				width: 40,
				value: Math.random() * 100,
			});
		}

		scheduler.run(world, 1 / 60);
	});

	bench('create 50 progress bars', () => {
		const { world, scheduler } = setupWorld();

		for (let i = 0; i < 50; i++) {
			const eid = addEntity(world);
			createProgressBar(world, eid, {
				x: (i % 2) * 40,
				y: Math.floor(i / 2),
				width: 38,
				value: Math.random() * 100,
			});
		}

		scheduler.run(world, 1 / 60);
	});

	bench('update progress bars (10 bars, 100 frames)', () => {
		const { world, scheduler } = setupWorld();
		const progressBars = [];

		for (let i = 0; i < 10; i++) {
			const eid = addEntity(world);
			const bar = createProgressBar(world, eid, {
				x: 0,
				y: i * 2,
				width: 40,
				value: 0,
			});
			progressBars.push(bar);
		}

		// Simulate 100 frames of value updates
		for (let frame = 0; frame < 100; frame++) {
			for (let i = 0; i < progressBars.length; i++) {
				const progress = ((frame + i * 10) % 100) / 100;
				progressBars[i]?.setValue(progress * 100);
			}
			scheduler.run(world, 1 / 60);
		}
	});
});

describe('TextInput Widget', () => {
	bench('create 20 textboxes', () => {
		const { world, scheduler } = setupWorld();

		for (let i = 0; i < 20; i++) {
			const eid = addEntity(world);
			createTextbox(world, eid, {
				x: 0,
				y: i,
				width: 40,
				height: 1,
			});
		}

		scheduler.run(world, 1 / 60);
	});

	bench('insert text into textbox (100 characters)', () => {
		const { world, scheduler } = setupWorld();
		const eid = addEntity(world);

		const textbox = createTextbox(world, eid, {
			x: 0,
			y: 0,
			width: 80,
			height: 1,
		});

		const text = 'The quick brown fox jumps over the lazy dog. '.repeat(3).substring(0, 100);

		for (const char of text) {
			textbox.insertText(char);
			scheduler.run(world, 1 / 60);
		}
	});

	bench('text editing operations (insert, delete, 60 ops)', () => {
		const { world, scheduler } = setupWorld();
		const eid = addEntity(world);

		const textbox = createTextbox(world, eid, {
			x: 0,
			y: 0,
			width: 80,
			height: 1,
		});

		textbox.setText('Initial text content');

		// Perform 60 mixed operations
		for (let i = 0; i < 60; i++) {
			if (i % 3 === 0) {
				textbox.insertText('x');
			} else if (i % 3 === 1 && textbox.getValue().length > 0) {
				textbox.deleteChar();
			} else {
				textbox.moveCursor(1);
			}
			scheduler.run(world, 1 / 60);
		}
	});
});

describe('List Widget', () => {
	bench('create list with 50 items', () => {
		const { world, scheduler } = setupWorld();
		const eid = addEntity(world);

		const items = Array.from({ length: 50 }, (_, i) => `Item ${i + 1}`);

		createList(world, eid, {
			x: 0,
			y: 0,
			width: 40,
			height: 20,
			items,
		});

		scheduler.run(world, 1 / 60);
	});

	bench('create list with 500 items', () => {
		const { world, scheduler } = setupWorld();
		const eid = addEntity(world);

		const items = Array.from({ length: 500 }, (_, i) => `Item ${i + 1}`);

		createList(world, eid, {
			x: 0,
			y: 0,
			width: 40,
			height: 20,
			items,
		});

		scheduler.run(world, 1 / 60);
	});

	bench('list selection changes (100 items, 100 selections)', () => {
		const { world, scheduler } = setupWorld();
		const eid = addEntity(world);

		const items = Array.from({ length: 100 }, (_, i) => `Item ${i + 1}`);

		const list = createList(world, eid, {
			x: 0,
			y: 0,
			width: 40,
			height: 20,
			items,
		});

		// Cycle through 100 selections
		for (let i = 0; i < 100; i++) {
			list.select(i % items.length);
			scheduler.run(world, 1 / 60);
		}
	});
});

describe('Panel Widget', () => {
	bench('create 10 panels with titles', () => {
		const { world, scheduler } = setupWorld();

		for (let i = 0; i < 10; i++) {
			const eid = addEntity(world);
			createPanel(world, eid, {
				x: (i % 2) * 40,
				y: Math.floor(i / 2) * 5,
				width: 38,
				height: 4,
				title: `Panel ${i + 1}`,
			});
		}

		scheduler.run(world, 1 / 60);
	});

	bench('panel collapse/expand (20 panels, 100 toggles)', () => {
		const { world, scheduler } = setupWorld();
		const panels = [];

		for (let i = 0; i < 20; i++) {
			const eid = addEntity(world);
			const panel = createPanel(world, eid, {
				x: 0,
				y: i * 3,
				width: 40,
				height: 2,
				title: `Panel ${i + 1}`,
				collapsible: true,
			});
			panels.push(panel);
		}

		// Toggle collapse state 100 times
		for (let i = 0; i < 100; i++) {
			const panel = panels[i % panels.length];
			if (panel) {
				if (panel.isCollapsed()) {
					panel.expand();
				} else {
					panel.collapse();
				}
			}
			scheduler.run(world, 1 / 60);
		}
	});
});

describe('Tree Widget', () => {
	bench('create tree with 20 nodes (2 levels deep)', () => {
		const { world, scheduler } = setupWorld();
		const eid = addEntity(world);

		const nodes = [
			{
				id: 'root',
				label: 'Root',
				children: Array.from({ length: 20 }, (_, i) => ({
					id: `child-${i}`,
					label: `Child ${i + 1}`,
				})),
			},
		];

		createTree(world, eid, {
			x: 0,
			y: 0,
			width: 40,
			height: 20,
			nodes,
		});

		scheduler.run(world, 1 / 60);
	});

	bench('create tree with 100 nodes (3 levels deep)', () => {
		const { world, scheduler } = setupWorld();
		const eid = addEntity(world);

		const nodes = [
			{
				id: 'root',
				label: 'Root',
				children: Array.from({ length: 10 }, (_, i) => ({
					id: `level1-${i}`,
					label: `Level 1 - ${i + 1}`,
					children: Array.from({ length: 10 }, (_, j) => ({
						id: `level2-${i}-${j}`,
						label: `Level 2 - ${i + 1}.${j + 1}`,
					})),
				})),
			},
		];

		createTree(world, eid, {
			x: 0,
			y: 0,
			width: 40,
			height: 20,
			nodes,
		});

		scheduler.run(world, 1 / 60);
	});

	bench('tree expand/collapse operations (20 nodes, 50 toggles)', () => {
		const { world, scheduler } = setupWorld();
		const eid = addEntity(world);

		const nodes = [
			{
				id: 'root',
				label: 'Root',
				children: Array.from({ length: 20 }, (_, i) => ({
					id: `child-${i}`,
					label: `Child ${i + 1}`,
					children: [
						{ id: `grandchild-${i}-0`, label: 'Grandchild 1' },
						{ id: `grandchild-${i}-1`, label: 'Grandchild 2' },
					],
				})),
			},
		];

		const tree = createTree(world, eid, {
			x: 0,
			y: 0,
			width: 40,
			height: 20,
			nodes,
		});

		// Toggle expand/collapse 50 times
		for (let i = 0; i < 50; i++) {
			const nodeId = `child-${i % 20}`;
			if (tree.isExpanded(nodeId)) {
				tree.collapse(nodeId);
			} else {
				tree.expand(nodeId);
			}
			scheduler.run(world, 1 / 60);
		}
	});
});
