/**
 * Zod schemas for validating entity configuration options.
 * @module core/entities/schemas
 */

import { z } from 'zod';
import type { BorderCharset } from '../../components/border';

// =============================================================================
// SHARED CONFIG SCHEMAS (internal)
// =============================================================================

/**
 * Position configuration shared by all entities.
 * @internal
 */
export const PositionConfigSchema = z.object({
	x: z.number().optional(),
	y: z.number().optional(),
	z: z.number().optional(),
	absolute: z.boolean().optional(),
});

/**
 * Dimension configuration shared by entities with size.
 * @internal
 */
export const DimensionConfigSchema = z.object({
	width: z.union([z.number(), z.string()]).optional(),
	height: z.union([z.number(), z.string()]).optional(),
	minWidth: z.number().optional(),
	maxWidth: z.number().optional(),
	minHeight: z.number().optional(),
	maxHeight: z.number().optional(),
	shrink: z.boolean().optional(),
});

/**
 * Style configuration for renderable entities.
 * @internal
 */
export const StyleConfigSchema = z.object({
	fg: z.number().optional(),
	bg: z.number().optional(),
	bold: z.boolean().optional(),
	italic: z.boolean().optional(),
	underline: z.boolean().optional(),
	strikethrough: z.boolean().optional(),
	dim: z.boolean().optional(),
	inverse: z.boolean().optional(),
	blink: z.boolean().optional(),
	visible: z.boolean().optional(),
});

/**
 * Border configuration.
 * @internal
 */
export const BorderConfigSchema = z.object({
	type: z.number().optional(),
	left: z.boolean().optional(),
	right: z.boolean().optional(),
	top: z.boolean().optional(),
	bottom: z.boolean().optional(),
	fg: z.number().optional(),
	bg: z.number().optional(),
	chars: z.custom<BorderCharset>().optional(),
});

/**
 * Padding configuration.
 * @internal
 */
export const PaddingConfigSchema = z.object({
	left: z.number().optional(),
	right: z.number().optional(),
	top: z.number().optional(),
	bottom: z.number().optional(),
});

/**
 * Content configuration for text entities.
 * @internal
 */
export const ContentConfigSchema = z.object({
	text: z.string().optional(),
	align: z.number().optional(),
	valign: z.number().optional(),
	wrap: z.boolean().optional(),
	parseTags: z.boolean().optional(),
});

/**
 * Interactive configuration.
 * @internal
 */
export const InteractiveConfigSchema = z.object({
	clickable: z.boolean().optional(),
	draggable: z.boolean().optional(),
	hoverable: z.boolean().optional(),
	keyable: z.boolean().optional(),
	hoverEffectFg: z.number().optional(),
	hoverEffectBg: z.number().optional(),
});

/**
 * Focusable configuration.
 * @internal
 */
export const FocusableConfigSchema = z.object({
	focusable: z.boolean().optional(),
	tabIndex: z.number().optional(),
	focusEffectFg: z.number().optional(),
	focusEffectBg: z.number().optional(),
});

/**
 * Scrollable configuration.
 * @internal
 */
export const ScrollableConfigSchema = z.object({
	scrollable: z.boolean().optional(),
	scrollX: z.number().optional(),
	scrollY: z.number().optional(),
	scrollWidth: z.number().optional(),
	scrollHeight: z.number().optional(),
	scrollbarVisible: z.number().optional(),
});

// =============================================================================
// BASIC ENTITY CONFIG SCHEMAS
// =============================================================================

/**
 * Zod schema for validating box entity configuration.
 *
 * Box entities are basic container elements with position, dimensions,
 * optional border, padding, and styling. They serve as the foundation
 * for layout and grouping other elements.
 *
 * @example
 * ```typescript
 * import { BoxConfigSchema } from 'blecsd';
 *
 * const config = BoxConfigSchema.parse({
 *   x: 10,
 *   y: 5,
 *   width: 40,
 *   height: 10,
 *   fg: 0xffffffff,
 *   bg: 0x0000ffff,
 *   border: {
 *     type: 1,
 *     left: true,
 *     right: true,
 *     top: true,
 *     bottom: true,
 *   },
 * });
 * ```
 */
export const BoxConfigSchema = z
	.object({
		parent: z.number().optional(),
		border: BorderConfigSchema.optional(),
		padding: PaddingConfigSchema.optional(),
	})
	.merge(PositionConfigSchema)
	.merge(DimensionConfigSchema)
	.merge(StyleConfigSchema);

/**
 * Configuration options for creating a box entity.
 *
 * @see {@link BoxConfigSchema} for validation
 * @see {@link createBoxEntity} for entity creation
 */
export type BoxConfig = z.infer<typeof BoxConfigSchema>;

/**
 * Zod schema for validating text entity configuration.
 *
 * Text entities display content with optional styling, border, alignment,
 * and text wrapping. They support both plain text and tag-parsed content.
 *
 * @example
 * ```typescript
 * import { TextConfigSchema, TextAlign, TextVAlign } from 'blecsd';
 *
 * const config = TextConfigSchema.parse({
 *   x: 5,
 *   y: 2,
 *   text: 'Hello, World!',
 *   fg: 0x00ff00ff,
 *   align: TextAlign.Center,
 *   valign: TextVAlign.Middle,
 *   wrap: true,
 * });
 * ```
 */
export const TextConfigSchema = z
	.object({
		parent: z.number().optional(),
		border: BorderConfigSchema.optional(),
		padding: PaddingConfigSchema.optional(),
	})
	.merge(PositionConfigSchema)
	.merge(DimensionConfigSchema)
	.merge(StyleConfigSchema)
	.merge(ContentConfigSchema);

/**
 * Configuration options for creating a text entity.
 *
 * @see {@link TextConfigSchema} for validation
 * @see {@link createTextEntity} for entity creation
 */
export type TextConfig = z.infer<typeof TextConfigSchema>;

/**
 * Zod schema for validating screen entity configuration.
 *
 * Screen entities are the root container for all other entities. They represent
 * the terminal viewport and define the coordinate space for child elements.
 * Width and height are required and must be positive integers.
 *
 * @example
 * ```typescript
 * import { ScreenConfigSchema } from 'blecsd';
 *
 * const config = ScreenConfigSchema.parse({
 *   width: 80,
 *   height: 24,
 *   title: 'My Terminal App',
 * });
 * ```
 */
export const ScreenConfigSchema = z.object({
	width: z.number().int().positive(),
	height: z.number().int().positive(),
	title: z.string().optional(),
	cursorVisible: z.boolean().optional(),
	cursorShape: z.number().int().min(0).max(5).optional(),
	fullUnicode: z.boolean().optional(),
	autoPadding: z.boolean().optional(),
});

/**
 * Configuration options for creating a screen entity.
 * Width and height are required.
 *
 * @see {@link ScreenConfigSchema} for validation
 * @see {@link createScreenEntity} for entity creation
 */
export type ScreenConfig = z.infer<typeof ScreenConfigSchema>;

// =============================================================================
// INTERACTIVE WIDGET CONFIG SCHEMAS
// =============================================================================

/**
 * Zod schema for validating button entity configuration.
 *
 * Button entities are interactive elements with focus support, hover effects,
 * and click handling. They display a centered label and respond to keyboard
 * and mouse input.
 *
 * @example
 * ```typescript
 * import { ButtonConfigSchema, BorderType } from 'blecsd';
 *
 * const config = ButtonConfigSchema.parse({
 *   x: 10,
 *   y: 5,
 *   width: 12,
 *   height: 3,
 *   label: 'Submit',
 *   clickable: true,
 *   hoverable: true,
 *   focusable: true,
 *   border: {
 *     type: BorderType.Line,
 *     left: true,
 *     right: true,
 *     top: true,
 *     bottom: true,
 *   },
 * });
 * ```
 */
export const ButtonConfigSchema = z
	.object({
		parent: z.number().optional(),
		label: z.string().optional(),
		border: BorderConfigSchema.optional(),
		padding: PaddingConfigSchema.optional(),
	})
	.merge(PositionConfigSchema)
	.merge(DimensionConfigSchema)
	.merge(StyleConfigSchema)
	.merge(InteractiveConfigSchema)
	.merge(FocusableConfigSchema);

/**
 * Configuration options for creating a button entity.
 *
 * @see {@link ButtonConfigSchema} for validation
 * @see {@link createButtonEntity} for entity creation
 */
export type ButtonConfig = z.infer<typeof ButtonConfigSchema>;

/**
 * Zod schema for validating list entity configuration.
 *
 * List entities display a scrollable list of items with selection support.
 * They are focusable, respond to keyboard navigation, and support
 * configurable scrollbar visibility.
 *
 * @example
 * ```typescript
 * import { ListConfigSchema } from 'blecsd';
 *
 * const config = ListConfigSchema.parse({
 *   x: 5,
 *   y: 5,
 *   width: 30,
 *   height: 10,
 *   items: ['Option 1', 'Option 2', 'Option 3'],
 *   selectedIndex: 0,
 *   scrollable: true,
 *   focusable: true,
 *   border: {
 *     type: 1,
 *     left: true,
 *     right: true,
 *     top: true,
 *     bottom: true,
 *   },
 * });
 * ```
 */
export const ListConfigSchema = z
	.object({
		parent: z.number().optional(),
		items: z.array(z.string()).optional(),
		selectedIndex: z.number().optional(),
		border: BorderConfigSchema.optional(),
		padding: PaddingConfigSchema.optional(),
	})
	.merge(PositionConfigSchema)
	.merge(DimensionConfigSchema)
	.merge(StyleConfigSchema)
	.merge(ScrollableConfigSchema)
	.merge(FocusableConfigSchema);

/**
 * Configuration options for creating a list entity.
 *
 * @see {@link ListConfigSchema} for validation
 * @see {@link createListEntity} for entity creation
 */
export type ListConfig = z.infer<typeof ListConfigSchema>;

/**
 * Schema for validating progress bar configuration.
 */
export const ProgressBarConfigSchema = z
	.object({
		parent: z.number().optional(),
		/** Current value (default: 0) */
		value: z.number().optional(),
		/** Minimum value (default: 0) */
		min: z.number().optional(),
		/** Maximum value (default: 100) */
		max: z.number().optional(),
		/** Orientation (0 = horizontal, 1 = vertical) */
		orientation: z.number().optional(),
		/** Whether to display percentage text */
		showPercentage: z.boolean().optional(),
		/** Fill character for completed portion */
		fillChar: z.string().optional(),
		/** Empty character for remaining portion */
		emptyChar: z.string().optional(),
		/** Fill foreground color */
		fillFg: z.number().optional(),
		/** Fill background color */
		fillBg: z.number().optional(),
		/** Empty foreground color */
		emptyFg: z.number().optional(),
		/** Empty background color */
		emptyBg: z.number().optional(),
		border: BorderConfigSchema.optional(),
		padding: PaddingConfigSchema.optional(),
	})
	.merge(PositionConfigSchema)
	.merge(DimensionConfigSchema)
	.merge(StyleConfigSchema);

/**
 * Configuration options for creating a progress bar entity.
 *
 * @see {@link ProgressBarConfigSchema} for validation
 * @see {@link createProgressBarEntity} for entity creation
 */
export type ProgressBarConfig = z.infer<typeof ProgressBarConfigSchema>;

// =============================================================================
// FORM INPUT CONFIG SCHEMAS
// =============================================================================

/**
 * Zod schema for validating input entity configuration.
 *
 * Input entities are text input fields with focus and key handling.
 * They support placeholder text, maximum length constraints, and
 * visual feedback for focus and hover states.
 *
 * @example
 * ```typescript
 * import { InputConfigSchema } from 'blecsd';
 *
 * const config = InputConfigSchema.parse({
 *   x: 10,
 *   y: 5,
 *   width: 30,
 *   height: 1,
 *   value: '',
 *   placeholder: 'Enter your name...',
 *   maxLength: 100,
 *   focusable: true,
 *   focusEffectFg: 0x00ff00ff,
 *   focusEffectBg: 0x111111ff,
 * });
 * ```
 */
export const InputConfigSchema = z
	.object({
		parent: z.number().optional(),
		value: z.string().optional(),
		placeholder: z.string().optional(),
		maxLength: z.number().optional(),
		border: BorderConfigSchema.optional(),
		padding: PaddingConfigSchema.optional(),
	})
	.merge(PositionConfigSchema)
	.merge(DimensionConfigSchema)
	.merge(StyleConfigSchema)
	.merge(InteractiveConfigSchema)
	.merge(FocusableConfigSchema);

/**
 * Configuration options for creating an input entity.
 *
 * @see {@link InputConfigSchema} for validation
 * @see {@link createInputEntity} for entity creation
 */
export type InputConfig = z.infer<typeof InputConfigSchema>;

/**
 * Zod schema for validating textbox entity configuration.
 *
 * Textbox entities are single-line text input fields with cursor support,
 * password masking, placeholder text, and keyboard navigation. They support
 * Enter to submit, Escape to cancel, and standard text editing keys.
 *
 * @example
 * ```typescript
 * import { TextboxConfigSchema } from 'blecsd';
 *
 * const config = TextboxConfigSchema.parse({
 *   x: 10,
 *   y: 5,
 *   width: 30,
 *   value: '',
 *   placeholder: 'Enter your name...',
 *   maxLength: 50,
 *   focusable: true,
 * });
 *
 * // Password field
 * const passwordConfig = TextboxConfigSchema.parse({
 *   x: 10,
 *   y: 8,
 *   width: 30,
 *   secret: true,
 *   censor: '*',
 *   placeholder: 'Enter password...',
 * });
 * ```
 */
export const TextboxConfigSchema = z
	.object({
		parent: z.number().optional(),
		/** Initial text value */
		value: z.string().optional(),
		/** Placeholder text shown when empty */
		placeholder: z.string().optional(),
		/** Password mode - masks input with censor character */
		secret: z.boolean().optional(),
		/** Character used to mask password input (default: '*') */
		censor: z.string().optional(),
		/** Maximum input length (0 = unlimited) */
		maxLength: z.number().optional(),
		border: BorderConfigSchema.optional(),
		padding: PaddingConfigSchema.optional(),
	})
	.merge(PositionConfigSchema)
	.merge(DimensionConfigSchema)
	.merge(StyleConfigSchema)
	.merge(InteractiveConfigSchema)
	.merge(FocusableConfigSchema);

/**
 * Configuration options for creating a textbox entity.
 *
 * @see {@link TextboxConfigSchema} for validation
 * @see {@link createTextboxEntity} for entity creation
 */
export type TextboxConfig = z.infer<typeof TextboxConfigSchema>;

/**
 * Zod schema for validating textarea entity configuration.
 *
 * Textarea entities are multi-line text input fields. They support Enter for
 * new lines, scrolling when content exceeds visible area, and submit via
 * Escape or Ctrl+Enter.
 *
 * @example
 * ```typescript
 * import { TextareaConfigSchema } from 'blecsd';
 *
 * const config = TextareaConfigSchema.parse({
 *   x: 10,
 *   y: 5,
 *   width: 40,
 *   height: 5,
 *   placeholder: 'Enter your message...',
 *   scrollable: true,
 * });
 * ```
 */
export const TextareaConfigSchema = z
	.object({
		parent: z.number().optional(),
		/** Initial text value */
		value: z.string().optional(),
		/** Placeholder text shown when empty */
		placeholder: z.string().optional(),
		/** Maximum input length (0 = unlimited) */
		maxLength: z.number().optional(),
		/** Whether textarea should scroll when content exceeds visible area */
		scrollable: z.boolean().optional(),
		border: BorderConfigSchema.optional(),
		padding: PaddingConfigSchema.optional(),
	})
	.merge(PositionConfigSchema)
	.merge(DimensionConfigSchema)
	.merge(StyleConfigSchema)
	.merge(InteractiveConfigSchema)
	.merge(FocusableConfigSchema)
	.merge(ScrollableConfigSchema);

/**
 * Configuration options for creating a textarea entity.
 *
 * @see {@link TextareaConfigSchema} for validation
 * @see {@link createTextareaEntity} for entity creation
 */
export type TextareaConfig = z.infer<typeof TextareaConfigSchema>;

/**
 * Zod schema for validating checkbox entity configuration.
 *
 * Checkbox entities are toggle controls with checked/unchecked states.
 * They support keyboard interaction (Enter/Space to toggle), focus handling,
 * and customizable display characters for both states.
 *
 * @example
 * ```typescript
 * import { CheckboxConfigSchema } from 'blecsd';
 *
 * const config = CheckboxConfigSchema.parse({
 *   x: 5,
 *   y: 10,
 *   label: 'Accept terms and conditions',
 *   checked: false,
 *   checkedChar: '☑',
 *   uncheckedChar: '☐',
 *   focusable: true,
 * });
 * ```
 */
export const CheckboxConfigSchema = z
	.object({
		parent: z.number().optional(),
		/** Label text displayed next to the checkbox */
		label: z.string().optional(),
		/** Initial checked state (default: false) */
		checked: z.boolean().optional(),
		/** Character displayed when checked (default: '☑') */
		checkedChar: z.string().optional(),
		/** Character displayed when unchecked (default: '☐') */
		uncheckedChar: z.string().optional(),
		border: BorderConfigSchema.optional(),
		padding: PaddingConfigSchema.optional(),
	})
	.merge(PositionConfigSchema)
	.merge(DimensionConfigSchema)
	.merge(StyleConfigSchema)
	.merge(InteractiveConfigSchema)
	.merge(FocusableConfigSchema);

/**
 * Configuration options for creating a checkbox entity.
 *
 * @see {@link CheckboxConfigSchema} for validation
 * @see {@link createCheckboxEntity} for entity creation
 */
export type CheckboxConfig = z.infer<typeof CheckboxConfigSchema>;

/**
 * Zod schema for validating select/dropdown entity configuration.
 *
 * Select entities are dropdown controls with a list of options.
 * They support click to open, keyboard navigation, and selection.
 *
 * @example
 * ```typescript
 * import { SelectConfigSchema } from 'blecsd';
 *
 * const config = SelectConfigSchema.parse({
 *   x: 10,
 *   y: 5,
 *   width: 30,
 *   options: [
 *     { label: 'Option 1', value: 'opt1' },
 *     { label: 'Option 2', value: 'opt2' },
 *   ],
 *   selectedIndex: 0,
 *   placeholder: 'Select an option...',
 * });
 * ```
 */
export const SelectConfigSchema = z
	.object({
		parent: z.number().optional(),
		/** Array of options */
		options: z
			.array(
				z.object({
					label: z.string(),
					value: z.string(),
				}),
			)
			.optional(),
		/** Initially selected option index (-1 for none) */
		selectedIndex: z.number().optional(),
		/** Placeholder text when no selection */
		placeholder: z.string().optional(),
		/** Dropdown indicator when closed */
		closedIndicator: z.string().optional(),
		/** Dropdown indicator when open */
		openIndicator: z.string().optional(),
		/** Selected option mark in dropdown */
		selectedMark: z.string().optional(),
		border: BorderConfigSchema.optional(),
		padding: PaddingConfigSchema.optional(),
	})
	.merge(PositionConfigSchema)
	.merge(DimensionConfigSchema)
	.merge(StyleConfigSchema)
	.merge(InteractiveConfigSchema)
	.merge(FocusableConfigSchema);

/**
 * Configuration options for creating a select entity.
 *
 * @see {@link SelectConfigSchema} for validation
 * @see {@link createSelectEntity} for entity creation
 */
export type SelectConfig = z.infer<typeof SelectConfigSchema>;

/**
 * Zod schema for validating slider entity configuration.
 *
 * Slider entities are range input controls with a track and thumb.
 * They support click/drag to change value, keyboard navigation,
 * and customizable display.
 *
 * @example
 * ```typescript
 * import { SliderConfigSchema } from 'blecsd';
 *
 * const config = SliderConfigSchema.parse({
 *   x: 10,
 *   y: 5,
 *   width: 30,
 *   min: 0,
 *   max: 100,
 *   value: 50,
 *   step: 5,
 *   showValue: true,
 * });
 * ```
 */
export const SliderConfigSchema = z
	.object({
		parent: z.number().optional(),
		/** Minimum value (default: 0) */
		min: z.number().optional(),
		/** Maximum value (default: 100) */
		max: z.number().optional(),
		/** Initial value (default: 0) */
		value: z.number().optional(),
		/** Step increment (default: 1) */
		step: z.number().optional(),
		/** Orientation (0=horizontal, 1=vertical) */
		orientation: z.number().optional(),
		/** Whether to display value text */
		showValue: z.boolean().optional(),
		/** Track character */
		trackChar: z.string().optional(),
		/** Thumb character */
		thumbChar: z.string().optional(),
		/** Fill character */
		fillChar: z.string().optional(),
		/** Track foreground color */
		trackFg: z.number().optional(),
		/** Track background color */
		trackBg: z.number().optional(),
		/** Thumb foreground color */
		thumbFg: z.number().optional(),
		/** Thumb background color */
		thumbBg: z.number().optional(),
		/** Fill foreground color */
		fillFg: z.number().optional(),
		/** Fill background color */
		fillBg: z.number().optional(),
		border: BorderConfigSchema.optional(),
		padding: PaddingConfigSchema.optional(),
	})
	.merge(PositionConfigSchema)
	.merge(DimensionConfigSchema)
	.merge(StyleConfigSchema)
	.merge(InteractiveConfigSchema)
	.merge(FocusableConfigSchema);

/**
 * Configuration options for creating a slider entity.
 *
 * @see {@link SliderConfigSchema} for validation
 * @see {@link createSliderEntity} for entity creation
 */
export type SliderConfig = z.infer<typeof SliderConfigSchema>;

/**
 * Schema for validating form configuration.
 */
export const FormConfigSchema = z
	.object({
		parent: z.number().optional(),
		/** Enable Tab/Shift+Tab navigation between fields */
		keys: z.boolean().optional(),
		/** Submit form when Enter is pressed on last field */
		submitOnEnter: z.boolean().optional(),
		/** Field configurations with names for the form */
		fields: z
			.array(
				z.object({
					name: z.string(),
					entity: z.number(),
					initialValue: z.unknown().optional(),
				}),
			)
			.optional(),
		border: BorderConfigSchema.optional(),
		padding: PaddingConfigSchema.optional(),
	})
	.merge(PositionConfigSchema)
	.merge(DimensionConfigSchema)
	.merge(StyleConfigSchema);

/**
 * Configuration options for creating a form entity.
 *
 * @see {@link FormConfigSchema} for validation
 * @see {@link createFormEntity} for entity creation
 */
export type FormConfig = z.infer<typeof FormConfigSchema>;

/**
 * Schema for validating radio set configuration.
 */
export const RadioSetConfigSchema = z
	.object({
		parent: z.number().optional(),
		/** Initial selected index (0-based) */
		selectedIndex: z.number().optional(),
		border: BorderConfigSchema.optional(),
		padding: PaddingConfigSchema.optional(),
	})
	.merge(PositionConfigSchema)
	.merge(DimensionConfigSchema)
	.merge(StyleConfigSchema);

/**
 * Configuration options for creating a radio set entity.
 *
 * @see {@link RadioSetConfigSchema} for validation
 * @see {@link createRadioSetEntity} for entity creation
 */
export type RadioSetConfig = z.infer<typeof RadioSetConfigSchema>;

/**
 * Schema for validating radio button configuration.
 */
export const RadioButtonConfigSchema = z
	.object({
		parent: z.number().optional(),
		/** RadioSet container this button belongs to */
		radioSet: z.number().optional(),
		/** Value associated with this button */
		value: z.string().optional(),
		/** Label text */
		label: z.string().optional(),
		/** Whether this button starts selected */
		selected: z.boolean().optional(),
		/** Custom selected character */
		selectedChar: z.string().optional(),
		/** Custom unselected character */
		unselectedChar: z.string().optional(),
		border: BorderConfigSchema.optional(),
		padding: PaddingConfigSchema.optional(),
	})
	.merge(PositionConfigSchema)
	.merge(DimensionConfigSchema)
	.merge(StyleConfigSchema)
	.merge(InteractiveConfigSchema)
	.merge(FocusableConfigSchema);

/**
 * Configuration options for creating a radio button entity.
 *
 * @see {@link RadioButtonConfigSchema} for validation
 * @see {@link createRadioButtonEntity} for entity creation
 */
export type RadioButtonConfig = z.infer<typeof RadioButtonConfigSchema>;
