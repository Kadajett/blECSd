#!/usr/bin/env node
/** Hierarchy Demo - parent-child tree with visibility cascade.
 * Run: npx tsx examples/demos/hierarchy-demo.ts | Quit: q or Ctrl+C */
import { createWorld, addEntity, appendChild, getChildren, getParent, getDepth, isRoot, setVisible, isVisible, toggle } from 'blecsd';
import type { Entity, World } from 'blecsd';

const stdout = process.stdout;
const height = stdout.rows ?? 24;
stdout.write('\x1b[?1049h\x1b[?25l');
const world = createWorld() as World;

// Build tree: root -> [A, B] | A -> [A1, A2] | B -> [B1]
const root = addEntity(world) as Entity;
const a = addEntity(world) as Entity, b = addEntity(world) as Entity;
const a1 = addEntity(world) as Entity, a2 = addEntity(world) as Entity, b1 = addEntity(world) as Entity;
appendChild(world, root, a); appendChild(world, root, b);
appendChild(world, a, a1); appendChild(world, a, a2); appendChild(world, b, b1);
for (const e of [root, a, b, a1, a2, b1]) setVisible(world, e, true);

const nodes = [
	{ eid: root, name: 'Root' }, { eid: a, name: 'A' }, { eid: a1, name: 'A1' },
	{ eid: a2, name: 'A2' }, { eid: b, name: 'B' }, { eid: b1, name: 'B1' },
];
let sel = 0;

function effectiveVis(eid: Entity): boolean {
	if (!isVisible(world, eid)) return false;
	const p = getParent(world, eid);
	return p === 0 ? true : effectiveVis(p as Entity);
}

function render(): void {
	stdout.write('\x1b[H\x1b[2J');
	stdout.write('\x1b[1;3H\x1b[1;36mHierarchy Demo\x1b[0m');
	stdout.write('\x1b[2;3H\x1b[90mParent-child tree with visibility cascade\x1b[0m');
	// Tree view
	const treeLines = [
		{ depth: 0, name: 'Root', eid: root },
		{ depth: 1, name: 'A', eid: a }, { depth: 2, name: 'A1', eid: a1 }, { depth: 2, name: 'A2', eid: a2 },
		{ depth: 1, name: 'B', eid: b }, { depth: 2, name: 'B1', eid: b1 },
	];
	for (let i = 0; i < treeLines.length; i++) {
		const t = treeLines[i]!;
		const indent = '  '.repeat(t.depth);
		const prefix = t.depth > 0 ? '|- ' : '';
		const vis = isVisible(world, t.eid);
		const eff = effectiveVis(t.eid);
		const marker = i === sel ? '\x1b[33m> ' : '  ';
		const color = eff ? '37' : '90';
		const visTag = vis ? (eff ? '\x1b[32m[vis]' : '\x1b[33m[vis*]') : '\x1b[31m[hid]';
		stdout.write(`\x1b[${4 + i};3H${marker}\x1b[${color}m${indent}${prefix}${t.name}\x1b[0m ${visTag}\x1b[0m`);
	}
	// Info panel
	const n = nodes[sel]!;
	const children = getChildren(world, n.eid);
	const depth = getDepth(world, n.eid);
	const parent = getParent(world, n.eid);
	const pName = parent === 0 ? 'none' : nodes.find((nd) => nd.eid === parent)?.name ?? '?';
	stdout.write(`\x1b[12;3H\x1b[90mSelected: ${n.name} | Depth: ${depth} | Parent: ${pName}\x1b[0m`);
	stdout.write(`\x1b[13;3H\x1b[90mChildren: ${children.length} | Root: ${isRoot(world, n.eid)}\x1b[0m`);
	stdout.write(`\x1b[14;3H\x1b[90m*vis = locally visible but parent hidden\x1b[0m`);
	stdout.write(`\x1b[${Math.min(height - 1, 17)};1H\x1b[33m[Up/Down] Select  [Space] Toggle visibility  [q] Quit\x1b[0m`);
}

render();
process.stdin.setRawMode?.(true);
process.stdin.resume();
process.stdin.on('data', (data: Buffer) => {
	const key = data.toString();
	if (key === 'q' || key === 'Q' || key === '\x03') { stdout.write('\x1b[?25h\x1b[?1049l'); process.exit(0); }
	if (key === '\x1b[A' || key === 'k') sel = (sel - 1 + nodes.length) % nodes.length;
	if (key === '\x1b[B' || key === 'j') sel = (sel + 1) % nodes.length;
	if (key === ' ') toggle(world, nodes[sel]!.eid);
	render();
});
