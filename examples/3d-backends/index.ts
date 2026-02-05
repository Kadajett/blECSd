/**
 * 3D Backend Comparison Demo
 *
 * Renders the same rotating cube in 5 viewports simultaneously,
 * one per backend: braille, halfblock, sextant, sixel, kitty.
 *
 * Run: pnpm dev
 * Quit: Ctrl+C
 */

import { addEntity, createWorld } from 'blecsd';
import {
	type Entity,
	type World,
	three,
	createViewport3D,
} from 'blecsd';

// Backend names and their display labels
const BACKENDS = ['braille', 'halfblock', 'sextant', 'sixel', 'kitty'] as const;
type BackendName = typeof BACKENDS[number];

// Layout constants
const VP_WIDTH = 22;
const VP_HEIGHT = 10;
const H_GAP = 2;
const V_GAP = 2;
const LEFT_MARGIN = 2;
const TOP_MARGIN = 3;

// Positions for 5 viewports: 3 on top row, 2 on bottom row
function getViewportPosition(index: number): { left: number; top: number } {
	const row = index < 3 ? 0 : 1;
	const col = index < 3 ? index : index - 3;
	return {
		left: LEFT_MARGIN + col * (VP_WIDTH + H_GAP),
		top: TOP_MARGIN + row * (VP_HEIGHT + V_GAP + 1), // +1 for label row
	};
}

// Create ECS world
const world = createWorld() as World;

// Create a shared cube mesh
const cubeId = three.createCubeMesh({ size: 1.5 });

// Create a viewport and cube entity for each backend
const viewports: Array<{ vpEntity: Entity; widget: ReturnType<typeof createViewport3D>; backend: BackendName }> = [];
const cubeEntities: Entity[] = [];

for (let i = 0; i < BACKENDS.length; i++) {
	const backend = BACKENDS[i]!;
	const pos = getViewportPosition(i);

	const vpEntity = addEntity(world) as Entity;
	const widget = createViewport3D(world, vpEntity, {
		left: pos.left,
		top: pos.top,
		width: VP_WIDTH,
		height: VP_HEIGHT,
		fov: Math.PI / 3,
		backend,
	});

	// Add a cube to the scene (shared mesh ID, per-viewport entity)
	const cubeEid = widget.addMesh(cubeId, { tz: -5 });
	cubeEntities.push(cubeEid);

	// Set up rotation animation
	three.setAnimation3D(world, cubeEid, {
		rotateSpeed: { x: 0.8, y: 1.2, z: 0.3 },
	});

	// Position camera
	widget.setCameraPosition(0, 0, 0);

	viewports.push({ vpEntity, widget, backend });
}

// Frame timing
let lastTime = Date.now();
const TARGET_FPS = 30;
const FRAME_MS = 1000 / TARGET_FPS;

// Hide cursor and clear screen
process.stdout.write('\x1B[?25l');
process.stdout.write('\x1B[2J');

// Draw title
const title = ' 3D Backend Comparison - blECSd ';
process.stdout.write(`\x1B[1;${LEFT_MARGIN}H\x1B[1;36m${title}\x1B[0m`);

// Draw backend labels (static, drawn once)
for (let i = 0; i < viewports.length; i++) {
	const vp = viewports[i]!;
	const pos = getViewportPosition(i);
	const label = `[${vp.backend}]`;
	process.stdout.write(`\x1B[${pos.top};${pos.left}H\x1B[1;33m${label}\x1B[0m`);
}

// Format a 24-bit RGB color as ANSI foreground escape
function fgColor(rgb: number): string {
	const r = (rgb >> 16) & 0xff;
	const g = (rgb >> 8) & 0xff;
	const b = rgb & 0xff;
	return `\x1B[38;2;${r};${g};${b}m`;
}

function bgColor(rgb: number): string {
	const r = (rgb >> 16) & 0xff;
	const g = (rgb >> 8) & 0xff;
	const b = rgb & 0xff;
	return `\x1B[48;2;${r};${g};${b}m`;
}

function frame(): void {
	const now = Date.now();
	const dt = (now - lastTime) / 1000;
	lastTime = now;

	// Manually update rotation for all cube entities
	for (const cubeEid of cubeEntities) {
		three.Transform3D.rx[cubeEid] = (three.Transform3D.rx[cubeEid] as number) + 0.8 * dt;
		three.Transform3D.ry[cubeEid] = (three.Transform3D.ry[cubeEid] as number) + 1.2 * dt;
		three.Transform3D.rz[cubeEid] = (three.Transform3D.rz[cubeEid] as number) + 0.3 * dt;
		three.Transform3D.dirty[cubeEid] = 1;
	}

	// Run 3D pipeline
	three.sceneGraphSystem(world);
	three.projectionSystem(world);
	three.rasterSystem(world);
	three.viewportOutputSystem(world);

	// Render each viewport's output to terminal
	let ansi = '';

	for (const { vpEntity, backend } of viewports) {
		const output = three.outputStore.get(vpEntity);
		if (!output) continue;

		if (output.encoded.cells) {
			// Cell-based backends: braille, halfblock, sextant
			for (const cell of output.encoded.cells) {
				ansi += `\x1B[${cell.y + 1};${cell.x + 1}H`;

				// Determine if it's a "blank" cell based on backend type
				const isBlank = isBlankChar(cell.char, backend);

				if (!isBlank) {
					ansi += fgColor(cell.fg);
					if (cell.bg > 0) {
						ansi += bgColor(cell.bg);
					}
					ansi += `${cell.char}\x1B[0m`;
				} else {
					ansi += ' ';
				}
			}
		}

		if (output.encoded.escape) {
			// Escape-based backends: sixel, kitty
			// Position cursor at viewport top-left, then write the escape sequence
			const pos = getViewportPosition(BACKENDS.indexOf(backend as BackendName));
			ansi += `\x1B[${pos.top + 1};${pos.left}H`;
			ansi += output.encoded.escape;
		}
	}

	// Draw FPS counter
	const fps = dt > 0 ? Math.round(1 / dt) : 0;
	const bottomRow = TOP_MARGIN + 2 * (VP_HEIGHT + V_GAP + 1) + 1;
	ansi += `\x1B[${bottomRow};${LEFT_MARGIN}H\x1B[90mFPS: ${fps}  Press Ctrl+C to quit\x1B[0m`;

	process.stdout.write(ansi);
}

/** Check if a character is the "empty" character for the given backend. */
function isBlankChar(char: string, backend: string): boolean {
	switch (backend) {
		case 'braille':
			return char === '\u2800'; // Braille empty pattern
		case 'halfblock':
			return char === ' ';
		case 'sextant':
			return char === ' ';
		default:
			return char === ' ';
	}
}

// Run frame loop
const interval = setInterval(frame, FRAME_MS);

// Clean up on exit
function cleanup(): void {
	clearInterval(interval);
	process.stdout.write('\x1B[?25h'); // Show cursor
	process.stdout.write('\x1B[0m');   // Reset attributes
	const bottomRow = TOP_MARGIN + 2 * (VP_HEIGHT + V_GAP + 1) + 2;
	process.stdout.write(`\x1B[${bottomRow};1H`); // Move below viewports
	process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
