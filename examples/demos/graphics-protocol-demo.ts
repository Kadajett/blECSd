#!/usr/bin/env node
/** Graphics Protocol Demo - pluggable backend abstraction for image rendering.
 * Run: npx tsx examples/demos/graphics-protocol-demo.ts | Quit: q or Ctrl+C */
import { createGraphicsManager, registerBackend, getActiveBackend, renderImage, clearImage, refreshBackend, DEFAULT_FALLBACK_CHAIN } from '../../src/terminal/graphics/backend';
import type { GraphicsBackend, ImageData as GfxImageData } from '../../src/terminal/graphics/backend';

const stdout = process.stdout;
const height = stdout.rows ?? 24;
stdout.write('\x1b[?1049h\x1b[?25l');

// Create mock backends for demonstration
function makeMock(name: 'kitty' | 'iterm2' | 'sixel' | 'ansi' | 'ascii', supported: boolean): GraphicsBackend {
	return {
		name, isSupported: () => supported,
		capabilities: { staticImages: true, animation: name === 'kitty', alphaChannel: name !== 'ascii', maxWidth: null, maxHeight: null },
		render: (img, opts) => `[${name}:${img.width}x${img.height}@${opts.x},${opts.y}]`,
		clear: (id) => `[${name}:clear${id ? ':' + id : ''}]`,
	};
}

const manager = createGraphicsManager();
const backendSupport = { kitty: false, iterm2: false, sixel: false, ansi: true, ascii: true } as Record<string, boolean>;
for (const [name, sup] of Object.entries(backendSupport)) registerBackend(manager, makeMock(name as 'ansi', sup));

// Sample image data
const img: GfxImageData = { width: 32, height: 16, data: new Uint8Array(32 * 16 * 4), format: 'rgba' };
let sel = 0;
const names = Object.keys(backendSupport);

function render(): void {
	stdout.write('\x1b[H\x1b[2J');
	stdout.write('\x1b[1;3H\x1b[1;36mGraphics Protocol Demo\x1b[0m');
	stdout.write('\x1b[2;3H\x1b[90mPluggable backends with automatic fallback selection\x1b[0m');
	stdout.write(`\x1b[4;3H\x1b[90mFallback chain: ${DEFAULT_FALLBACK_CHAIN.join(' > ')}\x1b[0m`);
	// Backend list
	for (let i = 0; i < names.length; i++) {
		const n = names[i]!;
		const sup = backendSupport[n]!;
		const marker = i === sel ? '\x1b[33m> ' : '  ';
		const status = sup ? '\x1b[32m[supported]' : '\x1b[31m[unavail]  ';
		stdout.write(`\x1b[${6 + i};5H${marker}\x1b[37m${n.padEnd(8)} ${status}\x1b[0m`);
	}
	// Active backend info
	refreshBackend(manager);
	const active = getActiveBackend(manager);
	stdout.write(`\x1b[13;3H\x1b[90mActive backend: \x1b[1;32m${active?.name ?? 'none'}\x1b[0m`);
	if (active) {
		const caps = active.capabilities;
		stdout.write(`\x1b[14;5H\x1b[90mStatic: ${caps.staticImages} | Animation: ${caps.animation} | Alpha: ${caps.alphaChannel}\x1b[0m`);
		const out = renderImage(manager, img, { x: 10, y: 5 });
		stdout.write(`\x1b[15;5H\x1b[90mRender output: ${out}\x1b[0m`);
		stdout.write(`\x1b[16;5H\x1b[90mClear output: ${clearImage(manager)}\x1b[0m`);
	}
	stdout.write(`\x1b[${Math.min(height - 1, 19)};1H\x1b[33m[Up/Down] Select  [Space] Toggle support  [q] Quit\x1b[0m`);
}

render();
process.stdin.setRawMode?.(true);
process.stdin.resume();
process.stdin.on('data', (data: Buffer) => {
	const key = data.toString();
	if (key === 'q' || key === 'Q' || key === '\x03') { stdout.write('\x1b[?25h\x1b[?1049l'); process.exit(0); }
	if (key === '\x1b[A' || key === 'k') sel = (sel - 1 + names.length) % names.length;
	if (key === '\x1b[B' || key === 'j') sel = (sel + 1) % names.length;
	if (key === ' ') {
		const n = names[sel]!;
		backendSupport[n] = !backendSupport[n];
		registerBackend(manager, makeMock(n as 'ansi', backendSupport[n]!));
	}
	render();
});
