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
// Behavior system
export type {
	BehaviorSystemConfig,
	MovementApplier,
	PositionResolver,
} from './behaviorSystem';
export { createBehaviorSystem } from './behaviorSystem';
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
	getFocusEventBus,
	getFocused,
	getFocusStackDepth,
	peekFocusStack,
	resetFocusEventBus,
	restoreFocus,
	rewindFocus,
	saveFocus,
} from './focusSystem';
// Frame budget manager
export type {
	BudgetAlert,
	FrameBudgetConfig,
	FrameBudgetManager,
	FrameStats,
	SystemTiming,
} from './frameBudget';
export {
	createFrameBudgetManager,
	destroyFrameBudgetManager,
	exportFrameBudgetMetrics,
	getFrameBudgetStats,
	onBudgetAlert,
	profiledSystem,
	recordFrameBudgetSystemTime,
	recordFrameTime,
	recordPhaseTime,
	resetFrameBudget,
} from './frameBudget';
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
// Particle system
export type { EntityProvider, ParticleSystemConfig } from './particleSystem';
export {
	ageParticle,
	burstParticles,
	createParticleSystem,
	killParticle,
	moveParticle,
	spawnParticle,
} from './particleSystem';
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
// Spatial hash system
export type {
	CellCoord,
	SpatialHashConfig,
	SpatialHashGrid,
	SpatialHashStats,
} from './spatialHash';
export {
	clearSpatialHash,
	createSpatialHash,
	createSpatialHashSystem,
	DEFAULT_CELL_SIZE,
	getEntitiesAtPoint,
	getEntitiesInCell,
	getNearbyEntities,
	getSpatialHashGrid,
	getSpatialHashStats,
	insertEntity,
	queryArea,
	rebuildSpatialHash,
	removeEntityFromGrid,
	setSpatialHashGrid,
	spatialHashSystem,
	worldToCell,
} from './spatialHash';
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
// TileMap renderer system
export type {
	TileMapBuffer,
	TileMapCamera,
	TileMapRendererConfig,
} from './tilemapRenderer';
export {
	clearTileMapRenderBuffer,
	createEmptyBuffer,
	createTilemapRenderSystem,
	getTileMapRenderBuffer,
	getTileMapRendererConfig,
	renderAllTileMaps,
	renderTileMapToBuffer,
	resetTileMapRenderer,
	setTileMapRendererConfig,
	tilemapRenderSystem,
} from './tilemapRenderer';
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
// Worker pool
export type {
	PoolStats,
	PoolTask,
	SyncHandler,
	TaskPriority,
	TaskResult,
	WorkerPoolConfig,
	WorkerPoolState,
} from './workerPool';
export {
	cancelAllOfType,
	cancelTask,
	createWorkerPool,
	destroyWorkerPool,
	getWorkerPoolState,
	registerTaskHandler,
	submitTask,
} from './workerPool';
