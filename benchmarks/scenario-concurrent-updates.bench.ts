/**
 * Real-World Scenario Benchmark: Concurrent Widget Updates
 *
 * Simulates a monitoring dashboard receiving high-frequency updates
 * to multiple widgets simultaneously in a single frame:
 * - 50+ widgets updating in parallel
 * - Mixed widget types (text, charts, gauges, progress bars)
 * - Realistic data patterns (metrics, logs, status indicators)
 *
 * Measures frame time when many widgets change simultaneously.
 */

import { bench, describe } from 'vitest';

describe('Concurrent Updates Scenario', () => {
	bench('50 widgets: single-frame concurrent update', () => {
		const { createWorld } = require('../src/core/world');
		const { addEntity, removeEntity } = require('../src/core/ecs');
		const { setPosition } = require('../src/components/position');
		const { setDimensions } = require('../src/components/dimensions');
		const { setRenderable } = require('../src/components/renderable');
		const { initializeScreen } = require('../src/components/screen');
		const { layoutSystem } = require('../src/systems/layoutSystem');
		const { renderSystem } = require('../src/systems/renderSystem');

		const world = createWorld();
		initializeScreen(world, 160, 48);

		// Create 50 simple text widgets in a 10x5 grid
		const entities: number[] = [];
		const cols = 10;
		const rows = 5;
		const widgetWidth = Math.floor(160 / cols);
		const widgetHeight = Math.floor(48 / rows);

		for (let i = 0; i < 50; i++) {
			const eid = addEntity(world);
			const col = i % cols;
			const row = Math.floor(i / cols);
			setPosition(world, eid, col * widgetWidth, row * widgetHeight);
			setDimensions(world, eid, { width: widgetWidth, height: widgetHeight });
			setRenderable(world, eid, {
				content: `Widget ${i}: 0`,
				fg: 0xffffff,
				bg: 0x000000,
			});
			entities.push(eid);
		}

		// Initial render
		layoutSystem(world);
		renderSystem(world);

		// Update ALL 50 widgets in a single frame
		for (let i = 0; i < entities.length; i++) {
			const eid = entities[i] as number;
			const value = Math.random() * 1000;
			setRenderable(world, eid, {
				content: `Widget ${i}: ${value.toFixed(2)}`,
				fg: 0xffffff,
				bg: 0x000000,
			});
		}

		// Re-render with all updates
		layoutSystem(world);
		renderSystem(world);

		// Cleanup
		for (const eid of entities) {
			removeEntity(world, eid);
		}
	});

	bench('100 widgets: rapid concurrent updates (10 frames)', () => {
		const { createWorld } = require('../src/core/world');
		const { addEntity, removeEntity } = require('../src/core/ecs');
		const { setPosition } = require('../src/components/position');
		const { setDimensions } = require('../src/components/dimensions');
		const { setRenderable } = require('../src/components/renderable');
		const { initializeScreen } = require('../src/components/screen');
		const { layoutSystem } = require('../src/systems/layoutSystem');
		const { renderSystem } = require('../src/systems/renderSystem');

		const world = createWorld();
		initializeScreen(world, 200, 60);

		// Create 100 widgets in a 10x10 grid
		const entities: number[] = [];
		const cols = 10;
		const rows = 10;
		const widgetWidth = Math.floor(200 / cols);
		const widgetHeight = Math.floor(60 / rows);

		for (let i = 0; i < 100; i++) {
			const eid = addEntity(world);
			const col = i % cols;
			const row = Math.floor(i / cols);
			setPosition(world, eid, col * widgetWidth, row * widgetHeight);
			setDimensions(world, eid, { width: widgetWidth, height: widgetHeight });
			setRenderable(world, eid, {
				content: `W${i}: 0`,
				fg: 0xffffff,
				bg: 0x000000,
			});
			entities.push(eid);
		}

		// Initial render
		layoutSystem(world);
		renderSystem(world);

		// Simulate 10 frames where all 100 widgets update every frame
		for (let frame = 0; frame < 10; frame++) {
			// Update all widgets
			for (let i = 0; i < entities.length; i++) {
				const eid = entities[i] as number;
				const value = Math.sin(frame * 0.1 + i) * 100;
				setRenderable(world, eid, {
					content: `W${i}: ${value.toFixed(1)}`,
					fg: 0xffffff,
					bg: 0x000000,
				});
			}

			// Re-render
			layoutSystem(world);
			renderSystem(world);
		}

		// Cleanup
		for (const eid of entities) {
			removeEntity(world, eid);
		}
	});

	bench('mixed widgets: 20 charts + 20 gauges + 20 text concurrent update', () => {
		const { createWorld } = require('../src/core/world');
		const { addEntity, removeEntity } = require('../src/core/ecs');
		const { initializeScreen } = require('../src/components/screen');
		const { createChart } = require('../src/widgets/chart');
		const { createGauge } = require('../src/widgets/gauge');
		const { setPosition } = require('../src/components/position');
		const { setDimensions } = require('../src/components/dimensions');
		const { setRenderable } = require('../src/components/renderable');
		const { layoutSystem } = require('../src/systems/layoutSystem');
		const { renderSystem } = require('../src/systems/renderSystem');

		const world = createWorld();
		initializeScreen(world, 240, 80);

		const entities: number[] = [];

		// Create 20 charts
		const charts: Array<{ eid: number; data: number[] }> = [];
		for (let i = 0; i < 20; i++) {
			const eid = addEntity(world);
			const data = Array.from({ length: 30 }, () => Math.random() * 100);
			createChart(world, eid, {
				position: { x: (i % 5) * 48, y: Math.floor(i / 5) * 20 },
				dimensions: { width: 48, height: 15 },
				type: 'sparkline',
				data,
			});
			charts.push({ eid, data });
			entities.push(eid);
		}

		// Create 20 gauges
		const gauges: Array<{ eid: number; value: number }> = [];
		for (let i = 0; i < 20; i++) {
			const eid = addEntity(world);
			const value = Math.random() * 100;
			createGauge(world, eid, {
				position: { x: 120 + (i % 5) * 24, y: Math.floor(i / 5) * 20 },
				dimensions: { width: 24, height: 15 },
				value,
				max: 100,
			});
			gauges.push({ eid, value });
			entities.push(eid);
		}

		// Create 20 text widgets
		const textWidgets: number[] = [];
		for (let i = 0; i < 20; i++) {
			const eid = addEntity(world);
			setPosition(world, eid, (i % 10) * 24, 40 + Math.floor(i / 10) * 20);
			setDimensions(world, eid, { width: 24, height: 15 });
			setRenderable(world, eid, {
				content: `Status ${i}: OK`,
				fg: 0x00ff00,
				bg: 0x000000,
			});
			textWidgets.push(eid);
			entities.push(eid);
		}

		// Initial render
		layoutSystem(world);
		renderSystem(world);

		// Update ALL 60 widgets simultaneously in one frame
		// Update charts: shift data and add new value
		for (const chart of charts) {
			chart.data.shift();
			chart.data.push(Math.random() * 100);
			createChart(world, chart.eid, { data: chart.data });
		}

		// Update gauges: new random value
		for (const gauge of gauges) {
			gauge.value = Math.random() * 100;
			createGauge(world, gauge.eid, { value: gauge.value });
		}

		// Update text widgets: cycle through statuses
		const statuses = ['OK', 'WARN', 'ERROR', 'IDLE'];
		const colors = [0x00ff00, 0xffff00, 0xff0000, 0x808080];
		for (let i = 0; i < textWidgets.length; i++) {
			const eid = textWidgets[i] as number;
			const statusIdx = Math.floor(Math.random() * statuses.length);
			setRenderable(world, eid, {
				content: `Status ${i}: ${statuses[statusIdx]}`,
				fg: colors[statusIdx] as number,
				bg: 0x000000,
			});
		}

		// Re-render with all updates
		layoutSystem(world);
		renderSystem(world);

		// Cleanup
		for (const eid of entities) {
			removeEntity(world, eid);
		}
	});

	bench('dashboard burst: 50 widgets updating @ 60 FPS for 100 frames', () => {
		const { createWorld } = require('../src/core/world');
		const { addEntity, removeEntity } = require('../src/core/ecs');
		const { setPosition } = require('../src/components/position');
		const { setDimensions } = require('../src/components/dimensions');
		const { setRenderable } = require('../src/components/renderable');
		const { initializeScreen } = require('../src/components/screen');
		const { layoutSystem } = require('../src/systems/layoutSystem');
		const { renderSystem } = require('../src/systems/renderSystem');

		const world = createWorld();
		initializeScreen(world, 160, 48);

		// Create 50 widgets
		const entities: number[] = [];
		const cols = 10;
		const rows = 5;
		const widgetWidth = Math.floor(160 / cols);
		const widgetHeight = Math.floor(48 / rows);

		for (let i = 0; i < 50; i++) {
			const eid = addEntity(world);
			const col = i % cols;
			const row = Math.floor(i / cols);
			setPosition(world, eid, col * widgetWidth, row * widgetHeight);
			setDimensions(world, eid, { width: widgetWidth, height: widgetHeight });
			setRenderable(world, eid, {
				content: `W${i}: 0.00`,
				fg: 0xffffff,
				bg: 0x000000,
			});
			entities.push(eid);
		}

		// Initial render
		layoutSystem(world);
		renderSystem(world);

		// Simulate 100 frames @ 60 FPS with all widgets updating every frame
		for (let frame = 0; frame < 100; frame++) {
			// Update all 50 widgets
			for (let i = 0; i < entities.length; i++) {
				const eid = entities[i] as number;
				// Simulate realistic metric: sine wave + noise
				const base = Math.sin(frame * 0.05 + i * 0.1) * 50 + 50;
				const noise = (Math.random() - 0.5) * 10;
				const value = base + noise;

				setRenderable(world, eid, {
					content: `W${i}: ${value.toFixed(2)}`,
					fg: 0xffffff,
					bg: 0x000000,
				});
			}

			// Re-render
			layoutSystem(world);
			renderSystem(world);
		}

		// Cleanup
		for (const eid of entities) {
			removeEntity(world, eid);
		}
	});
});
