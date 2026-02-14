/**
 * Real-World Scenario Benchmark: Terminal Resize Events
 *
 * Simulates rapid terminal resize events and measures:
 * - Layout recalculation cost
 * - Re-render cost
 * - Entity repositioning
 * - Dimension updates
 *
 * Common in responsive TUIs when users resize their terminal window.
 */

import { bench, describe } from 'vitest';

describe('Terminal Resize Scenario', () => {
	bench('resize event: 10 widgets, 10 resize cycles', () => {
		const { createWorld } = require('../src/core/world');
		const { addEntity, removeEntity } = require('../src/core/ecs');
		const { setPosition } = require('../src/components/position');
		const { setDimensions } = require('../src/components/dimensions');
		const { setRenderable } = require('../src/components/renderable');
		const { initializeScreen, setScreenSize } = require('../src/components/screen');
		const { layoutSystem } = require('../src/systems/layoutSystem');
		const { renderSystem } = require('../src/systems/renderSystem');

		const world = createWorld();
		initializeScreen(world, 80, 24);

		// Create 10 widgets arranged in a grid
		const entities: number[] = [];
		for (let i = 0; i < 10; i++) {
			const eid = addEntity(world);
			const col = i % 5;
			const row = Math.floor(i / 5);
			setPosition(world, eid, col * 16, row * 12);
			setDimensions(world, eid, { width: 16, height: 12 });
			setRenderable(world, eid, {
				content: `Widget ${i}`,
				fg: 0xffffff,
				bg: 0x000000,
			});
			entities.push(eid);
		}

		// Initial render
		layoutSystem(world);
		renderSystem(world);

		// Simulate 10 resize cycles with varying dimensions
		const sizes = [
			[100, 30],
			[120, 40],
			[80, 24],
			[160, 48],
			[90, 28],
			[110, 35],
			[80, 24],
			[140, 45],
			[100, 30],
			[80, 24],
		];

		for (const [width, height] of sizes) {
			// Resize screen
			setScreenSize(world, width, height);

			// Recalculate widget positions/sizes based on new screen size
			const cols = 5;
			const widgetWidth = Math.floor(width / cols);
			const widgetHeight = Math.floor(height / 2);

			for (let i = 0; i < entities.length; i++) {
				const eid = entities[i] as number;
				const col = i % cols;
				const row = Math.floor(i / cols);
				setPosition(world, eid, col * widgetWidth, row * widgetHeight);
				setDimensions(world, eid, { width: widgetWidth, height: widgetHeight });
			}

			// Re-layout and re-render
			layoutSystem(world);
			renderSystem(world);
		}

		// Cleanup
		for (const eid of entities) {
			removeEntity(world, eid);
		}
	});

	bench('resize event: 50 widgets, 5 resize cycles', () => {
		const { createWorld } = require('../src/core/world');
		const { addEntity, removeEntity } = require('../src/core/ecs');
		const { setPosition } = require('../src/components/position');
		const { setDimensions } = require('../src/components/dimensions');
		const { setRenderable } = require('../src/components/renderable');
		const { initializeScreen, setScreenSize } = require('../src/components/screen');
		const { layoutSystem } = require('../src/systems/layoutSystem');
		const { renderSystem } = require('../src/systems/renderSystem');

		const world = createWorld();
		initializeScreen(world, 160, 48);

		// Create 50 widgets in a 10x5 grid
		const entities: number[] = [];
		const cols = 10;
		const rows = 5;

		for (let i = 0; i < 50; i++) {
			const eid = addEntity(world);
			const col = i % cols;
			const row = Math.floor(i / cols);
			setPosition(world, eid, col * 16, row * 9);
			setDimensions(world, eid, { width: 16, height: 9 });
			setRenderable(world, eid, {
				content: `W${i}`,
				fg: 0xffffff,
				bg: 0x000000,
			});
			entities.push(eid);
		}

		// Initial render
		layoutSystem(world);
		renderSystem(world);

		// Simulate 5 resize cycles
		const sizes = [
			[180, 50],
			[140, 40],
			[200, 60],
			[120, 35],
			[160, 48],
		];

		for (const [width, height] of sizes) {
			setScreenSize(world, width, height);

			const widgetWidth = Math.floor(width / cols);
			const widgetHeight = Math.floor(height / rows);

			for (let i = 0; i < entities.length; i++) {
				const eid = entities[i] as number;
				const col = i % cols;
				const row = Math.floor(i / cols);
				setPosition(world, eid, col * widgetWidth, row * widgetHeight);
				setDimensions(world, eid, { width: widgetWidth, height: widgetHeight });
			}

			layoutSystem(world);
			renderSystem(world);
		}

		// Cleanup
		for (const eid of entities) {
			removeEntity(world, eid);
		}
	});

	bench('resize event: responsive layout with flex containers', () => {
		const { createWorld } = require('../src/core/world');
		const { addEntity, removeEntity } = require('../src/core/ecs');
		const { initializeScreen, setScreenSize } = require('../src/components/screen');
		const { createBox } = require('../src/widgets/box');
		const { layoutSystem } = require('../src/systems/layoutSystem');
		const { renderSystem } = require('../src/systems/renderSystem');

		const world = createWorld();
		initializeScreen(world, 80, 24);

		// Create a responsive layout with nested containers
		const entities: number[] = [];

		// Header
		const header = addEntity(world);
		createBox(world, header, {
			position: { x: 0, y: 0 },
			dimensions: { width: 80, height: 3 },
			border: { type: 'single' },
			title: 'Header',
		});
		entities.push(header);

		// Main content area (split into sidebar + content)
		const sidebar = addEntity(world);
		createBox(world, sidebar, {
			position: { x: 0, y: 3 },
			dimensions: { width: 20, height: 18 },
			border: { type: 'single' },
			title: 'Sidebar',
		});
		entities.push(sidebar);

		const content = addEntity(world);
		createBox(world, content, {
			position: { x: 20, y: 3 },
			dimensions: { width: 60, height: 18 },
			border: { type: 'single' },
			title: 'Content',
		});
		entities.push(content);

		// Footer
		const footer = addEntity(world);
		createBox(world, footer, {
			position: { x: 0, y: 21 },
			dimensions: { width: 80, height: 3 },
			border: { type: 'single' },
			title: 'Footer',
		});
		entities.push(footer);

		// Initial render
		layoutSystem(world);
		renderSystem(world);

		// Simulate 20 resize events with responsive layout recalculation
		const sizes = [
			[100, 30],
			[120, 40],
			[80, 24],
			[160, 48],
			[90, 28],
			[110, 35],
			[140, 45],
			[100, 30],
			[80, 20],
			[200, 60],
			[80, 24],
			[150, 50],
			[100, 30],
			[80, 24],
			[120, 35],
			[110, 32],
			[90, 26],
			[100, 28],
			[80, 24],
			[160, 48],
		];

		for (const [width, height] of sizes) {
			setScreenSize(world, width, height);

			// Recalculate responsive layout
			const sidebarWidth = Math.floor(width * 0.25);
			const contentWidth = width - sidebarWidth;
			const mainHeight = height - 6; // Header + footer

			// Update header
			createBox(world, header, {
				position: { x: 0, y: 0 },
				dimensions: { width, height: 3 },
				border: { type: 'single' },
				title: 'Header',
			});

			// Update sidebar
			createBox(world, sidebar, {
				position: { x: 0, y: 3 },
				dimensions: { width: sidebarWidth, height: mainHeight },
				border: { type: 'single' },
				title: 'Sidebar',
			});

			// Update content
			createBox(world, content, {
				position: { x: sidebarWidth, y: 3 },
				dimensions: { width: contentWidth, height: mainHeight },
				border: { type: 'single' },
				title: 'Content',
			});

			// Update footer
			createBox(world, footer, {
				position: { x: 0, y: 3 + mainHeight },
				dimensions: { width, height: 3 },
				border: { type: 'single' },
				title: 'Footer',
			});

			// Re-layout and re-render
			layoutSystem(world);
			renderSystem(world);
		}

		// Cleanup
		for (const eid of entities) {
			removeEntity(world, eid);
		}
	});
});
