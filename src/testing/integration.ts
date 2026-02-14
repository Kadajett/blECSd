/**
 * Integration testing utilities for blECSd.
 *
 * Provides helpers for simulating input events, setting up test screens,
 * and running full render cycles for integration testing.
 *
 * @module testing/integration
 *
 * @example
 * ```typescript
 * import {
 *   createTestScreen,
 *   simulateKey,
 *   simulateMouse,
 *   teardownTestScreen,
 * } from 'blecsd/testing';
 *
 * const ctx = createTestScreen(80, 24);
 * simulateKey('enter');
 * ctx.step();
 * teardownTestScreen(ctx);
 * ```
 */

import { setDimensions } from '../components/dimensions';
import { makeFocusable, resetFocusState } from '../components/focusable';
import { appendChild } from '../components/hierarchy';
import { setPosition, setZIndex } from '../components/position';
import { setStyle } from '../components/renderable';
import { resetScreenSingleton } from '../components/screen';
import { createDirtyTracker, type DirtyTracker } from '../core/dirtyTracking';
import { addEntity, createWorld } from '../core/ecs';
import { createScreenEntity } from '../core/entities';
import type { Entity, World } from '../core/types';
import { focusSystem } from '../systems/focusSystem';
import {
	inputSystem,
	queueKeyEvent,
	queueMouseEvent,
	resetInputState,
} from '../systems/inputSystem';
import { setInteractive } from '../systems/interactiveSystem';
import { layoutSystem } from '../systems/layoutSystem';
import { clearRenderBuffer, renderSystem, setRenderBuffer } from '../systems/renderSystem';
import type { KeyEvent, KeyName } from '../terminal/keyParser';
import type { MouseAction, MouseButton, MouseEvent } from '../terminal/mouseParser';
import { createScreenBuffer, getCell, type ScreenBufferData } from '../terminal/screen/cell';
import { captureScreen, screenshotToText } from '../terminal/screen/screenshot';

/**
 * Full integration test context with world, buffer, and lifecycle management.
 */
export interface IntegrationTestContext {
	/** The ECS world */
	readonly world: World;
	/** The dirty tracker for rendering */
	readonly tracker: DirtyTracker;
	/** The screen buffer for rendering */
	readonly buffer: ScreenBufferData;
	/** The screen entity */
	readonly screenEid: Entity;
	/** Run a full frame: input -> layout -> render */
	step(): void;
	/** Render the current state to a text string */
	toText(): string;
	/** Get the text of a specific row */
	rowText(y: number): string;
	/** Get the character at a specific cell */
	charAt(x: number, y: number): string | undefined;
}

/**
 * Creates a full integration test screen with all systems wired up.
 *
 * @param width - Screen width in columns
 * @param height - Screen height in rows
 * @returns An IntegrationTestContext with step() and inspection methods
 *
 * @example
 * ```typescript
 * import { createTestScreen, teardownTestScreen } from 'blecsd/testing';
 *
 * const ctx = createTestScreen(80, 24);
 * // ... add entities, simulate input ...
 * ctx.step(); // runs input -> layout -> render
 * expect(ctx.toText()).toContain('Hello');
 * teardownTestScreen(ctx);
 * ```
 */
export function createTestScreen(width: number, height: number): IntegrationTestContext {
	const world = createWorld() as World;
	resetScreenSingleton(world);
	const screenEid = createScreenEntity(world, { width, height });
	const tracker = createDirtyTracker(width, height);
	const buffer = createScreenBuffer(width, height);
	setRenderBuffer(tracker, buffer);
	resetInputState();
	resetFocusState();

	return {
		world,
		tracker,
		buffer,
		screenEid,
		step(): void {
			inputSystem(world);
			focusSystem(world);
			layoutSystem(world);
			renderSystem(world);
		},
		toText(): string {
			const screenshot = captureScreen(buffer);
			const text = screenshotToText(screenshot);
			const lines = text.split('\n');
			while (lines.length > 0 && lines[lines.length - 1]?.trim() === '') {
				lines.pop();
			}
			return lines.join('\n');
		},
		rowText(y: number): string {
			let text = '';
			for (let x = 0; x < buffer.width; x++) {
				const cell = getCell(buffer, x, y);
				text += cell?.char ?? ' ';
			}
			return text.trimEnd();
		},
		charAt(x: number, y: number): string | undefined {
			return getCell(buffer, x, y)?.char;
		},
	};
}

/**
 * Tears down a test screen, cleaning up all state.
 *
 * @param _ctx - The context to tear down
 *
 * @example
 * ```typescript
 * afterEach(() => {
 *   teardownTestScreen(ctx);
 * });
 * ```
 */
export function teardownTestScreen(_ctx: IntegrationTestContext): void {
	clearRenderBuffer();
	resetInputState();
	resetFocusState();
}

/**
 * Simulates a key press event.
 *
 * @param name - The key name (e.g., 'a', 'enter', 'tab', 'escape')
 * @param modifiers - Optional modifier keys
 *
 * @example
 * ```typescript
 * simulateKey('a');
 * simulateKey('enter', { ctrl: true });
 * simulateKey('tab', { shift: true });
 * ```
 */
export function simulateKey(
	name: KeyName,
	modifiers?: { ctrl?: boolean; meta?: boolean; shift?: boolean },
): void {
	const event: KeyEvent = {
		sequence: name,
		name,
		ctrl: modifiers?.ctrl ?? false,
		meta: modifiers?.meta ?? false,
		shift: modifiers?.shift ?? false,
		raw: new Uint8Array(),
	};
	queueKeyEvent(event);
}

/**
 * Simulates a mouse event.
 *
 * @param x - X coordinate (0-indexed)
 * @param y - Y coordinate (0-indexed)
 * @param button - Mouse button
 * @param action - Mouse action
 *
 * @example
 * ```typescript
 * simulateMouse(10, 5, 'left', 'press');
 * simulateMouse(10, 5, 'left', 'release');
 * ```
 */
export function simulateMouse(
	x: number,
	y: number,
	button: MouseButton,
	action: MouseAction,
): void {
	const event: MouseEvent = {
		x,
		y,
		button,
		action,
		ctrl: false,
		meta: false,
		shift: false,
		protocol: 'sgr',
		raw: new Uint8Array(),
	};
	queueMouseEvent(event);
}

/**
 * Simulates a click (press + release) at a position.
 *
 * @param x - X coordinate
 * @param y - Y coordinate
 * @param button - Mouse button (default: 'left')
 *
 * @example
 * ```typescript
 * simulateClick(10, 5);
 * ctx.step(); // processes click
 * ```
 */
export function simulateClick(x: number, y: number, button: MouseButton = 'left'): void {
	simulateMouse(x, y, button, 'press');
	simulateMouse(x, y, button, 'release');
}

/**
 * Creates an interactive, focusable entity for integration testing.
 *
 * @param ctx - The test context
 * @param x - X position
 * @param y - Y position
 * @param width - Width
 * @param height - Height
 * @param options - Additional options
 * @returns The entity ID
 *
 * @example
 * ```typescript
 * const btn = createInteractiveEntity(ctx, 5, 2, 10, 3, {
 *   focusable: true,
 *   bg: '#ff0000',
 * });
 * ```
 */
export function createInteractiveEntity(
	ctx: IntegrationTestContext,
	x: number,
	y: number,
	width: number,
	height: number,
	options?: {
		focusable?: boolean;
		fg?: string;
		bg?: string;
		parentEid?: Entity;
		zIndex?: number;
	},
): Entity {
	const eid = addEntity(ctx.world);
	setPosition(ctx.world, eid, x, y);
	setDimensions(ctx.world, eid, width, height);
	setStyle(ctx.world, eid, { fg: options?.fg ?? '#ffffff', bg: options?.bg ?? '#000000' });
	const shouldFocus = options?.focusable !== false;
	setInteractive(ctx.world, eid, {
		clickable: true,
		hoverable: true,
		focusable: shouldFocus,
	});
	if (shouldFocus) {
		makeFocusable(ctx.world, eid, true);
	}
	if (options?.zIndex !== undefined) {
		setZIndex(ctx.world, eid, options.zIndex);
	}
	if (options?.parentEid !== undefined) {
		appendChild(ctx.world, options.parentEid, eid);
	}
	return eid;
}
