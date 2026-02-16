/**
 * Input system namespace.
 *
 * @example
 * ```typescript
 * import { inputSys } from 'blecsd/systems';
 * const world = createWorld();
 * inputSys.register(world);
 * inputSys.queueKey(world, { key: 'a', ctrl: false, meta: false, shift: false });
 * const hit = inputSys.hitTest(world, mouseX, mouseY);
 * inputSys.captureMouse(world, eid);
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

export const inputSys = Object.freeze({
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

export type InputSysModule = typeof inputSys;
