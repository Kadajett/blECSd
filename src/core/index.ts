/**
 * Core module - ECS foundation
 * @module core
 */

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
// Effects system
export type { DynamicValue, EffectConfig, ResolvedEffect } from './effects';
export {
	applyCustomEffect,
	applyFocusEffect,
	applyHoverEffect,
	clearAllStoredStyles,
	clearStoredStyle,
	getComputedEffectStyle,
	getOriginalStyle,
	getStoredStyle,
	hasFocusEffectApplied,
	hasHoverEffectApplied,
	hasStoredStyle,
	removeAllEffects,
	removeFocusEffect,
	removeHoverEffect,
	resolveEffectConfig,
	syncEffects,
} from './effects';
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
	InputEventBufferOptions,
	InputLatencyStats,
	TimestampedInputEvent,
	TimestampedKeyEvent,
	TimestampedMouseEvent,
} from './inputEventBuffer';
export {
	createInputEventBuffer,
	globalInputBuffer,
	InputEventBuffer,
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
	sortByZIndex,
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
