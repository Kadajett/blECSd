/**
 * Queries Demo
 *
 * Demonstrates finding, filtering, and sorting entities using ECS queries.
 * Create entities and run different queries to see matching results.
 *
 * Run: npx tsx examples/demos/queries-demo.ts
 * @module demos/queries
 */
import {
	createWorld, addEntity, addComponent,
	Position, setPosition, Dimensions, setDimensions,
	Renderable, setStyle, setVisible,
	Focusable, makeFocusable,
	Interactive, setClickable, setHoverable,
	Content, setContent,
	Padding, setPaddingAll,
	Border, setBorder,
	query, queryRenderable, queryFocusable, queryInteractive, queryContent, queryPadding, queryBorder,
	filterVisible, filterDirty, filterFocusable, filterClickable,
	sortByZIndex, ZOrder, setZIndex,
	isDirty, markDirty,
} from 'blecsd';
import { setupTerminal, shutdownTerminal, setupSignalHandlers, formatHelpBar, formatTitle, isQuitKey, getTerminalSize, moveTo } from './demo-utils';

const world = createWorld();
const entities: Array<{ eid: number; name: string; comps: string[] }> = [];

// Create varied entities with different component combinations
function make(name: string, comps: string[]): void {
	const eid = addEntity(world);
	if (comps.includes('pos')) { addComponent(world, eid, Position); setPosition(world, eid, Math.random() * 60 | 0, Math.random() * 20 | 0); }
	if (comps.includes('render')) { addComponent(world, eid, Renderable); setStyle(world, eid, { fg: 0xffffffff }); }
	if (comps.includes('dim')) { addComponent(world, eid, Dimensions); setDimensions(world, eid, 10, 3); }
	if (comps.includes('focus')) { addComponent(world, eid, Focusable); makeFocusable(world, eid); }
	if (comps.includes('inter')) { addComponent(world, eid, Interactive); setClickable(world, eid, true); setHoverable(world, eid, true); }
	if (comps.includes('content')) { addComponent(world, eid, Content); setContent(world, eid, name); }
	if (comps.includes('pad')) { addComponent(world, eid, Padding); setPaddingAll(world, eid, 1); }
	if (comps.includes('border')) { addComponent(world, eid, Border); setBorder(world, eid, { top: true, right: true, bottom: true, left: true }); }
	if (comps.includes('z')) { addComponent(world, eid, ZOrder); setZIndex(world, eid, Math.random() * 10 | 0); }
	if (comps.includes('dirty')) markDirty(world, eid);
	if (comps.includes('hidden')) setVisible(world, eid, false);
	entities.push({ eid, name, comps });
}

make('Player', ['pos', 'render', 'dim', 'focus', 'inter', 'content', 'z', 'dirty']);
make('Enemy', ['pos', 'render', 'dim', 'inter', 'content', 'z']);
make('Wall', ['pos', 'render', 'dim', 'border']);
make('Label', ['pos', 'render', 'content']);
make('Button', ['pos', 'render', 'dim', 'focus', 'inter', 'content', 'pad', 'border']);
make('Hidden', ['pos', 'render', 'content', 'hidden']);
make('Panel', ['pos', 'render', 'dim', 'pad', 'border', 'z', 'dirty']);
make('Ghost', ['pos', 'content']);

const queries = [
	{ name: 'queryRenderable', fn: () => queryRenderable(world) },
	{ name: 'queryFocusable', fn: () => queryFocusable(world) },
	{ name: 'queryInteractive', fn: () => queryInteractive(world) },
	{ name: 'queryContent', fn: () => queryContent(world) },
	{ name: 'queryPadding', fn: () => queryPadding(world) },
	{ name: 'queryBorder', fn: () => queryBorder(world) },
	{ name: 'filterVisible', fn: () => filterVisible(world, queryRenderable(world)) },
	{ name: 'filterDirty', fn: () => filterDirty(world, queryRenderable(world)) },
];
let qIdx = 0;

function render(): void {
	const { width, height } = getTerminalSize();
	const out: string[] = ['\x1b[2J\x1b[H'];
	out.push(formatTitle('Queries Demo') + '\n');
	out.push(`  ${entities.length} entities created with various component combinations\n`);
	out.push('  ' + '\u2500'.repeat(Math.min(width - 4, 60)) + '\n');

	// Entity list
	out.push('  \x1b[1mEntities:\x1b[0m\n');
	for (const e of entities) out.push(`    \x1b[36m#${e.eid}\x1b[0m ${e.name.padEnd(8)} [${e.comps.join(', ')}]\n`);
	out.push('\n');

	// Current query
	const q = queries[qIdx]!;
	const results = q.fn();
	out.push(`  \x1b[1mQuery:\x1b[0m \x1b[33m${q.name}\x1b[0m  (\x1b[32m${results.length} matches\x1b[0m)\n`);
	out.push('  Matches: ');
	const names = results.map((eid: number) => entities.find((e) => e.eid === eid)?.name ?? `#${eid}`);
	out.push(names.map((n: string) => `\x1b[36m${n}\x1b[0m`).join(', ') || '\x1b[90m(none)\x1b[0m');
	out.push('\n');

	out.push(moveTo(height, 1) + formatHelpBar('[Left/Right] Switch query  [q] Quit', `Query ${qIdx + 1}/${queries.length}`));
	process.stdout.write(out.join(''));
}

function shutdown(): void { shutdownTerminal(); process.exit(0); }
setupTerminal();
setupSignalHandlers(shutdown);
render();

process.stdin.on('data', (data: Buffer) => {
	if (isQuitKey(data)) { shutdown(); return; }
	const ch = data.toString();
	if (ch === '\x1b[C' || ch === 'l') qIdx = (qIdx + 1) % queries.length;
	if (ch === '\x1b[D' || ch === 'h') qIdx = (qIdx - 1 + queries.length) % queries.length;
	render();
});
