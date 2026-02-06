/**
 * Key Lock/Grab Demo
 *
 * Demonstrates input grabbing: a modal dialog captures all keyboard input
 * until dismissed. Shows how to implement modal focus patterns.
 *
 * Run: npx tsx examples/demos/key-lock-grab-demo.ts
 * @module demos/key-lock-grab
 */
import { setupTerminal, shutdownTerminal, setupSignalHandlers, formatHelpBar, formatTitle, isQuitKey, getTerminalSize, moveTo } from './demo-utils';

// Simple input grab state
let grabbed = false;
let grabTarget = '';
const log: string[] = [];
let inputBuffer = '';
const fields = ['Username', 'Password', 'Email'];
let fieldIdx = 0;
const values: Record<string, string> = {};

function addLog(msg: string): void {
	log.push(msg);
	if (log.length > 8) log.shift();
}

function render(): void {
	const { width, height } = getTerminalSize();
	const out: string[] = ['\x1b[2J\x1b[H'];
	out.push(formatTitle('Key Lock/Grab Demo') + '\n');
	out.push(`  Input grab: ${grabbed ? '\x1b[31mLOCKED\x1b[0m' : '\x1b[32mFREE\x1b[0m'}  Target: ${grabTarget || '(none)'}\n`);
	out.push('  ' + '\u2500'.repeat(Math.min(width - 4, 50)) + '\n\n');

	if (!grabbed) {
		// Normal mode - show form fields
		out.push('  \x1b[1mForm Fields:\x1b[0m\n');
		for (let i = 0; i < fields.length; i++) {
			const sel = i === fieldIdx ? '\x1b[33m> ' : '  ';
			const val = values[fields[i]!] ?? '';
			out.push(`  ${sel}${fields[i]}: \x1b[36m${val || '(empty)'}\x1b[0m\n`);
		}
		out.push('\n  \x1b[90mPress Enter to edit field, [g] to grab all input\x1b[0m\n');
	} else {
		// Grabbed mode - modal input
		const boxW = 40;
		const boxH = 7;
		const bx = Math.floor((width - boxW) / 2);
		const by = Math.floor((height - boxH) / 2);

		// Draw modal box
		out.push(moveTo(by, bx) + `\x1b[1;41m\u250c${'─'.repeat(boxW - 2)}\u2510\x1b[0m`);
		out.push(moveTo(by + 1, bx) + `\x1b[1;41m\u2502\x1b[0m\x1b[41m${` INPUT LOCKED: ${grabTarget}`.padEnd(boxW - 2)}\x1b[0m\x1b[1;41m\u2502\x1b[0m`);
		out.push(moveTo(by + 2, bx) + `\x1b[1;41m\u2502\x1b[0m${' '.repeat(boxW - 2)}\x1b[1;41m\u2502\x1b[0m`);
		const prompt = ` > ${inputBuffer}\x1b[7m \x1b[0m`;
		out.push(moveTo(by + 3, bx) + `\x1b[1;41m\u2502\x1b[0m${prompt}${' '.repeat(Math.max(0, boxW - 2 - inputBuffer.length - 4))}\x1b[1;41m\u2502\x1b[0m`);
		out.push(moveTo(by + 4, bx) + `\x1b[1;41m\u2502\x1b[0m${' '.repeat(boxW - 2)}\x1b[1;41m\u2502\x1b[0m`);
		out.push(moveTo(by + 5, bx) + `\x1b[1;41m\u2502\x1b[0m\x1b[90m  Enter=Submit  Esc=Cancel${' '.repeat(boxW - 28)}\x1b[0m\x1b[1;41m\u2502\x1b[0m`);
		out.push(moveTo(by + 6, bx) + `\x1b[1;41m\u2514${'─'.repeat(boxW - 2)}\u2518\x1b[0m`);
	}

	// Event log
	out.push(moveTo(height - 10, 2) + '\x1b[1mEvent Log:\x1b[0m');
	for (let i = 0; i < log.length; i++) out.push(moveTo(height - 9 + i, 4) + `\x1b[90m${log[i]}\x1b[0m`);

	const help = grabbed
		? formatHelpBar('[Enter] Submit  [Esc] Cancel  [All keys captured]')
		: formatHelpBar('[Up/Down] Select  [Enter] Edit  [g] Grab  [q] Quit');
	out.push(moveTo(height, 1) + help);
	process.stdout.write(out.join(''));
}

function grabInput(target: string): void {
	grabbed = true;
	grabTarget = target;
	inputBuffer = '';
	addLog(`\x1b[33mGrabbed input for: ${target}\x1b[0m`);
}

function releaseInput(save: boolean): void {
	if (save) {
		values[grabTarget] = inputBuffer;
		addLog(`\x1b[32mSaved "${grabTarget}" = "${inputBuffer}"\x1b[0m`);
	} else {
		addLog(`\x1b[31mCancelled input for ${grabTarget}\x1b[0m`);
	}
	grabbed = false;
	grabTarget = '';
	inputBuffer = '';
}

function shutdown(): void { shutdownTerminal(); process.exit(0); }
setupTerminal();
setupSignalHandlers(shutdown);
render();

process.stdin.on('data', (data: Buffer) => {
	const ch = data.toString();

	if (grabbed) {
		// All input is captured by the modal
		if (ch === '\x1b') { releaseInput(false); }
		else if (ch === '\r') { releaseInput(true); }
		else if (ch === '\x7f') { inputBuffer = inputBuffer.slice(0, -1); }
		else if (ch.length === 1 && ch.charCodeAt(0) >= 32) {
			inputBuffer += ch;
			addLog(`\x1b[90mCapture: key="${ch}"\x1b[0m`);
		}
		// Note: even quit keys are captured when grabbed!
		if (ch === '\x03') { addLog('\x1b[31mCtrl+C captured (would quit if not grabbed)\x1b[0m'); }
	} else {
		if (isQuitKey(data)) { shutdown(); return; }
		if (ch === '\x1b[A' || ch === 'k') fieldIdx = (fieldIdx - 1 + fields.length) % fields.length;
		if (ch === '\x1b[B' || ch === 'j') fieldIdx = (fieldIdx + 1) % fields.length;
		if (ch === '\r') grabInput(fields[fieldIdx]!);
		if (ch === 'g') grabInput('Global');
		addLog(`\x1b[90mFree: key=${JSON.stringify(ch)}\x1b[0m`);
	}
	render();
});
