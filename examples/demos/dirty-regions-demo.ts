#!/usr/bin/env node
/** Dirty Regions Demo - dirty rectangle tracking for optimized rendering.
 * Run: npx tsx examples/demos/dirty-regions-demo.ts | Quit: q or Ctrl+C */
import { createDirtyTracker, markCellDirty, markRegionDirty, getDirtyRegions, clearDirtyTracking, hasDirtyEntities, getDirtyStats } from '../../src/core/dirtyRects';

const stdout = process.stdout;
const [termW, termH] = [stdout.columns ?? 80, stdout.rows ?? 24];
stdout.write('\x1b[?1049h\x1b[?25l');

const gridW = 40, gridH = 12;
const tracker = createDirtyTracker(gridW, gridH);
let mode = 0; // 0 = cell, 1 = region

function render(): void {
	stdout.write('\x1b[H\x1b[2J');
	stdout.write('\x1b[1;3H\x1b[1;36mDirty Regions Demo\x1b[0m');
	stdout.write(`\x1b[2;3H\x1b[90mMode: ${mode === 0 ? 'Random cells' : 'Random regions'} | Grid: ${gridW}x${gridH}\x1b[0m`);
	// Get dirty regions before rendering
	const regions = getDirtyRegions(tracker);
	const stats = getDirtyStats(tracker);
	// Draw grid
	const ox = 3, oy = 4;
	for (let y = 0; y < gridH; y++) for (let x = 0; x < gridW; x++) stdout.write(`\x1b[${oy + y};${ox + x}H\x1b[90m.\x1b[0m`);
	// Highlight dirty regions
	for (const r of regions) {
		for (let y = r.y; y < r.y + r.height && y < gridH; y++)
			for (let x = r.x; x < r.x + r.width && x < gridW; x++)
				stdout.write(`\x1b[${oy + y};${ox + x}H\x1b[41;37m#\x1b[0m`);
	}
	// Stats
	const iy = oy + gridH + 1;
	stdout.write(`\x1b[${iy};3H\x1b[90mDirty: ${hasDirtyEntities(tracker) ? 'yes' : 'no'} | Regions: ${regions.length}\x1b[0m`);
	stdout.write(`\x1b[${iy + 1};3H\x1b[90mCells: ${stats.dirtyCellCount}/${stats.totalCells} (${(stats.dirtyPercentage * 100).toFixed(1)}%)\x1b[0m`);
	if (regions.length > 0) {
		stdout.write(`\x1b[${iy + 2};3H\x1b[90mRegion list:\x1b[0m`);
		for (let i = 0; i < Math.min(regions.length, 4); i++) {
			const r = regions[i]!;
			stdout.write(`\x1b[${iy + 3 + i};5H\x1b[90m${i + 1}. (${r.x},${r.y}) ${r.width}x${r.height}\x1b[0m`);
		}
	}
	stdout.write(`\x1b[${Math.min(termH - 1, iy + 8)};1H\x1b[33m[Space] Add dirty  [c] Clear  [m] Mode  [q] Quit\x1b[0m`);
}

render();
process.stdin.setRawMode?.(true);
process.stdin.resume();
process.stdin.on('data', (data: Buffer) => {
	const key = data.toString();
	if (key === 'q' || key === 'Q' || key === '\x03') { stdout.write('\x1b[?25h\x1b[?1049l'); process.exit(0); }
	if (key === ' ') {
		if (mode === 0) {
			for (let i = 0; i < 8; i++) markCellDirty(tracker, Math.floor(Math.random() * gridW), Math.floor(Math.random() * gridH));
		} else {
			const rx = Math.floor(Math.random() * (gridW - 5)), ry = Math.floor(Math.random() * (gridH - 3));
			markRegionDirty(tracker, rx, ry, 3 + Math.floor(Math.random() * 5), 2 + Math.floor(Math.random() * 3));
		}
	}
	if (key === 'c') clearDirtyTracking(tracker);
	if (key === 'm') mode = 1 - mode;
	render();
});
