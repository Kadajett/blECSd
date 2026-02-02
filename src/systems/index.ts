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
// Camera system
export {
	cameraSystem,
	createCameraSystem,
	queryCameras,
	registerCameraSystem,
	updateCameras,
} from './cameraSystem';
// Collision system
export type {
	CollisionEventData,
	CollisionEventMap,
	CollisionSystemState,
} from './collisionSystem';
export {
	areColliding,
	collisionSystem,
	createCollisionSystem,
	detectCollisions,
	getActiveCollisions,
	getActiveTriggers,
	getCollidingEntities,
	getCollisionEventBus,
	getTriggerZones,
	isColliding,
	isInTrigger,
	queryColliders,
	registerCollisionSystem,
	resetCollisionState,
} from './collisionSystem';
// Drag system
export type {
	DragConstraints,
	DragEndEvent,
	DragEventMap,
	DragMoveEvent,
	DragStartEvent,
	DragState,
	DragVerifyCallback,
	DropEvent,
} from './dragSystem';
export {
	clearDragConstraints,
	createDragSystem,
	getDragConstraints,
	getDragVerifyCallback,
	resetDragStores,
	setDragConstraints,
	setDragVerifyCallback,
} from './dragSystem';
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
