/**
 * Real-World Scenario Benchmark: Dashboard with Animated Widgets
 *
 * Simulates a monitoring dashboard with multiple animated widgets:
 * - Progress bars updating continuously
 * - Sparklines showing real-time metrics
 * - Scrolling text/log feeds
 * - Gauges with smooth value transitions
 *
 * Measures frame time with multiple concurrent animations.
 */

import { bench, describe } from 'vitest';

describe('Animation Scenario', () => {
	bench('animated dashboard: 5 progress bars @ 60 FPS (500 frames)', () => {
		const { createWorld } = require('../src/core/world');
		const { addEntity, removeEntity } = require('../src/core/ecs');
		const { initializeScreen } = require('../src/components/screen');
		const { createProgressBar } = require('../src/widgets/progressBar');
		const { layoutSystem } = require('../src/systems/layoutSystem');
		const { renderSystem } = require('../src/systems/renderSystem');

		const world = createWorld();
		initializeScreen(world, 80, 24);

		// Create 5 progress bars
		const progressBars: Array<{ eid: number; progress: number; direction: number }> = [];
		for (let i = 0; i < 5; i++) {
			const eid = addEntity(world);
			const bar = createProgressBar(world, eid, {
				position: { x: 5, y: i * 4 + 2 },
				dimensions: { width: 70, height: 3 },
				value: 0,
				max: 100,
			});
			progressBars.push({ eid, progress: 0, direction: 1 });
		}

		// Initial render
		layoutSystem(world);
		renderSystem(world);

		// Simulate 500 frames at 60 FPS
		for (let frame = 0; frame < 500; frame++) {
			// Update each progress bar
			for (const bar of progressBars) {
				// Animate progress: bounce between 0 and 100
				bar.progress += bar.direction * 2;
				if (bar.progress >= 100) {
					bar.progress = 100;
					bar.direction = -1;
				} else if (bar.progress <= 0) {
					bar.progress = 0;
					bar.direction = 1;
				}

				// Update progress bar value
				const barWidget = createProgressBar(world, bar.eid, {
					value: bar.progress,
				});
			}

			// Re-render
			layoutSystem(world);
			renderSystem(world);
		}

		// Cleanup
		for (const bar of progressBars) {
			removeEntity(world, bar.eid);
		}
	});

	bench('animated dashboard: 3 sparklines + 3 gauges @ 60 FPS (500 frames)', () => {
		const { createWorld } = require('../src/core/world');
		const { addEntity, removeEntity } = require('../src/core/ecs');
		const { initializeScreen } = require('../src/components/screen');
		const { createChart } = require('../src/widgets/chart');
		const { createGauge } = require('../src/widgets/gauge');
		const { layoutSystem } = require('../src/systems/layoutSystem');
		const { renderSystem } = require('../src/systems/renderSystem');

		const world = createWorld();
		initializeScreen(world, 120, 40);

		// Create 3 sparkline charts
		const sparklines: Array<{ eid: number; data: number[] }> = [];
		for (let i = 0; i < 3; i++) {
			const eid = addEntity(world);
			createChart(world, eid, {
				position: { x: i * 40, y: 0 },
				dimensions: { width: 40, height: 15 },
				type: 'sparkline',
				data: Array.from({ length: 40 }, () => Math.random() * 100),
			});
			sparklines.push({
				eid,
				data: Array.from({ length: 40 }, () => Math.random() * 100),
			});
		}

		// Create 3 gauges
		const gauges: Array<{ eid: number; value: number; target: number }> = [];
		for (let i = 0; i < 3; i++) {
			const eid = addEntity(world);
			const value = Math.random() * 100;
			createGauge(world, eid, {
				position: { x: i * 40, y: 20 },
				dimensions: { width: 40, height: 15 },
				value,
				max: 100,
			});
			gauges.push({ eid, value, target: value });
		}

		// Initial render
		layoutSystem(world);
		renderSystem(world);

		// Simulate 500 frames
		for (let frame = 0; frame < 500; frame++) {
			// Update sparklines: shift data left and add new value
			for (const sparkline of sparklines) {
				sparkline.data.shift();
				sparkline.data.push(Math.random() * 100);

				createChart(world, sparkline.eid, {
					data: sparkline.data,
				});
			}

			// Update gauges: smooth transition to random target
			for (const gauge of gauges) {
				// Pick new random target every 60 frames
				if (frame % 60 === 0) {
					gauge.target = Math.random() * 100;
				}

				// Smooth interpolation toward target
				const diff = gauge.target - gauge.value;
				gauge.value += diff * 0.1;

				createGauge(world, gauge.eid, {
					value: gauge.value,
				});
			}

			// Re-render
			layoutSystem(world);
			renderSystem(world);
		}

		// Cleanup
		for (const sparkline of sparklines) {
			removeEntity(world, sparkline.eid);
		}
		for (const gauge of gauges) {
			removeEntity(world, gauge.eid);
		}
	});

	bench('animated dashboard: scrolling text feed @ 60 FPS (500 frames)', () => {
		const { createWorld } = require('../src/core/world');
		const { addEntity, removeEntity } = require('../src/core/ecs');
		const { initializeScreen } = require('../src/components/screen');
		const { createStreamingText } = require('../src/widgets/streamingText');
		const { layoutSystem } = require('../src/systems/layoutSystem');
		const { renderSystem } = require('../src/systems/renderSystem');

		const world = createWorld();
		initializeScreen(world, 80, 24);

		// Create 3 scrolling log feeds
		const feeds: number[] = [];
		for (let i = 0; i < 3; i++) {
			const eid = addEntity(world);
			createStreamingText(world, eid, {
				position: { x: i * 27, y: 0 },
				dimensions: { width: 26, height: 24 },
				scrollback: 1000,
			});
			feeds.push(eid);
		}

		// Initial render
		layoutSystem(world);
		renderSystem(world);

		// Simulate 500 frames with new log lines
		const logMessages = [
			'[INFO] Service started',
			'[DEBUG] Processing request',
			'[WARN] High memory usage',
			'[ERROR] Connection timeout',
			'[INFO] Request completed',
			'[DEBUG] Cache hit',
			'[WARN] Slow query detected',
			'[INFO] User authenticated',
		];

		for (let frame = 0; frame < 500; frame++) {
			// Add new log line to each feed every 5 frames
			if (frame % 5 === 0) {
				for (const feedEid of feeds) {
					const msg = logMessages[Math.floor(Math.random() * logMessages.length)];
					const timestamp = new Date().toISOString();
					const line = `${timestamp} ${msg}`;

					const widget = createStreamingText(world, feedEid, {});
					widget.appendLine(line);
				}
			}

			// Re-render
			layoutSystem(world);
			renderSystem(world);
		}

		// Cleanup
		for (const feedEid of feeds) {
			removeEntity(world, feedEid);
		}
	});

	bench('animated dashboard: combined animations (10 widgets) @ 60 FPS (500 frames)', () => {
		const { createWorld } = require('../src/core/world');
		const { addEntity, removeEntity } = require('../src/core/ecs');
		const { initializeScreen } = require('../src/components/screen');
		const { createProgressBar } = require('../src/widgets/progressBar');
		const { createChart } = require('../src/widgets/chart');
		const { createGauge } = require('../src/widgets/gauge');
		const { createStreamingText } = require('../src/widgets/streamingText');
		const { layoutSystem } = require('../src/systems/layoutSystem');
		const { renderSystem } = require('../src/systems/renderSystem');

		const world = createWorld();
		initializeScreen(world, 160, 48);

		const entities: number[] = [];

		// 2 progress bars
		const progressBars: Array<{ eid: number; progress: number; direction: number }> = [];
		for (let i = 0; i < 2; i++) {
			const eid = addEntity(world);
			createProgressBar(world, eid, {
				position: { x: 5, y: i * 8 + 2 },
				dimensions: { width: 70, height: 3 },
				value: 0,
				max: 100,
			});
			progressBars.push({ eid, progress: 0, direction: 1 });
			entities.push(eid);
		}

		// 3 sparklines
		const sparklines: Array<{ eid: number; data: number[] }> = [];
		for (let i = 0; i < 3; i++) {
			const eid = addEntity(world);
			createChart(world, eid, {
				position: { x: i * 53, y: 20 },
				dimensions: { width: 50, height: 12 },
				type: 'sparkline',
				data: Array.from({ length: 50 }, () => Math.random() * 100),
			});
			sparklines.push({
				eid,
				data: Array.from({ length: 50 }, () => Math.random() * 100),
			});
			entities.push(eid);
		}

		// 3 gauges
		const gauges: Array<{ eid: number; value: number; target: number }> = [];
		for (let i = 0; i < 3; i++) {
			const eid = addEntity(world);
			const value = Math.random() * 100;
			createGauge(world, eid, {
				position: { x: i * 53, y: 33 },
				dimensions: { width: 50, height: 12 },
				value,
				max: 100,
			});
			gauges.push({ eid, value, target: value });
			entities.push(eid);
		}

		// 2 scrolling text feeds
		const feeds: number[] = [];
		for (let i = 0; i < 2; i++) {
			const eid = addEntity(world);
			createStreamingText(world, eid, {
				position: { x: 80 + i * 40, y: 0 },
				dimensions: { width: 38, height: 48 },
				scrollback: 1000,
			});
			feeds.push(eid);
			entities.push(eid);
		}

		// Initial render
		layoutSystem(world);
		renderSystem(world);

		const logMessages = [
			'[INFO] Service started',
			'[DEBUG] Processing request',
			'[WARN] High memory usage',
			'[ERROR] Connection timeout',
		];

		// Simulate 500 frames with all animations running
		for (let frame = 0; frame < 500; frame++) {
			// Update progress bars
			for (const bar of progressBars) {
				bar.progress += bar.direction * 2;
				if (bar.progress >= 100) {
					bar.progress = 100;
					bar.direction = -1;
				} else if (bar.progress <= 0) {
					bar.progress = 0;
					bar.direction = 1;
				}
				createProgressBar(world, bar.eid, { value: bar.progress });
			}

			// Update sparklines
			for (const sparkline of sparklines) {
				sparkline.data.shift();
				sparkline.data.push(Math.random() * 100);
				createChart(world, sparkline.eid, { data: sparkline.data });
			}

			// Update gauges
			for (const gauge of gauges) {
				if (frame % 60 === 0) {
					gauge.target = Math.random() * 100;
				}
				const diff = gauge.target - gauge.value;
				gauge.value += diff * 0.1;
				createGauge(world, gauge.eid, { value: gauge.value });
			}

			// Update scrolling feeds
			if (frame % 5 === 0) {
				for (const feedEid of feeds) {
					const msg = logMessages[Math.floor(Math.random() * logMessages.length)];
					const widget = createStreamingText(world, feedEid, {});
					widget.appendLine(`${new Date().toISOString()} ${msg}`);
				}
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
