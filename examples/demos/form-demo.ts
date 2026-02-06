/**
 * Form Demo
 *
 * Demonstrates a form with multiple fields and validation.
 * Tab to switch fields, type to edit, Enter to submit, q in non-edit mode to exit.
 *
 * Run: npx tsx examples/demos/form-demo.ts
 * @module demos/form
 */
import {
	createWorld, createFormEntity, attachFormBehavior,
	onFormSubmit, submitForm, resetForm,
} from 'blecsd';
import type { World } from 'blecsd';
import { setupTerminal, shutdownTerminal, setupSignalHandlers, clearScreen, formatHelpBar, moveTo, getTerminalSize, formatTitle, isQuitKey } from './demo-utils';

const world = createWorld() as World;
const formEid = createFormEntity(world, { x: 4, y: 4, width: 50, height: 20 });
attachFormBehavior(world, formEid);

const fields = [
	{ label: 'Name', value: '', placeholder: 'Enter name' },
	{ label: 'Email', value: '', placeholder: 'Enter email' },
	{ label: 'Phone', value: '', placeholder: 'Enter phone' },
];

let focusIdx = 0;
let editing = false;
let submitted = false;
let formData = '';

onFormSubmit(formEid, () => {
	submitted = true;
	const values: Record<string, string> = {};
	for (const f of fields) values[f.label] = f.value;
	formData = JSON.stringify(values, null, 2);
});

function render(): void {
	const { height } = getTerminalSize();
	const out: string[] = [clearScreen()];
	out.push(moveTo(1, 1) + formatTitle('Form Demo'));
	out.push(moveTo(2, 3) + '\x1b[90mTab = field  |  Enter = edit/submit  |  Esc = stop edit  |  Ctrl+S = submit\x1b[0m');

	// Form border
	out.push(moveTo(4, 3) + '\x1b[36m┌────────────────────────────────────┐\x1b[0m');
	out.push(moveTo(5, 3) + '\x1b[36m│\x1b[0m  \x1b[1mRegistration Form\x1b[0m                \x1b[36m│\x1b[0m');
	out.push(moveTo(6, 3) + '\x1b[36m├────────────────────────────────────┤\x1b[0m');

	for (let i = 0; i < fields.length; i++) {
		const f = fields[i]!;
		const focused = i === focusIdx;
		const row = 7 + i * 3;
		const border = focused ? '\x1b[1;33m' : '\x1b[90m';
		const labelColor = focused ? '\x1b[1m' : '\x1b[0m';
		const isEdit = focused && editing;
		const display = f.value || (isEdit ? '' : `\x1b[90m${f.placeholder}\x1b[0m`);
		const cursor = isEdit ? '\x1b[7m \x1b[0m' : '';
		const indicator = focused ? '\x1b[33m▶\x1b[0m' : ' ';

		out.push(moveTo(row, 3) + `\x1b[36m│\x1b[0m ${indicator} ${labelColor}${f.label}:\x1b[0m`);
		out.push(moveTo(row + 1, 3) + `\x1b[36m│\x1b[0m   ${border}[${display}${cursor}${' '.repeat(Math.max(0, 25 - f.value.length))}]\x1b[0m`);
		out.push(moveTo(row + 2, 3) + '\x1b[36m│\x1b[0m' + ' '.repeat(35) + '\x1b[36m│\x1b[0m');
	}

	const bottomRow = 7 + fields.length * 3;
	out.push(moveTo(bottomRow, 3) + '\x1b[36m└────────────────────────────────────┘\x1b[0m');

	if (submitted) {
		out.push(moveTo(bottomRow + 2, 3) + '\x1b[32mSubmitted! Values:\x1b[0m');
		const lines = formData.split('\n');
		for (let i = 0; i < lines.length; i++) {
			out.push(moveTo(bottomRow + 3 + i, 5) + `\x1b[90m${lines[i]}\x1b[0m`);
		}
	}

	const mode = editing ? '\x1b[33mEDIT\x1b[90m' : 'NAV';
	out.push(moveTo(height, 1) + formatHelpBar('[Tab] Field  [Enter] Edit  [Esc] Stop  [Ctrl+S] Submit  [q] Quit', `Mode: ${mode}`));
	process.stdout.write(out.join(''));
}

function shutdown(): void { shutdownTerminal(); process.exit(0); }
setupTerminal();
setupSignalHandlers(shutdown);
render();

process.stdin.on('data', (data: Buffer) => {
	const ch = data.toString();
	if (!editing && (ch === '\x03' || ch === 'q')) { shutdown(); return; }
	if (ch === '\x03') { shutdown(); return; }

	if (editing) {
		if (ch === '\x1b') { editing = false; }
		else if (ch === '\r') { editing = false; }
		else if (ch === '\x13') { submitForm(world, formEid); editing = false; } // Ctrl+S
		else if (ch === '\x7f' || ch === '\b') {
			fields[focusIdx]!.value = fields[focusIdx]!.value.slice(0, -1);
		} else if (ch.length === 1 && ch >= ' ') {
			fields[focusIdx]!.value += ch;
		}
	} else {
		if (ch === '\t') focusIdx = (focusIdx + 1) % fields.length;
		if (ch === '\x1b[Z') focusIdx = (focusIdx + fields.length - 1) % fields.length; // Shift+Tab
		if (ch === '\r') editing = true;
		if (ch === '\x13') submitForm(world, formEid); // Ctrl+S
	}
	render();
});
