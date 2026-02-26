import {
  addEntity,
  createScreenEntity,
  createWorld,
} from '../src/core/index';
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
  setOutputBuffer,
  setOutputStream,
  setRenderBuffer,
} from '../src/systems/index';
import { createDirtyTracker } from '../src/core/dirty';
import { createDoubleBuffer, createProgram, getBackBuffer } from '../src/terminal/index';

const cols = process.stdout.columns ?? 80;
const rows = process.stdout.rows ?? 24;

const world = createWorld();
createScreenEntity(world, { width: cols, height: rows });

setOutputStream(process.stdout);
const doubleBuffer = createDoubleBuffer(cols, rows);
setOutputBuffer(doubleBuffer);
setRenderBuffer(createDirtyTracker(cols, rows), getBackBuffer(doubleBuffer));

const panel = addEntity(world);
setPosition(world, panel, 2, 2);
setDimensions(world, panel, 54, 5);
setStyle(world, panel, { fg: '#ffffff', bg: '#1f2937' });

let count = 0;

function updatePanel(): void {
  const pos = getPosition(world, panel);
  const coords = pos ? `${pos.x},${pos.y}` : 'unknown';
  setContent(
    world,
    panel,
    `blECSd Counter Demo\nCount: ${count}\nPosition: ${coords}\n↑↓←→ move  +/- count  r reset  q quit`,
  );
}

function render(): void {
  layoutSystem(world);
  renderSystem(world);
  outputSystem(world);
}

updatePanel();
render();

const program = createProgram();
await program.init();

function shutdown(code = 0): void {
  cleanup(world);
  program.destroy();
  process.exit(code);
}

program.on('key', (event) => {
  switch (event.name) {
    case 'q':
      shutdown(0);
      return;
    case 'c':
      if (event.ctrl) shutdown(0);
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
});

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
