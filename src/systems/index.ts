/**
 * Systems module - ECS systems for game logic
 * @module systems
 */

// Animation system
export {
	animationSystem,
	createAnimationSystem,
	hasAnimationSystem,
	queryAnimation,
	registerAnimationSystem,
	updateAnimations,
} from './animationSystem';
// Input system
export type {
	HitTestResult,
	InputEventType,
	InputSystemState,
	QueuedInputEvent,
	QueuedKeyEvent,
	QueuedMouseEvent,
} from './inputSystem';
export {
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
} from './inputSystem';
// Movement system
export {
	createMovementSystem,
	hasMovementSystem,
	movementSystem,
	queryMovement,
	registerMovementSystem,
	updateMovements,
} from './movementSystem';
// State machine system
export {
	createStateMachineSystem,
	getStateAgeStore,
	getSystemStateAge,
	queryStateMachine,
	registerStateMachineSystem,
	resetStateAge,
	stateMachineSystem,
	updateStateAges,
} from './stateMachineSystem';
