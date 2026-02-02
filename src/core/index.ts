/**
 * Core module - ECS foundation
 * @module core
 */

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
// Phase manager
export type { PhaseId } from './phaseManager';
export {
	BUILTIN_PHASE_NAMES,
	createPhaseManager,
	defaultPhaseManager,
	isBuiltinPhase,
	PhaseManager,
} from './phaseManager';
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
export type { Entity, System, Unsubscribe, World } from './types';
export { LoopPhase } from './types';
export { createWorld, resetWorld } from './world';
