/**
 * Real-World Scenario Benchmark: Dashboard with Multiple Panels
 *
 * Simulates a monitoring dashboard with:
 * - Multiple updating panels (charts, gauges, stats)
 * - Real-time data updates (60 FPS)
 * - Layout recalculations
 * - Rendering pipeline
 */

import { describe, bench } from 'vitest';
import { addEntity } from '../src/core/ecs';
import type { World } from '../src/core/types';
import { createWorld } from '../src/core/world';
import { setPosition } from '../src/components/position';
import { setDimensions } from '../src/components/dimensions';
import { setRenderable } from '../src/components/renderable';
import { layoutSystem } from '../src/systems/layoutSystem';
import { renderSystem } from '../src/systems/renderSystem';
import { createScheduler, LoopPhase } from '../src/core/scheduler';
import { initializeScreen } from '../src/components/screen';

/**
 * Creates a dashboard with multiple panels
 */
function createDashboard(world: World, panelCount: number): number[] {
	const panels: number[] = [];
	const cols = Math.ceil(Math.sqrt(panelCount));
	const rows = Math.ceil(panelCount / cols);
	const panelWidth = Math.floor(80 / cols);
	const panelHeight = Math.floor(24 / rows);

	for (let i = 0; i < panelCount; i++) {
		const col = i % cols;
		const row = Math.floor(i / cols);

		const panel = addEntity(world);
		setPosition(world, panel, col * panelWidth, row * panelHeight);
		setDimensions(world, panel, { width: panelWidth, height: panelHeight });
		setRenderable(world, panel, {
			content: `Panel ${i + 1}`,
			fg: 0xffffff,
			bg: 0x000000,
		});

		panels.push(panel);
	}

	return panels;
}

/**
 * Simulates data update for a panel
 */
function updatePanelData(world: World, panelId: number, value: number): void {
	setRenderable(world, panelId, {
		content: `Value: ${value.toFixed(2)}`,
		fg: 0xffffff,
		bg: 0x000000,
	});
}

describe('Dashboard Scenario', () => {
	bench('4-panel dashboard @ 60 FPS (1000 frames)', () => {
		const world = createWorld();
		initializeScreen(world, 80, 24);
		const scheduler = createScheduler();
		scheduler.registerSystem(LoopPhase.LAYOUT, layoutSystem);
		scheduler.registerSystem(LoopPhase.RENDER, renderSystem);

		const panels = createDashboard(world, 4);
		const deltaTime = 1 / 60; // 60 FPS

		// Simulate 1000 frames of updates
		for (let frame = 0; frame < 1000; frame++) {
			// Update each panel with simulated data
			for (let i = 0; i < panels.length; i++) {
				const value = Math.sin(frame * 0.1 + i) * 100;
				updatePanelData(world, panels[i] as number, value);
			}

			// Run layout and render
			scheduler.run(world, deltaTime);
		}
	});

	bench('16-panel dashboard @ 60 FPS (1000 frames)', () => {
		const world = createWorld();
		initializeScreen(world, 80, 24);
		const scheduler = createScheduler();
		scheduler.registerSystem(LoopPhase.LAYOUT, layoutSystem);
		scheduler.registerSystem(LoopPhase.RENDER, renderSystem);

		const panels = createDashboard(world, 16);
		const deltaTime = 1 / 60;

		for (let frame = 0; frame < 1000; frame++) {
			for (let i = 0; i < panels.length; i++) {
				const value = Math.sin(frame * 0.1 + i) * 100;
				updatePanelData(world, panels[i] as number, value);
			}

			scheduler.run(world, deltaTime);
		}
	});

	bench('64-panel dashboard @ 60 FPS (1000 frames)', () => {
		const world = createWorld();
		initializeScreen(world, 160, 48); // Larger screen for more panels
		const scheduler = createScheduler();
		scheduler.registerSystem(LoopPhase.LAYOUT, layoutSystem);
		scheduler.registerSystem(LoopPhase.RENDER, renderSystem);

		const panels = createDashboard(world, 64);
		const deltaTime = 1 / 60;

		for (let frame = 0; frame < 1000; frame++) {
			for (let i = 0; i < panels.length; i++) {
				const value = Math.sin(frame * 0.1 + i) * 100;
				updatePanelData(world, panels[i] as number, value);
			}

			scheduler.run(world, deltaTime);
		}
	});
});
