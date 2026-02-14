/**
 * Panel Drag and Resize Benchmarks
 *
 * Measures drag system performance for panel movement and resize operations.
 *
 * Run with: pnpm bench src/benchmarks/drag.bench.ts
 *
 * @module benchmarks/drag
 */

import { addComponent, addEntity, createWorld } from '../core/ecs';
import { bench, describe } from 'vitest';
import { Dimensions, setDimensions } from '../components/dimensions';
import { Hierarchy, setParent } from '../components/hierarchy';
import { Interactive } from '../components/interactive';
import { setInteractive } from '../systems/interactiveSystem';
import { Position, setPosition } from '../components/position';
import { Renderable } from '../components/renderable';
import { createEventBus } from '../core/events';
import type { Entity, World } from '../core/types';
import {
	clearDragConstraints,
	createDragSystem,
	type DragEventMap,
	resetDragStores,
	setDragConstraints,
	setDragVerifyCallback,
} from '../systems/dragSystem';

// =============================================================================
// SETUP HELPERS
// =============================================================================

/**
 * Creates a world with a container and draggable panels.
 */
function createPanelWorld(panelCount: number): {
	world: World;
	container: Entity;
	panels: Entity[];
} {
	const world = createWorld() as World;

	// Create a container
	const container = addEntity(world) as Entity;
	addComponent(world, container, Position);
	addComponent(world, container, Dimensions);
	setPosition(world, container, 0, 0);
	setDimensions(world, container, 200, 100);

	// Create draggable panels
	const panels: Entity[] = [];
	for (let i = 0; i < panelCount; i++) {
		const panel = addEntity(world) as Entity;
		addComponent(world, panel, Position);
		addComponent(world, panel, Dimensions);
		addComponent(world, panel, Renderable);
		addComponent(world, panel, Hierarchy);
		addComponent(world, panel, Interactive);

		// Set up panel
		setPosition(world, panel, (i * 25) % 180, (i * 10) % 80);
		setDimensions(world, panel, 20, 10);
		setParent(world, panel, container);
		setInteractive(world, panel, { draggable: true });

		panels.push(panel);
	}

	return { world, container, panels };
}

/**
 * Cleans up after a benchmark iteration.
 */
function cleanup(): void {
	resetDragStores();
}

// =============================================================================
// DRAG SYSTEM CREATION BENCHMARKS
// =============================================================================

describe('Drag System Creation', () => {
	bench('create drag system', () => {
		const eventBus = createEventBus<DragEventMap>();
		createDragSystem(eventBus);
	});
});

// =============================================================================
// DRAG START/END BENCHMARKS
// =============================================================================

describe('Drag Start/End', () => {
	describe('start drag', () => {
		bench('start drag - no constraints', () => {
			const { world, panels } = createPanelWorld(1);
			const eventBus = createEventBus<DragEventMap>();
			const dragSystem = createDragSystem(eventBus);
			const panel = panels[0]!;

			dragSystem.startDrag(world, panel, 10, 5);
			dragSystem.endDrag(world);

			cleanup();
		});

		bench('start drag - with constraints', () => {
			const { world, panels } = createPanelWorld(1);
			const eventBus = createEventBus<DragEventMap>();
			const dragSystem = createDragSystem(eventBus);
			const panel = panels[0]!;

			setDragConstraints(world, panel, {
				constrainToParent: true,
				snapToGrid: { x: 5, y: 5 },
				minX: 0,
				maxX: 180,
				bringToFront: true,
			});

			dragSystem.startDrag(world, panel, 10, 5);
			dragSystem.endDrag(world);

			clearDragConstraints(world, panel);
			cleanup();
		});
	});

	describe('start/end cycle', () => {
		let world: World;
		let panels: Entity[];
		let eventBus: ReturnType<typeof createEventBus<DragEventMap>>;
		let dragSystem: ReturnType<typeof createDragSystem>;

		bench(
			'100 start/end cycles',
			() => {
				for (let i = 0; i < 100; i++) {
					const panel = panels[i % panels.length]!;
					dragSystem.startDrag(world, panel, 10, 5);
					dragSystem.endDrag(world);
				}
			},
			{
				setup() {
					cleanup();
					const setup = createPanelWorld(10);
					world = setup.world;
					panels = setup.panels;
					eventBus = createEventBus<DragEventMap>();
					dragSystem = createDragSystem(eventBus);
				},
			},
		);
	});
});

// =============================================================================
// DRAG MOVEMENT BENCHMARKS
// =============================================================================

describe('Drag Movement', () => {
	describe('unconstrained drag', () => {
		let world: World;
		let panel: Entity;
		let dragSystem: ReturnType<typeof createDragSystem>;

		bench(
			'100 drag updates - no constraints',
			() => {
				for (let i = 0; i < 100; i++) {
					dragSystem.updateDrag(world, 10 + i, 5 + (i % 50));
				}
			},
			{
				setup() {
					cleanup();
					const setup = createPanelWorld(1);
					world = setup.world;
					panel = setup.panels[0]!;
					const eventBus = createEventBus<DragEventMap>();
					dragSystem = createDragSystem(eventBus);
					dragSystem.startDrag(world, panel, 10, 5);
				},
			},
		);

		bench(
			'1,000 drag updates - no constraints',
			() => {
				for (let i = 0; i < 1000; i++) {
					dragSystem.updateDrag(world, 10 + (i % 180), 5 + (i % 80));
				}
			},
			{
				setup() {
					cleanup();
					const setup = createPanelWorld(1);
					world = setup.world;
					panel = setup.panels[0]!;
					const eventBus = createEventBus<DragEventMap>();
					dragSystem = createDragSystem(eventBus);
					dragSystem.startDrag(world, panel, 10, 5);
				},
			},
		);
	});

	describe('constrained drag', () => {
		let world: World;
		let panel: Entity;
		let dragSystem: ReturnType<typeof createDragSystem>;

		bench(
			'100 drag updates - parent bounds constraint',
			() => {
				for (let i = 0; i < 100; i++) {
					dragSystem.updateDrag(world, 10 + i, 5 + (i % 50));
				}
			},
			{
				setup() {
					cleanup();
					const setup = createPanelWorld(1);
					world = setup.world;
					panel = setup.panels[0]!;

					setDragConstraints(world, panel, {
						constrainToParent: true,
					});

					const eventBus = createEventBus<DragEventMap>();
					dragSystem = createDragSystem(eventBus);
					dragSystem.startDrag(world, panel, 10, 5);
				},
			},
		);

		bench(
			'100 drag updates - grid snap',
			() => {
				for (let i = 0; i < 100; i++) {
					dragSystem.updateDrag(world, 10 + i, 5 + (i % 50));
				}
			},
			{
				setup() {
					cleanup();
					const setup = createPanelWorld(1);
					world = setup.world;
					panel = setup.panels[0]!;

					setDragConstraints(world, panel, {
						snapToGrid: { x: 5, y: 5 },
					});

					const eventBus = createEventBus<DragEventMap>();
					dragSystem = createDragSystem(eventBus);
					dragSystem.startDrag(world, panel, 10, 5);
				},
			},
		);

		bench(
			'100 drag updates - axis lock (x only)',
			() => {
				for (let i = 0; i < 100; i++) {
					dragSystem.updateDrag(world, 10 + i, 5 + (i % 50));
				}
			},
			{
				setup() {
					cleanup();
					const setup = createPanelWorld(1);
					world = setup.world;
					panel = setup.panels[0]!;

					setDragConstraints(world, panel, {
						constrainAxis: 'x',
					});

					const eventBus = createEventBus<DragEventMap>();
					dragSystem = createDragSystem(eventBus);
					dragSystem.startDrag(world, panel, 10, 5);
				},
			},
		);

		bench(
			'100 drag updates - all constraints combined',
			() => {
				for (let i = 0; i < 100; i++) {
					dragSystem.updateDrag(world, 10 + i, 5 + (i % 50));
				}
			},
			{
				setup() {
					cleanup();
					const setup = createPanelWorld(1);
					world = setup.world;
					panel = setup.panels[0]!;

					setDragConstraints(world, panel, {
						constrainToParent: true,
						snapToGrid: { x: 5, y: 5 },
						minX: 0,
						maxX: 180,
						minY: 0,
						maxY: 90,
						bringToFront: true,
					});

					const eventBus = createEventBus<DragEventMap>();
					dragSystem = createDragSystem(eventBus);
					dragSystem.startDrag(world, panel, 10, 5);
				},
			},
		);
	});

	describe('drag with verification callback', () => {
		let world: World;
		let panel: Entity;
		let dragSystem: ReturnType<typeof createDragSystem>;

		bench(
			'100 drag updates - with verify callback',
			() => {
				for (let i = 0; i < 100; i++) {
					dragSystem.updateDrag(world, 10 + i, 5 + (i % 50));
				}
			},
			{
				setup() {
					cleanup();
					const setup = createPanelWorld(1);
					world = setup.world;
					panel = setup.panels[0]!;

					setDragVerifyCallback(world, panel, (_entity, _dx, _dy) => {
						// Simulate some verification logic
						return true;
					});

					const eventBus = createEventBus<DragEventMap>();
					dragSystem = createDragSystem(eventBus);
					dragSystem.startDrag(world, panel, 10, 5);
				},
			},
		);
	});
});

// =============================================================================
// RESIZE SIMULATION BENCHMARKS
// =============================================================================

describe('Resize Operations', () => {
	describe('dimension updates (simulating resize)', () => {
		let world: World;
		let panel: Entity;

		bench(
			'100 dimension updates',
			() => {
				for (let i = 0; i < 100; i++) {
					setDimensions(world, panel, 20 + (i % 30), 10 + (i % 20));
				}
			},
			{
				setup() {
					const setup = createPanelWorld(1);
					world = setup.world;
					panel = setup.panels[0]!;
				},
			},
		);

		bench(
			'1,000 dimension updates',
			() => {
				for (let i = 0; i < 1000; i++) {
					setDimensions(world, panel, 20 + (i % 30), 10 + (i % 20));
				}
			},
			{
				setup() {
					const setup = createPanelWorld(1);
					world = setup.world;
					panel = setup.panels[0]!;
				},
			},
		);
	});

	describe('combined move + resize', () => {
		let world: World;
		let panel: Entity;
		let dragSystem: ReturnType<typeof createDragSystem>;

		bench(
			'100 move + resize cycles',
			() => {
				for (let i = 0; i < 100; i++) {
					// Simulate drag movement
					dragSystem.updateDrag(world, 10 + i, 5 + (i % 50));
					// Simulate resize
					setDimensions(world, panel, 20 + (i % 30), 10 + (i % 20));
				}
			},
			{
				setup() {
					cleanup();
					const setup = createPanelWorld(1);
					world = setup.world;
					panel = setup.panels[0]!;
					const eventBus = createEventBus<DragEventMap>();
					dragSystem = createDragSystem(eventBus);
					dragSystem.startDrag(world, panel, 10, 5);
				},
			},
		);
	});
});

// =============================================================================
// MULTI-PANEL BENCHMARKS
// =============================================================================

describe('Multi-Panel Operations', () => {
	describe('rapid panel switching', () => {
		let world: World;
		let panels: Entity[];
		let dragSystem: ReturnType<typeof createDragSystem>;

		bench(
			'switch between 10 panels (100 switches)',
			() => {
				for (let i = 0; i < 100; i++) {
					const panel = panels[i % panels.length]!;
					dragSystem.startDrag(world, panel, 10, 5);
					dragSystem.updateDrag(world, 15, 10);
					dragSystem.endDrag(world);
				}
			},
			{
				setup() {
					cleanup();
					const setup = createPanelWorld(10);
					world = setup.world;
					panels = setup.panels;
					const eventBus = createEventBus<DragEventMap>();
					dragSystem = createDragSystem(eventBus);
				},
			},
		);
	});

	describe('constraint lookup with many panels', () => {
		let world: World;
		let panels: Entity[];

		bench(
			'set/get constraints for 100 panels',
			() => {
				for (const panel of panels) {
					setDragConstraints(world, panel, {
						constrainToParent: true,
						snapToGrid: { x: 5, y: 5 },
					});
				}
			},
			{
				setup() {
					cleanup();
					const setup = createPanelWorld(100);
					world = setup.world;
					panels = setup.panels;
				},
			},
		);
	});
});

// =============================================================================
// 60 FPS SIMULATION
// =============================================================================

describe('60 FPS Drag Simulation', () => {
	let world: World;
	let panel: Entity;
	let dragSystem: ReturnType<typeof createDragSystem>;

	bench(
		'1 second of 60fps drag (60 frames)',
		() => {
			// Simulate 60 frames of continuous drag
			for (let frame = 0; frame < 60; frame++) {
				dragSystem.updateDrag(world, 10 + frame * 2, 5 + frame);
			}
		},
		{
			setup() {
				cleanup();
				const setup = createPanelWorld(1);
				world = setup.world;
				panel = setup.panels[0]!;

				setDragConstraints(world, panel, {
					constrainToParent: true,
					snapToGrid: { x: 1, y: 1 },
				});

				const eventBus = createEventBus<DragEventMap>();
				dragSystem = createDragSystem(eventBus);
				dragSystem.startDrag(world, panel, 10, 5);
			},
		},
	);

	bench(
		'1 second of 60fps drag with events (60 frames)',
		() => {
			// Simulate 60 frames of continuous drag
			for (let frame = 0; frame < 60; frame++) {
				dragSystem.updateDrag(world, 10 + frame * 2, 5 + frame);
			}
		},
		{
			setup() {
				cleanup();
				const setup = createPanelWorld(1);
				world = setup.world;
				panel = setup.panels[0]!;

				const eventBus = createEventBus<DragEventMap>();

				// Add event listeners to simulate real-world usage
				eventBus.on('drag', (_e) => {
					// Simulate UI update
				});

				dragSystem = createDragSystem(eventBus);
				dragSystem.startDrag(world, panel, 10, 5);
			},
		},
	);
});
