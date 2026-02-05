/**
 * Core module - ECS foundation
 * @module core
 */

// Auto-padding
export type { AutoPaddingData, EffectivePaddingData } from './autoPadding';
export {
	getAutoPadding,
	getEffectivePadding,
	getTotalEffectivePadding,
	hasAutoPadding,
	hasEntityAutoPadding,
} from './autoPadding';
// Border docking
export type {
	BorderDockingContext,
	BorderDockingOptions,
	BorderEdge,
	BorderStyleType,
	ConnectionFlags,
	DockingBuffer,
	DockingCell,
	Junction,
	JunctionCharset,
} from './borderDocking';
export {
	applyJunctions,
	clearDockingContext,
	createBorderDockingContext,
	detectAllJunctions,
	detectBorderStyle,
	detectJunctions,
	getConnectionFlags,
	getEdgeCount,
	getEdgesAt,
	getJunctionChar,
	getJunctionCharset,
	getJunctionRenderData,
	isBorderChar,
	isJunctionChar,
	JUNCTION_ASCII,
	JUNCTION_BOLD,
	JUNCTION_DOUBLE,
	JUNCTION_SINGLE,
	registerEdge,
	registerRectBorder,
	resizeDockingContext,
} from './borderDocking';
// Clipping system
export type {
	ClippingData,
	ClippingOptions,
	ClipRect,
	ClipStack,
	OverflowValue,
} from './clipping';
export {
	Clipping,
	clampToClipRect,
	createClipRect,
	createClipStack,
	createInfiniteClipRect,
	getClipping,
	getClipRect,
	getClipRectHeight,
	getClipRectToAncestor,
	getClipRectWidth,
	getCurrentClip,
	getOverflow,
	hasClipping,
	intersectClipRects,
	isClipRectEmpty,
	isPointVisible,
	isRectVisible,
	Overflow,
	popClipRect,
	pushClipRect,
	setOverflow,
	shouldClipContent,
} from './clipping';
// Computed position
export type {
	AbsolutePosition,
	ComputedPositionData,
	InnerDimensions,
	InnerPosition,
	RelativePosition,
	TotalPadding,
} from './computedPosition';
export {
	getAbsolutePosition,
	getComputedPosition,
	getInnerDimensions,
	getInnerPosition,
	getRelativePosition,
	getTotalPadding,
	isPointInEntity,
	isPointInInnerBounds,
	setAbsolutePosition,
	setRelativePosition,
} from './computedPosition';
// Dirty rectangle tracking
export type {
	DirtyRect,
	DirtyStats,
	DirtyTrackerData,
} from './dirtyRects';
export {
	clearDirtyTracking,
	createDirtyTracker,
	forceFullRedrawFlag,
	getDirtyEntities,
	getDirtyRegions,
	getDirtyRegionsInViewport,
	getDirtyStats,
	hasDirtyEntities,
	isCellDirty,
	isEntityDirty,
	markAllEntitiesDirty,
	markCellDirty,
	markEntityDirty,
	markRegionDirty,
	needsFullRedraw,
	regionIntersectsDirty,
	removeEntityFromTracking,
	resizeDirtyTracker,
	updateEntityBounds,
} from './dirtyRects';
// Disposal and cleanup
export type { CleanupCallback, DestroyOptions } from './disposal';
export {
	clearCleanupCallbacks,
	clearDestroyQueue,
	destroyAllChildren,
	destroyEntity,
	destroyWorld,
	flushDestroyQueue,
	getDestroyQueueSize,
	isMarkedForDestruction,
	registerCleanupCallback,
	resetDisposalState,
} from './disposal';
// Effects system
export type { DynamicValue, EffectConfig, EffectsConfig, ResolvedEffect } from './effects';
export {
	applyCustomEffect,
	applyDisabledEffect,
	applyFocusEffect,
	applyHoverEffect,
	applyPressEffect,
	clearAllEffectConfigs,
	clearAllStoredStyles,
	clearEffectState,
	clearEffects,
	clearStoredStyle,
	getComputedEffectStyle,
	getEffectState,
	getEffects,
	getOriginalStyle,
	getStoredStyle,
	hasAnyEffectApplied,
	hasDisabledEffectApplied,
	hasFocusEffectApplied,
	hasHoverEffectApplied,
	hasPressEffectApplied,
	hasStoredStyle,
	removeAllEffects,
	removeDisabledEffect,
	removeFocusEffect,
	removeHoverEffect,
	removePressEffect,
	resolveEffectConfig,
	setEffects,
	syncEffects,
} from './effects';
export type {
	BoxConfig,
	ButtonConfig,
	CheckboxConfig,
	FormConfig,
	InputConfig,
	ListConfig,
	ProgressBarConfig,
	RadioButtonConfig,
	RadioSetConfig,
	ScreenConfig,
	SelectConfig,
	SliderConfig,
	TextareaConfig,
	TextboxConfig,
	TextConfig,
} from './entities';
export {
	BoxConfigSchema,
	ButtonConfigSchema,
	CheckboxConfigSchema,
	createBoxEntity,
	createButtonEntity,
	createCheckboxEntity,
	createFormEntity,
	createInputEntity,
	createListEntity,
	createProgressBarEntity,
	createRadioButtonEntity,
	createRadioSetEntity,
	createScreenEntity,
	createSelectEntity,
	createSliderEntity,
	createTextareaEntity,
	createTextboxEntity,
	createTextEntity,
	FormConfigSchema,
	InputConfigSchema,
	ListConfigSchema,
	ProgressBarConfigSchema,
	RadioButtonConfigSchema,
	RadioSetConfigSchema,
	ScreenConfigSchema,
	SelectConfigSchema,
	SliderConfigSchema,
	TextareaConfigSchema,
	TextboxConfigSchema,
	TextConfigSchema,
} from './entities';
// Entity data storage
export type { DataValue, EntityDataMap } from './entityData';
export {
	clearAllEntityData,
	clearEntityData,
	deleteEntityData,
	getAllEntityData,
	getEntityData,
	getEntityDataCount,
	getEntityDataKeys,
	hasAnyEntityData,
	hasEntityData,
	setEntityData,
	setEntityDataBulk,
	updateEntityData,
} from './entityData';
// Event bubbling
export type {
	BubbleableEvent,
	BubbleableEventOptions,
	BubbleResult,
	GetEntityEventBus,
} from './eventBubbling';
export {
	bubbleEvent,
	createBubbleableEvent,
	createEntityEventBusStore,
} from './eventBubbling';
// Event system
export type { EventHandler, EventMap, ScreenEventMap, UIEventMap } from './events';
export { createEventBus, EventBus } from './events';
// Game loop
export type {
	FixedTimestepConfig,
	FixedUpdateHook,
	GameLoopHooks,
	GameLoopOptions,
	InterpolateHook,
	LoopHook,
	LoopStats,
} from './gameLoop';
export {
	createGameLoop,
	GameLoop,
	isLoopPaused,
	isLoopRunning,
	LoopState,
} from './gameLoop';
// Hit testing
export type { ClickableCache, HitTestOptions, HitTestResult } from './hitTest';
export {
	createClickableCache,
	getAllClickablesAt,
	getAllHoverablesAt,
	getClickableAt,
	getClickableCount,
	getClickableEntities,
	getHoverableAt,
	hasClickableAt,
	hasHoverableAt,
	hitTest,
	hitTestAll,
	hitTestDetailed,
	invalidateClickableCache,
	isCacheDirty,
	updateClickableCache,
} from './hitTest';
// Input action mapping
export type {
	ActionBinding,
	ActionCallback,
	ActionState,
	SerializedBindings,
} from './inputActions';
export {
	ActionBindingSchema,
	ActionPresets,
	createInputActionManager,
	InputActionManager,
	SerializedBindingsSchema,
} from './inputActions';
// Input event buffer
export type {
	InputBufferStats,
	InputEventBufferData,
	InputEventBufferOptions,
	InputLatencyStats,
	TimestampedInputEvent,
	TimestampedKeyEvent,
	TimestampedMouseEvent,
} from './inputEventBuffer';
export {
	beginFrame,
	clearBuffer,
	createInputEventBuffer,
	drainAllEvents,
	drainKeys,
	drainMouse,
	endFrame,
	getLatencyStats,
	getPendingCount,
	getPendingKeyCount,
	getPendingMouseCount,
	getStats,
	globalInputBuffer,
	hasPendingEvents,
	isLatencyAcceptable,
	isProcessingTimeAcceptable,
	peekEvents,
	peekKeys,
	peekMouse,
	pushKeyEvent,
	pushMouseEvent,
	recordLatency,
	recordLatencyBatch,
	resetLatencyStats,
	resetStats,
} from './inputEventBuffer';
// Input state tracking
export type {
	InputStateConfig,
	InputStateStats,
	KeyState,
	MouseButtonState,
	MouseState,
} from './inputState';
export {
	createInputState,
	getMovementDirection,
	InputState,
	isAllKeysDown,
	isAnyKeyDown,
	isAnyKeyPressed,
} from './inputState';
// Key bindings
export type {
	BindingMatch,
	ConditionContext,
	KeyBinding,
	KeyBindingRegistry,
	ParsedKey,
} from './keyBindings';
export {
	createKeyBindingRegistry,
	DEFAULT_NAV_BINDINGS,
	DEFAULT_TEXT_BINDINGS,
	evaluateCondition,
	formatKey,
	formatKeyEvent,
	getBindingForAction,
	getBindingsForKey,
	KeyBindingSchema,
	KeyBindingsArraySchema,
	listBindings,
	matchEvent,
	matchesKey,
	parseKeyString,
	registerBinding,
	registerBindings,
	unregisterBinding,
} from './keyBindings';
// Key lock and grab
export type { KeyLockFilter, KeyLockOptions, KeyLockState } from './keyLock';
export {
	addIgnoredKeys,
	applyKeyLockOptions,
	areAllKeysLocked,
	clearIgnoredKeys,
	createKeyLockScope,
	createKeyLockState,
	getGrabbedKeys,
	getIgnoredKeys,
	getKeyLockFilter,
	getKeyLockState,
	grabKeys,
	isKeyGrabbed,
	isKeyIgnored,
	isKeyLocked,
	lockAllKeys,
	releaseAllGrabbedKeys,
	releaseKeys,
	removeIgnoredKeys,
	resetKeyLockState,
	setIgnoredKeys,
	setKeyLockFilter,
	shouldBlockKeyEvent,
	unlockAllKeys,
} from './keyLock';
// Lifecycle events
export type {
	AdoptEvent,
	AttachEvent,
	DestroyEvent,
	DetachEvent,
	LifecycleEvent,
	LifecycleEventMap,
	LifecycleEventName,
	RemoveEvent,
	ReparentEvent,
} from './lifecycleEvents';
export {
	clearLifecycleEventBuses,
	emitAdopt,
	emitAttach,
	emitDestroy,
	emitDetach,
	emitRemove,
	emitReparent,
	getLifecycleEventBus,
	onAdopt,
	onAttach,
	onDestroy,
	onDetach,
	onRemove,
	onReparent,
	removeLifecycleEventBus,
} from './lifecycleEvents';
// Phase manager
export type { PhaseId } from './phaseManager';
export {
	BUILTIN_PHASE_NAMES,
	createPhaseManager,
	defaultPhaseManager,
	isBuiltinPhase,
	PhaseManager,
} from './phaseManager';
// Position cache
export type { CachedPosition, SetPositionCacheOptions } from './positionCache';
export {
	clearAllPositionCaches,
	getCachedInnerHeight,
	getCachedInnerWidth,
	getPositionCache,
	hasValidPositionCache,
	invalidatePositionCache,
	invalidatePositionCacheTree,
	isPointInCachedBounds,
	PositionCache,
	setPositionCache,
	updateCachedScrollBase,
} from './positionCache';
// Positioning
export type { PositionValue } from './positioning';
export {
	centerPosition,
	clampPosition,
	isKeywordPosition,
	isPercentagePosition,
	PositionValueSchema,
	parsePosition,
	parsePositionWithNegative,
	percentOffsetPosition,
	percentPosition,
	resolvePosition,
	resolvePositionClamped,
} from './positioning';
export {
	filterClickable,
	filterDirty,
	filterFocusable,
	filterVisible,
	filterVisibleDirty,
	getChildEntities,
	getDescendantEntities,
	getRootEntities,
	queryBorder,
	queryContent,
	queryFocusable,
	queryHierarchy,
	queryInteractive,
	queryPadding,
	queryRenderable,
	queryScrollable,
	sortByDepth,
	sortByTabIndex,
	// sortByZIndex is exported from ./zOrder (uses dedicated ZOrder component)
} from './queries';
export { createScheduler, getDeltaTime, Scheduler } from './scheduler';
// Shrink-to-content
export type { ShrinkBox } from './shrinkToContent';
export {
	applyShrink,
	calculateShrinkSize,
	getShrinkBox,
	getShrinkHeight,
	getShrinkWidth,
} from './shrinkToContent';
// Style inheritance
export {
	clearStyleCache,
	computeInheritedStyle,
	doesPropertyInherit,
	findPropertySource,
	getCacheGeneration,
	getComputedStyles,
	getDefaultStyle,
	getInheritedProperty,
	getLocalStyle,
	hasValidStyleCache,
	INHERITING_PROPERTIES,
	invalidateAllStyleCaches,
	invalidateStyleCache,
	isDefaultColor,
	mergeStyles,
	NON_INHERITING_PROPERTIES,
	precomputeStyles,
	resolveStyle,
} from './styleInheritance';
export type { Entity, System, Unsubscribe, World } from './types';
export { LoopPhase } from './types';
export { createWorld, resetWorld } from './world';
export type { WorldAdapter, WorldAdapterType } from './worldAdapter';
export {
	clearWorldAdapter,
	createWorldAdapter,
	DEFAULT_WORLD_ADAPTER,
	getWorldAdapter,
	setWorldAdapter,
} from './worldAdapter';
// Z-order management
export {
	DEFAULT_Z_INDEX,
	getChildrenByZIndex,
	getLocalZ,
	getZIndex,
	hasZOrder,
	MAX_Z_INDEX,
	MIN_Z_INDEX,
	moveDown,
	moveUp,
	normalizeZIndices,
	resetZOrder,
	setBack,
	setFront,
	setLocalZ,
	setZIndex,
	sortByZIndex,
	ZOrder,
} from './zOrder';
