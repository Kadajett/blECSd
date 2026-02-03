/**
 * Terminal Doom: A Doom source port rendering to the terminal via Kitty graphics protocol.
 *
 * Usage:
 *   pnpm dev [path/to/doom1.wad]
 *
 * Requires a Kitty-protocol compatible terminal (Kitty, WezTerm, Ghostty).
 *
 * To obtain doom1.wad (shareware, freely distributable):
 *   - Download from https://www.doomworld.com/classicdoom/info/shareware.php
 *   - Or: https://archive.org/details/2020_03_22_DOOM
 *   - Place doom1.wad in the examples/doom/ directory
 *
 * Controls:
 *   W/Up     - Move forward
 *   S/Down   - Move backward
 *   A/Left   - Turn left
 *   D/Right  - Turn right
 *   Q/,      - Strafe left
 *   E/.      - Strafe right
 *   Ctrl+C   - Quit
 *
 * @module doom
 */

import { three } from 'blecsd';

import { ANGLETOFINESHIFT, FINEMASK, finecosine, finesine, generateTables } from './math/angles.js';
import { FRACBITS, FRACUNIT } from './math/fixed.js';
import { initRenderTables, updateFlatScales } from './math/tables.js';
import { loadWad } from './wad/wad.js';
import { loadMap } from './wad/mapData.js';
import { parsePlaypal, parseColormap } from './render/palette.js';
import { loadTextures } from './render/textures.js';
import { createRenderState } from './render/defs.js';
import { renderBspNode } from './render/bsp.js';
import { drawPlanes } from './render/planes.js';
import { createPlayer, updatePlayer } from './game/player.js';
import { setupInput, pollInput, cleanupInput } from './game/input.js';

// ─── Configuration ─────────────────────────────────────────────────

const SCREEN_WIDTH = 320;
const SCREEN_HEIGHT = 200;
const TARGET_FPS = 30;
const TICRATE = 35;
const FRAME_TIME = 1000 / TARGET_FPS;

// ─── Main ──────────────────────────────────────────────────────────

function main(): void {
	const wadPath = process.argv[2] || './doom1.wad';
	const mapName = process.argv[3] || 'E1M1';

	// Initialize math tables
	generateTables();
	initRenderTables(SCREEN_WIDTH, SCREEN_HEIGHT);

	// Load WAD
	console.log(`Loading WAD: ${wadPath}`);
	let wad;
	try {
		wad = loadWad(wadPath);
	} catch (err) {
		console.error(`Failed to load WAD file: ${wadPath}`);
		console.error('');
		console.error('To obtain doom1.wad (shareware, freely distributable):');
		console.error('  1. Download from https://www.doomworld.com/classicdoom/info/shareware.php');
		console.error('  2. Or from: https://archive.org/details/2020_03_22_DOOM');
		console.error('  3. Place doom1.wad in the examples/doom/ directory');
		console.error('  4. Run: pnpm dev ./doom1.wad');
		process.exit(1);
	}

	console.log(`WAD type: ${wad.header.type}, ${wad.directory.length} lumps`);

	// Load map
	console.log(`Loading map: ${mapName}`);
	const map = loadMap(wad, mapName);
	console.log(
		`Map loaded: ${map.vertexes.length} vertices, ${map.linedefs.length} linedefs, ` +
		`${map.nodes.length} nodes, ${map.sectors.length} sectors, ${map.things.length} things`,
	);

	// Load palette and colormaps
	const playpal = parsePlaypal(wad.raw.subarray(
		wad.directory.find((e) => e.name === 'PLAYPAL')?.filepos ?? 0,
		(wad.directory.find((e) => e.name === 'PLAYPAL')?.filepos ?? 0) +
		(wad.directory.find((e) => e.name === 'PLAYPAL')?.size ?? 0),
	));
	const colormap = parseColormap(wad.raw.subarray(
		wad.directory.find((e) => e.name === 'COLORMAP')?.filepos ?? 0,
		(wad.directory.find((e) => e.name === 'COLORMAP')?.filepos ?? 0) +
		(wad.directory.find((e) => e.name === 'COLORMAP')?.size ?? 0),
	));
	const palette = playpal[0]!;

	// Load textures
	console.log('Loading textures...');
	const textures = loadTextures(wad);
	console.log(
		`Textures: ${textures.textureDefs.length} wall textures, ` +
		`${textures.flatByName.size} flats, ${textures.patchNames.length} patches`,
	);

	// Create framebuffer and backend
	const fb = three.createPixelFramebuffer({
		width: SCREEN_WIDTH,
		height: SCREEN_HEIGHT,
		enableDepthBuffer: true,
	});
	const backend = three.createKittyBackend({ imageId: 1, chunkSize: 1024 * 1024 });

	// Create player
	const player = createPlayer(map);
	console.log(
		`Player start: (${player.x >> FRACBITS}, ${player.y >> FRACBITS}) ` +
		`angle: ${Math.round(((player.angle >>> 0) / 0x100000000) * 360)}`,
	);

	// Enter alt screen, hide cursor
	process.stdout.write('\x1b[?1049h'); // alt screen
	process.stdout.write('\x1b[?25l');   // hide cursor

	// Set up input
	setupInput();

	// Frame counter
	let frameCount = 0;
	let lastFpsTime = Date.now();
	let fps = 0;

	// ─── Frame Loop ────────────────────────────────────────────────

	function frame(): void {
		const frameStart = Date.now();

		// Process input
		const input = pollInput();

		// Check for quit
		if (input.keys.has('c') && input.ctrl) {
			shutdown();
			return;
		}
		if (input.keys.has('escape')) {
			shutdown();
			return;
		}

		// Update player
		updatePlayer(player, input, map);

		// Set up render state
		const rs = createRenderState(fb, map, textures, palette, colormap);
		rs.viewx = player.x;
		rs.viewy = player.y;
		rs.viewz = player.viewz;
		rs.viewangle = player.angle;

		const fineAngle = (player.angle >> ANGLETOFINESHIFT) & FINEMASK;
		rs.viewcos = finecosine[fineAngle] ?? FRACUNIT;
		rs.viewsin = finesine[fineAngle] ?? 0;

		// Recalculate flat scales for current view angle (matching R_ClearPlanes)
		updateFlatScales(player.angle);

		// Clear framebuffer
		three.clearFramebuffer(fb, { r: 0, g: 0, b: 0, a: 255 });

		// Render BSP (walls)
		if (map.nodes.length > 0) {
			renderBspNode(rs, map.nodes.length - 1);
		}

		// Render floors and ceilings
		drawPlanes(rs);

		// Encode and output
		const encoded = backend.encode(fb, 0, 0);
		if (encoded.escape) {
			// Position at top-left and write
			process.stdout.write(`\x1b[1;1H${encoded.escape}`);
		}

		// FPS counter
		frameCount++;
		const now = Date.now();
		if (now - lastFpsTime >= 1000) {
			fps = frameCount;
			frameCount = 0;
			lastFpsTime = now;
		}

		// Schedule next frame
		const elapsed = Date.now() - frameStart;
		const delay = Math.max(1, FRAME_TIME - elapsed);
		setTimeout(frame, delay);
	}

	// Start the loop
	console.log('Starting render loop...');
	setTimeout(frame, 100);
}

// ─── Shutdown ──────────────────────────────────────────────────────

function shutdown(): void {
	cleanupInput();
	process.stdout.write('\x1b[?25h');   // show cursor
	process.stdout.write('\x1b[?1049l'); // exit alt screen
	console.log('Terminal Doom exited.');
	process.exit(0);
}

// Handle signals
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Run
main();
