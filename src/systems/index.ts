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
// Layout system
export type { ComputedLayoutData } from './layoutSystem';
export {
	ComputedLayout,
	computeLayoutNow,
	createLayoutSystem,
	getComputedBounds,
	getComputedLayout,
	hasComputedLayout,
	invalidateAllLayouts,
	invalidateLayout,
	layoutSystem,
} from './layoutSystem';
// Movement system
export {
	createMovementSystem,
	hasMovementSystem,
	movementSystem,
	queryMovement,
	registerMovementSystem,
	updateMovements,
} from './movementSystem';
// Output system
export type { OutputState } from './outputSystem';
export {
	cleanup,
	clearOutputBuffer,
	clearOutputStream,
	clearScreen,
	createOutputState,
	createOutputSystem,
	cursorHome,
	enterAlternateScreen,
	generateOutput,
	getOutputBuffer,
	getOutputState,
	getOutputStream,
	hideCursor,
	leaveAlternateScreen,
	outputSystem,
	resetAttributes,
	resetOutputState,
	setOutputBuffer,
	setOutputStream,
	showCursor,
	writeRaw,
} from './outputSystem';
// Render system
export type { RenderContext } from './renderSystem';
export {
	clearRenderBuffer,
	createRenderSystem,
	getRenderBuffer,
	markAllDirty,
	renderBackground,
	renderBorder,
	renderContent,
	renderRect,
	renderScrollbar,
	renderSystem,
	renderText,
	setRenderBuffer,
} from './renderSystem';
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
// Focus system
export type {
	FocusEventData,
	FocusEventMap,
	FocusEventType,
} from './focusSystem';
export {
	blurAll,
	clearFocusStack,
	createFocusSystem,
	focusEntity,
	focusFirst,
	focusLast,
	focusNext,
	focusOffset,
	focusPop,
	focusPrev,
	focusPush,
	focusSystem,
	getFocusableEntities,
	getFocused,
	getFocusEventBus,
	getFocusStackDepth,
	peekFocusStack,
	resetFocusEventBus,
	restoreFocus,
	rewindFocus,
	saveFocus,
} from './focusSystem';
// Virtualized render system
export type {
	LineRenderConfig,
	VirtualizedRenderContext,
} from './virtualizedRenderSystem';
export {
	cleanupEntityResources,
	cleanupVirtualizedRenderSystem,
	clearLineRenderConfig,
	clearVirtualizedRenderBuffer,
	createVirtualizedRenderSystem,
	getLineRenderConfig,
	getLineStore,
	getVirtualizedRenderBuffer,
	LineRenderConfigSchema,
	registerLineStore,
	setLineRenderConfig,
	setVirtualizedRenderBuffer,
	unregisterLineStore,
	updateLineStore,
	virtualizedRenderSystem,
} from './virtualizedRenderSystem';
