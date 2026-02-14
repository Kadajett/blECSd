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
	ActivePairsView,
	CollisionEventData,
	CollisionEventMap,
	CollisionSystemState,
} from './collisionSystem';
export {
	areColliding,
	collisionSystem,
	createCollisionSystem,
	detectCollisions,
	getActiveCollisionCount,
	getActiveCollisions,
	getActiveTriggerCount,
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
// Constraint layout
export type { Constraint, Rect } from './constraintLayout';
export {
	fixed,
	layoutHorizontal,
	layoutVertical,
	max,
	min,
	percentage,
	ratio,
} from './constraintLayout';
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
	beginSyncOutput,
	bell,
	cleanup,
	clearOutputBuffer,
	clearOutputStream,
	clearScreen,
	createOutputState,
	createOutputSystem,
	cursorHome,
	disableBracketedPasteMode,
	disableFocusReporting,
	disableMouseTracking,
	enableBracketedPasteMode,
	enableFocusReporting,
	enableMouseTracking,
	endSyncOutput,
	enterAlternateScreen,
	generateOutput,
	getOutputBuffer,
	getOutputState,
	getOutputStream,
	hideCursor,
	leaveAlternateScreen,
	moveTo,
	outputSystem,
	resetAttributes,
	resetOutputState,
	restoreCursorPosition,
	saveCursorPosition,
	setOutputBuffer,
	setOutputStream,
	setTerminalCursorShape,
	setWindowTitle,
	showCursor,
	writeRaw,
} from './outputSystem';
// Panel movement
export type {
	DirtyRect,
	MoveResult,
	PanelConstraints,
	PanelMoveConfig,
	PanelMoveState,
	ResizeHandle,
} from './panelMovement';
export {
	beginMove,
	beginResize,
	cancelMoveOrResize,
	createPanelConstraints,
	createPanelMoveConfig,
	createPanelMoveState,
	detectResizeHandle,
	endMoveOrResize,
	keyboardMove,
	keyboardResize,
	mergeDirtyRects,
	updateMove,
	updateResize,
} from './panelMovement';
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
// Reactive system
export { createReactiveSystem, createReactiveSystemsForAllPhases } from './reactiveSystem';
// Render system
export type { RenderContext } from './renderSystem';
export {
	clearRenderBuffer,
	createRenderSystem,
	getRenderBuffer,
	getViewportBounds,
	isOcclusionCullingEnabled,
	markAllDirty,
	renderBackground,
	renderBorder,
	renderContent,
	renderRect,
	renderScrollbar,
	renderSystem,
	renderText,
	setOcclusionCulling,
	setRenderBuffer,
	setViewportBounds,
} from './renderSystem';
// Smooth scroll system
export type {
	ScrollAnimationState,
	ScrollEvent,
	ScrollPhysicsConfig,
} from './smoothScroll';
export {
	applyScrollImpulse,
	clearAllScrollStates,
	createSmoothScrollSystem,
	endUserScroll,
	getScrollPosition,
	getScrollState,
	isScrolling,
	removeScrollState,
	setScrollImmediate,
	smoothScrollTo,
	startUserScroll,
	updateScrollPhysics,
} from './smoothScroll';
// Spatial hash system
export type {
	CellCoord,
	PrevBounds,
	SpatialHashConfig,
	SpatialHashGrid,
	SpatialHashStats,
	SpatialHashSystemState,
} from './spatialHash';
export {
	clearSpatialHash,
	createSpatialHash,
	createSpatialHashSystem,
	createSpatialHashSystemState,
	DEFAULT_CELL_SIZE,
	getEntitiesAtPoint,
	getEntitiesInCell,
	getNearbyEntities,
	getSpatialDirtyCount,
	getSpatialHashGrid,
	getSpatialHashStats,
	getSpatialHashSystemState,
	incrementalSpatialUpdate,
	insertEntity,
	markSpatialDirty,
	queryArea,
	rebuildSpatialHash,
	removeEntityFromGrid,
	resetSpatialHashState,
	setSpatialDirtyThreshold,
	setSpatialHashGrid,
	spatialHashSystem,
	worldToCell,
} from './spatialHash';
// Spring system
export type { SpringConfig } from './spring';
export {
	createSpring,
	getSpringTarget,
	isSpringActive,
	Spring,
	setSpringTarget,
	springBouncy,
	springSmooth,
	springSnappy,
	springSystem,
} from './spring';
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
// Visibility culling system
export type {
	CachedBounds,
	CullingResult,
	PositionCache,
	Viewport,
} from './visibilityCulling';
export {
	clearPositionCache,
	createIncrementalSpatialSystem,
	createPositionCache,
	createVisibilityCullingSystem,
	performCulling,
	queryVisibleEntities,
	removeFromCache,
	updateEntityIfMoved,
} from './visibilityCulling';
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
