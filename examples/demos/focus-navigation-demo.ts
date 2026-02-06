/**
 * Focus Navigation Demo
 *
 * Demonstrates Tab/Shift+Tab focus cycling between UI elements
 * with visual focus indicators. Press q or Ctrl+C to exit.
 *
 * Run: npx tsx examples/demos/focus-navigation-demo.ts
 * @module demos/focus-navigation
 */
import {
	addEntity,
	createWorld,
	focus,
	focusNext,
	focusPrev,
	getFocusedEntity,
	isFocused,
	setFocusable,
	setTabIndex,
	type Entity,
	type World,
} from 'blecsd';

const LABELS = ['[ Save ]', '[ Cancel ]', '[ Help ]', '[ Settings ]', '[ Quit ]'];

function render(world: World, entities: Entity[]): void {
	const lines: string[] = [];
	lines.push('\x1b[2J\x1b[H'); // clear screen, home cursor
	lines.push('\x1b[1m  Focus Navigation Demo\x1b[0m\n');
	lines.push('  Tab = next  |  Shift+Tab = prev  |  q = quit\n');
	lines.push('  ─────────────────────────────────────────────\n');

	for (let i = 0; i < entities.length; i++) {
		const eid = entities[i]!;
		const label = LABELS[i] ?? `[ Item ${i} ]`;
		if (isFocused(world, eid)) {
			lines.push(`  \x1b[7m\x1b[1m▶ ${label}\x1b[0m  ◀ focused\n`);
		} else {
			lines.push(`    ${label}\n`);
		}
	}

	const focused = getFocusedEntity();
	const idx = focused !== null ? entities.indexOf(focused) : -1;
	lines.push(`\n  Focused index: ${idx >= 0 ? idx : 'none'}\n`);
	process.stdout.write(lines.join(''));
}

function main(): void {
	const world = createWorld() as World;
	const entities: Entity[] = [];

	for (let i = 0; i < LABELS.length; i++) {
		const eid = addEntity(world);
		setFocusable(world, eid, { tabIndex: i });
		setTabIndex(world, eid, i);
		entities.push(eid);
	}

	// Focus the first element
	focus(world, entities[0]!);

	process.stdout.write('\x1b[?1049h\x1b[?25l'); // alt screen, hide cursor
	process.stdin.setRawMode(true);
	process.stdin.resume();
	render(world, entities);

	process.stdin.on('data', (data: Buffer) => {
		const str = data.toString();
		if (str === 'q' || str === '\x03') {
			shutdown();
			return;
		}
		if (str === '\x1b[Z') {
			// Shift+Tab
			focusPrev(world, entities);
		} else if (str === '\t') {
			focusNext(world, entities);
		}
		render(world, entities);
	});
}

function shutdown(): void {
	process.stdin.setRawMode(false);
	process.stdout.write('\x1b[?25h\x1b[?1049l');
	process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
main();
