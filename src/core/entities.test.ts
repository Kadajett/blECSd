import { beforeEach, describe, expect, it } from 'vitest';
import { Border, BorderType } from '../components/border';
import {
	getCheckboxChar,
	getCheckboxDisplay,
	getCheckboxState,
	isCheckbox,
	isChecked,
	resetCheckboxStore,
	toggleCheckbox,
} from '../components/checkbox';
import { Content, getContent, resetContentStore } from '../components/content';
import { Dimensions } from '../components/dimensions';
import { Focusable, resetFocusState } from '../components/focusable';
import {
	getFormFields,
	isForm,
	isFormKeysEnabled,
	isFormSubmitOnEnter,
	resetFormStore,
} from '../components/form';
import { Hierarchy } from '../components/hierarchy';
import { Interactive } from '../components/interactive';
import { Padding } from '../components/padding';
import { Position } from '../components/position';
import {
	getProgress,
	getProgressBarDisplay,
	getProgressMax,
	getProgressMin,
	getProgressOrientation,
	isProgressBar,
	isShowingPercentage,
	ProgressOrientation,
	resetProgressBarStore,
} from '../components/progressBar';
import { Renderable } from '../components/renderable';
import { Scrollable } from '../components/scrollable';
import { hasScrollable } from '../systems/scrollableSystem';
import {
	getSelectDisplay,
	getSelectedIndex,
	getSelectOptions,
	getSelectState,
	isSelect,
	resetSelectStore,
} from '../systems/selectSystem';
import { SliderOrientation } from '../components/slider';
import {
	getSliderDisplay,
	getSliderMax,
	getSliderMin,
	getSliderOrientation,
	getSliderState,
	getSliderStep,
	getSliderValue,
	isShowingSliderValue,
	isSlider,
	resetSliderStore,
} from '../systems/sliderSystem';
import { StateMachineStore } from '../components/stateMachine';
import {
	getTextInputConfig,
	getTextInputState,
	isMultiline,
	isTextInput,
	resetTextInputStore,
} from '../components/textInput';
import { createWorld } from '../core/ecs';
import {
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
	ScreenConfigSchema,
	SelectConfigSchema,
	SliderConfigSchema,
	TextareaConfigSchema,
	TextboxConfigSchema,
	TextConfigSchema,
} from './entities';
import type { World } from './types';

describe('Entity Factories', () => {
	let world: World;

	beforeEach(() => {
		world = createWorld() as World;
		resetContentStore();
		resetFocusState();
		resetCheckboxStore();
		resetTextInputStore();
		resetFormStore();
		resetProgressBarStore();
		resetSelectStore();
		resetSliderStore();
		StateMachineStore.clear();
	});

	describe('createBoxEntity', () => {
		it('creates a box with default values', () => {
			const eid = createBoxEntity(world);

			expect(Position.x[eid]).toBe(0);
			expect(Position.y[eid]).toBe(0);
			expect(Renderable.visible[eid]).toBe(1);
			expect(Hierarchy.parent[eid]).toBe(0); // NULL_ENTITY
		});

		it('creates a box with position config', () => {
			const eid = createBoxEntity(world, {
				x: 10,
				y: 20,
				z: 5,
				absolute: true,
			});

			expect(Position.x[eid]).toBe(10);
			expect(Position.y[eid]).toBe(20);
			expect(Position.z[eid]).toBe(5);
			expect(Position.absolute[eid]).toBe(1);
		});

		it('creates a box with dimension config', () => {
			const eid = createBoxEntity(world, {
				width: 40,
				height: 10,
				minWidth: 20,
				maxWidth: 60,
			});

			expect(Dimensions.width[eid]).toBe(40);
			expect(Dimensions.height[eid]).toBe(10);
			expect(Dimensions.minWidth[eid]).toBe(20);
			expect(Dimensions.maxWidth[eid]).toBe(60);
		});

		it('creates a box with style config', () => {
			const eid = createBoxEntity(world, {
				fg: 0xff0000ff,
				bg: 0x00ff00ff,
				bold: true,
				visible: true,
			});

			expect(Renderable.fg[eid]).toBe(0xff0000ff);
			expect(Renderable.bg[eid]).toBe(0x00ff00ff);
			expect(Renderable.visible[eid]).toBe(1);
		});

		it('creates a box with border config', () => {
			const eid = createBoxEntity(world, {
				border: {
					type: BorderType.Line,
					left: true,
					right: true,
					top: true,
					bottom: true,
				},
			});

			expect(Border.type[eid]).toBe(BorderType.Line);
			expect(Border.left[eid]).toBe(1);
			expect(Border.right[eid]).toBe(1);
			expect(Border.top[eid]).toBe(1);
			expect(Border.bottom[eid]).toBe(1);
		});

		it('creates a box with padding config', () => {
			const eid = createBoxEntity(world, {
				padding: {
					left: 2,
					right: 2,
					top: 1,
					bottom: 1,
				},
			});

			expect(Padding.left[eid]).toBe(2);
			expect(Padding.right[eid]).toBe(2);
			expect(Padding.top[eid]).toBe(1);
			expect(Padding.bottom[eid]).toBe(1);
		});

		it('creates a box with parent', () => {
			const parent = createBoxEntity(world);
			const child = createBoxEntity(world, { parent });

			expect(Hierarchy.parent[child]).toBe(parent);
		});
	});

	describe('createTextEntity', () => {
		it('creates a text with default values', () => {
			const eid = createTextEntity(world);

			expect(Position.x[eid]).toBe(0);
			expect(Position.y[eid]).toBe(0);
			expect(Renderable.visible[eid]).toBe(1);
			expect(Content.align[eid]).toBe(0);
		});

		it('creates a text with content', () => {
			const eid = createTextEntity(world, {
				text: 'Hello, World!',
			});

			const content = getContent(world, eid);
			expect(content).toBe('Hello, World!');
			expect(Content.length[eid]).toBe(13);
		});

		it('creates a text with alignment', () => {
			const eid = createTextEntity(world, {
				text: 'Centered',
				align: 1, // Center
				valign: 1, // Middle
			});

			expect(Content.align[eid]).toBe(1);
			expect(Content.valign[eid]).toBe(1);
		});

		it('creates a text with wrap enabled', () => {
			const eid = createTextEntity(world, {
				text: 'Long text that should wrap',
				wrap: true,
			});

			expect(Content.wrap[eid]).toBe(1);
		});
	});

	describe('createButtonEntity', () => {
		it('creates a button with default interactive properties', () => {
			const eid = createButtonEntity(world);

			expect(Interactive.clickable[eid]).toBe(1);
			expect(Interactive.hoverable[eid]).toBe(1);
			expect(Interactive.keyable[eid]).toBe(1);
			expect(Focusable.focusable[eid]).toBe(1);
		});

		it('creates a button with label', () => {
			const eid = createButtonEntity(world, {
				label: 'Submit',
			});

			const content = getContent(world, eid);
			expect(content).toBe('Submit');
		});

		it('creates a button with custom interactive options', () => {
			const eid = createButtonEntity(world, {
				clickable: true,
				hoverable: true,
				hoverEffectFg: 0x00ffffff,
				hoverEffectBg: 0xff00ffff,
			});

			expect(Interactive.hoverEffectFg[eid]).toBe(0x00ffffff);
			expect(Interactive.hoverEffectBg[eid]).toBe(0xff00ffff);
		});

		it('creates a button with custom focusable options', () => {
			const eid = createButtonEntity(world, {
				focusable: true,
				tabIndex: 5,
				focusEffectFg: 0xffff00ff,
				focusEffectBg: 0x0000ffff,
			});

			expect(Focusable.tabIndex[eid]).toBe(5);
			expect(Focusable.focusEffectFg[eid]).toBe(0xffff00ff);
			expect(Focusable.focusEffectBg[eid]).toBe(0x0000ffff);
		});

		it('creates a button with border', () => {
			const eid = createButtonEntity(world, {
				border: {
					type: BorderType.Line,
					left: true,
					right: true,
					top: true,
					bottom: true,
				},
			});

			expect(Border.type[eid]).toBe(BorderType.Line);
			expect(Border.left[eid]).toBe(1);
		});
	});

	describe('createScreenEntity', () => {
		it('creates a screen with required dimensions', () => {
			const eid = createScreenEntity(world, {
				width: 80,
				height: 24,
			});

			expect(Position.x[eid]).toBe(0);
			expect(Position.y[eid]).toBe(0);
			expect(Dimensions.width[eid]).toBe(80);
			expect(Dimensions.height[eid]).toBe(24);
		});

		it('creates a screen as root (no parent)', () => {
			const eid = createScreenEntity(world, {
				width: 80,
				height: 24,
			});

			expect(Hierarchy.parent[eid]).toBe(0); // NULL_ENTITY
			expect(Hierarchy.depth[eid]).toBe(0);
		});

		it('creates a screen that is always visible', () => {
			const eid = createScreenEntity(world, {
				width: 80,
				height: 24,
			});

			expect(Renderable.visible[eid]).toBe(1);
		});

		it('throws for invalid screen config', () => {
			expect(() => {
				createScreenEntity(world, {
					width: -1,
					height: 24,
				});
			}).toThrow();
		});
	});

	describe('createInputEntity', () => {
		it('creates an input with default values', () => {
			const eid = createInputEntity(world);

			expect(Interactive.clickable[eid]).toBe(1);
			expect(Interactive.keyable[eid]).toBe(1);
			expect(Focusable.focusable[eid]).toBe(1);
		});

		it('creates an input with initial value', () => {
			const eid = createInputEntity(world, {
				value: 'Initial text',
			});

			const content = getContent(world, eid);
			expect(content).toBe('Initial text');
		});

		it('creates an input with custom focus colors', () => {
			const eid = createInputEntity(world, {
				focusEffectFg: 0x00ff00ff,
				focusEffectBg: 0x111111ff,
			});

			expect(Focusable.focusEffectFg[eid]).toBe(0x00ff00ff);
			expect(Focusable.focusEffectBg[eid]).toBe(0x111111ff);
		});
	});

	describe('createListEntity', () => {
		it('creates a list with items', () => {
			const eid = createListEntity(world, {
				items: ['Item 1', 'Item 2', 'Item 3'],
			});

			const content = getContent(world, eid);
			expect(content).toBe('Item 1\nItem 2\nItem 3');
		});

		it('creates a list with scrollable properties', () => {
			const eid = createListEntity(world, {
				items: ['A', 'B', 'C', 'D', 'E'],
				scrollY: 2,
			});

			expect(Scrollable.scrollY[eid]).toBe(2);
			expect(Scrollable.scrollHeight[eid]).toBe(5);
		});

		it('creates a list that is focusable and keyable', () => {
			const eid = createListEntity(world);

			expect(Focusable.focusable[eid]).toBe(1);
			expect(Interactive.keyable[eid]).toBe(1);
		});

		it('creates an empty list', () => {
			const eid = createListEntity(world, {});

			expect(Scrollable.scrollHeight[eid]).toBe(0);
		});
	});

	describe('createCheckboxEntity', () => {
		it('creates a checkbox with default values', () => {
			const eid = createCheckboxEntity(world);

			expect(Interactive.clickable[eid]).toBe(1);
			expect(Interactive.keyable[eid]).toBe(1);
			expect(Interactive.hoverable[eid]).toBe(1);
			expect(Focusable.focusable[eid]).toBe(1);
		});

		it('creates a checkbox with state machine', () => {
			const eid = createCheckboxEntity(world);

			expect(isCheckbox(world, eid)).toBe(true);
			expect(getCheckboxState(world, eid)).toBe('unchecked');
		});

		it('creates a checkbox that starts unchecked by default', () => {
			const eid = createCheckboxEntity(world);

			expect(isChecked(world, eid)).toBe(false);
		});

		it('creates a checkbox that starts checked when specified', () => {
			const eid = createCheckboxEntity(world, {
				checked: true,
			});

			expect(isChecked(world, eid)).toBe(true);
			expect(getCheckboxState(world, eid)).toBe('checked');
		});

		it('creates a checkbox with label', () => {
			const eid = createCheckboxEntity(world, {
				label: 'Accept terms',
			});

			const content = getContent(world, eid);
			expect(content).toBe('Accept terms');
		});

		it('creates a checkbox with default display characters', () => {
			const eid = createCheckboxEntity(world);

			const display = getCheckboxDisplay(eid);
			expect(display.checkedChar).toBe('☑');
			expect(display.uncheckedChar).toBe('☐');
		});

		it('creates a checkbox with custom display characters', () => {
			const eid = createCheckboxEntity(world, {
				checkedChar: '[x]',
				uncheckedChar: '[ ]',
			});

			const display = getCheckboxDisplay(eid);
			expect(display.checkedChar).toBe('[x]');
			expect(display.uncheckedChar).toBe('[ ]');
		});

		it('returns correct display character based on state', () => {
			const eid = createCheckboxEntity(world, {
				checkedChar: '[X]',
				uncheckedChar: '[_]',
			});

			expect(getCheckboxChar(world, eid)).toBe('[_]');

			toggleCheckbox(world, eid);

			expect(getCheckboxChar(world, eid)).toBe('[X]');
		});

		it('creates a checkbox with custom interactive options', () => {
			const eid = createCheckboxEntity(world, {
				hoverEffectFg: 0x00ffffff,
				hoverEffectBg: 0xff00ffff,
			});

			expect(Interactive.hoverEffectFg[eid]).toBe(0x00ffffff);
			expect(Interactive.hoverEffectBg[eid]).toBe(0xff00ffff);
		});

		it('creates a checkbox with custom focusable options', () => {
			const eid = createCheckboxEntity(world, {
				focusable: true,
				tabIndex: 3,
				focusEffectFg: 0xffff00ff,
				focusEffectBg: 0x0000ffff,
			});

			expect(Focusable.tabIndex[eid]).toBe(3);
			expect(Focusable.focusEffectFg[eid]).toBe(0xffff00ff);
			expect(Focusable.focusEffectBg[eid]).toBe(0x0000ffff);
		});

		it('creates a checkbox with position', () => {
			const eid = createCheckboxEntity(world, {
				x: 10,
				y: 5,
			});

			expect(Position.x[eid]).toBe(10);
			expect(Position.y[eid]).toBe(5);
		});

		it('creates a checkbox with border', () => {
			const eid = createCheckboxEntity(world, {
				border: {
					type: BorderType.Line,
					left: true,
					right: true,
					top: true,
					bottom: true,
				},
			});

			expect(Border.type[eid]).toBe(BorderType.Line);
			expect(Border.left[eid]).toBe(1);
		});

		it('creates a checkbox with parent', () => {
			const parent = createBoxEntity(world);
			const checkbox = createCheckboxEntity(world, { parent });

			expect(Hierarchy.parent[checkbox]).toBe(parent);
		});

		it('toggles checkbox state correctly', () => {
			const eid = createCheckboxEntity(world);

			expect(isChecked(world, eid)).toBe(false);

			toggleCheckbox(world, eid);
			expect(isChecked(world, eid)).toBe(true);

			toggleCheckbox(world, eid);
			expect(isChecked(world, eid)).toBe(false);
		});
	});

	describe('createTextboxEntity', () => {
		it('creates a textbox with default values', () => {
			const eid = createTextboxEntity(world);

			expect(Interactive.clickable[eid]).toBe(1);
			expect(Interactive.keyable[eid]).toBe(1);
			expect(Interactive.hoverable[eid]).toBe(1);
			expect(Focusable.focusable[eid]).toBe(1);
		});

		it('creates a textbox with state machine', () => {
			const eid = createTextboxEntity(world);

			expect(isTextInput(world, eid)).toBe(true);
			expect(getTextInputState(world, eid)).toBe('idle');
		});

		it('creates a textbox with empty value by default', () => {
			const eid = createTextboxEntity(world);

			const content = getContent(world, eid);
			expect(content).toBe('');
		});

		it('creates a textbox with initial value', () => {
			const eid = createTextboxEntity(world, {
				value: 'Hello World',
			});

			const content = getContent(world, eid);
			expect(content).toBe('Hello World');
		});

		it('creates a textbox with placeholder', () => {
			const eid = createTextboxEntity(world, {
				placeholder: 'Enter text...',
			});

			const config = getTextInputConfig(world, eid);
			expect(config.placeholder).toBe('Enter text...');
		});

		it('creates a textbox with secret mode', () => {
			const eid = createTextboxEntity(world, {
				secret: true,
			});

			const config = getTextInputConfig(world, eid);
			expect(config.secret).toBe(true);
		});

		it('creates a textbox with custom censor character', () => {
			const eid = createTextboxEntity(world, {
				secret: true,
				censor: '#',
			});

			const config = getTextInputConfig(world, eid);
			expect(config.censor).toBe('#');
		});

		it('creates a textbox with max length', () => {
			const eid = createTextboxEntity(world, {
				maxLength: 50,
			});

			const config = getTextInputConfig(world, eid);
			expect(config.maxLength).toBe(50);
		});

		it('creates a textbox with custom interactive options', () => {
			const eid = createTextboxEntity(world, {
				hoverEffectFg: 0x00ffffff,
				hoverEffectBg: 0xff00ffff,
			});

			expect(Interactive.hoverEffectFg[eid]).toBe(0x00ffffff);
			expect(Interactive.hoverEffectBg[eid]).toBe(0xff00ffff);
		});

		it('creates a textbox with custom focusable options', () => {
			const eid = createTextboxEntity(world, {
				focusable: true,
				tabIndex: 5,
				focusEffectFg: 0xffff00ff,
				focusEffectBg: 0x0000ffff,
			});

			expect(Focusable.tabIndex[eid]).toBe(5);
			expect(Focusable.focusEffectFg[eid]).toBe(0xffff00ff);
			expect(Focusable.focusEffectBg[eid]).toBe(0x0000ffff);
		});

		it('creates a textbox with position', () => {
			const eid = createTextboxEntity(world, {
				x: 15,
				y: 8,
			});

			expect(Position.x[eid]).toBe(15);
			expect(Position.y[eid]).toBe(8);
		});

		it('creates a textbox with dimensions', () => {
			const eid = createTextboxEntity(world, {
				width: 30,
				height: 1,
			});

			expect(Dimensions.width[eid]).toBe(30);
			expect(Dimensions.height[eid]).toBe(1);
		});

		it('creates a textbox with border', () => {
			const eid = createTextboxEntity(world, {
				border: {
					type: BorderType.Line,
					left: true,
					right: true,
					top: true,
					bottom: true,
				},
			});

			expect(Border.type[eid]).toBe(BorderType.Line);
		});

		it('creates a textbox with padding', () => {
			const eid = createTextboxEntity(world, {
				padding: {
					left: 1,
					right: 1,
				},
			});

			expect(Padding.left[eid]).toBe(1);
			expect(Padding.right[eid]).toBe(1);
		});

		it('creates a textbox with parent', () => {
			const parent = createBoxEntity(world);
			const textbox = createTextboxEntity(world, { parent });

			expect(Hierarchy.parent[textbox]).toBe(parent);
		});
	});

	describe('createTextareaEntity', () => {
		it('creates a textarea with default values', () => {
			const eid = createTextareaEntity(world);

			expect(Interactive.clickable[eid]).toBe(1);
			expect(Interactive.keyable[eid]).toBe(1);
			expect(Interactive.hoverable[eid]).toBe(1);
			expect(Focusable.focusable[eid]).toBe(1);
		});

		it('creates a textarea with state machine', () => {
			const eid = createTextareaEntity(world);

			expect(isTextInput(world, eid)).toBe(true);
			expect(getTextInputState(world, eid)).toBe('idle');
		});

		it('creates a textarea with multiline enabled', () => {
			const eid = createTextareaEntity(world);

			expect(isMultiline(world, eid)).toBe(true);
		});

		it('creates a textarea with empty value by default', () => {
			const eid = createTextareaEntity(world);

			const content = getContent(world, eid);
			expect(content).toBe('');
		});

		it('creates a textarea with initial value', () => {
			const eid = createTextareaEntity(world, {
				value: 'Line 1\nLine 2',
			});

			const content = getContent(world, eid);
			expect(content).toBe('Line 1\nLine 2');
		});

		it('creates a textarea with placeholder', () => {
			const eid = createTextareaEntity(world, {
				placeholder: 'Enter your message...',
			});

			const config = getTextInputConfig(world, eid);
			expect(config.placeholder).toBe('Enter your message...');
		});

		it('creates a textarea without secret mode', () => {
			const eid = createTextareaEntity(world);

			const config = getTextInputConfig(world, eid);
			expect(config.secret).toBe(false);
		});

		it('creates a textarea with max length', () => {
			const eid = createTextareaEntity(world, {
				maxLength: 500,
			});

			const config = getTextInputConfig(world, eid);
			expect(config.maxLength).toBe(500);
		});

		it('creates a textarea with scrollable component', () => {
			const eid = createTextareaEntity(world, {
				scrollable: true,
			});

			expect(hasScrollable(world, eid)).toBe(true);
			expect(Scrollable.scrollX[eid]).toBe(0);
			expect(Scrollable.scrollY[eid]).toBe(0);
			expect(Scrollable.scrollbarVisible[eid]).toBe(2); // Auto
		});

		it('creates a textarea without scrollable by default', () => {
			const eid = createTextareaEntity(world);

			// Should not have Scrollable component
			expect(hasScrollable(world, eid)).toBe(false);
		});

		it('creates a textarea with custom interactive options', () => {
			const eid = createTextareaEntity(world, {
				hoverEffectFg: 0x00ffffff,
				hoverEffectBg: 0xff00ffff,
			});

			expect(Interactive.hoverEffectFg[eid]).toBe(0x00ffffff);
			expect(Interactive.hoverEffectBg[eid]).toBe(0xff00ffff);
		});

		it('creates a textarea with custom focusable options', () => {
			const eid = createTextareaEntity(world, {
				focusable: true,
				tabIndex: 5,
				focusEffectFg: 0xffff00ff,
				focusEffectBg: 0x0000ffff,
			});

			expect(Focusable.tabIndex[eid]).toBe(5);
			expect(Focusable.focusEffectFg[eid]).toBe(0xffff00ff);
			expect(Focusable.focusEffectBg[eid]).toBe(0x0000ffff);
		});

		it('creates a textarea with position', () => {
			const eid = createTextareaEntity(world, {
				x: 15,
				y: 8,
			});

			expect(Position.x[eid]).toBe(15);
			expect(Position.y[eid]).toBe(8);
		});

		it('creates a textarea with dimensions', () => {
			const eid = createTextareaEntity(world, {
				width: 50,
				height: 10,
			});

			expect(Dimensions.width[eid]).toBe(50);
			expect(Dimensions.height[eid]).toBe(10);
		});

		it('creates a textarea with border', () => {
			const eid = createTextareaEntity(world, {
				border: {
					type: BorderType.Line,
					left: true,
					right: true,
					top: true,
					bottom: true,
				},
			});

			expect(Border.type[eid]).toBe(BorderType.Line);
		});

		it('creates a textarea with padding', () => {
			const eid = createTextareaEntity(world, {
				padding: {
					left: 1,
					right: 1,
					top: 1,
					bottom: 1,
				},
			});

			expect(Padding.left[eid]).toBe(1);
			expect(Padding.right[eid]).toBe(1);
			expect(Padding.top[eid]).toBe(1);
			expect(Padding.bottom[eid]).toBe(1);
		});

		it('creates a textarea with parent', () => {
			const parent = createBoxEntity(world);
			const textarea = createTextareaEntity(world, { parent });

			expect(Hierarchy.parent[textarea]).toBe(parent);
		});

		it('creates a textarea with top-aligned content by default', () => {
			const eid = createTextareaEntity(world);

			// Textareas should have top-aligned content for multiline
			expect(Content.valign[eid]).toBe(0); // Top
			expect(Content.align[eid]).toBe(0); // Left
		});

		it('validates textarea config with schema', () => {
			const config = TextareaConfigSchema.parse({
				x: 10,
				y: 5,
				width: 40,
				height: 5,
				placeholder: 'Enter text...',
				scrollable: true,
				maxLength: 500,
			});

			expect(config.x).toBe(10);
			expect(config.y).toBe(5);
			expect(config.width).toBe(40);
			expect(config.height).toBe(5);
			expect(config.placeholder).toBe('Enter text...');
			expect(config.scrollable).toBe(true);
			expect(config.maxLength).toBe(500);
		});
	});

	describe('createSelectEntity', () => {
		it('creates a select with default values', () => {
			const eid = createSelectEntity(world);

			expect(Interactive.clickable[eid]).toBe(1);
			expect(Interactive.keyable[eid]).toBe(1);
			expect(Interactive.hoverable[eid]).toBe(1);
			expect(Focusable.focusable[eid]).toBe(1);
		});

		it('creates a select with state machine', () => {
			const eid = createSelectEntity(world);

			expect(isSelect(world, eid)).toBe(true);
			expect(getSelectState(world, eid)).toBe('closed');
		});

		it('creates a select with options', () => {
			const eid = createSelectEntity(world, {
				options: [
					{ label: 'Red', value: 'red' },
					{ label: 'Green', value: 'green' },
					{ label: 'Blue', value: 'blue' },
				],
			});

			expect(getSelectOptions(world, eid).length).toBe(3);
			expect(getSelectOptions(world, eid)[0]).toEqual({ label: 'Red', value: 'red' });
		});

		it('creates a select with selected index', () => {
			const eid = createSelectEntity(world, {
				options: [
					{ label: 'Red', value: 'red' },
					{ label: 'Green', value: 'green' },
				],
				selectedIndex: 1,
			});

			expect(getSelectedIndex(world, eid)).toBe(1);
		});

		it('creates a select with placeholder in content when no selection', () => {
			const eid = createSelectEntity(world, {
				placeholder: 'Choose a color...',
			});

			expect(getContent(world, eid)).toBe('Choose a color...');
		});

		it('creates a select with selected value in content', () => {
			const eid = createSelectEntity(world, {
				options: [
					{ label: 'Red', value: 'red' },
					{ label: 'Green', value: 'green' },
				],
				selectedIndex: 0,
			});

			expect(getContent(world, eid)).toBe('Red');
		});

		it('creates a select with custom display indicators', () => {
			const eid = createSelectEntity(world, {
				closedIndicator: 'v',
				openIndicator: '^',
				selectedMark: '*',
			});

			const display = getSelectDisplay(world, eid);
			expect(display.closedIndicator).toBe('v');
			expect(display.openIndicator).toBe('^');
			expect(display.selectedMark).toBe('*');
		});

		it('creates a select with custom interactive options', () => {
			const eid = createSelectEntity(world, {
				hoverEffectFg: 0x00ffffff,
				hoverEffectBg: 0xff00ffff,
			});

			expect(Interactive.hoverEffectFg[eid]).toBe(0x00ffffff);
			expect(Interactive.hoverEffectBg[eid]).toBe(0xff00ffff);
		});

		it('creates a select with custom focusable options', () => {
			const eid = createSelectEntity(world, {
				focusable: true,
				tabIndex: 5,
				focusEffectFg: 0xffff00ff,
				focusEffectBg: 0x0000ffff,
			});

			expect(Focusable.tabIndex[eid]).toBe(5);
			expect(Focusable.focusEffectFg[eid]).toBe(0xffff00ff);
			expect(Focusable.focusEffectBg[eid]).toBe(0x0000ffff);
		});

		it('creates a select with position', () => {
			const eid = createSelectEntity(world, {
				x: 15,
				y: 8,
			});

			expect(Position.x[eid]).toBe(15);
			expect(Position.y[eid]).toBe(8);
		});

		it('creates a select with dimensions', () => {
			const eid = createSelectEntity(world, {
				width: 30,
				height: 1,
			});

			expect(Dimensions.width[eid]).toBe(30);
			expect(Dimensions.height[eid]).toBe(1);
		});

		it('creates a select with border', () => {
			const eid = createSelectEntity(world, {
				border: {
					type: BorderType.Line,
					left: true,
					right: true,
					top: true,
					bottom: true,
				},
			});

			expect(Border.type[eid]).toBe(BorderType.Line);
		});

		it('creates a select with padding', () => {
			const eid = createSelectEntity(world, {
				padding: {
					left: 1,
					right: 1,
				},
			});

			expect(Padding.left[eid]).toBe(1);
			expect(Padding.right[eid]).toBe(1);
		});

		it('creates a select with parent', () => {
			const parent = createBoxEntity(world);
			const select = createSelectEntity(world, { parent });

			expect(Hierarchy.parent[select]).toBe(parent);
		});

		it('validates select config with schema', () => {
			const config = SelectConfigSchema.parse({
				x: 10,
				y: 5,
				width: 30,
				options: [
					{ label: 'Option 1', value: 'opt1' },
					{ label: 'Option 2', value: 'opt2' },
				],
				selectedIndex: 0,
				placeholder: 'Select an option...',
			});

			expect(config.x).toBe(10);
			expect(config.y).toBe(5);
			expect(config.width).toBe(30);
			expect(config.options?.length).toBe(2);
			expect(config.selectedIndex).toBe(0);
			expect(config.placeholder).toBe('Select an option...');
		});
	});

	describe('createSliderEntity', () => {
		it('creates a slider with default values', () => {
			const eid = createSliderEntity(world);

			expect(Interactive.clickable[eid]).toBe(1);
			expect(Interactive.draggable[eid]).toBe(1);
			expect(Interactive.keyable[eid]).toBe(1);
			expect(Interactive.hoverable[eid]).toBe(1);
			expect(Focusable.focusable[eid]).toBe(1);
		});

		it('creates a slider with state machine', () => {
			const eid = createSliderEntity(world);

			expect(isSlider(world, eid)).toBe(true);
			expect(getSliderState(world, eid)).toBe('idle');
		});

		it('creates a slider with default range', () => {
			const eid = createSliderEntity(world);

			expect(getSliderMin(world, eid)).toBe(0);
			expect(getSliderMax(world, eid)).toBe(100);
			expect(getSliderValue(world, eid)).toBe(0);
			expect(getSliderStep(world, eid)).toBe(1);
		});

		it('creates a slider with custom range', () => {
			const eid = createSliderEntity(world, {
				min: 10,
				max: 50,
				value: 25,
				step: 5,
			});

			expect(getSliderMin(world, eid)).toBe(10);
			expect(getSliderMax(world, eid)).toBe(50);
			expect(getSliderValue(world, eid)).toBe(25);
			expect(getSliderStep(world, eid)).toBe(5);
		});

		it('creates a slider with orientation', () => {
			const horizontal = createSliderEntity(world, {
				orientation: SliderOrientation.Horizontal,
			});
			const vertical = createSliderEntity(world, {
				orientation: SliderOrientation.Vertical,
			});

			expect(getSliderOrientation(world, horizontal)).toBe(SliderOrientation.Horizontal);
			expect(getSliderOrientation(world, vertical)).toBe(SliderOrientation.Vertical);
		});

		it('creates a slider with showValue', () => {
			const eid = createSliderEntity(world, {
				showValue: true,
			});

			expect(isShowingSliderValue(world, eid)).toBe(true);
		});

		it('creates a slider with custom display options', () => {
			const eid = createSliderEntity(world, {
				trackChar: '=',
				thumbChar: 'O',
				fillChar: '#',
			});

			const display = getSliderDisplay(world, eid);
			expect(display.trackChar).toBe('=');
			expect(display.thumbChar).toBe('O');
			expect(display.fillChar).toBe('#');
		});

		it('creates a slider with custom interactive options', () => {
			const eid = createSliderEntity(world, {
				hoverEffectFg: 0x00ffffff,
				hoverEffectBg: 0xff00ffff,
			});

			expect(Interactive.hoverEffectFg[eid]).toBe(0x00ffffff);
			expect(Interactive.hoverEffectBg[eid]).toBe(0xff00ffff);
		});

		it('creates a slider with custom focusable options', () => {
			const eid = createSliderEntity(world, {
				focusable: true,
				tabIndex: 5,
				focusEffectFg: 0xffff00ff,
				focusEffectBg: 0x0000ffff,
			});

			expect(Focusable.tabIndex[eid]).toBe(5);
			expect(Focusable.focusEffectFg[eid]).toBe(0xffff00ff);
			expect(Focusable.focusEffectBg[eid]).toBe(0x0000ffff);
		});

		it('creates a slider with position', () => {
			const eid = createSliderEntity(world, {
				x: 15,
				y: 8,
			});

			expect(Position.x[eid]).toBe(15);
			expect(Position.y[eid]).toBe(8);
		});

		it('creates a slider with dimensions', () => {
			const eid = createSliderEntity(world, {
				width: 30,
				height: 1,
			});

			expect(Dimensions.width[eid]).toBe(30);
			expect(Dimensions.height[eid]).toBe(1);
		});

		it('creates a slider with border', () => {
			const eid = createSliderEntity(world, {
				border: {
					type: BorderType.Line,
					left: true,
					right: true,
					top: true,
					bottom: true,
				},
			});

			expect(Border.type[eid]).toBe(BorderType.Line);
		});

		it('creates a slider with padding', () => {
			const eid = createSliderEntity(world, {
				padding: {
					left: 1,
					right: 1,
				},
			});

			expect(Padding.left[eid]).toBe(1);
			expect(Padding.right[eid]).toBe(1);
		});

		it('creates a slider with parent', () => {
			const parent = createBoxEntity(world);
			const slider = createSliderEntity(world, { parent });

			expect(Hierarchy.parent[slider]).toBe(parent);
		});

		it('validates slider config with schema', () => {
			const config = SliderConfigSchema.parse({
				x: 10,
				y: 5,
				width: 30,
				min: 0,
				max: 100,
				value: 50,
				step: 5,
				showValue: true,
			});

			expect(config.x).toBe(10);
			expect(config.y).toBe(5);
			expect(config.width).toBe(30);
			expect(config.min).toBe(0);
			expect(config.max).toBe(100);
			expect(config.value).toBe(50);
			expect(config.step).toBe(5);
			expect(config.showValue).toBe(true);
		});
	});

	describe('createFormEntity', () => {
		it('creates a form with default values', () => {
			const eid = createFormEntity(world);

			expect(isForm(world, eid)).toBe(true);
		});

		it('creates a form with keys enabled by default', () => {
			const eid = createFormEntity(world);

			expect(isFormKeysEnabled(eid)).toBe(true);
		});

		it('creates a form with submit on enter enabled by default', () => {
			const eid = createFormEntity(world);

			expect(isFormSubmitOnEnter(eid)).toBe(true);
		});

		it('creates a form with keys disabled', () => {
			const eid = createFormEntity(world, { keys: false });

			expect(isFormKeysEnabled(eid)).toBe(false);
		});

		it('creates a form with submit on enter disabled', () => {
			const eid = createFormEntity(world, { submitOnEnter: false });

			expect(isFormSubmitOnEnter(eid)).toBe(false);
		});

		it('creates a form with position', () => {
			const eid = createFormEntity(world, {
				x: 10,
				y: 5,
			});

			expect(Position.x[eid]).toBe(10);
			expect(Position.y[eid]).toBe(5);
		});

		it('creates a form with dimensions', () => {
			const eid = createFormEntity(world, {
				width: 50,
				height: 20,
			});

			expect(Dimensions.width[eid]).toBe(50);
			expect(Dimensions.height[eid]).toBe(20);
		});

		it('creates a form with border', () => {
			const eid = createFormEntity(world, {
				border: {
					type: BorderType.Line,
					left: true,
					right: true,
					top: true,
					bottom: true,
				},
			});

			expect(Border.type[eid]).toBe(BorderType.Line);
		});

		it('creates a form with padding', () => {
			const eid = createFormEntity(world, {
				padding: {
					left: 2,
					right: 2,
					top: 1,
					bottom: 1,
				},
			});

			expect(Padding.left[eid]).toBe(2);
			expect(Padding.right[eid]).toBe(2);
			expect(Padding.top[eid]).toBe(1);
			expect(Padding.bottom[eid]).toBe(1);
		});

		it('creates a form with parent', () => {
			const parent = createBoxEntity(world);
			const form = createFormEntity(world, { parent });

			expect(Hierarchy.parent[form]).toBe(parent);
		});

		it('creates a form with pre-registered fields', () => {
			const field = createTextboxEntity(world);
			const eid = createFormEntity(world, {
				fields: [{ name: 'username', entity: field }],
			});

			const fields = getFormFields(world, eid);
			expect(fields).toContain(field);
		});
	});

	describe('createProgressBarEntity', () => {
		it('creates a progress bar with default values', () => {
			const eid = createProgressBarEntity(world);

			expect(isProgressBar(world, eid)).toBe(true);
			expect(getProgress(world, eid)).toBe(0);
			expect(getProgressMin(world, eid)).toBe(0);
			expect(getProgressMax(world, eid)).toBe(100);
		});

		it('creates a progress bar with initial value', () => {
			const eid = createProgressBarEntity(world, { value: 50 });

			expect(getProgress(world, eid)).toBe(50);
		});

		it('creates a progress bar with custom range', () => {
			const eid = createProgressBarEntity(world, {
				min: 10,
				max: 200,
			});

			expect(getProgressMin(world, eid)).toBe(10);
			expect(getProgressMax(world, eid)).toBe(200);
		});

		it('creates a progress bar with vertical orientation', () => {
			const eid = createProgressBarEntity(world, {
				orientation: ProgressOrientation.Vertical,
			});

			expect(getProgressOrientation(world, eid)).toBe(ProgressOrientation.Vertical);
		});

		it('creates a progress bar with percentage display', () => {
			const eid = createProgressBarEntity(world, {
				showPercentage: true,
			});

			expect(isShowingPercentage(world, eid)).toBe(true);
		});

		it('creates a progress bar with custom display characters', () => {
			const eid = createProgressBarEntity(world, {
				fillChar: '=',
				emptyChar: '-',
			});

			const display = getProgressBarDisplay(world, eid);
			expect(display.fillChar).toBe('=');
			expect(display.emptyChar).toBe('-');
		});

		it('creates a progress bar with custom colors', () => {
			const eid = createProgressBarEntity(world, {
				fillFg: 0x00ff00ff,
				fillBg: 0x000000ff,
			});

			const display = getProgressBarDisplay(world, eid);
			expect(display.fillFg).toBe(0x00ff00ff);
			expect(display.fillBg).toBe(0x000000ff);
		});

		it('creates a progress bar with position', () => {
			const eid = createProgressBarEntity(world, {
				x: 10,
				y: 5,
			});

			expect(Position.x[eid]).toBe(10);
			expect(Position.y[eid]).toBe(5);
		});

		it('creates a progress bar with dimensions', () => {
			const eid = createProgressBarEntity(world, {
				width: 30,
				height: 1,
			});

			expect(Dimensions.width[eid]).toBe(30);
			expect(Dimensions.height[eid]).toBe(1);
		});

		it('creates a progress bar with border', () => {
			const eid = createProgressBarEntity(world, {
				border: {
					type: BorderType.Line,
					left: true,
					right: true,
					top: true,
					bottom: true,
				},
			});

			expect(Border.type[eid]).toBe(BorderType.Line);
		});

		it('creates a progress bar with parent', () => {
			const parent = createBoxEntity(world);
			const progressBar = createProgressBarEntity(world, { parent });

			expect(Hierarchy.parent[progressBar]).toBe(parent);
		});
	});

	describe('Config Schemas', () => {
		it('validates BoxConfigSchema', () => {
			const result = BoxConfigSchema.safeParse({
				x: 10,
				y: 20,
				width: 40,
				height: 10,
			});

			expect(result.success).toBe(true);
		});

		it('validates TextConfigSchema with text', () => {
			const result = TextConfigSchema.safeParse({
				text: 'Hello',
				align: 1,
			});

			expect(result.success).toBe(true);
		});

		it('validates ButtonConfigSchema', () => {
			const result = ButtonConfigSchema.safeParse({
				label: 'Click me',
				clickable: true,
				focusable: true,
			});

			expect(result.success).toBe(true);
		});

		it('validates ScreenConfigSchema requires dimensions', () => {
			const validResult = ScreenConfigSchema.safeParse({
				width: 80,
				height: 24,
			});
			expect(validResult.success).toBe(true);

			const invalidResult = ScreenConfigSchema.safeParse({});
			expect(invalidResult.success).toBe(false);
		});

		it('validates InputConfigSchema', () => {
			const result = InputConfigSchema.safeParse({
				value: 'test',
				placeholder: 'Enter text',
				maxLength: 100,
			});

			expect(result.success).toBe(true);
		});

		it('validates ListConfigSchema', () => {
			const result = ListConfigSchema.safeParse({
				items: ['a', 'b', 'c'],
				selectedIndex: 0,
			});

			expect(result.success).toBe(true);
		});

		it('validates CheckboxConfigSchema', () => {
			const result = CheckboxConfigSchema.safeParse({
				label: 'Accept terms',
				checked: true,
				checkedChar: '[x]',
				uncheckedChar: '[ ]',
				focusable: true,
			});

			expect(result.success).toBe(true);
		});

		it('validates CheckboxConfigSchema with minimal config', () => {
			const result = CheckboxConfigSchema.safeParse({});

			expect(result.success).toBe(true);
		});

		it('validates TextboxConfigSchema', () => {
			const result = TextboxConfigSchema.safeParse({
				value: 'Hello',
				placeholder: 'Enter text...',
				secret: false,
				maxLength: 100,
				focusable: true,
			});

			expect(result.success).toBe(true);
		});

		it('validates TextboxConfigSchema with secret mode', () => {
			const result = TextboxConfigSchema.safeParse({
				secret: true,
				censor: '#',
			});

			expect(result.success).toBe(true);
		});

		it('validates TextboxConfigSchema with minimal config', () => {
			const result = TextboxConfigSchema.safeParse({});

			expect(result.success).toBe(true);
		});

		it('validates FormConfigSchema', () => {
			const result = FormConfigSchema.safeParse({
				x: 10,
				y: 5,
				width: 50,
				height: 20,
				keys: true,
				submitOnEnter: true,
			});

			expect(result.success).toBe(true);
		});

		it('validates FormConfigSchema with fields', () => {
			const result = FormConfigSchema.safeParse({
				fields: [
					{ name: 'username', entity: 1, initialValue: '' },
					{ name: 'password', entity: 2, initialValue: '' },
				],
			});

			expect(result.success).toBe(true);
		});

		it('validates FormConfigSchema with minimal config', () => {
			const result = FormConfigSchema.safeParse({});

			expect(result.success).toBe(true);
		});

		it('validates ProgressBarConfigSchema', () => {
			const result = ProgressBarConfigSchema.safeParse({
				value: 50,
				min: 0,
				max: 100,
				orientation: 0,
				showPercentage: true,
				fillChar: '=',
			});

			expect(result.success).toBe(true);
		});

		it('validates ProgressBarConfigSchema with minimal config', () => {
			const result = ProgressBarConfigSchema.safeParse({});

			expect(result.success).toBe(true);
		});
	});

	describe('Entity creation order', () => {
		it('creates entities with sequential IDs', () => {
			const eid1 = createBoxEntity(world);
			const eid2 = createBoxEntity(world);
			const eid3 = createBoxEntity(world);

			expect(eid2).toBe(eid1 + 1);
			expect(eid3).toBe(eid2 + 1);
		});
	});

	describe('Default component values', () => {
		it('marks new entities as dirty', () => {
			const eid = createBoxEntity(world);

			expect(Renderable.dirty[eid]).toBe(1);
		});

		it('sets default colors', () => {
			const eid = createBoxEntity(world);

			expect(Renderable.fg[eid]).toBe(0xffffffff); // White
			expect(Renderable.bg[eid]).toBe(0x000000ff); // Black
		});

		it('initializes hierarchy with no parent', () => {
			const eid = createBoxEntity(world);

			expect(Hierarchy.parent[eid]).toBe(0); // NULL_ENTITY
			expect(Hierarchy.firstChild[eid]).toBe(0); // NULL_ENTITY
			expect(Hierarchy.childCount[eid]).toBe(0);
		});
	});
});
