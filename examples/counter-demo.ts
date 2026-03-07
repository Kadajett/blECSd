import { addEntity, createScreenEntity, createWorld } from '../src/core/index';
import {
	getPosition,
	moveBy,
	setContent,
	setDimensions,
	setPosition,
	setStyle,
} from '../src/components/index';
import {
	cleanup,
	layoutSystem,
	outputSystem,
	renderSystem,
} from '../src/systems/index';
import { createRenderPipeline, onShutdown } from '../src/app';
import { createProgram } from '../src/terminal/index';

const { cols, rows } = createRenderPipeline(process.stdout);

const world = createWorld();
createScreenEntity(world, { width: cols, height: rows });

const panel = addEntity(world);
setPosition(world, panel, 2, 2);
setDimensions(world, panel, 54, 5);
setStyle(world, panel, { fg: '#ffffff', bg: '#1f2937' });

let count = 0;
let isShuttingDown = false;
const emitState = process.env.BLECSD_EXAMPLE_EMIT_STATE === '1';

function updatePanel(): void {
	const pos = getPosition(world, panel);
	const coords = pos ? `${pos.x},${pos.y}` : 'unknown';
	const content = `blECSd Counter Demo\nCount: ${count}\nPosition: ${coords}\n↑↓←→ move  +/- count  r reset  q quit`;
	setContent(world, panel, content);
	if (emitState) {
		process.stdout.write(`\n[STATE]\n${content}\n[/STATE]\n`);
	}
}

function render(): void {
	layoutSystem(world);
	renderSystem(world);
	outputSystem(world);
}

function shutdown(code = 0, destroyProgram = true): void {
	if (isShuttingDown) return;
	isShuttingDown = true;
	cleanup(world);
	if (destroyProgram && program) {
		program.destroy();
	}
	process.exit(code);
}

function handleKey(name: string, ctrl = false): void {
	switch (name) {
		case 'q':
			shutdown(0, !isScriptedMode);
			return;
		case 'c':
			if (ctrl) shutdown(0, !isScriptedMode);
			return;
		case 'up':
			moveBy(world, panel, 0, -1);
			break;
		case 'down':
			moveBy(world, panel, 0, 1);
			break;
		case 'left':
			moveBy(world, panel, -1, 0);
			break;
		case 'right':
			moveBy(world, panel, 1, 0);
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
	render();
}

updatePanel();
render();

const scriptTokens = (process.env.BLECSD_EXAMPLE_SCRIPT ?? '')
	.split(',')
	.map((token) => token.trim())
	.filter(Boolean);
const isScriptedMode = scriptTokens.length > 0;

let program: ReturnType<typeof createProgram> | null = null;

if (isScriptedMode) {
	for (const token of scriptTokens) {
		handleKey(token);
		if (isShuttingDown) {
			break;
		}
	}
	if (!isShuttingDown) {
		shutdown(0, false);
	}
} else {
	program = createProgram();
	await program.init();

	program.on('key', (event) => {
		handleKey(event.name, event.ctrl);
	});

	process.on('SIGINT', () => shutdown(0));
	process.on('SIGTERM', () => shutdown(0));
}
