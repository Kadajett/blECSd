/**
 * Input system namespace.
 *
 * @example
 * ```typescript
 * import { input } from 'blecsd/systems';
 * const world = createWorld();
 * input.register(world);
 * input.queueKey(world, { key: 'a', ctrl: false, meta: false, shift: false });
 * const hit = input.hitTest(world, mouseX, mouseY);
 * input.captureMouse(world, eid);
 * ```
 */
import {
	captureMouseTo,
	clearEntityInput,
	clearEventQueue,
	createInputSystem,
	getEventQueue,
	getInputEventBus,
	getInteractiveEntityAt,
	getMouseCaptureEntity,
	hitTest,
	inputState,
	inputSystem,
	isMouseCaptured,
	pointInEntity,
	queryInputReceivers,
	queueKeyEvent,
	queueMouseEvent,
	registerInputSystem,
	releaseMouse,
	resetInputState,
} from '../inputSystem';

export const input = Object.freeze({
	create: createInputSystem,
	register: registerInputSystem,
	system: inputSystem,
	state: inputState,
	query: queryInputReceivers,
	hitTest,
	pointInEntity,
	getInteractiveAt: getInteractiveEntityAt,
	queueKey: queueKeyEvent,
	queueMouse: queueMouseEvent,
	getEventQueue,
	clearQueue: clearEventQueue,
	clearEntityInput,
	getEventBus: getInputEventBus,
	reset: resetInputState,
	mouse: Object.freeze({
		capture: captureMouseTo,
		release: releaseMouse,
		isCaptured: isMouseCaptured,
		getCaptureEntity: getMouseCaptureEntity,
	}),
});

export type InputSystemModule = typeof input;
