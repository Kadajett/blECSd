/**
 * Input system for processing keyboard and mouse events.
 * Handles hit testing, focus management, and event dispatch.
 * @module systems/inputSystem
 */

import { hasComponent, query } from 'bitecs';
import { Dimensions } from '../components/dimensions';
import {
	Focusable,
	focus,
	focusNext,
	focusPrev,
	getFocusedEntity,
	isFocusable,
} from '../components/focusable';
// hierarchy utilities reserved for future hit-testing through component tree
import {
	clearKeyboardInput,
	clearMouseInput,
	hasKeyboardInput,
	hasMouseInput,
	MouseButtons,
	recordClick,
	setKeyboardInput,
	setMouseInput,
} from '../components/input';
import {
	hasInteractive,
	Interactive,
	isClickable,
	isHoverable,
	setHovered,
	setPressed,
} from '../components/interactive';
import { Position } from '../components/position';
import { EventBus, type UIEventMap } from '../core/events';
import type { Scheduler } from '../core/scheduler';
import type { Entity, System, World } from '../core/types';
import type { KeyEvent as ParsedKeyEvent } from '../terminal/keyParser';
import type { MouseEvent as ParsedMouseEvent } from '../terminal/mouseParser';

/**
 * Input event types that can be queued.
 */
export type InputEventType = 'key' | 'mouse';

/**
 * Queued key event.
 */
export interface QueuedKeyEvent {
	type: 'key';
	event: ParsedKeyEvent;
	timestamp: number;
}

/**
 * Queued mouse event.
 */
export interface QueuedMouseEvent {
	type: 'mouse';
	event: ParsedMouseEvent;
	timestamp: number;
}

/**
 * Union of all queued input events.
 */
export type QueuedInputEvent = QueuedKeyEvent | QueuedMouseEvent;

/**
 * Result of hit testing a point.
 */
export interface HitTestResult {
	/** Entity that was hit */
	entity: Entity;
	/** Local X coordinate within the entity */
	localX: number;
	/** Local Y coordinate within the entity */
	localY: number;
	/** Z-index of the entity */
	zIndex: number;
}

/**
 * Input system state and configuration.
 */
export interface InputSystemState {
	/** Queue of pending input events */
	eventQueue: QueuedInputEvent[];
	/** Entity that currently has mouse capture (for drag operations) */
	capturedEntity: Entity | null;
	/** Last known mouse position */
	lastMouseX: number;
	lastMouseY: number;
	/** Entity under the mouse last frame */
	lastHoveredEntity: Entity | null;
	/** Global event bus for dispatching UI events */
	eventBus: EventBus<UIEventMap>;
}

// Note: InputReceiver component registration reserved for future use
// when entities need explicit opt-in to receive input events

/**
 * Global input system state.
 * Can be accessed and modified for testing or custom input handling.
 */
export const inputState: InputSystemState = {
	eventQueue: [],
	capturedEntity: null,
	lastMouseX: 0,
	lastMouseY: 0,
	lastHoveredEntity: null,
	eventBus: new EventBus<UIEventMap>(),
};

/**
 * Resets input system state.
 * Useful for testing or when reinitializing the input system.
 *
 * @example
 * ```typescript
 * import { resetInputState } from 'blecsd';
 *
 * // Clear all pending events and state
 * resetInputState();
 * ```
 */
export function resetInputState(): void {
	inputState.eventQueue = [];
	inputState.capturedEntity = null;
	inputState.lastMouseX = 0;
	inputState.lastMouseY = 0;
	inputState.lastHoveredEntity = null;
}

/**
 * Queues a keyboard event for processing.
 *
 * @param event - The parsed key event from the input stream
 *
 * @example
 * ```typescript
 * import { queueKeyEvent } from 'blecsd';
 *
 * // Queue a key event for next frame
 * queueKeyEvent({ name: 'a', ctrl: false, meta: false, shift: false, raw: 'a' });
 * ```
 */
export function queueKeyEvent(event: ParsedKeyEvent): void {
	inputState.eventQueue.push({
		type: 'key',
		event,
		timestamp: Date.now(),
	});
}

/**
 * Queues a mouse event for processing.
 *
 * @param event - The parsed mouse event from the input stream
 *
 * @example
 * ```typescript
 * import { queueMouseEvent } from 'blecsd';
 *
 * // Queue a mouse event for next frame
 * queueMouseEvent({ x: 10, y: 5, button: 'left', action: 'press', raw: '' });
 * ```
 */
export function queueMouseEvent(event: ParsedMouseEvent): void {
	inputState.eventQueue.push({
		type: 'mouse',
		event,
		timestamp: Date.now(),
	});
}

/**
 * Gets the current event queue.
 * Mainly useful for debugging and testing.
 */
export function getEventQueue(): readonly QueuedInputEvent[] {
	return inputState.eventQueue;
}

/**
 * Clears all queued events.
 */
export function clearEventQueue(): void {
	inputState.eventQueue = [];
}

/**
 * Gets the global input event bus.
 * Use this to subscribe to UI events from anywhere.
 *
 * @returns The global UI event bus
 *
 * @example
 * ```typescript
 * import { getInputEventBus } from 'blecsd';
 *
 * const eventBus = getInputEventBus();
 * eventBus.on('click', (event) => {
 *   console.log(`Clicked at ${event.x}, ${event.y}`);
 * });
 * ```
 */
export function getInputEventBus(): EventBus<UIEventMap> {
	return inputState.eventBus;
}

/**
 * Captures mouse events to a specific entity.
 * While captured, all mouse events are sent to this entity
 * regardless of hit testing. Used for drag operations.
 *
 * @param entity - Entity to capture events to, or null to release
 *
 * @example
 * ```typescript
 * import { captureMouseTo, releaseMouse } from 'blecsd';
 *
 * // Start drag
 * captureMouseTo(entityId);
 *
 * // End drag
 * releaseMouse();
 * ```
 */
export function captureMouseTo(entity: Entity | null): void {
	inputState.capturedEntity = entity;
}

/**
 * Releases mouse capture.
 */
export function releaseMouse(): void {
	inputState.capturedEntity = null;
}

/**
 * Checks if an entity is currently capturing mouse events.
 */
export function isMouseCaptured(): boolean {
	return inputState.capturedEntity !== null;
}

/**
 * Gets the entity currently capturing mouse events.
 */
export function getMouseCaptureEntity(): Entity | null {
	return inputState.capturedEntity;
}

/**
 * Tests if a point is inside an entity's bounding box.
 * Uses Position and Dimensions components.
 *
 * @param world - The ECS world
 * @param eid - Entity to test
 * @param x - X coordinate to test
 * @param y - Y coordinate to test
 * @returns true if point is inside entity bounds
 *
 * @example
 * ```typescript
 * import { pointInEntity } from 'blecsd';
 *
 * if (pointInEntity(world, entity, mouseX, mouseY)) {
 *   console.log('Mouse is over entity');
 * }
 * ```
 */
export function pointInEntity(world: World, eid: Entity, x: number, y: number): boolean {
	if (!hasComponent(world, eid, Position) || !hasComponent(world, eid, Dimensions)) {
		return false;
	}

	const posX = Position.x[eid] ?? 0;
	const posY = Position.y[eid] ?? 0;
	const width = Dimensions.width[eid] ?? 0;
	const height = Dimensions.height[eid] ?? 0;

	// Skip entities with no size
	if (width <= 0 || height <= 0) {
		return false;
	}

	return x >= posX && x < posX + width && y >= posY && y < posY + height;
}

/**
 * Performs hit testing at a point to find all entities under it.
 * Returns entities sorted by z-index (highest first).
 *
 * @param world - The ECS world
 * @param x - X coordinate to test
 * @param y - Y coordinate to test
 * @returns Array of hit test results, sorted by z-index (highest first)
 *
 * @example
 * ```typescript
 * import { hitTest } from 'blecsd';
 *
 * const hits = hitTest(world, mouseX, mouseY);
 * if (hits.length > 0) {
 *   const topEntity = hits[0].entity;
 *   console.log(`Top entity at click: ${topEntity}`);
 * }
 * ```
 */
export function hitTest(world: World, x: number, y: number): HitTestResult[] {
	const results: HitTestResult[] = [];

	// Query all entities with Position and Dimensions
	const entities = Array.from(query(world, [Position, Dimensions]));

	for (const eid of entities) {
		if (!pointInEntity(world, eid, x, y)) {
			continue;
		}

		const posX = Position.x[eid] ?? 0;
		const posY = Position.y[eid] ?? 0;
		const zIndex = Position.z[eid] ?? 0;

		results.push({
			entity: eid,
			localX: x - posX,
			localY: y - posY,
			zIndex,
		});
	}

	// Sort by z-index descending (highest first)
	results.sort((a, b) => b.zIndex - a.zIndex);

	return results;
}

/**
 * Gets the topmost interactive entity at a point.
 * Only returns entities that can receive input.
 *
 * @param world - The ECS world
 * @param x - X coordinate to test
 * @param y - Y coordinate to test
 * @returns The topmost interactive entity or null
 */
export function getInteractiveEntityAt(world: World, x: number, y: number): Entity | null {
	const hits = hitTest(world, x, y);

	for (const hit of hits) {
		if (hasInteractive(world, hit.entity)) {
			return hit.entity;
		}
	}

	return null;
}

/**
 * Converts mouse button from string to numeric constant.
 */
function buttonToNumber(button: string): number {
	switch (button) {
		case 'left':
			return MouseButtons.LEFT;
		case 'middle':
			return MouseButtons.MIDDLE;
		case 'right':
			return MouseButtons.RIGHT;
		case 'wheelup':
			return MouseButtons.WHEEL_UP;
		case 'wheeldown':
			return MouseButtons.WHEEL_DOWN;
		default:
			return MouseButtons.NONE;
	}
}

/**
 * Processes a single key event.
 */
function processKeyEvent(world: World, event: ParsedKeyEvent): void {
	// Get the focused entity
	const focusedEntity = getFocusedEntity();

	// Handle Tab for focus navigation
	if (event.name === 'tab') {
		// Query all focusable entities
		const focusableEntities = Array.from(query(world, [Focusable]));
		if (event.shift) {
			focusPrev(world, focusableEntities);
		} else {
			focusNext(world, focusableEntities);
		}
		return;
	}

	// If there's a focused entity, update its KeyboardInput component
	if (focusedEntity !== null) {
		const keyCode = event.raw.length > 0 ? (event.raw[0] ?? 0) : 0;
		setKeyboardInput(world, focusedEntity, {
			lastKeyCode: keyCode,
			lastKeyTime: Date.now(),
			ctrl: event.ctrl,
			meta: event.meta,
			shift: event.shift,
		});

		// Dispatch keypress event to the event bus
		inputState.eventBus.emit('keypress', {
			key: event.name,
			ctrl: event.ctrl,
			meta: event.meta,
			shift: event.shift,
		});
	}
}

/**
 * Processes a single mouse event.
 */
function processMouseEvent(world: World, event: ParsedMouseEvent): void {
	const x = event.x;
	const y = event.y;
	const button = buttonToNumber(event.button);

	// Update last known mouse position
	inputState.lastMouseX = x;
	inputState.lastMouseY = y;

	// Determine target entity
	let targetEntity: Entity | null = inputState.capturedEntity;

	if (targetEntity === null) {
		targetEntity = getInteractiveEntityAt(world, x, y);
	}

	// Handle hover state changes
	const previousHovered = inputState.lastHoveredEntity;
	const currentHovered = targetEntity;

	if (previousHovered !== currentHovered) {
		// Mouse left previous entity
		if (previousHovered !== null && hasInteractive(world, previousHovered)) {
			setHovered(world, previousHovered, false);
			inputState.eventBus.emit('mouseleave', { x, y });
		}

		// Mouse entered new entity
		if (
			currentHovered !== null &&
			hasInteractive(world, currentHovered) &&
			isHoverable(world, currentHovered)
		) {
			setHovered(world, currentHovered, true);
			inputState.eventBus.emit('mouseenter', { x, y });
		}

		inputState.lastHoveredEntity = currentHovered;
	}

	// Always emit mousemove
	inputState.eventBus.emit('mousemove', { x, y });

	// Handle mouse actions
	if (targetEntity !== null) {
		switch (event.action) {
			case 'press': {
				// Update MouseInput component
				if (hasMouseInput(world, targetEntity)) {
					setMouseInput(world, targetEntity, {
						x,
						y,
						button,
						pressed: true,
					});
					recordClick(world, targetEntity, x, y, button);
				}

				// Update pressed state
				if (hasInteractive(world, targetEntity)) {
					setPressed(world, targetEntity, true);
				}

				// Emit mousedown
				inputState.eventBus.emit('mousedown', { x, y, button });

				// Handle focus on click
				if (isFocusable(world, targetEntity)) {
					focus(world, targetEntity);
				}
				break;
			}

			case 'release': {
				// Update MouseInput component
				if (hasMouseInput(world, targetEntity)) {
					setMouseInput(world, targetEntity, {
						x,
						y,
						button,
						pressed: false,
					});
				}

				// Update pressed state
				if (hasInteractive(world, targetEntity)) {
					setPressed(world, targetEntity, false);
				}

				// Emit mouseup
				inputState.eventBus.emit('mouseup', { x, y, button });

				// Emit click if this was a press+release on the same entity
				if (isClickable(world, targetEntity)) {
					inputState.eventBus.emit('click', { x, y, button });
				}

				// Release any capture on mouse up
				if (inputState.capturedEntity !== null) {
					releaseMouse();
				}
				break;
			}

			case 'move': {
				// Update position in MouseInput
				if (hasMouseInput(world, targetEntity)) {
					setMouseInput(world, targetEntity, { x, y });
				}
				break;
			}

			case 'wheel': {
				// Emit scroll event
				const direction = button === MouseButtons.WHEEL_UP ? 'up' : 'down';
				inputState.eventBus.emit('scroll', { direction, amount: 1 });
				break;
			}
		}
	}
}

/**
 * The input system processes all queued input events.
 * This system should be registered in the INPUT phase (automatically protected).
 *
 * The system:
 * 1. Processes all queued key and mouse events
 * 2. Updates KeyboardInput and MouseInput components
 * 3. Performs hit testing for mouse events
 * 4. Updates Interactive component state (hovered, pressed)
 * 5. Manages focus changes (click to focus, Tab navigation)
 * 6. Dispatches UI events to the event bus
 *
 * @param world - The ECS world to process
 * @returns The world (unchanged reference)
 *
 * @example
 * ```typescript
 * import { createScheduler, inputSystem, registerInputSystem } from 'blecsd';
 *
 * const scheduler = createScheduler();
 * registerInputSystem(scheduler);
 *
 * // In game loop
 * scheduler.run(world, deltaTime);
 * ```
 */
export const inputSystem: System = (world: World): World => {
	// Process all queued events
	const events = [...inputState.eventQueue];
	inputState.eventQueue = [];

	for (const queued of events) {
		if (queued.type === 'key') {
			processKeyEvent(world, queued.event);
		} else if (queued.type === 'mouse') {
			processMouseEvent(world, queued.event);
		}
	}

	return world;
};

/**
 * Creates a new input system.
 *
 * Factory function that returns the inputSystem.
 * Useful for cases where you need a fresh reference.
 *
 * @returns The input system function
 *
 * @example
 * ```typescript
 * import { createInputSystem, createScheduler } from 'blecsd';
 *
 * const scheduler = createScheduler();
 * const system = createInputSystem();
 * // Note: Use registerInputSystem instead for proper INPUT phase registration
 * ```
 */
export function createInputSystem(): System {
	return inputSystem;
}

/**
 * Registers the input system with a scheduler.
 *
 * Registers inputSystem in the protected INPUT phase.
 * This ensures input is always processed first.
 *
 * @param scheduler - The scheduler to register with
 * @param priority - Optional priority within the INPUT phase (default: 0)
 *
 * @example
 * ```typescript
 * import { createScheduler, registerInputSystem } from 'blecsd';
 *
 * const scheduler = createScheduler();
 * registerInputSystem(scheduler);
 *
 * // Input events will now be processed in INPUT phase
 * scheduler.run(world, deltaTime);
 * ```
 */
export function registerInputSystem(scheduler: Scheduler, priority = 0): void {
	scheduler.registerInputSystem(inputSystem, priority);
}

/**
 * Clears input state for an entity.
 * Resets KeyboardInput and MouseInput components to default state.
 *
 * @param world - The ECS world
 * @param eid - Entity to clear input state for
 *
 * @example
 * ```typescript
 * import { clearEntityInput } from 'blecsd';
 *
 * // Clear all input state when entity loses focus
 * clearEntityInput(world, entity);
 * ```
 */
export function clearEntityInput(world: World, eid: Entity): void {
	if (hasKeyboardInput(world, eid)) {
		clearKeyboardInput(world, eid);
	}
	if (hasMouseInput(world, eid)) {
		clearMouseInput(world, eid);
	}
}

/**
 * Query all entities that can receive input.
 * Returns entities with either Interactive or Focusable components.
 *
 * @param world - The ECS world
 * @returns Array of entity IDs that can receive input
 */
export function queryInputReceivers(world: World): number[] {
	const interactive = Array.from(query(world, [Interactive]));
	const focusable = Array.from(query(world, [Focusable]));

	// Combine and deduplicate
	const set = new Set([...interactive, ...focusable]);
	return Array.from(set);
}
