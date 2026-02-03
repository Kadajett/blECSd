/**
 * 3D OBJ Viewer Example
 *
 * Loads an OBJ model file and renders it in the terminal.
 * Falls back to a generated sphere if no file is provided.
 *
 * Usage: pnpm dev [path/to/model.obj]
 * Quit: Ctrl+C
 */

import { readFileSync } from 'fs';
import { addEntity, createWorld } from 'bitecs';
import {
	type Entity,
	type World,
	three,
	createViewport3D,
} from 'blecsd';

// Parse CLI args
const objPath = process.argv[2];

// Create ECS world
const world = createWorld() as World;

const VIEWPORT_WIDTH = 70;
const VIEWPORT_HEIGHT = 24;

// Create viewport
const vpEntity = addEntity(world) as Entity;
const viewport = createViewport3D(world, vpEntity, {
	left: 2,
	top: 1,
	width: VIEWPORT_WIDTH,
	height: VIEWPORT_HEIGHT,
	fov: Math.PI / 3,
	backend: 'braille',
});

// Load mesh
let meshId: number;
let modelName: string;

if (objPath) {
	try {
		const objSource = readFileSync(objPath, 'utf-8');
		meshId = three.loadObjAsMesh(objSource, { name: objPath });
		modelName = objPath;
	} catch (err) {
		console.error(`Failed to load ${objPath}: ${(err as Error).message}`);
		console.error('Falling back to generated sphere...');
		meshId = three.createSphereMesh({ radius: 1.5, widthSegments: 24, heightSegments: 12 });
		modelName = 'sphere (fallback)';
	}
} else {
	meshId = three.createSphereMesh({ radius: 1.5, widthSegments: 24, heightSegments: 12 });
	modelName = 'sphere (default)';
}

// Add mesh to scene
const meshEid = viewport.addMesh(meshId, { tz: -5 }, {
	renderMode: 'wireframe',
	wireColor: 0x00FF88,
});

// Position camera
viewport.setCameraPosition(0, 0, 0);

// Frame timing
let lastTime = Date.now();
const TARGET_FPS = 30;
const FRAME_MS = 1000 / TARGET_FPS;
let rotationY = 0;

// Hide cursor and clear screen
process.stdout.write('\x1B[?25l\x1B[2J');

function frame(): void {
	const now = Date.now();
	const dt = (now - lastTime) / 1000;
	lastTime = now;

	// Rotate the model
	rotationY += 0.8 * dt;
	three.Transform3D.ry[meshEid] = rotationY;
	three.Transform3D.dirty[meshEid] = 1;

	// Run 3D pipeline
	three.sceneGraphSystem(world);
	three.projectionSystem(world);
	three.rasterSystem(world);
	three.viewportOutputSystem(world);

	// Get output
	const output = three.outputStore.get(vpEntity);
	if (!output?.encoded.cells) return;

	// Render to terminal
	let ansi = '';
	for (const cell of output.encoded.cells) {
		ansi += `\x1B[${cell.y + 1};${cell.x + 1}H`;
		if (cell.char !== '\u2800') {
			const r = (cell.fg >> 16) & 0xff;
			const g = (cell.fg >> 8) & 0xff;
			const b = cell.fg & 0xff;
			ansi += `\x1B[38;2;${r};${g};${b}m${cell.char}\x1B[0m`;
		} else {
			ansi += ' ';
		}
	}

	// Draw info
	const title = ` OBJ Viewer - ${modelName} `;
	const titleX = Math.floor((VIEWPORT_WIDTH - title.length) / 2) + 2;
	ansi += `\x1B[1;${titleX}H\x1B[1;36m${title}\x1B[0m`;

	const fps = dt > 0 ? Math.round(1 / dt) : 0;
	const meshData = three.getMeshData(meshId);
	const vertCount = meshData?.vertexCount ?? 0;
	ansi += `\x1B[${VIEWPORT_HEIGHT + 2};2H\x1B[90mFPS: ${fps}  Vertices: ${vertCount}  Press Ctrl+C to quit\x1B[0m`;

	process.stdout.write(ansi);
}

const interval = setInterval(frame, FRAME_MS);

function cleanup(): void {
	clearInterval(interval);
	process.stdout.write('\x1B[?25h\x1B[0m');
	process.stdout.write(`\x1B[${VIEWPORT_HEIGHT + 4};1H`);
	process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
