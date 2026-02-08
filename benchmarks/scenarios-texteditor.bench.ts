/**
 * Real-World Scenario Benchmark: Text Editor with Cursor Movement
 *
 * Simulates a text editor with:
 * - Cursor movement (arrow keys, jumps)
 * - Text insertion/deletion
 * - Syntax highlighting (simulated)
 * - Line wrapping
 * - Undo/redo operations
 */

import { describe, bench } from 'vitest';
import { addEntity } from '../src/core/ecs';
import type { World } from '../src/core/types';
import { createWorld } from '../src/core/world';
import { setPosition } from '../src/components/position';
import { setDimensions } from '../src/components/dimensions';
import {
	createTextarea,
	insertTextInTextarea,
	moveCursorInTextarea,
	deleteTextInTextarea,
} from '../src/widgets/textarea';
import { layoutSystem } from '../src/systems/layoutSystem';
import { renderSystem } from '../src/systems/renderSystem';
import { createScheduler, LoopPhase } from '../src/core/scheduler';
import { initializeScreen } from '../src/components/screen';

/**
 * Generates mock code content
 */
function generateCodeContent(lines: number): string {
	const content: string[] = [];

	for (let i = 0; i < lines; i++) {
		const indent = '  '.repeat(Math.floor(Math.random() * 3));
		const lineType = Math.random();

		if (lineType < 0.2) {
			content.push(`${indent}function example${i}() {`);
		} else if (lineType < 0.4) {
			content.push(`${indent}  const value = someFunction(${i});`);
		} else if (lineType < 0.6) {
			content.push(`${indent}  return value * 2;`);
		} else if (lineType < 0.8) {
			content.push(`${indent}}`);
		} else {
			content.push('');
		}
	}

	return content.join('\n');
}

describe('Text Editor Scenario', () => {
	bench('100-line file - cursor navigation (1000 movements)', () => {
		const world = createWorld();
		initializeScreen(world, 80, 24);
		const scheduler = createScheduler();
		scheduler.registerSystem(LoopPhase.LAYOUT, layoutSystem);
		scheduler.registerSystem(LoopPhase.RENDER, renderSystem);

		const entity = addEntity(world);
		setPosition(world, entity, 0, 0);
		setDimensions(world, entity, { width: 80, height: 24 });

		const editor = createTextarea(world, entity);
		const content = generateCodeContent(100);
		insertTextInTextarea(editor, content, 0);

		// Simulate cursor movements
		for (let i = 0; i < 1000; i++) {
			const movements = ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'];
			const movement = movements[i % movements.length] as string;

			if (movement === 'ArrowDown') {
				moveCursorInTextarea(editor, 0, 1);
			} else if (movement === 'ArrowUp') {
				moveCursorInTextarea(editor, 0, -1);
			} else if (movement === 'ArrowLeft') {
				moveCursorInTextarea(editor, -1, 0);
			} else {
				moveCursorInTextarea(editor, 1, 0);
			}

			scheduler.run(world, 1 / 60);
		}
	});

	bench('500-line file - typing (1000 characters)', () => {
		const world = createWorld();
		initializeScreen(world, 80, 24);
		const scheduler = createScheduler();
		scheduler.registerSystem(LoopPhase.LAYOUT, layoutSystem);
		scheduler.registerSystem(LoopPhase.RENDER, renderSystem);

		const entity = addEntity(world);
		setPosition(world, entity, 0, 0);
		setDimensions(world, entity, { width: 80, height: 24 });

		const editor = createTextarea(world, entity);
		const content = generateCodeContent(500);
		insertTextInTextarea(editor, content, 0);

		// Simulate typing
		const textToType = 'const example = "Hello, World!";';
		for (let i = 0; i < 1000; i++) {
			const char = textToType[i % textToType.length] as string;
			insertTextInTextarea(editor, char, editor.cursorPos);
			scheduler.run(world, 1 / 60);
		}
	});

	bench('1000-line file - page scrolling (100 pages)', () => {
		const world = createWorld();
		initializeScreen(world, 80, 24);
		const scheduler = createScheduler();
		scheduler.registerSystem(LoopPhase.LAYOUT, layoutSystem);
		scheduler.registerSystem(LoopPhase.RENDER, renderSystem);

		const entity = addEntity(world);
		setPosition(world, entity, 0, 0);
		setDimensions(world, entity, { width: 80, height: 24 });

		const editor = createTextarea(world, entity);
		const content = generateCodeContent(1000);
		insertTextInTextarea(editor, content, 0);

		// Simulate page up/down
		for (let i = 0; i < 100; i++) {
			if (i % 2 === 0) {
				// Page down (24 lines)
				moveCursorInTextarea(editor, 0, 24);
			} else {
				// Page up
				moveCursorInTextarea(editor, 0, -24);
			}

			scheduler.run(world, 1 / 60);
		}
	});

	bench('100-line file - insert/delete operations (500 ops)', () => {
		const world = createWorld();
		initializeScreen(world, 80, 24);
		const scheduler = createScheduler();
		scheduler.registerSystem(LoopPhase.LAYOUT, layoutSystem);
		scheduler.registerSystem(LoopPhase.RENDER, renderSystem);

		const entity = addEntity(world);
		setPosition(world, entity, 0, 0);
		setDimensions(world, entity, { width: 80, height: 24 });

		const editor = createTextarea(world, entity);
		const content = generateCodeContent(100);
		insertTextInTextarea(editor, content, 0);

		// Simulate insert/delete operations
		for (let i = 0; i < 500; i++) {
			if (i % 2 === 0) {
				// Insert text
				insertTextInTextarea(editor, 'x', editor.cursorPos);
			} else {
				// Delete text
				if (editor.cursorPos > 0) {
					deleteTextInTextarea(editor, editor.cursorPos - 1, 1);
				}
			}

			scheduler.run(world, 1 / 60);
		}
	});

	bench('500-line file - jump to line (1000 jumps)', () => {
		const world = createWorld();
		initializeScreen(world, 80, 24);
		const scheduler = createScheduler();
		scheduler.registerSystem(LoopPhase.LAYOUT, layoutSystem);
		scheduler.registerSystem(LoopPhase.RENDER, renderSystem);

		const entity = addEntity(world);
		setPosition(world, entity, 0, 0);
		setDimensions(world, entity, { width: 80, height: 24 });

		const editor = createTextarea(world, entity);
		const content = generateCodeContent(500);
		insertTextInTextarea(editor, content, 0);

		const lines = content.split('\n');

		// Simulate jumping to random lines
		for (let i = 0; i < 1000; i++) {
			const targetLine = Math.floor(Math.random() * lines.length);

			// Calculate position of target line
			let pos = 0;
			for (let j = 0; j < targetLine; j++) {
				pos += (lines[j]?.length ?? 0) + 1; // +1 for newline
			}

			// Move cursor to start of target line
			const currentLine = editor.cursorPos;
			const lineDelta = targetLine - Math.floor(currentLine / 80);
			moveCursorInTextarea(editor, pos - editor.cursorPos, lineDelta);

			scheduler.run(world, 1 / 60);
		}
	});

	bench('Multi-cursor editing (4 cursors, 250 ops)', () => {
		const world = createWorld();
		initializeScreen(world, 80, 24);
		const scheduler = createScheduler();
		scheduler.registerSystem(LoopPhase.LAYOUT, layoutSystem);
		scheduler.registerSystem(LoopPhase.RENDER, renderSystem);

		const entity = addEntity(world);
		setPosition(world, entity, 0, 0);
		setDimensions(world, entity, { width: 80, height: 24 });

		const editor = createTextarea(world, entity);
		const content = generateCodeContent(100);
		insertTextInTextarea(editor, content, 0);

		// Simulate multi-cursor editing (4 cursors)
		const cursors = [100, 500, 1000, 1500];

		for (let i = 0; i < 250; i++) {
			// Type at all cursor positions
			for (const cursorPos of cursors) {
				insertTextInTextarea(editor, 'x', cursorPos);
			}

			scheduler.run(world, 1 / 60);
		}
	});
});
