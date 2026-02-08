/**
 * Real-World Scenario Benchmark: Log Viewer Scrolling
 *
 * Simulates a log viewer with:
 * - Large datasets (10k-100k lines)
 * - Smooth scrolling
 * - Virtualized rendering
 * - Text search/filtering
 */

import { describe, bench } from 'vitest';
import { addEntity } from '../src/core/ecs';
import type { World } from '../src/core/types';
import { createWorld } from '../src/core/world';
import { setPosition } from '../src/components/position';
import { setDimensions } from '../src/components/dimensions';
import { createVirtualScrollback, appendLine, scrollTo } from '../src/utils/virtualScrollback';
import { layoutSystem } from '../src/systems/layoutSystem';
import { createScheduler, LoopPhase } from '../src/core/scheduler';
import { initializeScreen } from '../src/components/screen';

/**
 * Generates mock log lines
 */
function generateLogLine(index: number): string {
	const timestamp = new Date(Date.now() - (100000 - index) * 1000).toISOString();
	const levels = ['INFO', 'WARN', 'ERROR', 'DEBUG'];
	const level = levels[index % levels.length] as string;
	return `[${timestamp}] ${level}: Log message ${index} with some content here`;
}

/**
 * Creates a log viewer with specified line count
 */
function createLogViewer(world: World, lineCount: number) {
	const viewer = addEntity(world);
	setPosition(world, viewer, 0, 0);
	setDimensions(world, viewer, { width: 80, height: 24 });

	const scrollback = createVirtualScrollback({ maxLines: lineCount });

	// Populate with log lines
	for (let i = 0; i < lineCount; i++) {
		appendLine(scrollback, generateLogLine(i));
	}

	return { viewer, scrollback };
}

describe('Log Viewer Scenario', () => {
	bench('10k lines - scroll through 1000 positions', () => {
		const world = createWorld();
		initializeScreen(world, 80, 24);
		const scheduler = createScheduler();
		scheduler.registerSystem(LoopPhase.LAYOUT, layoutSystem);

		const { scrollback } = createLogViewer(world, 10000);

		// Simulate scrolling through the log
		for (let i = 0; i < 1000; i++) {
			const position = Math.floor((i / 1000) * 9976); // 10000 - 24 visible lines
			scrollTo(scrollback, position);
			scheduler.run(world, 1 / 60);
		}
	});

	bench('50k lines - scroll through 1000 positions', () => {
		const world = createWorld();
		initializeScreen(world, 80, 24);
		const scheduler = createScheduler();
		scheduler.registerSystem(LoopPhase.LAYOUT, layoutSystem);

		const { scrollback } = createLogViewer(world, 50000);

		for (let i = 0; i < 1000; i++) {
			const position = Math.floor((i / 1000) * 49976);
			scrollTo(scrollback, position);
			scheduler.run(world, 1 / 60);
		}
	});

	bench('100k lines - scroll through 1000 positions', () => {
		const world = createWorld();
		initializeScreen(world, 80, 24);
		const scheduler = createScheduler();
		scheduler.registerSystem(LoopPhase.LAYOUT, layoutSystem);

		const { scrollback } = createLogViewer(world, 100000);

		for (let i = 0; i < 1000; i++) {
			const position = Math.floor((i / 1000) * 99976);
			scrollTo(scrollback, position);
			scheduler.run(world, 1 / 60);
		}
	});

	bench('10k lines - rapid append (1000 new lines)', () => {
		const world = createWorld();
		initializeScreen(world, 80, 24);
		const scheduler = createScheduler();
		scheduler.registerSystem(LoopPhase.LAYOUT, layoutSystem);

		const { scrollback } = createLogViewer(world, 10000);

		// Simulate rapid log appending
		for (let i = 0; i < 1000; i++) {
			appendLine(scrollback, generateLogLine(10000 + i));
			// Auto-scroll to bottom
			scrollTo(scrollback, scrollback.totalLines - 24);
			scheduler.run(world, 1 / 60);
		}
	});

	bench('50k lines - search/filter (1000 iterations)', () => {
		const world = createWorld();
		initializeScreen(world, 80, 24);

		const { scrollback } = createLogViewer(world, 50000);

		// Simulate searching through logs
		const searchTerms = ['ERROR', 'WARN', 'INFO', 'DEBUG'];
		let matches = 0;

		for (let i = 0; i < 1000; i++) {
			const term = searchTerms[i % searchTerms.length] as string;
			const lines = scrollback.getLines(0, scrollback.totalLines);

			// Search for term
			for (const line of lines) {
				if (line.includes(term)) {
					matches++;
				}
			}
		}
	});
});
