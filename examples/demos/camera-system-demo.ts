#!/usr/bin/env node
/** Camera System Demo - viewport following a target with smoothing and bounds.
 * Run: npx tsx examples/demos/camera-system-demo.ts | Quit: q or Ctrl+C */
import { createWorld, addEntity, setPosition, getPosition } from 'blecsd';
import type { Entity, World } from 'blecsd';
import { setCamera, setCameraTarget, updateCameraFollow, worldToScreen, isInView, getCamera, setCameraBounds } from '../../src/components/camera';

const stdout = process.stdout;
const [termW, termH] = [stdout.columns ?? 80, stdout.rows ?? 24];
stdout.write('\x1b[?1049h\x1b[?25l');
const world = createWorld() as World;

// World is 200x60, camera viewport is terminal-sized
const [worldW, worldH] = [200, 60];
const player = addEntity(world) as Entity;
setPosition(world, player, 100, 30);
const cam = addEntity(world) as Entity;
setCamera(world, cam, { width: termW - 2, height: termH - 5 });
setCameraBounds(world, cam, { minX: 0, maxX: worldW, minY: 0, maxY: worldH });
setCameraTarget(world, cam, player, 0.15);

// Scatter some landmarks
const marks = Array.from({ length: 20 }, () => ({ x: Math.floor(Math.random() * worldW), y: Math.floor(Math.random() * worldH), ch: '*+#@o'[Math.floor(Math.random() * 5)] }));
let lastT = performance.now();

function render(): void {
	const now = performance.now(), dt = (now - lastT) / 1000; lastT = now;
	updateCameraFollow(world, cam, dt);
	const camD = getCamera(world, cam), pPos = getPosition(world, player);
	if (!camD || !pPos) return;
	stdout.write('\x1b[H\x1b[2J');
	stdout.write('\x1b[1;3H\x1b[1;36mCamera System Demo\x1b[0m');
	stdout.write(`\x1b[2;3H\x1b[90mPlayer: (${pPos.x.toFixed(0)},${pPos.y.toFixed(0)}) | Cam: (${camD.x.toFixed(0)},${camD.y.toFixed(0)}) | World: ${worldW}x${worldH}\x1b[0m`);
	// Render landmarks relative to camera
	for (const m of marks) {
		if (!isInView(world, cam, m.x, m.y)) continue;
		const s = worldToScreen(world, cam, m.x, m.y);
		if (!s) continue;
		const sx = s.x + 1, sy = s.y + 4;
		if (sx >= 1 && sx <= termW && sy >= 3 && sy < termH - 1) stdout.write(`\x1b[${sy};${sx}H\x1b[33m${m.ch}\x1b[0m`);
	}
	// Render player
	const ps = worldToScreen(world, cam, pPos.x, pPos.y);
	if (ps) { const px = ps.x + 1, py = ps.y + 4; if (px >= 1 && py >= 3) stdout.write(`\x1b[${py};${px}H\x1b[1;32m@\x1b[0m`); }
	stdout.write(`\x1b[${termH};1H\x1b[33m[Arrows] Move player  [q] Quit\x1b[0m`);
}

render();
const timer = setInterval(render, 50);
process.stdin.setRawMode?.(true);
process.stdin.resume();
process.stdin.on('data', (data: Buffer) => {
	const key = data.toString();
	if (key === 'q' || key === 'Q' || key === '\x03') { clearInterval(timer); stdout.write('\x1b[?25h\x1b[?1049l'); process.exit(0); }
	const p = getPosition(world, player); if (!p) return;
	const sp = 2;
	if (key === '\x1b[A' || key === 'k') setPosition(world, player, p.x, Math.max(0, p.y - sp));
	if (key === '\x1b[B' || key === 'j') setPosition(world, player, p.x, Math.min(worldH, p.y + sp));
	if (key === '\x1b[D' || key === 'h') setPosition(world, player, Math.max(0, p.x - sp), p.y);
	if (key === '\x1b[C' || key === 'l') setPosition(world, player, Math.min(worldW, p.x + sp), p.y);
});
