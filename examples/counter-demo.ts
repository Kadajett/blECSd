import { addEntity } from '../src/core/index';
import { getPosition, moveBy, setContent, setDimensions, setPosition, setStyle } from '../src/components/index';
import { createApp } from '../src/app';

const app = await createApp({ fullscreen: true });

const panel = addEntity(app.world);
setPosition(app.world, panel, 2, 2);
setDimensions(app.world, panel, 54, 5);
setStyle(app.world, panel, { fg: '#ffffff', bg: '#1f2937' });

let count = 0;
const emitState = process.env.BLECSD_EXAMPLE_EMIT_STATE === '1';

function updatePanel(): void {
	const pos = getPosition(app.world, panel);
	const coords = pos ? `${pos.x},${pos.y}` : 'unknown';
	const content = `blECSd Counter Demo\nCount: ${count}\nPosition: ${coords}\n↑↓←→ move  +/- count  r reset  q quit`;
	setContent(app.world, panel, content);
	if (emitState) {
		process.stdout.write(`\n[STATE]\n${content}\n[/STATE]\n`);
	}
}

function handleKey(name: string, ctrl = false): void {
	switch (name) {
		case 'q':
			if (!isScriptedMode) app.shutdown();
			return;
		case 'c':
			if (ctrl && !isScriptedMode) app.shutdown();
			return;
		case 'up':
			moveBy(app.world, panel, 0, -1);
			break;
		case 'down':
			moveBy(app.world, panel, 0, 1);
			break;
		case 'left':
			moveBy(app.world, panel, -1, 0);
			break;
		case 'right':
			moveBy(app.world, panel, 1, 0);
			break;
		case '+':
		case 'equals':
			count += 1;
			break;
		case '-':
			count -= 1;
			break;
		case 'r':
			count = 0;
			break;
		default:
			return;
	}

	updatePanel();
	app.render();
}

updatePanel();
app.render();

const scriptTokens = (process.env.BLECSD_EXAMPLE_SCRIPT ?? '')
	.split(',')
	.map((token) => token.trim())
	.filter(Boolean);
const isScriptedMode = scriptTokens.length > 0;

if (isScriptedMode) {
	for (const token of scriptTokens) {
		handleKey(token);
	}
	app.shutdown();
} else {
	app.program.on('key', (event) => {
		handleKey(event.name, event.ctrl);
	});
}
