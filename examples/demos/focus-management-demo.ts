/**
 * Focus Management Demo
 *
 * Demonstrates focus system with tab order, focus/blur, and visual indicators.
 * Tab/Shift+Tab to navigate, Enter to activate, d to disable, q to exit.
 *
 * Run: npx tsx examples/demos/focus-management-demo.ts
 * @module demos/focus-management
 */
import {
	createWorld, addEntity, addComponent, Position, Focusable, Dimensions,
	setPosition, setFocusable, isFocused, focus,
	setDimensions, getTabIndex, setTabIndex,
} from 'blecsd';
import type { World, Entity } from 'blecsd';
import { setupTerminal, shutdownTerminal, setupSignalHandlers, clearScreen, formatHelpBar, moveTo, getTerminalSize, formatTitle, isQuitKey } from './demo-utils';

const world = createWorld() as World;

const widgets = [
	{ eid: addEntity(world) as Entity, label: 'Search', icon: '?', disabled: false },
	{ eid: addEntity(world) as Entity, label: 'Settings', icon: '*', disabled: false },
	{ eid: addEntity(world) as Entity, label: 'Profile', icon: '@', disabled: false },
	{ eid: addEntity(world) as Entity, label: 'Messages', icon: '#', disabled: false },
	{ eid: addEntity(world) as Entity, label: 'Logout', icon: '!', disabled: false },
];

for (let i = 0; i < widgets.length; i++) {
	const w = widgets[i]!;
	addComponent(world, w.eid, Position);
	addComponent(world, w.eid, Focusable);
	addComponent(world, w.eid, Dimensions);
	setPosition(world, w.eid, 4, 6 + i * 3);
	setDimensions(world, w.eid, 30, 3);
	setFocusable(world, w.eid, { focusable: true, tabIndex: i });
}

focus(world, widgets[0]!.eid);

let focusIdx = 0;
let lastAction = '';

function render(): void {
	const { height } = getTerminalSize();
	const out: string[] = [clearScreen()];
	out.push(moveTo(1, 1) + formatTitle('Focus Management Demo'));
	out.push(moveTo(2, 3) + '\x1b[90mTab = next  |  Shift+Tab = prev  |  Enter = activate  |  d = disable  |  q = quit\x1b[0m');

	const tabEntities = widgets.filter(w => !w.disabled).map(w => w.eid);
	out.push(moveTo(3, 3) + `\x1b[90mTab order: [${tabEntities.join(', ')}]  Focused: ${widgets[focusIdx]?.eid ?? 'none'}\x1b[0m`);

	for (let i = 0; i < widgets.length; i++) {
		const w = widgets[i]!;
		const focused = i === focusIdx;
		const row = 6 + i * 3;
		const border = w.disabled ? '\x1b[90m' : focused ? '\x1b[1;33m' : '\x1b[36m';
		const textColor = w.disabled ? '\x1b[90;9m' : focused ? '\x1b[1m' : '\x1b[0m';
		const indicator = focused ? '\x1b[33m>\x1b[0m' : ' ';
		const tab = getTabIndex(world, w.eid);

		out.push(moveTo(row, 2) + indicator);
		out.push(moveTo(row, 4) + `${border}┌${'─'.repeat(28)}┐\x1b[0m`);
		out.push(moveTo(row + 1, 4) + `${border}│\x1b[0m ${textColor}${w.icon}  ${w.label}\x1b[0m${' '.repeat(20 - w.label.length)}${border}│\x1b[0m`);
		out.push(moveTo(row + 2, 4) + `${border}└${'─'.repeat(28)}┘\x1b[0m`);
		out.push(moveTo(row + 1, 36) + `\x1b[90mtab:${tab} ${w.disabled ? 'DISABLED' : ''}\x1b[0m`);
	}

	if (lastAction) out.push(moveTo(22, 4) + `\x1b[32m${lastAction}\x1b[0m`);
	out.push(moveTo(height, 1) + formatHelpBar('[Tab] Next  [Shift+Tab] Prev  [Enter] Activate  [d] Disable  [q] Quit'));
	process.stdout.write(out.join(''));
}

function shutdown(): void { shutdownTerminal(); process.exit(0); }
setupTerminal();
setupSignalHandlers(shutdown);
render();

process.stdin.on('data', (data: Buffer) => {
	if (isQuitKey(data)) { shutdown(); return; }
	const ch = data.toString();

	if (ch === '\t') {
		do { focusIdx = (focusIdx + 1) % widgets.length; } while (widgets[focusIdx]!.disabled);
	}
	if (ch === '\x1b[Z') { // Shift+Tab
		do { focusIdx = (focusIdx + widgets.length - 1) % widgets.length; } while (widgets[focusIdx]!.disabled);
	}
	if (ch === '\r') {
		const w = widgets[focusIdx]!;
		if (!w.disabled) lastAction = `Activated: ${w.label}`;
	}
	if (ch === 'd') {
		const w = widgets[focusIdx]!;
		w.disabled = !w.disabled;
		lastAction = `${w.label} ${w.disabled ? 'disabled' : 'enabled'}`;
		if (w.disabled && widgets.some(ww => !ww.disabled)) {
			do { focusIdx = (focusIdx + 1) % widgets.length; } while (widgets[focusIdx]!.disabled);
		}
	}
	render();
});
