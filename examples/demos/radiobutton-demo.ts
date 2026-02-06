/**
 * RadioButton Widget Demo
 *
 * Demonstrates radio button groups with exclusive selection.
 * Uses createRadioButtonEntity, attachRadioButtonBehavior, selectRadioButton, onRadioSelect.
 * Tab to navigate, Enter/Space to select, q or Ctrl+C to exit.
 *
 * Run: npx tsx examples/demos/radiobutton-demo.ts
 * @module demos/radiobutton
 */

import {
	createWorld, addEntity,
	createRadioButtonEntity, attachRadioButtonBehavior,
	selectRadioButton, onRadioSelect,
} from 'blecsd';

const world = createWorld();

// Create a radio group entity for grouping
const groupEid = addEntity(world);

const options = [
	{ label: 'Small (8px)',   value: 'small' },
	{ label: 'Medium (14px)', value: 'medium' },
	{ label: 'Large (20px)',  value: 'large' },
	{ label: 'Custom',        value: 'custom' },
];

interface RadioOption {
	label: string;
	value: string;
	eid: number;
	selected: boolean;
}

const radioItems: RadioOption[] = [];
let focusIdx = 0;
let selectedValue = 'medium';

for (let i = 0; i < options.length; i++) {
	const opt = options[i];
	const eid = createRadioButtonEntity(world, {
		label: opt.label,
		x: 4,
		y: 6 + i * 2,
		width: 25,
		height: 1,
	});
	attachRadioButtonBehavior(world, eid, groupEid);
	const item: RadioOption = { ...opt, eid, selected: opt.value === 'medium' };
	radioItems.push(item);

	onRadioSelect(eid, (selValue) => {
		selectedValue = selValue || opt.value;
		for (const ri of radioItems) {
			ri.selected = ri.eid === eid;
		}
	});
}

// Select default
const defaultItem = radioItems.find((r) => r.value === 'medium');
if (defaultItem) {
	selectRadioButton(world, defaultItem.eid);
}

function render(): void {
	const out: string[] = ['\x1b[2J\x1b[H'];
	out.push('\x1b[1m  RadioButton Demo\x1b[0m\n');
	out.push('  Tab/j/k = navigate  |  Enter/Space = select  |  q = quit\n');
	out.push('  ──────────────────────────────────────────────────────────\n\n');

	out.push('  \x1b[4mFont Size:\x1b[0m\n\n');

	for (let i = 0; i < radioItems.length; i++) {
		const item = radioItems[i];
		const focused = i === focusIdx;
		const bullet = item.selected ? '\x1b[32m(o)\x1b[0m' : '\x1b[2m( )\x1b[0m';
		const label = focused ? `\x1b[1;33m${item.label}\x1b[0m` : item.label;
		const indicator = focused ? ' <' : '';
		out.push(`  ${bullet} ${label}${indicator}\n`);
	}

	out.push(`\n  Selected: \x1b[32m${selectedValue}\x1b[0m\n`);

	// Preview
	out.push('\n  \x1b[4mPreview:\x1b[0m\n');
	if (selectedValue === 'small') {
		out.push('  \x1b[2mAa Bb Cc (small)\x1b[0m\n');
	} else if (selectedValue === 'medium') {
		out.push('  Aa Bb Cc (medium)\n');
	} else if (selectedValue === 'large') {
		out.push('  \x1b[1mAa Bb Cc (large)\x1b[0m\n');
	} else {
		out.push('  \x1b[3mAa Bb Cc (custom)\x1b[0m\n');
	}

	process.stdout.write(out.join(''));
}

function main(): void {
	process.stdout.write('\x1b[?1049h\x1b[?25l');
	process.stdin.setRawMode(true);
	process.stdin.resume();
	render();

	process.stdin.on('data', (data: Buffer) => {
		const ch = data.toString();
		if (ch === '\x03' || ch === 'q') { shutdown(); return; }

		if (ch === '\t' || ch === 'j' || ch === '\x1b[B') {
			focusIdx = (focusIdx + 1) % radioItems.length;
		} else if (ch === 'k' || ch === '\x1b[A') {
			focusIdx = (focusIdx - 1 + radioItems.length) % radioItems.length;
		} else if (ch === '\r' || ch === ' ') {
			selectRadioButton(world, radioItems[focusIdx].eid);
		}
		render();
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
