/**
 * TypeScript type exports for blECSd
 *
 * This module provides all public types for library consumers.
 * Types are organized by category for easy discovery.
 *
 * @module types
 */

import type { z } from 'zod';

// =============================================================================
// UTILITY TYPES
// =============================================================================

/**
 * Makes all properties in T and nested objects optional.
 *
 * @example
 * ```typescript
 * import type { DeepPartial } from 'blecsd';
 *
 * interface Config {
 *   display: { width: number; height: number };
 *   input: { keys: boolean; mouse: boolean };
 * }
 *
 * // All properties are optional, including nested
 * const partial: DeepPartial<Config> = {
 *   display: { width: 80 }
 * };
 * ```
 */
export type DeepPartial<T> = T extends object ? { [P in keyof T]?: DeepPartial<T[P]> } : T;

/**
 * Makes all properties in T and nested objects readonly.
 *
 * @example
 * ```typescript
 * import type { DeepReadonly } from 'blecsd';
 *
 * interface State {
 *   position: { x: number; y: number };
 *   velocity: { x: number; y: number };
 * }
 *
 * const frozen: DeepReadonly<State> = {
 *   position: { x: 10, y: 20 },
 *   velocity: { x: 0, y: 0 }
 * };
 *
 * // frozen.position.x = 5; // Error: Cannot assign to 'x' because it is a read-only property
 * ```
 */
export type DeepReadonly<T> = T extends object
	? { readonly [P in keyof T]: DeepReadonly<T[P]> }
	: T;

/**
 * Infers the TypeScript type from a Zod schema.
 *
 * @example
 * ```typescript
 * import { z } from 'zod';
 * import type { InferSchema } from 'blecsd';
 *
 * const PersonSchema = z.object({
 *   name: z.string(),
 *   age: z.number()
 * });
 *
 * type Person = InferSchema<typeof PersonSchema>;
 * // { name: string; age: number }
 * ```
 */
export type InferSchema<T extends z.ZodType> = z.infer<T>;

/**
 * Extracts the input type from a Zod schema.
 * Useful when schema has transforms.
 *
 * @example
 * ```typescript
 * import { z } from 'zod';
 * import type { InferInput } from 'blecsd';
 *
 * const DateSchema = z.string().transform(s => new Date(s));
 *
 * type DateInput = InferInput<typeof DateSchema>;
 * // string (what you pass in)
 *
 * type DateOutput = InferSchema<typeof DateSchema>;
 * // Date (what you get out)
 * ```
 */
export type InferInput<T extends z.ZodType> = z.input<T>;

/**
 * Makes specific keys of T required while keeping others optional.
 *
 * @example
 * ```typescript
 * import type { RequiredKeys } from 'blecsd';
 *
 * interface Config {
 *   width?: number;
 *   height?: number;
 *   title?: string;
 * }
 *
 * // width and height are required, title stays optional
 * type RequiredDimensions = RequiredKeys<Config, 'width' | 'height'>;
 * ```
 */
export type RequiredKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Makes specific keys of T optional while keeping others required.
 *
 * @example
 * ```typescript
 * import type { OptionalKeys } from 'blecsd';
 *
 * interface Component {
 *   x: number;
 *   y: number;
 *   z: number;
 * }
 *
 * // z is optional, x and y stay required
 * type Component2D = OptionalKeys<Component, 'z'>;
 * ```
 */
export type OptionalKeys<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Extracts keys of T that have values assignable to V.
 *
 * @example
 * ```typescript
 * import type { KeysOfType } from 'blecsd';
 *
 * interface Component {
 *   x: number;
 *   y: number;
 *   name: string;
 *   active: boolean;
 * }
 *
 * type NumericKeys = KeysOfType<Component, number>;
 * // 'x' | 'y'
 * ```
 */
export type KeysOfType<T, V> = { [K in keyof T]: T[K] extends V ? K : never }[keyof T];

/**
 * A value that can be either T or a function that returns T.
 * Useful for lazy or dynamic values.
 *
 * @example
 * ```typescript
 * import type { MaybeThunk } from 'blecsd';
 *
 * type DynamicColor = MaybeThunk<number>;
 *
 * const staticColor: DynamicColor = 0xff0000ff;
 * const dynamicColor: DynamicColor = () => Math.random() > 0.5 ? 0xff0000ff : 0x00ff00ff;
 * ```
 */
export type MaybeThunk<T> = T | (() => T);

/**
 * Represents a 32-bit packed RGBA color value.
 * Format: 0xAARRGGBB (alpha, red, green, blue)
 *
 * @example
 * ```typescript
 * import type { PackedColor } from 'blecsd';
 *
 * const red: PackedColor = 0xff0000ff;   // ARGB: 255, 255, 0, 0
 * const green: PackedColor = 0x00ff00ff; // ARGB: 255, 0, 255, 0
 * const transparent: PackedColor = 0xff000080; // 50% alpha
 * ```
 */
export type PackedColor = number;

/**
 * A callback that can be unsubscribed.
 * Returns a function that removes the subscription.
 *
 * @example
 * ```typescript
 * import type { Subscription } from 'blecsd';
 *
 * function subscribe(callback: () => void): Subscription {
 *   // Register callback...
 *   return () => {
 *     // Remove callback...
 *   };
 * }
 *
 * const unsub = subscribe(() => console.log('event'));
 * unsub(); // Removes the subscription
 * ```
 */
export type Subscription = () => void;

// =============================================================================
// CORE TYPES - Re-exports from core module
// =============================================================================

export type {
	/** Branded Entity ID type for type safety */
	Entity,
	/** A system function that processes the world */
	System,
	/** Function to unsubscribe from events */
	Unsubscribe,
	/** The ECS World type from bitecs */
	World,
} from '../core/types';

// Re-export LoopPhase enum (not a type)
export { LoopPhase } from '../core/types';

// =============================================================================
// EVENT TYPES
// =============================================================================

export type {
	/** Bubbleable event interface */
	BubbleableEvent,
	/** Options for bubbleable events */
	BubbleableEventOptions,
	/** Result of event bubbling */
	BubbleResult,
} from '../core/eventBubbling';
export type {
	/** Entity event bus store interface */
	EntityEventBusStore,
	/** Handler function for events */
	EventHandler,
	/** Generic event map interface */
	EventMap,
	/** Function to get entity event bus */
	GetEntityEventBus,
	/** Screen-level event map */
	ScreenEventMap,
	/** UI element event map */
	UIEventMap,
} from '../core/events';

export type {
	/** Lifecycle event for entity adoption */
	AdoptEvent,
	/** Lifecycle event for entity attachment */
	AttachEvent,
	/** Lifecycle event for entity destruction */
	DestroyEvent,
	/** Lifecycle event for entity detachment */
	DetachEvent,
	/** Base lifecycle event type */
	LifecycleEvent,
	/** Map of lifecycle events */
	LifecycleEventMap,
	/** Names of lifecycle events */
	LifecycleEventName,
	/** Lifecycle event for entity removal */
	RemoveEvent,
	/** Lifecycle event for entity reparenting */
	ReparentEvent,
} from '../core/lifecycleEvents';

// =============================================================================
// INPUT TYPES
// =============================================================================

export type {
	/** Action binding configuration */
	ActionBinding,
	/** Action callback function */
	ActionCallback,
	/** Action state */
	ActionState,
	/** Serialized bindings format */
	SerializedBindings,
} from '../core/inputActions';
export type {
	/** Input buffer statistics */
	InputBufferStats,
	/** Input event buffer options */
	InputEventBufferOptions,
	/** Input latency statistics */
	InputLatencyStats,
	/** Timestamped input event */
	TimestampedInputEvent,
	/** Timestamped keyboard event */
	TimestampedKeyEvent,
	/** Timestamped mouse event */
	TimestampedMouseEvent,
} from '../core/inputEventBuffer';
export type {
	/** Input state configuration */
	InputStateConfig,
	/** Input state statistics */
	InputStateStats,
	/** Key state tracking */
	KeyState,
	/** Mouse button state */
	MouseButtonState,
	/** Mouse state tracking */
	MouseState,
} from '../core/inputState';
export type {
	/** Hit test result */
	HitTestResult,
	/** Input event type */
	InputEventType,
	/** Input system state */
	InputSystemState,
	/** Queued input event */
	QueuedInputEvent,
	/** Queued keyboard event */
	QueuedKeyEvent,
	/** Queued mouse event */
	QueuedMouseEvent,
} from '../systems';
export type {
	/** Focus event type */
	FocusEvent,
	/** Parsed keyboard event */
	KeyEvent,
	/** Key name type */
	KeyName,
	/** Mouse action type */
	MouseAction,
	/** Mouse button type */
	MouseButton,
	/** Parsed mouse event */
	MouseEvent,
	/** Mouse protocol type */
	MouseProtocol,
	/** Result of parsing mouse input */
	ParseMouseResult,
} from '../terminal';

// =============================================================================
// COMPONENT DATA TYPES
// =============================================================================

// Animation
export type {
	/** Animation data */
	AnimationData,
	/** Animation definition */
	AnimationDefinition,
	/** Animation frame */
	AnimationFrame,
	/** Animation options */
	AnimationOptions,
	/** Play animation options */
	PlayAnimationOptions,
} from '../components/animation';
export type {
	/** Border character set */
	BorderCharset,
	/** Border data for an entity */
	BorderData,
	/** Border options for configuration */
	BorderOptions,
} from '../components/border';
export type {
	/** Camera bounds */
	CameraBounds,
	/** Camera data */
	CameraData,
	/** Camera options */
	CameraOptions,
} from '../components/camera';
export type {
	/** Axis-aligned bounding box */
	AABB,
	/** Collider data */
	ColliderData,
	/** Collider options */
	ColliderOptions,
	/** Collision pair */
	CollisionPair,
} from '../components/collision';
export type {
	/** Content data for text content */
	ContentData,
	/** Content options for configuration */
	ContentOptions,
} from '../components/content';
export type {
	/** Dimension constraints */
	DimensionConstraints,
	/** Dimensions data for an entity */
	DimensionsData,
	/** Dimension value (number or 'auto' or percentage) */
	DimensionValue,
} from '../components/dimensions';
export type {
	/** Focusable data for an entity */
	FocusableData,
	/** Focusable options for configuration */
	FocusableOptions,
} from '../components/focusable';
// Hierarchy
export type {
	/** Hierarchy data for an entity */
	HierarchyData,
} from '../components/hierarchy';

// Interaction
export type {
	/** Interactive data for an entity */
	InteractiveData,
	/** Interactive options for configuration */
	InteractiveOptions,
} from '../components/interactive';
export type {
	/** Padding data for an entity */
	PaddingData,
	/** Padding options for configuration */
	PaddingOptions,
} from '../components/padding';
// Position and Layout
export type {
	/** Position data for an entity */
	PositionData,
} from '../components/position';
// Rendering
export type {
	/** Renderable data for an entity */
	RenderableData,
	/** Style data for rendering */
	StyleData,
	/** Style options for configuration */
	StyleOptions,
} from '../components/renderable';
export type {
	/** Scrollable data for an entity */
	ScrollableData,
	/** Scrollable options for configuration */
	ScrollableOptions,
	/** Scroll percentage */
	ScrollPercentage,
	/** Scroll position */
	ScrollPosition,
} from '../components/scrollable';
// Sprite
export type {
	/** Sprite cell */
	SpriteCell,
	/** Sprite data */
	SpriteData,
	/** Sprite frame */
	SpriteFrame,
	/** Sprite sheet data */
	SpriteSheetData,
	/** Sprite sheet options */
	SpriteSheetOptions,
} from '../components/sprite';
// Physics
export type {
	/** Acceleration data */
	AccelerationData,
	/** Velocity data */
	VelocityData,
	/** Velocity options */
	VelocityOptions,
} from '../components/velocity';
export type {
	/** Position value type */
	PositionValue,
} from '../core/positioning';

// =============================================================================
// WIDGET STATE TYPES
// =============================================================================

// Button
export type {
	/** Button event */
	ButtonEvent,
	/** Button state */
	ButtonState,
	/** Button store */
	ButtonStore,
} from '../components/button';

// Checkbox
export type {
	/** Checkbox display options */
	CheckboxDisplay,
	/** Checkbox display configuration */
	CheckboxDisplayOptions,
	/** Checkbox event */
	CheckboxEvent,
	/** Checkbox state */
	CheckboxState,
	/** Checkbox store */
	CheckboxStore,
} from '../components/checkbox';
// Form
export type {
	/** Form field value */
	FormFieldValue,
	/** Form reset callback */
	FormResetCallback,
	/** Form store */
	FormStore,
	/** Form submit callback */
	FormSubmitCallback,
	/** Form values */
	FormValues,
} from '../components/form';
// Label
export type {
	/** Label data */
	LabelData,
	/** Label options */
	LabelOptions,
} from '../components/label';
// List
export type {
	/** List action */
	ListAction,
	/** List display */
	ListDisplay,
	/** List display options */
	ListDisplayOptions,
	/** List event */
	ListEvent,
	/** List item */
	ListItem,
	/** List lazy load callback */
	ListLazyLoadCallback,
	/** List scroll callback */
	ListScrollCallback,
	/** List scroll info */
	ListScrollInfo,
	/** List select callback */
	ListSelectCallback,
	/** List state */
	ListState,
	/** List store */
	ListStore,
} from '../components/list';

// ProgressBar
export type {
	/** Progress bar display */
	ProgressBarDisplay,
	/** Progress bar display options */
	ProgressBarDisplayOptions,
	/** Progress bar store */
	ProgressBarStore,
	/** Progress change callback */
	ProgressChangeCallback,
	/** Progress complete callback */
	ProgressCompleteCallback,
} from '../components/progressBar';
// RadioButton
export type {
	/** Radio button display */
	RadioButtonDisplay,
	/** Radio button display options */
	RadioButtonDisplayOptions,
	/** Radio button event */
	RadioButtonEvent,
	/** Radio button state */
	RadioButtonState,
	/** Radio button store */
	RadioButtonStore,
	/** Radio select callback */
	RadioSelectCallback,
	/** Radio set store */
	RadioSetStore,
} from '../components/radioButton';
// Select
export type {
	/** Select callback */
	SelectCallback,
	/** Select display */
	SelectDisplay,
	/** Select display options */
	SelectDisplayOptions,
	/** Select event */
	SelectEvent,
	/** Select option */
	SelectOption,
	/** Select state */
	SelectState,
	/** Select store */
	SelectStore,
} from '../components/select';
export type {
	/** Select action */
	SelectAction,
} from '../systems/selectSystem';
// Slider
export type {
	/** Slider change callback */
	SliderChangeCallback,
	/** Slider display */
	SliderDisplay,
	/** Slider display options */
	SliderDisplayOptions,
	/** Slider event */
	SliderEvent,
	/** Slider orientation type */
	SliderOrientationType,
	/** Slider state */
	SliderState,
	/** Slider store */
	SliderStore,
} from '../components/slider';
export type {
	/** Slider action */
	SliderAction,
} from '../systems/sliderSystem';

// Table
export type {
	/** Cell alignment */
	CellAlign,
	/** Table cell */
	TableCell,
	/** Table column */
	TableColumn,
	/** Table data */
	TableData,
	/** Table display */
	TableDisplay,
	/** Table display options */
	TableDisplayOptions,
	/** Table row */
	TableRow,
	/** Table store */
	TableStore,
} from '../components/table';
// TextInput
export type {
	/** Cursor config */
	CursorConfig,
	/** Cursor config options */
	CursorConfigOptions,
	/** Cursor mode type */
	CursorModeType,
	/** Text input action */
	TextInputAction,
	/** Text input config */
	TextInputConfig,
	/** Text input config options */
	TextInputConfigOptions,
	/** Text input event */
	TextInputEvent,
	/** Text input state */
	TextInputState,
	/** Text input store */
	TextInputStore,
} from '../components/textInput';

// =============================================================================
// CONFIG TYPES
// =============================================================================

export type {
	/** Box configuration */
	BoxConfig,
	/** Button configuration */
	ButtonConfig,
	/** Checkbox configuration */
	CheckboxConfig,
	/** Form configuration */
	FormConfig,
	/** Input configuration */
	InputConfig,
	/** List configuration */
	ListConfig,
	/** Progress bar configuration */
	ProgressBarConfig,
	/** Radio button configuration */
	RadioButtonConfig,
	/** Radio set configuration */
	RadioSetConfig,
	/** Screen configuration */
	ScreenConfig,
	/** Select configuration */
	SelectConfig,
	/** Slider configuration */
	SliderConfig,
	/** Textarea configuration */
	TextareaConfig,
	/** Textbox configuration */
	TextboxConfig,
	/** Text configuration */
	TextConfig,
} from '../core/entities';

// =============================================================================
// GAME LOOP TYPES
// =============================================================================

export type {
	/** Fixed timestep configuration */
	FixedTimestepConfig,
	/** Fixed update hook */
	FixedUpdateHook,
	/** Game loop hooks */
	GameLoopHooks,
	/** Game loop options */
	GameLoopOptions,
	/** Interpolate hook */
	InterpolateHook,
	/** Loop hook function */
	LoopHook,
	/** Loop statistics */
	LoopStats,
} from '../core/gameLoop';

export type {
	/** Phase ID */
	PhaseId,
} from '../core/phaseManager';

// =============================================================================
// COMPUTED POSITION TYPES
// =============================================================================

export type {
	/** Absolute position */
	AbsolutePosition,
	/** Computed position data */
	ComputedPositionData,
	/** Inner dimensions */
	InnerDimensions,
	/** Inner position */
	InnerPosition,
	/** Relative position */
	RelativePosition,
	/** Total padding */
	TotalPadding,
} from '../core/computedPosition';

export type {
	/** Position cache */
	CachedPosition,
	/** Set position cache options */
	SetPositionCacheOptions,
} from '../core/positionCache';

export type {
	/** Shrink box */
	ShrinkBox,
} from '../core/shrinkToContent';

// =============================================================================
// EFFECTS TYPES
// =============================================================================

export type {
	/** Dynamic value (can be static or function) */
	DynamicValue,
	/** Effect configuration */
	EffectConfig,
	/** Resolved effect */
	ResolvedEffect,
} from '../core/effects';

// =============================================================================
// UTILITY TYPES FROM UTILS MODULE
// =============================================================================

export type {
	/** Alignment type */
	Alignment,
	/** Box drawing characters */
	BoxChars,
	/** Cell in a buffer */
	Cell,
	/** Cell buffer */
	CellBuffer,
	/** Fuzzy match result */
	FuzzyMatch,
	/** Fuzzy options */
	FuzzyOptions,
	/** Fuzzy search options */
	FuzzySearchOptions,
	/** Parsed content */
	ParsedContent,
	/** Render box options */
	RenderBoxOptions,
	/** Style attribute */
	StyleAttr,
	/** Style input */
	StyleInput,
	/** Text segment */
	TextSegment,
	/** Wrap options */
	WrapOptions,
} from '../utils';

// =============================================================================
// TERMINAL TYPES
// =============================================================================

export type {
	/** Color support level */
	ColorSupport,
	/** Terminal information */
	TerminalInfo,
} from '../terminal/detection';

export type {
	/** Program configuration */
	ProgramConfig,
	/** Resize event */
	ResizeEvent,
} from '../terminal/program';

// =============================================================================
// SCHEMA TYPES
// =============================================================================

export type {
	/** Color string type */
	ColorString,
	/** Dimension type */
	Dimension,
	/** Non-negative integer type */
	NonNegativeInt,
	/** Percentage type */
	Percentage,
	/** Positive integer type */
	PositiveInt,
} from '../schemas';
