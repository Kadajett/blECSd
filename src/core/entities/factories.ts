/**
 * Entity factory functions for creating common entity types.
 * These factories combine components and helpers to create fully-configured entities.
 * @module core/entities/factories
 */

import {
	attachCheckboxBehavior,
	DEFAULT_CHECKED_CHAR,
	DEFAULT_UNCHECKED_CHAR,
	setCheckboxDisplay,
} from '../../components/checkbox';
import { Content, setContent } from '../../components/content';
import { Dimensions } from '../../components/dimensions';
import { Focusable, type FocusableOptions, setFocusable } from '../../components/focusable';
import { attachFormBehavior, registerFormField } from '../../components/form';
import { Hierarchy, setParent } from '../../components/hierarchy';
import { Interactive, type InteractiveOptions } from '../../components/interactive';
import { Position } from '../../components/position';
import {
	attachProgressBarBehavior,
	ProgressOrientation,
	setProgressBarDisplay,
} from '../../components/progressBar';
import {
	attachRadioButtonBehavior,
	attachRadioSetBehavior,
	selectRadioButton,
	setRadioButtonDisplay,
	setRadioValue,
} from '../../components/radioButton';
import { Renderable } from '../../components/renderable';
import {
	hasScreenSingleton,
	initScreenComponent,
	registerScreenSingleton,
} from '../../components/screen';
import { Scrollable } from '../../components/scrollable';
import type { SelectOption } from '../../components/select';
import {
	attachTextInputBehavior,
	DEFAULT_CENSOR_CHAR,
	DEFAULT_PLACEHOLDER,
	setTextInputConfig,
} from '../../components/textInput';
import { setInteractive } from '../../systems/interactiveSystem';
import { attachSelectBehavior, setSelectDisplay } from '../../systems/selectSystem';
import {
	attachSliderBehavior,
	setShowSliderValue,
	setSliderOrientation,
} from '../../systems/sliderSystem';
import { addComponent, addEntity } from '../ecs';
import type { Entity, World } from '../types';
import {
	applyBorderConfig,
	applyDimensionConfig,
	applyFocusableOptions,
	applyInteractiveOptions,
	applyListScrollableOptions,
	applyPaddingConfig,
	applyPositionConfig,
	applyScrollableOptions,
	applySliderDisplayOptions,
	applyStyleConfig,
	applyTextContent,
	initBaseComponents,
	initContentComponent,
	initFocusableComponent,
	initListInteractive,
	initListScrollable,
	initWidgetFocusable,
	initWidgetInteractive,
} from './helpers';
import type {
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
} from './schemas';
import {
	BoxConfigSchema,
	ButtonConfigSchema,
	CheckboxConfigSchema,
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
} from './schemas';

export function createBoxEntity(world: World, config: BoxConfig = {}): Entity {
	const validated = BoxConfigSchema.parse(config);
	const eid = addEntity(world) as Entity;

	initBaseComponents(world, eid);
	applyPositionConfig(eid, validated);
	applyDimensionConfig(eid, validated);
	applyStyleConfig(world, eid, validated);
	applyBorderConfig(world, eid, validated.border);
	applyPaddingConfig(world, eid, validated.padding);

	if (validated.parent !== undefined) {
		setParent(world, eid, validated.parent as Entity);
	}

	return eid;
}

export function createTextEntity(world: World, config: TextConfig = {}): Entity {
	const validated = TextConfigSchema.parse(config);
	const eid = addEntity(world) as Entity;

	initBaseComponents(world, eid);
	applyPositionConfig(eid, validated);
	applyDimensionConfig(eid, validated);
	applyStyleConfig(world, eid, validated);
	applyBorderConfig(world, eid, validated.border);
	applyPaddingConfig(world, eid, validated.padding);

	initContentComponent(world, eid);
	applyTextContent(world, eid, validated);

	if (validated.parent !== undefined) {
		setParent(world, eid, validated.parent as Entity);
	}

	return eid;
}

export function createButtonEntity(world: World, config: ButtonConfig = {}): Entity {
	const validated = ButtonConfigSchema.parse(config);
	const eid = addEntity(world) as Entity;

	initBaseComponents(world, eid);
	applyPositionConfig(eid, validated);
	applyDimensionConfig(eid, validated);
	applyStyleConfig(world, eid, validated);
	applyBorderConfig(world, eid, validated.border);
	applyPaddingConfig(world, eid, validated.padding);

	// Initialize Content component for label
	Content.align[eid] = 1; // Center by default
	Content.valign[eid] = 1; // Middle by default
	Content.wrap[eid] = 0;
	Content.parseTags[eid] = 0;
	Content.length[eid] = 0;
	Content.hash[eid] = 0;

	if (validated.label !== undefined) {
		setContent(world, eid, validated.label);
	}

	// Initialize Interactive component
	addComponent(world, eid, Interactive);
	Interactive.clickable[eid] = 1; // Buttons are clickable by default
	Interactive.draggable[eid] = 0;
	Interactive.hoverable[eid] = 1; // Buttons are hoverable by default
	Interactive.hovered[eid] = 0;
	Interactive.pressed[eid] = 0;
	Interactive.keyable[eid] = 1; // Buttons respond to keys by default
	Interactive.hoverEffectFg[eid] = 0xffffffff;
	Interactive.hoverEffectBg[eid] = 0x444444ff;

	const interactiveOptions: InteractiveOptions = {};
	if (validated.clickable !== undefined) interactiveOptions.clickable = validated.clickable;
	if (validated.draggable !== undefined) interactiveOptions.draggable = validated.draggable;
	if (validated.hoverable !== undefined) interactiveOptions.hoverable = validated.hoverable;
	if (validated.keyable !== undefined) interactiveOptions.keyable = validated.keyable;
	if (validated.hoverEffectFg !== undefined)
		interactiveOptions.hoverEffectFg = validated.hoverEffectFg;
	if (validated.hoverEffectBg !== undefined)
		interactiveOptions.hoverEffectBg = validated.hoverEffectBg;

	if (Object.keys(interactiveOptions).length > 0) {
		setInteractive(world, eid, interactiveOptions);
	}

	// Initialize Focusable component
	addComponent(world, eid, Focusable);
	Focusable.focusable[eid] = 1; // Buttons are focusable by default
	Focusable.focused[eid] = 0;
	Focusable.tabIndex[eid] = 0;
	Focusable.focusEffectFg[eid] = 0xffffffff;
	Focusable.focusEffectBg[eid] = 0x0066ffff;

	const focusableOptions: FocusableOptions = {};
	if (validated.focusable !== undefined) focusableOptions.focusable = validated.focusable;
	if (validated.tabIndex !== undefined) focusableOptions.tabIndex = validated.tabIndex;
	if (validated.focusEffectFg !== undefined)
		focusableOptions.focusEffectFg = validated.focusEffectFg;
	if (validated.focusEffectBg !== undefined)
		focusableOptions.focusEffectBg = validated.focusEffectBg;

	if (Object.keys(focusableOptions).length > 0) {
		setFocusable(world, eid, focusableOptions);
	}

	if (validated.parent !== undefined) {
		setParent(world, eid, validated.parent as Entity);
	}

	return eid;
}

export function createScreenEntity(world: World, config: ScreenConfig): Entity {
	// Check for existing screen before creating entity
	if (hasScreenSingleton(world)) {
		throw new Error('A screen already exists in this world. Only one screen is allowed.');
	}

	const validated = ScreenConfigSchema.parse(config);
	const eid = addEntity(world) as Entity;

	initBaseComponents(world, eid);

	// Screen is always at 0,0 and not absolute
	Position.x[eid] = 0;
	Position.y[eid] = 0;
	Position.z[eid] = 0;
	Position.absolute[eid] = 0;

	// Set dimensions to terminal size
	Dimensions.width[eid] = validated.width;
	Dimensions.height[eid] = validated.height;

	// Screen is always visible
	Renderable.visible[eid] = 1;
	Renderable.dirty[eid] = 1;

	// Screen is the root (no parent - using 0 = NULL_ENTITY)
	Hierarchy.parent[eid] = 0;
	Hierarchy.depth[eid] = 0;

	// Initialize Screen component for cursor, focus, and settings
	initScreenComponent(world, eid, {
		cursorVisible: validated.cursorVisible,
		cursorShape: validated.cursorShape as
			| import('../../components/screen').CursorShapeValue
			| undefined,
		fullUnicode: validated.fullUnicode,
		autoPadding: validated.autoPadding,
	});

	// Register as the singleton screen entity
	registerScreenSingleton(world, eid);

	return eid;
}

export function createInputEntity(world: World, config: InputConfig = {}): Entity {
	const validated = InputConfigSchema.parse(config);
	const eid = addEntity(world) as Entity;

	initBaseComponents(world, eid);
	applyPositionConfig(eid, validated);
	applyDimensionConfig(eid, validated);
	applyStyleConfig(world, eid, validated);
	applyBorderConfig(world, eid, validated.border);
	applyPaddingConfig(world, eid, validated.padding);

	// Initialize Content component for value
	Content.align[eid] = 0; // Left align
	Content.valign[eid] = 1; // Middle
	Content.wrap[eid] = 0;
	Content.parseTags[eid] = 0;
	Content.length[eid] = 0;
	Content.hash[eid] = 0;

	if (validated.value !== undefined) {
		setContent(world, eid, validated.value);
	}

	// Initialize Interactive component
	Interactive.clickable[eid] = 1;
	Interactive.draggable[eid] = 0;
	Interactive.hoverable[eid] = 1;
	Interactive.hovered[eid] = 0;
	Interactive.pressed[eid] = 0;
	Interactive.keyable[eid] = 1;
	Interactive.hoverEffectFg[eid] = 0xffffffff;
	Interactive.hoverEffectBg[eid] = 0x333333ff;

	const interactiveOptions: InteractiveOptions = {};
	if (validated.clickable !== undefined) interactiveOptions.clickable = validated.clickable;
	if (validated.draggable !== undefined) interactiveOptions.draggable = validated.draggable;
	if (validated.hoverable !== undefined) interactiveOptions.hoverable = validated.hoverable;
	if (validated.keyable !== undefined) interactiveOptions.keyable = validated.keyable;
	if (validated.hoverEffectFg !== undefined)
		interactiveOptions.hoverEffectFg = validated.hoverEffectFg;
	if (validated.hoverEffectBg !== undefined)
		interactiveOptions.hoverEffectBg = validated.hoverEffectBg;

	if (Object.keys(interactiveOptions).length > 0) {
		setInteractive(world, eid, interactiveOptions);
	}

	// Initialize Focusable component
	addComponent(world, eid, Focusable);
	Focusable.focusable[eid] = 1;
	Focusable.focused[eid] = 0;
	Focusable.tabIndex[eid] = 0;
	Focusable.focusEffectFg[eid] = 0xffffffff;
	Focusable.focusEffectBg[eid] = 0x0066ffff;

	const focusableOptions: FocusableOptions = {};
	if (validated.focusable !== undefined) focusableOptions.focusable = validated.focusable;
	if (validated.tabIndex !== undefined) focusableOptions.tabIndex = validated.tabIndex;
	if (validated.focusEffectFg !== undefined)
		focusableOptions.focusEffectFg = validated.focusEffectFg;
	if (validated.focusEffectBg !== undefined)
		focusableOptions.focusEffectBg = validated.focusEffectBg;

	if (Object.keys(focusableOptions).length > 0) {
		setFocusable(world, eid, focusableOptions);
	}

	if (validated.parent !== undefined) {
		setParent(world, eid, validated.parent as Entity);
	}

	return eid;
}

export function createListEntity(world: World, config: ListConfig = {}): Entity {
	const validated = ListConfigSchema.parse(config);
	const eid = addEntity(world) as Entity;

	initBaseComponents(world, eid);
	applyPositionConfig(eid, validated);
	applyDimensionConfig(eid, validated);
	applyStyleConfig(world, eid, validated);
	applyBorderConfig(world, eid, validated.border);
	applyPaddingConfig(world, eid, validated.padding);

	initContentComponent(world, eid);
	if (validated.items !== undefined && validated.items.length > 0) {
		setContent(world, eid, validated.items.join('\n'));
	}

	initListScrollable(world, eid, validated.items?.length ?? 0);
	applyListScrollableOptions(world, eid, validated);

	initFocusableComponent(world, eid);
	applyFocusableOptions(world, eid, validated);

	initListInteractive(eid);

	if (validated.parent !== undefined) {
		setParent(world, eid, validated.parent as Entity);
	}

	return eid;
}

export function createCheckboxEntity(world: World, config: CheckboxConfig = {}): Entity {
	const validated = CheckboxConfigSchema.parse(config);
	const eid = addEntity(world) as Entity;

	initBaseComponents(world, eid);
	applyPositionConfig(eid, validated);
	applyDimensionConfig(eid, validated);
	applyStyleConfig(world, eid, validated);
	applyBorderConfig(world, eid, validated.border);
	applyPaddingConfig(world, eid, validated.padding);

	// Initialize Content component for label
	initContentComponent(world, eid);
	Content.align[eid] = 0; // Left align by default
	Content.valign[eid] = 1; // Middle by default

	if (validated.label !== undefined) {
		setContent(world, eid, validated.label);
	}

	// Initialize Interactive and Focusable components with widget defaults
	initWidgetInteractive(world, eid);
	applyInteractiveOptions(world, eid, validated);
	initWidgetFocusable(world, eid);
	applyFocusableOptions(world, eid, validated);

	// Set up checkbox display characters
	setCheckboxDisplay(world, eid, {
		checkedChar: validated.checkedChar ?? DEFAULT_CHECKED_CHAR,
		uncheckedChar: validated.uncheckedChar ?? DEFAULT_UNCHECKED_CHAR,
	});

	// Attach checkbox state machine behavior
	attachCheckboxBehavior(world, eid, validated.checked ?? false);

	if (validated.parent !== undefined) {
		setParent(world, eid, validated.parent as Entity);
	}

	return eid;
}

export function createTextboxEntity(world: World, config: TextboxConfig = {}): Entity {
	const validated = TextboxConfigSchema.parse(config);
	const eid = addEntity(world) as Entity;

	initBaseComponents(world, eid);
	applyPositionConfig(eid, validated);
	applyDimensionConfig(eid, validated);
	applyStyleConfig(world, eid, validated);
	applyBorderConfig(world, eid, validated.border);
	applyPaddingConfig(world, eid, validated.padding);

	// Initialize Content component for value
	initContentComponent(world, eid);
	Content.align[eid] = 0; // Left align by default
	Content.valign[eid] = 1; // Middle by default

	if (validated.value !== undefined) {
		setContent(world, eid, validated.value);
	}

	// Initialize Interactive and Focusable components with widget defaults
	initWidgetInteractive(world, eid);
	Interactive.hoverEffectBg[eid] = 0x333333ff; // Textbox-specific hover color
	applyInteractiveOptions(world, eid, validated);
	initWidgetFocusable(world, eid);
	applyFocusableOptions(world, eid, validated);

	// Attach text input state machine behavior
	attachTextInputBehavior(world, eid);

	// Set up text input configuration
	setTextInputConfig(world, eid, {
		secret: validated.secret ?? false,
		censor: validated.censor ?? DEFAULT_CENSOR_CHAR,
		placeholder: validated.placeholder ?? DEFAULT_PLACEHOLDER,
		maxLength: validated.maxLength ?? 0,
	});

	if (validated.parent !== undefined) {
		setParent(world, eid, validated.parent as Entity);
	}

	return eid;
}

export function createTextareaEntity(world: World, config: TextareaConfig = {}): Entity {
	const validated = TextareaConfigSchema.parse(config);
	const eid = addEntity(world) as Entity;

	initBaseComponents(world, eid);
	applyPositionConfig(eid, validated);
	applyDimensionConfig(eid, validated);
	applyStyleConfig(world, eid, validated);
	applyBorderConfig(world, eid, validated.border);
	applyPaddingConfig(world, eid, validated.padding);

	// Initialize Content component for value
	initContentComponent(world, eid);
	Content.align[eid] = 0; // Left align by default
	Content.valign[eid] = 0; // Top align by default for multiline

	if (validated.value !== undefined) {
		setContent(world, eid, validated.value);
	}

	// Initialize Interactive and Focusable components with widget defaults
	initWidgetInteractive(world, eid);
	Interactive.hoverEffectBg[eid] = 0x333333ff; // Textarea-specific hover color
	applyInteractiveOptions(world, eid, validated);
	initWidgetFocusable(world, eid);
	applyFocusableOptions(world, eid, validated);

	// Initialize Scrollable component if requested
	if (validated.scrollable) {
		addComponent(world, eid, Scrollable);
		Scrollable.scrollX[eid] = 0;
		Scrollable.scrollY[eid] = 0;
		Scrollable.scrollWidth[eid] = 0;
		Scrollable.scrollHeight[eid] = 0; // Will be updated when content changes
		Scrollable.scrollbarVisible[eid] = 2; // Auto
		applyScrollableOptions(world, eid, validated);
	}

	// Attach text input state machine behavior
	attachTextInputBehavior(world, eid);

	// Set up text input configuration with multiline enabled
	setTextInputConfig(world, eid, {
		secret: false, // Textareas don't support secret mode
		censor: '', // Not applicable for textarea
		placeholder: validated.placeholder ?? DEFAULT_PLACEHOLDER,
		maxLength: validated.maxLength ?? 0,
		multiline: true, // Key difference from Textbox
	});

	if (validated.parent !== undefined) {
		setParent(world, eid, validated.parent as Entity);
	}

	return eid;
}

export function createSelectEntity(world: World, config: SelectConfig = {}): Entity {
	const validated = SelectConfigSchema.parse(config);
	const eid = addEntity(world) as Entity;

	initBaseComponents(world, eid);
	applyPositionConfig(eid, validated);
	applyDimensionConfig(eid, validated);
	applyStyleConfig(world, eid, validated);
	applyBorderConfig(world, eid, validated.border);
	applyPaddingConfig(world, eid, validated.padding);

	// Initialize Content component for displaying selected value
	initContentComponent(world, eid);
	Content.align[eid] = 0; // Left align
	Content.valign[eid] = 1; // Middle

	// Initialize Interactive and Focusable components with widget defaults
	initWidgetInteractive(world, eid);
	Interactive.hoverEffectBg[eid] = 0x333333ff; // Select-specific hover color
	applyInteractiveOptions(world, eid, validated);
	initWidgetFocusable(world, eid);
	applyFocusableOptions(world, eid, validated);

	// Attach select behavior with options
	const options: SelectOption[] = validated.options ?? [];
	const selectedIndex = validated.selectedIndex ?? -1;
	attachSelectBehavior(world, eid, options, selectedIndex);

	// Set up display configuration
	const selectDisplayOptions: {
		closedIndicator?: string;
		openIndicator?: string;
		selectedMark?: string;
	} = {};
	if (validated.closedIndicator !== undefined)
		selectDisplayOptions.closedIndicator = validated.closedIndicator;
	if (validated.openIndicator !== undefined)
		selectDisplayOptions.openIndicator = validated.openIndicator;
	if (validated.selectedMark !== undefined)
		selectDisplayOptions.selectedMark = validated.selectedMark;
	setSelectDisplay(world, eid, selectDisplayOptions);

	// Set initial content to placeholder or selected value
	if (selectedIndex >= 0 && options[selectedIndex]) {
		setContent(world, eid, options[selectedIndex].label);
	} else if (validated.placeholder) {
		setContent(world, eid, validated.placeholder);
	}

	if (validated.parent !== undefined) {
		setParent(world, eid, validated.parent as Entity);
	}

	return eid;
}

export function createSliderEntity(world: World, config: SliderConfig = {}): Entity {
	const validated = SliderConfigSchema.parse(config);
	const eid = addEntity(world) as Entity;

	initBaseComponents(world, eid);
	applyPositionConfig(eid, validated);
	applyDimensionConfig(eid, validated);
	applyStyleConfig(world, eid, validated);
	applyBorderConfig(world, eid, validated.border);
	applyPaddingConfig(world, eid, validated.padding);

	// Initialize Interactive and Focusable components with widget defaults
	initWidgetInteractive(world, eid);
	Interactive.draggable[eid] = 1; // Sliders are draggable by default
	Interactive.hoverEffectBg[eid] = 0x333333ff; // Slider-specific hover color
	applyInteractiveOptions(world, eid, validated);
	initWidgetFocusable(world, eid);
	applyFocusableOptions(world, eid, validated);

	// Attach slider behavior
	const min = validated.min ?? 0;
	const max = validated.max ?? 100;
	const value = validated.value ?? 0;
	const step = validated.step ?? 1;
	attachSliderBehavior(world, eid, min, max, value, step);

	// Set orientation if specified
	if (validated.orientation !== undefined) {
		setSliderOrientation(world, eid, validated.orientation as 0 | 1);
	}

	// Set show value if specified
	if (validated.showValue !== undefined) {
		setShowSliderValue(world, eid, validated.showValue);
	}

	// Apply slider display configuration
	applySliderDisplayOptions(world, eid, validated);

	if (validated.parent !== undefined) {
		setParent(world, eid, validated.parent as Entity);
	}

	return eid;
}

export function createFormEntity(world: World, config: FormConfig = {}): Entity {
	const validated = FormConfigSchema.parse(config);
	const eid = addEntity(world) as Entity;

	initBaseComponents(world, eid);
	applyPositionConfig(eid, validated);
	applyDimensionConfig(eid, validated);
	applyStyleConfig(world, eid, validated);
	applyBorderConfig(world, eid, validated.border);
	applyPaddingConfig(world, eid, validated.padding);

	// Attach form behavior
	attachFormBehavior(world, eid, {
		keys: validated.keys ?? true,
		submitOnEnter: validated.submitOnEnter ?? true,
	});

	// Register any pre-configured fields
	if (validated.fields) {
		for (const field of validated.fields) {
			registerFormField(world, eid, field.entity as Entity, field.name, field.initialValue);
		}
	}

	if (validated.parent !== undefined) {
		setParent(world, eid, validated.parent as Entity);
	}

	return eid;
}

export function createProgressBarEntity(world: World, config: ProgressBarConfig = {}): Entity {
	const validated = ProgressBarConfigSchema.parse(config);
	const eid = addEntity(world) as Entity;

	initBaseComponents(world, eid);
	applyPositionConfig(eid, validated);
	applyDimensionConfig(eid, validated);
	applyStyleConfig(world, eid, validated);
	applyBorderConfig(world, eid, validated.border);
	applyPaddingConfig(world, eid, validated.padding);

	// Attach progress bar behavior
	attachProgressBarBehavior(world, eid, {
		value: validated.value ?? 0,
		min: validated.min ?? 0,
		max: validated.max ?? 100,
		orientation: (validated.orientation as ProgressOrientation) ?? ProgressOrientation.Horizontal,
		showPercentage: validated.showPercentage ?? false,
	});

	// Set up display configuration
	if (
		validated.fillChar !== undefined ||
		validated.emptyChar !== undefined ||
		validated.fillFg !== undefined ||
		validated.fillBg !== undefined ||
		validated.emptyFg !== undefined ||
		validated.emptyBg !== undefined
	) {
		setProgressBarDisplay(world, eid, {
			fillChar: validated.fillChar,
			emptyChar: validated.emptyChar,
			fillFg: validated.fillFg,
			fillBg: validated.fillBg,
			emptyFg: validated.emptyFg,
			emptyBg: validated.emptyBg,
		});
	}

	if (validated.parent !== undefined) {
		setParent(world, eid, validated.parent as Entity);
	}

	return eid;
}

export function createRadioSetEntity(world: World, config: RadioSetConfig = {}): Entity {
	const validated = RadioSetConfigSchema.parse(config);
	const eid = addEntity(world) as Entity;

	initBaseComponents(world, eid);
	applyPositionConfig(eid, validated);
	applyDimensionConfig(eid, validated);
	applyStyleConfig(world, eid, validated);
	applyBorderConfig(world, eid, validated.border);
	applyPaddingConfig(world, eid, validated.padding);

	// Attach radio set behavior
	attachRadioSetBehavior(world, eid);

	if (validated.parent !== undefined) {
		setParent(world, eid, validated.parent as Entity);
	}

	return eid;
}

export function createRadioButtonEntity(world: World, config: RadioButtonConfig = {}): Entity {
	const validated = RadioButtonConfigSchema.parse(config);
	const eid = addEntity(world) as Entity;

	initBaseComponents(world, eid);
	applyPositionConfig(eid, validated);
	applyDimensionConfig(eid, validated);
	applyStyleConfig(world, eid, validated);
	applyBorderConfig(world, eid, validated.border);
	applyPaddingConfig(world, eid, validated.padding);

	// Initialize Content component for label
	initContentComponent(world, eid);
	Content.align[eid] = 0; // Left align by default
	Content.valign[eid] = 1; // Middle by default

	if (validated.label !== undefined) {
		setContent(world, eid, validated.label);
	}

	// Initialize Interactive and Focusable components with widget defaults
	initWidgetInteractive(world, eid);
	Interactive.hoverEffectBg[eid] = 0x333333ff; // RadioButton-specific hover color
	applyInteractiveOptions(world, eid, validated);
	initWidgetFocusable(world, eid);
	applyFocusableOptions(world, eid, validated);

	// Attach radio button state machine
	attachRadioButtonBehavior(world, eid, validated.radioSet as Entity | undefined);

	// Set value if provided
	if (validated.value !== undefined) {
		setRadioValue(eid, validated.value);
	}

	// Set display characters if provided
	if (validated.selectedChar !== undefined || validated.unselectedChar !== undefined) {
		setRadioButtonDisplay(eid, {
			selectedChar: validated.selectedChar,
			unselectedChar: validated.unselectedChar,
		});
	}

	if (validated.parent !== undefined) {
		setParent(world, eid, validated.parent as Entity);
	}

	// Select if specified
	if (validated.selected) {
		selectRadioButton(world, eid);
	}

	return eid;
}
