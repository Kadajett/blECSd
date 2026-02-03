/**
 * 3D Cube Example
 *
 * Renders a rotating wireframe cube in the terminal using braille characters.
 * Demonstrates the 3D rendering pipeline: scene graph, projection, rasterization,
 * and viewport output.
 *
 * Run: pnpm dev
 * Quit: Ctrl+C
 */

import { addEntity, createWorld } from 'bitecs';
import {
	type Entity,
	type World,
	three,
	createViewport3D,
} from 'blecsd';

// Create ECS world
const world = createWorld() as World;

// Terminal dimensions
const VIEWPORT_WIDTH = 60;
const VIEWPORT_HEIGHT = 20;

// Create viewport entity
const vpEntity = addEntity(world) as Entity;
const viewport = createViewport3D(world, vpEntity, {
	left: 2,
	top: 1,
	width: VIEWPORT_WIDTH,
	height: VIEWPORT_HEIGHT,
	fov: Math.PI / 3,
	backend: 'braille',
});

// Create a cube mesh
const cubeId = three.createCubeMesh({ size: 1.5 });

// Add cube to the scene
const cubeEid = viewport.addMesh(cubeId, { tz: -5 });

// Set up animation: rotate the cube
three.setAnimation3D(world, cubeEid, {
	rotateSpeed: { x: 0.8, y: 1.2, z: 0.3 },
});

// Position camera
viewport.setCameraPosition(0, 0, 0);

// Frame timing
let lastTime = Date.now();
const TARGET_FPS = 30;
const FRAME_MS = 1000 / TARGET_FPS;

// Hide cursor
process.stdout.write('\x1B[?25l');
// Clear screen
process.stdout.write('\x1B[2J');

function frame(): void {
	const now = Date.now();
	const dt = (now - lastTime) / 1000;
	lastTime = now;

	// Run animation
	// Manually update rotation since we don't have the scheduler running
	three.Transform3D.rx[cubeEid] = (three.Transform3D.rx[cubeEid] as number) + 0.8 * dt;
	three.Transform3D.ry[cubeEid] = (three.Transform3D.ry[cubeEid] as number) + 1.2 * dt;
	three.Transform3D.rz[cubeEid] = (three.Transform3D.rz[cubeEid] as number) + 0.3 * dt;
	three.Transform3D.dirty[cubeEid] = 1;

	// Run 3D pipeline
	three.sceneGraphSystem(world);
	three.projectionSystem(world);
	three.rasterSystem(world);
	three.viewportOutputSystem(world);

	// Get output
	const output = three.outputStore.get(vpEntity);
	if (!output?.encoded.cells) return;

	// Render cells to terminal
	let ansi = '';
	for (const cell of output.encoded.cells) {
		// Move cursor and write character with color
		ansi += `\x1B[${cell.y + 1};${cell.x + 1}H`;

		if (cell.char !== '\u2800') {
			// Foreground color from cell
			const r = (cell.fg >> 16) & 0xff;
			const g = (cell.fg >> 8) & 0xff;
			const b = cell.fg & 0xff;
			ansi += `\x1B[38;2;${r};${g};${b}m${cell.char}\x1B[0m`;
		} else {
			ansi += ' ';
		}
	}

	// Draw title
	const title = ' 3D Cube - blECSd ';
	const titleX = Math.floor((VIEWPORT_WIDTH - title.length) / 2) + 2;
	ansi += `\x1B[1;${titleX}H\x1B[1;36m${title}\x1B[0m`;

	// Draw FPS counter
	const fps = dt > 0 ? Math.round(1 / dt) : 0;
	ansi += `\x1B[${VIEWPORT_HEIGHT + 2};2H\x1B[90mFPS: ${fps}  Press Ctrl+C to quit\x1B[0m`;

	process.stdout.write(ansi);
}

// Run frame loop
const interval = setInterval(frame, FRAME_MS);

// Clean up on exit
function cleanup(): void {
	clearInterval(interval);
	process.stdout.write('\x1B[?25h'); // Show cursor
	process.stdout.write('\x1B[0m');   // Reset attributes
	process.stdout.write(`\x1B[${VIEWPORT_HEIGHT + 4};1H`); // Move below viewport
	process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
