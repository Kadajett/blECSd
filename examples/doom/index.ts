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
import { loadSprites } from './wad/spriteData.js';
import { spawnMapThings } from './game/spawn.js';
import { renderSprites } from './render/sprites.js';
import { createHudState, drawHud, updateHud } from './render/hud.js';
import { registerActions, initThinkers, runThinkers } from './game/thinkers.js';
import { ACTION_FUNCTIONS } from './game/enemyAI.js';
import { createWeaponState, tickWeapon, processWeaponInput, WEAPON_INFO } from './game/weapons.js';
import { fireHitscan, fireMelee } from './game/hitscan.js';
import { drawWeaponSprite } from './game/psprite.js';
import {
	createGameState,
	canPlayerAct,
	isAwaitingRespawn,
	isGameOver,
	tickDeath,
	respawnPlayer,
} from './game/death.js';
import { createMenuState, updateMenu, isMenuActive } from './game/menu.js';
import { loadTitlePic, drawTitleScreen } from './render/titleScreen.js';
import { tickProjectiles } from './game/projectiles.js';
import {
	createTransitionState,
	createLevelStats,
	triggerExit,
	advanceToIntermission,
	tickIntermission,
	canSkipIntermission,
	skipCounts,
	advanceToLoading,
	completeTransition,
	isInTransition,
	isEpisodeComplete,
	doLoadLevel,
	carryOverPlayerState,
	mapExists,
	TransitionPhase,
} from './game/levelTransition.js';
import { createSpecialsState, useLines, checkWalkTriggers, runSectorThinkers } from './game/specials.js';
import { drawIntermission } from './render/intermission.js';

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
	let map = loadMap(wad, mapName);
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

	// Load sprites
	console.log('Loading sprites...');
	const spriteStore = loadSprites(wad);
	console.log(`Sprites: ${spriteStore.sprites.size} sprite definitions`);

	// Spawn map things
	let mobjs = spawnMapThings(map, 2);
	console.log(`Spawned ${mobjs.length} things`);

	// Initialize enemy AI
	registerActions(ACTION_FUNCTIONS);
	initThinkers(mobjs);
	console.log('Enemy AI initialized');

	// Load title screen picture
	const hasTitlePic = loadTitlePic(wad);
	console.log(`Title screen: ${hasTitlePic ? 'TITLEPIC loaded' : 'fallback'}`);

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

	// Create HUD state
	const hudState = createHudState();

	// Create weapon state
	const weaponState = createWeaponState();

	// Create game state (death/respawn tracking)
	const gameState = createGameState();

	// Create menu state (game starts on title screen)
	const menuState = createMenuState();

	// Create level transition state
	const transitionState = createTransitionState(mapName);
	transitionState.stats = createLevelStats(mobjs);

	// Create specials state (sector movers + exit detection)
	let specialsState = createSpecialsState(player);
	specialsState.onExit = (secret: boolean) => {
		triggerExit(transitionState, mobjs, secret);
	};

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

		// Check for Ctrl+C quit (always active)
		if (input.keys.has('c') && input.ctrl) {
			shutdown();
			return;
		}

		// ─── Menu Mode ──────────────────────────────────────────
		if (isMenuActive(menuState)) {
			const menuResult = updateMenu(menuState, input.keys);

			if (menuResult.quit) {
				shutdown();
				return;
			}

			// Draw title screen with menu overlays
			drawTitleScreen(fb, palette, menuState);

			// Encode and output
			const encoded = backend.encode(fb, 0, 0);
			if (encoded.escape) {
				process.stdout.write(`\x1b[1;1H${encoded.escape}`);
			}

			// Schedule next frame
			const elapsed = Date.now() - frameStart;
			const delay = Math.max(1, FRAME_TIME - elapsed);
			setTimeout(frame, delay);
			return;
		}

		// ─── Gameplay Mode ──────────────────────────────────────

		// Escape quits during gameplay
		if (input.keys.has('escape')) {
			shutdown();
			return;
		}

		// ─── Transition: Exiting ────────────────────────────────
		if (transitionState.phase === TransitionPhase.EXITING) {
			advanceToIntermission(transitionState);
		}

		// ─── Transition: Intermission ───────────────────────────
		if (transitionState.phase === TransitionPhase.INTERMISSION) {
			tickIntermission(transitionState);

			// Space skips count animation or advances past intermission
			if (input.keys.has('space')) {
				if (!transitionState.countsFinished) {
					skipCounts(transitionState);
				} else if (canSkipIntermission(transitionState)) {
					advanceToLoading(transitionState);
				}
			}

			// Draw intermission screen
			drawIntermission(fb, palette, transitionState);

			// Encode and output
			const encoded = backend.encode(fb, 0, 0);
			if (encoded.escape) {
				process.stdout.write(`\x1b[1;1H${encoded.escape}`);
			}

			// Schedule next frame (skip gameplay rendering)
			const elapsed = Date.now() - frameStart;
			const delay = Math.max(1, FRAME_TIME - elapsed);
			setTimeout(frame, delay);
			return;
		}

		// ─── Transition: Loading ────────────────────────────────
		if (transitionState.phase === TransitionPhase.LOADING) {
			const nextMapName = transitionState.nextMap;

			if (!nextMapName || isEpisodeComplete(transitionState) || !mapExists(wad, nextMapName)) {
				// Episode complete or no next map: reset to title
				completeTransition(transitionState, transitionState.currentMap, mobjs);
				shutdown();
				return;
			}

			// Save current player state for carryover
			const oldHealth = player.health;
			const oldArmor = player.armor;
			const oldAmmo = player.ammo;
			const oldMaxAmmo = player.maxAmmo;
			const oldWeaponCurrent = weaponState.current;
			const oldWeaponOwned = [...weaponState.owned];
			const oldWeaponAmmo = [...weaponState.ammo];
			const oldWeaponMaxAmmo = [...weaponState.maxAmmo];

			// Load the new level
			const result = doLoadLevel(wad, nextMapName, 2);
			map = result.map;
			mobjs = result.mobjs;

			// Reset player to new map start
			const freshPlayer = createPlayer(map);
			player.x = freshPlayer.x;
			player.y = freshPlayer.y;
			player.z = freshPlayer.z;
			player.angle = freshPlayer.angle;
			player.viewz = freshPlayer.viewz;
			player.viewheight = freshPlayer.viewheight;
			player.deltaviewheight = freshPlayer.deltaviewheight;
			player.momx = 0;
			player.momy = 0;
			player.sectorIndex = freshPlayer.sectorIndex;

			// Carry over persistent stats
			player.health = oldHealth;
			player.armor = oldArmor;
			player.ammo = oldAmmo;
			player.maxAmmo = oldMaxAmmo;

			// Carry over weapons
			weaponState.current = oldWeaponCurrent;
			weaponState.owned = oldWeaponOwned;
			weaponState.ammo = oldWeaponAmmo;
			weaponState.maxAmmo = oldWeaponMaxAmmo;
			weaponState.pendingWeapon = -1;
			weaponState.state = 0; // WS_RAISE
			weaponState.tics = 6;
			weaponState.frame = 0;
			weaponState.ready = false;
			weaponState.bobX = 0;
			weaponState.bobY = 0;
			weaponState.flashTics = 0;

			// Reset game state to playing
			gameState.phase = 0; // GamePhase.PLAYING
			gameState.deathTics = 0;

			// Reset specials state for new map
			specialsState = createSpecialsState(player);
			specialsState.onExit = (secret: boolean) => {
				triggerExit(transitionState, mobjs, secret);
			};

			// Complete transition
			completeTransition(transitionState, nextMapName, mobjs);

			console.log(`Loaded map: ${nextMapName}`);
		}

		// ─── Gameplay ───────────────────────────────────────────

		// Handle respawn input (USE key while dead)
		if (isAwaitingRespawn(gameState) && input.keys.has('space')) {
			respawnPlayer(gameState, player, weaponState, map);
		}

		// Tick death animation if dying
		tickDeath(gameState, player);

		// Update player and weapons only when alive
		let extralight = 0;
		if (canPlayerAct(gameState) && !isInTransition(transitionState)) {
			updatePlayer(player, input, map);
			updateHud(hudState, input);

			// Check for USE key (interact with specials)
			if (input.keys.has('e') || input.keys.has('space')) {
				useLines(player, map, specialsState);
			}

			// Check walk triggers
			checkWalkTriggers(player, map, specialsState);

			// Process weapon input and tick
			const firing = processWeaponInput(weaponState, input.keys);
			const shouldFire = tickWeapon(weaponState, player, firing);

			if (shouldFire) {
				const info = WEAPON_INFO[weaponState.current];
				if (info) {
					if (info.melee) {
						fireMelee(player, mobjs, info.damage);
					} else {
						for (let p = 0; p < info.pellets; p++) {
							const pelletDamage = ((Math.random() * info.damage | 0) + 1);
							fireHitscan(player, map, mobjs, pelletDamage, info.spread);
						}
					}
				}
			}

			// Apply muzzle flash extralight
			extralight = weaponState.flashTics > 0 ? 2 : 0;
		}

		// Run enemy AI thinkers (still run while dying for ambient animation)
		runThinkers(mobjs, player, gameState, map);

		// Move projectiles and check collisions
		tickProjectiles(mobjs, player, map);

		// Run sector movers (doors, lifts, platforms, crushers)
		runSectorThinkers(specialsState, map);

		// Set up render state
		const rs = createRenderState(fb, map, textures, palette, colormap);
		rs.viewx = player.x;
		rs.viewy = player.y;
		rs.viewz = player.viewz;
		rs.viewangle = player.angle;

		const fineAngle = (player.angle >> ANGLETOFINESHIFT) & FINEMASK;
		rs.viewcos = finecosine[fineAngle] ?? FRACUNIT;
		rs.viewsin = finesine[fineAngle] ?? 0;
		rs.extralight = extralight;

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

		// Render sprites
		renderSprites(rs, mobjs, spriteStore);

		// Render weapon sprite overlay (only when alive)
		if (canPlayerAct(gameState)) {
			drawWeaponSprite(rs, weaponState, spriteStore);
		}

		// Draw HUD
		drawHud(rs, player, hudState, map);

		// Draw death/game over overlay
		if (isAwaitingRespawn(gameState)) {
			drawDeathOverlay(rs, gameState.lives);
		} else if (isGameOver(gameState)) {
			drawGameOverOverlay(rs);
		}

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

// ─── Death / Game Over Overlays ─────────────────────────────────────

/**
 * Draw a red-tinted "YOU DIED" overlay with respawn prompt.
 * Shows remaining lives and "Press SPACE to respawn".
 */
function drawDeathOverlay(rs: { fb: ReturnType<typeof three.createPixelFramebuffer>; screenWidth: number; screenHeight: number }, lives: number): void {
	// Red tint over entire screen
	applyRedTint(rs);

	// Center text: "YOU DIED" and "PRESS SPACE TO RESPAWN"
	const cx = Math.floor(rs.screenWidth / 2);
	const cy = Math.floor(rs.screenHeight / 2) - 20;

	drawOverlayText(rs, cx - 24, cy, 'YOU DIED', 255, 40, 40);
	drawOverlayText(rs, cx - 60, cy + 16, 'PRESS SPACE TO RESPAWN', 200, 200, 200);
	drawOverlayText(rs, cx - 24, cy + 32, `LIVES: ${lives}`, 200, 200, 0);
}

/**
 * Draw a "GAME OVER" overlay.
 */
function drawGameOverOverlay(rs: { fb: ReturnType<typeof three.createPixelFramebuffer>; screenWidth: number; screenHeight: number }): void {
	// Deep red tint
	applyRedTint(rs);

	const cx = Math.floor(rs.screenWidth / 2);
	const cy = Math.floor(rs.screenHeight / 2) - 10;

	drawOverlayText(rs, cx - 27, cy, 'GAME OVER', 255, 0, 0);
}

/**
 * Apply a red tint to the framebuffer by blending red into every pixel.
 */
function applyRedTint(rs: { fb: ReturnType<typeof three.createPixelFramebuffer>; screenWidth: number; screenHeight: number }): void {
	const data = rs.fb.data;
	for (let i = 0; i < data.length; i += 4) {
		// Blend toward red: increase red channel, reduce green and blue
		const r = data[i] ?? 0;
		const g = data[i + 1] ?? 0;
		const b = data[i + 2] ?? 0;
		data[i] = Math.min(255, r + 60);
		data[i + 1] = Math.floor(g * 0.4);
		data[i + 2] = Math.floor(b * 0.4);
	}
}

/**
 * Draw simple text at a position using 3x5 minimal font.
 * Each character is 4px wide (3px char + 1px gap).
 */
function drawOverlayText(
	rs: { fb: ReturnType<typeof three.createPixelFramebuffer>; screenWidth: number; screenHeight: number },
	x: number,
	y: number,
	text: string,
	r: number,
	g: number,
	b: number,
): void {
	for (let i = 0; i < text.length; i++) {
		const ch = text[i];
		if (!ch || ch === ' ') continue;
		const pattern = OVERLAY_FONT[ch];
		if (!pattern) continue;
		const cx = x + i * 4;
		for (let row = 0; row < pattern.length; row++) {
			const line = pattern[row];
			if (!line) continue;
			for (let col = 0; col < line.length; col++) {
				if (line[col] !== '#') continue;
				const px = cx + col;
				const py = y + row;
				if (px >= 0 && px < rs.screenWidth && py >= 0 && py < rs.screenHeight) {
					three.setPixelUnsafe(rs.fb, px, py, r, g, b, 255);
				}
			}
		}
	}
}

/** Minimal 3x5 font for overlay messages. */
const OVERLAY_FONT: Readonly<Record<string, readonly string[]>> = {
	A: ['###', '# #', '###', '# #', '# #'],
	B: ['## ', '# #', '## ', '# #', '## '],
	C: ['###', '#  ', '#  ', '#  ', '###'],
	D: ['## ', '# #', '# #', '# #', '## '],
	E: ['###', '#  ', '## ', '#  ', '###'],
	G: ['###', '#  ', '# #', '# #', '###'],
	I: ['###', ' # ', ' # ', ' # ', '###'],
	L: ['#  ', '#  ', '#  ', '#  ', '###'],
	M: ['# #', '###', '###', '# #', '# #'],
	N: ['# #', '## ', '###', '# #', '# #'],
	O: ['###', '# #', '# #', '# #', '###'],
	P: ['###', '# #', '###', '#  ', '#  '],
	R: ['###', '# #', '## ', '# #', '# #'],
	S: ['###', '#  ', '###', '  #', '###'],
	T: ['###', ' # ', ' # ', ' # ', ' # '],
	U: ['# #', '# #', '# #', '# #', '###'],
	V: ['# #', '# #', '# #', '# #', ' # '],
	W: ['# #', '# #', '###', '###', '# #'],
	Y: ['# #', '# #', '###', ' # ', ' # '],
	':': ['   ', ' # ', '   ', ' # ', '   '],
	'0': ['###', '# #', '# #', '# #', '###'],
	'1': [' # ', '## ', ' # ', ' # ', '###'],
	'2': ['###', '  #', '###', '#  ', '###'],
	'3': ['###', '  #', '###', '  #', '###'],
	'4': ['# #', '# #', '###', '  #', '  #'],
	'5': ['###', '#  ', '###', '  #', '###'],
	'6': ['###', '#  ', '###', '# #', '###'],
	'7': ['###', '  #', ' # ', ' # ', ' # '],
	'8': ['###', '# #', '###', '# #', '###'],
	'9': ['###', '# #', '###', '  #', '###'],
};

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
