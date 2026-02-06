/**
 * Zod validation schemas
 * @module schemas
 */

export type {
	ColorString,
	Dimension,
	NonNegativeInt,
	Percentage,
	PositionValue,
	PositiveInt,
} from './common';
export {
	ColorStringSchema,
	DimensionSchema,
	NonNegativeIntSchema,
	PercentageSchema,
	PositionValueSchema,
	PositiveIntSchema,
} from './common';

export {
	AnimationFrameSchema,
	AnimationOptionsSchema,
	DimensionConstraintsSchema,
	DimensionValueSchema,
	ListBehaviorOptionsSchema,
	ListItemSchema,
	PaddingOptionsSchema,
	PaddingValueSchema,
	ScrollableOptionsSchema,
	SetDimensionsSchema,
	SetPositionSchema,
	SliderPercentageSchema,
	SliderRangeSchema,
	SliderStepSchema,
	StyleColorSchema,
	StyleOptionsSchema,
	ZIndexSchema,
} from './components';
export {
	FixedTimestepConfigSchema,
	GameLoopOptionsSchema,
	LoopStatsSchema,
} from './gameLoop';
export {
	ComputedLayoutSchema,
	DragConstraintsSchema,
	EntityBoundsSchema,
	FocusEventTypeSchema,
	OutputStateSchema,
	QueuedInputEventSchema,
	QueuedKeyEventSchema,
	QueuedMouseEventSchema,
	SnapToGridSchema,
} from './systems';
export {
	BufferEncodingSchema,
	EditorOptionsSchema,
	ExecOptionsSchema,
	SpawnOptionsSchema,
} from './terminal';
export {
	FilePathSchema,
	IntervalSchema,
	OpacitySchema,
	PackedColorSchema,
	SpeedMultiplierSchema,
	TextAlignSchema,
	TreePathSchema,
	VAlignSchema,
	WidgetBorderSchema,
	WidgetColorSchema,
	WidgetDimensionSchema,
	WidgetPaddingSchema,
	WidgetPositionSchema,
} from './widgets';
