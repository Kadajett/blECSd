#!/usr/bin/env node
/** Hover Tooltips Demo - tooltip system with delays and keyboard navigation.
 * Run: npx tsx examples/demos/hover-tooltips-demo.ts | Quit: q or Ctrl+C */
import { createHoverTextManager } from 'blecsd/widgets';

const stdout = process.stdout;
const [width, height] = [stdout.columns ?? 80, stdout.rows ?? 24];
stdout.write('\x1b[?1049h\x1b[?25l');

const manager = createHoverTextManager({ showDelay: 300, hideDelay: 100, offsetX: 2, offsetY: 1, screenWidth: width, screenHeight: height });

const buttons = [
	{ id: 1, x: 5, y: 4, label: '[ Save ]', tooltip: 'Save the current file to disk (Ctrl+S)' },
	{ id: 2, x: 20, y: 4, label: '[ Open ]', tooltip: 'Open a file from the filesystem' },
	{ id: 3, x: 35, y: 4, label: '[ Close ]', tooltip: 'Close the current tab' },
	{ id: 4, x: 5, y: 8, label: '[ Settings ]', tooltip: 'Configure application preferences' },
	{ id: 5, x: 20, y: 8, label: '[ Help ]', tooltip: 'View documentation and shortcuts' },
	{ id: 6, x: 35, y: 8, label: '[ About ]', tooltip: 'blECSd Terminal UI Library v0.1' },
];
for (const b of buttons) manager.setHoverText(b.id, b.tooltip);

let idx = 0;
let lastTime = Date.now();

function render(): void {
	stdout.write('\x1b[H\x1b[2J');
	stdout.write('\x1b[1;3H\x1b[1;36mHover Tooltips Demo\x1b[0m');
	stdout.write('\x1b[2;3H\x1b[90mNavigate with arrows, tooltips appear after delay\x1b[0m');
	for (let i = 0; i < buttons.length; i++) {
		const b = buttons[i]; if (!b) continue;
		const hl = i === idx;
		stdout.write(`\x1b[${b.y};${b.x}H${hl ? '>' : ' '}${hl ? '\x1b[1;33m' : '\x1b[37m'}${b.label}\x1b[0m`);
	}
	const now = Date.now();
	const dt = (now - lastTime) / 1000;
	lastTime = now;
	const b = buttons[idx];
	if (b) manager.updateMouse(b.x + 4, b.y, b.id);
	manager.update(dt);
	const tip = manager.getRenderData();
	if (tip) {
		const tx = Math.min(tip.position.x, width - tip.text.length - 4);
		const ty = Math.min(tip.position.y, height - 3);
		const border = `+${'-'.repeat(tip.text.length + 2)}+`;
		stdout.write(`\x1b[${ty};${tx}H\x1b[43;30m${border}\x1b[0m`);
		stdout.write(`\x1b[${ty + 1};${tx}H\x1b[43;30m| ${tip.text} |\x1b[0m`);
		stdout.write(`\x1b[${ty + 2};${tx}H\x1b[43;30m${border}\x1b[0m`);
	}
	stdout.write(`\x1b[${Math.min(height - 1, 12)};1H\x1b[33m[Left/Right] Navigate  [q] Quit\x1b[0m`);
}

render();
const timer = setInterval(render, 100);

process.stdin.setRawMode?.(true);
process.stdin.resume();
process.stdin.on('data', (data: Buffer) => {
	const key = data.toString();
	if (key === 'q' || key === 'Q' || key === '\x03') { clearInterval(timer); stdout.write('\x1b[?25h\x1b[?1049l'); process.exit(0); }
	if (key === '\x1b[C' || key === 'l') idx = (idx + 1) % buttons.length;
	if (key === '\x1b[D' || key === 'h') idx = (idx - 1 + buttons.length) % buttons.length;
	render();
});
