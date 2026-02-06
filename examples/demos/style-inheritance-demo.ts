#!/usr/bin/env node
/** Style Inheritance Demo - shows how styles cascade through entity hierarchy.
 * Some properties (fg, bold) inherit; others (bg) are local.
 * Run: npx tsx examples/demos/style-inheritance-demo.ts | Quit: q or Ctrl+C */
import { addEntity, appendChild, createWorld, setStyle } from 'blecsd';
import type { Entity, World } from 'blecsd';
import { INHERITING_PROPERTIES, NON_INHERITING_PROPERTIES, resolveStyle, getLocalStyle, doesPropertyInherit } from '../../src/core/styleInheritance';

const stdout = process.stdout;
const height = stdout.rows ?? 24;
stdout.write('\x1b[?1049h\x1b[?25l');
const world = createWorld() as World;

// Build hierarchy: root -> parent -> child -> grandchild
const root = addEntity(world) as Entity;
const parent = addEntity(world) as Entity;
const child = addEntity(world) as Entity;
const grandchild = addEntity(world) as Entity;
appendChild(world, root, parent);
appendChild(world, parent, child);
appendChild(world, child, grandchild);

// Set styles at different levels
setStyle(world, root, { fg: 0xff0000ff, bold: true }); // Red, bold
setStyle(world, parent, { bg: 0x0000ffff }); // Blue bg (non-inheriting)
setStyle(world, child, { underline: true }); // Adds underline

let sel = 0;
const nodes = [
	{ eid: root, label: 'Root', depth: 0 },
	{ eid: parent, label: 'Parent', depth: 1 },
	{ eid: child, label: 'Child', depth: 2 },
	{ eid: grandchild, label: 'Grandchild', depth: 3 },
];

function fmt(s: Record<string, unknown>): string {
	const p: string[] = [];
	if (s.fg) p.push(`fg=0x${(s.fg as number).toString(16).padStart(8, '0')}`);
	if (s.bg) p.push(`bg=0x${(s.bg as number).toString(16).padStart(8, '0')}`);
	for (const k of ['bold', 'underline', 'blink', 'inverse'] as const) if (s[k]) p.push(k);
	return p.length > 0 ? p.join(', ') : '(none)';
}

function render(): void {
	stdout.write('\x1b[H\x1b[2J');
	stdout.write('\x1b[1;3H\x1b[1;36mStyle Inheritance Demo\x1b[0m');
	stdout.write('\x1b[2;3H\x1b[90mProperties cascade from parent to child\x1b[0m');
	let row = 4;
	for (let i = 0; i < nodes.length; i++) {
		const n = nodes[i]; if (!n) continue;
		const indent = '  '.repeat(n.depth);
		const arrow = n.depth > 0 ? '+-' : '';
		const marker = i === sel ? '\x1b[33m>>>\x1b[0m ' : '    ';
		stdout.write(`\x1b[${row};3H${marker}${indent}${arrow}\x1b[1m${n.label}\x1b[0m`);
		stdout.write(`\x1b[${row + 1};${7 + n.depth * 2}H\x1b[90mLocal:    ${fmt(getLocalStyle(world, n.eid))}\x1b[0m`);
		stdout.write(`\x1b[${row + 2};${7 + n.depth * 2}H\x1b[32mResolved: ${fmt(resolveStyle(world, n.eid))}\x1b[0m`);
		row += 3;
	}
	row++;
	stdout.write(`\x1b[${row};3H\x1b[1;36mInheritance Rules:\x1b[0m`);
	stdout.write(`\x1b[${row + 1};5H\x1b[32mInherits:   ${INHERITING_PROPERTIES.join(', ')}\x1b[0m`);
	stdout.write(`\x1b[${row + 2};5H\x1b[31mLocal only: ${NON_INHERITING_PROPERTIES.join(', ')}\x1b[0m`);
	stdout.write(`\x1b[${row + 3};5H\x1b[90mdoesPropertyInherit('fg')=${doesPropertyInherit('fg')} | ('bg')=${doesPropertyInherit('bg')}\x1b[0m`);
	stdout.write(`\x1b[${Math.min(height - 1, row + 5)};1H\x1b[33m[Up/Down] Select node  [q] Quit\x1b[0m`);
}

render();
process.stdin.setRawMode?.(true);
process.stdin.resume();
process.stdin.on('data', (data: Buffer) => {
	const key = data.toString();
	if (key === 'q' || key === 'Q' || key === '\x03') { stdout.write('\x1b[?25h\x1b[?1049l'); process.exit(0); }
	if (key === '\x1b[A' || key === 'k') sel = Math.max(0, sel - 1);
	if (key === '\x1b[B' || key === 'j') sel = Math.min(nodes.length - 1, sel + 1);
	render();
});
