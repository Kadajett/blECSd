/**
 * Focus Stack Demo
 *
 * Demonstrates focus stack management with push/pop layers.
 * Tab to navigate within layer, Enter to push new layer, Escape to pop, q to exit.
 *
 * Run: npx tsx examples/demos/focus-stack-demo.ts
 * @module demos/focus-stack
 */
import {
	createWorld, addEntity, addComponent, Position, Focusable,
	setPosition, setFocusable, isFocused, focus,
} from 'blecsd';
import type { World, Entity } from 'blecsd';
import { setupTerminal, shutdownTerminal, setupSignalHandlers, clearScreen, formatHelpBar, moveTo, getTerminalSize, formatTitle, isQuitKey } from './demo-utils';

const world = createWorld() as World;

interface FocusLayer { name: string; entities: Array<{ eid: Entity; label: string }>; focusIdx: number }
const layers: FocusLayer[] = [];

function createLayer(name: string, labels: string[]): FocusLayer {
	const entities: Array<{ eid: Entity; label: string }> = [];
	for (const label of labels) {
		const eid = addEntity(world) as Entity;
		addComponent(world, eid, Position);
		addComponent(world, eid, Focusable);
		setFocusable(world, eid, { focusable: true, tabIndex: entities.length });
		entities.push({ eid, label });
	}
	if (entities[0]) focus(world, entities[0].eid);
	return { name, entities, focusIdx: 0 };
}

// Initial layer
layers.push(createLayer('Main Menu', ['File', 'Edit', 'View', 'Help']));

function pushLayer(): void {
	const names = ['Dialog', 'Modal', 'Popup', 'Alert'];
	const items = ['OK', 'Cancel', 'Apply', 'Close'];
	const name = names[layers.length % names.length]!;
	layers.push(createLayer(`${name} (Layer ${layers.length})`, items.slice(0, 2 + (layers.length % 3))));
}

function popLayer(): void {
	if (layers.length <= 1) return;
	layers.pop();
	const top = layers[layers.length - 1]!;
	if (top.entities[top.focusIdx]) focus(world, top.entities[top.focusIdx]!.eid);
}

function currentLayer(): FocusLayer { return layers[layers.length - 1]!; }

function render(): void {
	const { height } = getTerminalSize();
	const out: string[] = [clearScreen()];
	out.push(moveTo(1, 1) + formatTitle('Focus Stack Demo'));
	out.push(moveTo(2, 3) + '\x1b[90mTab/Shift+Tab = navigate  |  Enter = push layer  |  Esc = pop layer  |  q = quit\x1b[0m');
	out.push(moveTo(3, 3) + `\x1b[90mStack depth: ${layers.length}\x1b[0m`);

	for (let l = 0; l < layers.length; l++) {
		const layer = layers[l]!;
		const isTop = l === layers.length - 1;
		const baseRow = 5;
		const baseCol = 4 + l * 3;
		const dimmed = !isTop;
		const border = isTop ? '\x1b[1;36m' : '\x1b[90m';
		const layerW = 24;

		// Draw layer box
		out.push(moveTo(baseRow, baseCol) + `${border}┌${'─'.repeat(layerW - 2)}┐\x1b[0m`);
		out.push(moveTo(baseRow + 1, baseCol) + `${border}│\x1b[0m ${isTop ? '\x1b[1m' : '\x1b[90m'}${layer.name.padEnd(layerW - 4)}\x1b[0m ${border}│\x1b[0m`);
		out.push(moveTo(baseRow + 2, baseCol) + `${border}├${'─'.repeat(layerW - 2)}┤\x1b[0m`);

		for (let i = 0; i < layer.entities.length; i++) {
			const ent = layer.entities[i]!;
			const focused = isTop && i === layer.focusIdx;
			const label = focused ? `\x1b[1;33m> ${ent.label}\x1b[0m` : dimmed ? `\x1b[90m  ${ent.label}\x1b[0m` : `  ${ent.label}`;
			out.push(moveTo(baseRow + 3 + i, baseCol) + `${border}│\x1b[0m ${label}${' '.repeat(Math.max(0, layerW - 6 - ent.label.length))} ${border}│\x1b[0m`);
		}
		out.push(moveTo(baseRow + 3 + layer.entities.length, baseCol) + `${border}└${'─'.repeat(layerW - 2)}┘\x1b[0m`);
	}

	out.push(moveTo(height, 1) + formatHelpBar('[Tab] Navigate  [Enter] Push  [Esc] Pop  [q] Quit', `Depth: ${layers.length}`));
	process.stdout.write(out.join(''));
}

function shutdown(): void { shutdownTerminal(); process.exit(0); }
setupTerminal();
setupSignalHandlers(shutdown);
render();

process.stdin.on('data', (data: Buffer) => {
	if (isQuitKey(data)) { shutdown(); return; }
	const ch = data.toString();
	const layer = currentLayer();
	if (ch === '\t') layer.focusIdx = (layer.focusIdx + 1) % layer.entities.length;
	if (ch === '\x1b[Z') layer.focusIdx = (layer.focusIdx + layer.entities.length - 1) % layer.entities.length; // Shift+Tab
	if (ch === '\r') pushLayer();
	if (ch === '\x1b' && data.length === 1) popLayer();
	render();
});
