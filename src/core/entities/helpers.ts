/**
 * Internal helper functions for entity creation and configuration.
 * These functions are used by entity factories to apply common configurations.
 * @module core/entities/helpers
 */

import type { z } from 'zod';
import { Border, type BorderOptions, setBorder } from '../../components/border';
import { Content, type ContentOptions, setContent } from '../../components/content';
import { Dimensions, type DimensionValue } from '../../components/dimensions';
import { Focusable, type FocusableOptions, setFocusable } from '../../components/focusable';
import { Hierarchy } from '../../components/hierarchy';
import { Interactive, type InteractiveOptions, setInteractive } from '../../components/interactive';
import { Padding, type PaddingOptions, setPadding } from '../../components/padding';
import { Position } from '../../components/position';
import { Renderable, type StyleOptions, setStyle } from '../../components/renderable';
import { Scrollable, type ScrollableOptions, setScrollable } from '../../components/scrollable';
import { setSliderDisplay } from '../../components/slider';
import { addComponent } from '../ecs';
import type { Entity, World } from '../types';
import type {
	BorderConfigSchema,
	ContentConfigSchema,
	DimensionConfigSchema,
	FocusableConfigSchema,
	InteractiveConfigSchema,
	PaddingConfigSchema,
	PositionConfigSchema,
	ScrollableConfigSchema,
	StyleConfigSchema,
} from './schemas';

export function initBaseComponents(world: World, eid: Entity): void {
	// Add components using bitecs addComponent
	addComponent(world, eid, Position);
	addComponent(world, eid, Dimensions);
	addComponent(world, eid, Renderable);
	addComponent(world, eid, Hierarchy);

	// Initialize Position
	Position.x[eid] = 0;
	Position.y[eid] = 0;
	Position.z[eid] = 0;
	Position.absolute[eid] = 0;

	// Initialize Dimensions
	Dimensions.width[eid] = 0;
	Dimensions.height[eid] = 0;
	Dimensions.minWidth[eid] = 0;
	Dimensions.minHeight[eid] = 0;
	Dimensions.maxWidth[eid] = Number.POSITIVE_INFINITY;
	Dimensions.maxHeight[eid] = Number.POSITIVE_INFINITY;
	Dimensions.shrink[eid] = 0;

	// Initialize Renderable
	Renderable.visible[eid] = 1;
	Renderable.dirty[eid] = 1;
	Renderable.fg[eid] = 0xffffffff;
	Renderable.bg[eid] = 0x000000ff;
	Renderable.bold[eid] = 0;
	Renderable.underline[eid] = 0;
	Renderable.blink[eid] = 0;
	Renderable.inverse[eid] = 0;
	Renderable.transparent[eid] = 0;

	// Initialize Hierarchy (using NULL_ENTITY for no parent/child)
	Hierarchy.parent[eid] = 0; // 0 = no parent in this implementation
	Hierarchy.firstChild[eid] = 0;
	Hierarchy.nextSibling[eid] = 0;
	Hierarchy.prevSibling[eid] = 0;
	Hierarchy.childCount[eid] = 0;
	Hierarchy.depth[eid] = 0;
}

export function applyPositionConfig(
	eid: Entity,
	config: z.infer<typeof PositionConfigSchema>,
): void {
	if (config.x !== undefined) Position.x[eid] = config.x;
	if (config.y !== undefined) Position.y[eid] = config.y;
	if (config.z !== undefined) Position.z[eid] = config.z;
	if (config.absolute !== undefined) Position.absolute[eid] = config.absolute ? 1 : 0;
}

export function parseDimValue(value: DimensionValue): number {
	if (typeof value === 'string' && value.endsWith('%')) {
		const percent = Number.parseFloat(value);
		return -(percent + 2); // Encode percentage
	}
	if (value === 'auto') {
		return -1; // AUTO_DIMENSION
	}
	return value as number;
}

export function applyDimensionConstraints(
	eid: Entity,
	config: z.infer<typeof DimensionConfigSchema>,
): void {
	if (config.minWidth !== undefined) Dimensions.minWidth[eid] = config.minWidth;
	if (config.maxWidth !== undefined) Dimensions.maxWidth[eid] = config.maxWidth;
	if (config.minHeight !== undefined) Dimensions.minHeight[eid] = config.minHeight;
	if (config.maxHeight !== undefined) Dimensions.maxHeight[eid] = config.maxHeight;
	if (config.shrink !== undefined) Dimensions.shrink[eid] = config.shrink ? 1 : 0;
}

export function applyDimensionConfig(
	eid: Entity,
	config: z.infer<typeof DimensionConfigSchema>,
): void {
	if (config.width !== undefined) {
		Dimensions.width[eid] = parseDimValue(config.width as DimensionValue);
	}
	if (config.height !== undefined) {
		Dimensions.height[eid] = parseDimValue(config.height as DimensionValue);
	}
	applyDimensionConstraints(eid, config);
}

export function applyStyleConfig(
	world: World,
	eid: Entity,
	config: z.infer<typeof StyleConfigSchema>,
): void {
	const styleOptions: StyleOptions = {};

	if (config.fg !== undefined) styleOptions.fg = config.fg;
	if (config.bg !== undefined) styleOptions.bg = config.bg;
	if (config.bold !== undefined) styleOptions.bold = config.bold;
	if (config.underline !== undefined) styleOptions.underline = config.underline;
	if (config.inverse !== undefined) styleOptions.inverse = config.inverse;
	if (config.blink !== undefined) styleOptions.blink = config.blink;

	if (Object.keys(styleOptions).length > 0) {
		setStyle(world, eid, styleOptions);
	}

	if (config.visible !== undefined) {
		Renderable.visible[eid] = config.visible ? 1 : 0;
	}
}

export function applyBorderConfig(
	world: World,
	eid: Entity,
	config?: z.infer<typeof BorderConfigSchema>,
): void {
	if (!config) {
		return;
	}

	// Only initialize border if any border option is set
	const hasBorderConfig =
		config.type !== undefined ||
		config.left !== undefined ||
		config.right !== undefined ||
		config.top !== undefined ||
		config.bottom !== undefined ||
		config.fg !== undefined ||
		config.bg !== undefined ||
		config.chars !== undefined;

	if (!hasBorderConfig) {
		return;
	}

	// Initialize border component
	Border.type[eid] = config.type ?? 0;
	Border.left[eid] = 0;
	Border.right[eid] = 0;
	Border.top[eid] = 0;
	Border.bottom[eid] = 0;
	Border.fg[eid] = 0xffffffff;
	Border.bg[eid] = 0x000000ff;

	const borderOptions: BorderOptions = {};
	if (config.type !== undefined) borderOptions.type = config.type;
	if (config.left !== undefined) borderOptions.left = config.left;
	if (config.right !== undefined) borderOptions.right = config.right;
	if (config.top !== undefined) borderOptions.top = config.top;
	if (config.bottom !== undefined) borderOptions.bottom = config.bottom;
	if (config.fg !== undefined) borderOptions.fg = config.fg;
	if (config.bg !== undefined) borderOptions.bg = config.bg;
	if (config.chars !== undefined) borderOptions.chars = config.chars;

	setBorder(world, eid, borderOptions);
}

export function applyPaddingConfig(
	world: World,
	eid: Entity,
	config?: z.infer<typeof PaddingConfigSchema>,
): void {
	if (!config) {
		return;
	}

	const hasPaddingConfig =
		config.left !== undefined ||
		config.right !== undefined ||
		config.top !== undefined ||
		config.bottom !== undefined;

	if (!hasPaddingConfig) {
		return;
	}

	// Initialize padding component
	Padding.left[eid] = 0;
	Padding.right[eid] = 0;
	Padding.top[eid] = 0;
	Padding.bottom[eid] = 0;

	const paddingOptions: PaddingOptions = {};
	if (config.left !== undefined) paddingOptions.left = config.left;
	if (config.right !== undefined) paddingOptions.right = config.right;
	if (config.top !== undefined) paddingOptions.top = config.top;
	if (config.bottom !== undefined) paddingOptions.bottom = config.bottom;

	setPadding(world, eid, paddingOptions);
}

export function initContentComponent(world: World, eid: Entity): void {
	addComponent(world, eid, Content);
	Content.align[eid] = 0;
	Content.valign[eid] = 0;
	Content.wrap[eid] = 0;
	Content.parseTags[eid] = 0;
	Content.length[eid] = 0;
	Content.hash[eid] = 0;
	Content.contentId[eid] = 0;
}

export function applyContentOptionsWithoutText(
	eid: Entity,
	config: z.infer<typeof ContentConfigSchema>,
): void {
	if (config.align !== undefined) Content.align[eid] = config.align;
	if (config.valign !== undefined) Content.valign[eid] = config.valign;
	if (config.wrap !== undefined) Content.wrap[eid] = config.wrap ? 1 : 0;
	if (config.parseTags !== undefined) Content.parseTags[eid] = config.parseTags ? 1 : 0;
}

export function applyTextContent(
	world: World,
	eid: Entity,
	config: z.infer<typeof ContentConfigSchema>,
): void {
	if (config.text !== undefined) {
		const contentOptions: ContentOptions = {};
		if (config.align !== undefined) contentOptions.align = config.align;
		if (config.valign !== undefined) contentOptions.valign = config.valign;
		if (config.wrap !== undefined) contentOptions.wrap = config.wrap;
		if (config.parseTags !== undefined) contentOptions.parseTags = config.parseTags;
		setContent(world, eid, config.text, contentOptions);
	} else {
		applyContentOptionsWithoutText(eid, config);
	}
}

export function initListScrollable(world: World, eid: Entity, itemCount: number): void {
	addComponent(world, eid, Scrollable);
	Scrollable.scrollX[eid] = 0;
	Scrollable.scrollY[eid] = 0;
	Scrollable.scrollWidth[eid] = 0;
	Scrollable.scrollHeight[eid] = itemCount;
	Scrollable.scrollbarVisible[eid] = 2; // Auto
}

export function applyListScrollableOptions(
	world: World,
	eid: Entity,
	config: z.infer<typeof ScrollableConfigSchema>,
): void {
	const scrollableOptions: ScrollableOptions = {};
	if (config.scrollable !== undefined) scrollableOptions.scrollX = 0;
	if (config.scrollX !== undefined) scrollableOptions.scrollX = config.scrollX;
	if (config.scrollY !== undefined) scrollableOptions.scrollY = config.scrollY;
	if (config.scrollWidth !== undefined) scrollableOptions.scrollWidth = config.scrollWidth;
	if (config.scrollHeight !== undefined) scrollableOptions.scrollHeight = config.scrollHeight;
	if (config.scrollbarVisible !== undefined)
		scrollableOptions.scrollbarVisible = config.scrollbarVisible;

	if (Object.keys(scrollableOptions).length > 0) {
		setScrollable(world, eid, scrollableOptions);
	}
}

export function initListInteractive(eid: Entity): void {
	Interactive.clickable[eid] = 1;
	Interactive.draggable[eid] = 0;
	Interactive.hoverable[eid] = 0;
	Interactive.hovered[eid] = 0;
	Interactive.pressed[eid] = 0;
	Interactive.keyable[eid] = 1;
	Interactive.hoverEffectFg[eid] = 0xffffffff;
	Interactive.hoverEffectBg[eid] = 0x444444ff;
}

export function initFocusableComponent(world: World, eid: Entity): void {
	addComponent(world, eid, Focusable);
	Focusable.focusable[eid] = 1;
	Focusable.focused[eid] = 0;
	Focusable.tabIndex[eid] = 0;
	Focusable.focusEffectFg[eid] = 0xffffffff;
	Focusable.focusEffectBg[eid] = 0x0066ffff;
}

export function applyFocusableOptions(
	world: World,
	eid: Entity,
	config: z.infer<typeof FocusableConfigSchema>,
): void {
	const focusableOptions: FocusableOptions = {};
	if (config.focusable !== undefined) focusableOptions.focusable = config.focusable;
	if (config.tabIndex !== undefined) focusableOptions.tabIndex = config.tabIndex;
	if (config.focusEffectFg !== undefined) focusableOptions.focusEffectFg = config.focusEffectFg;
	if (config.focusEffectBg !== undefined) focusableOptions.focusEffectBg = config.focusEffectBg;

	if (Object.keys(focusableOptions).length > 0) {
		setFocusable(world, eid, focusableOptions);
	}
}

export function applyInteractiveOptions(
	world: World,
	eid: Entity,
	config: z.infer<typeof InteractiveConfigSchema>,
): void {
	const interactiveOptions: InteractiveOptions = {};
	if (config.clickable !== undefined) interactiveOptions.clickable = config.clickable;
	if (config.draggable !== undefined) interactiveOptions.draggable = config.draggable;
	if (config.hoverable !== undefined) interactiveOptions.hoverable = config.hoverable;
	if (config.keyable !== undefined) interactiveOptions.keyable = config.keyable;
	if (config.hoverEffectFg !== undefined) interactiveOptions.hoverEffectFg = config.hoverEffectFg;
	if (config.hoverEffectBg !== undefined) interactiveOptions.hoverEffectBg = config.hoverEffectBg;

	if (Object.keys(interactiveOptions).length > 0) {
		setInteractive(world, eid, interactiveOptions);
	}
}

export function initWidgetInteractive(world: World, eid: Entity): void {
	addComponent(world, eid, Interactive);
	Interactive.clickable[eid] = 1;
	Interactive.draggable[eid] = 0;
	Interactive.hoverable[eid] = 1;
	Interactive.hovered[eid] = 0;
	Interactive.pressed[eid] = 0;
	Interactive.keyable[eid] = 1;
	Interactive.hoverEffectFg[eid] = 0xffffffff;
	Interactive.hoverEffectBg[eid] = 0x444444ff;
}

export function initWidgetFocusable(world: World, eid: Entity): void {
	addComponent(world, eid, Focusable);
	Focusable.focusable[eid] = 1;
	Focusable.focused[eid] = 0;
	Focusable.tabIndex[eid] = 0;
	Focusable.focusEffectFg[eid] = 0xffffffff;
	Focusable.focusEffectBg[eid] = 0x0066ffff;
}

export function applyScrollableOptions(
	world: World,
	eid: Entity,
	config: {
		scrollX?: number | undefined;
		scrollY?: number | undefined;
		scrollWidth?: number | undefined;
		scrollHeight?: number | undefined;
		scrollbarVisible?: number | undefined;
	},
): void {
	const scrollableOptions: ScrollableOptions = {};
	if (config.scrollX !== undefined) scrollableOptions.scrollX = config.scrollX;
	if (config.scrollY !== undefined) scrollableOptions.scrollY = config.scrollY;
	if (config.scrollWidth !== undefined) scrollableOptions.scrollWidth = config.scrollWidth;
	if (config.scrollHeight !== undefined) scrollableOptions.scrollHeight = config.scrollHeight;
	if (config.scrollbarVisible !== undefined)
		scrollableOptions.scrollbarVisible = config.scrollbarVisible as 0 | 1 | 2;

	if (Object.keys(scrollableOptions).length > 0) {
		setScrollable(world, eid, scrollableOptions);
	}
}

export function applySliderDisplayOptions(
	world: World,
	eid: Entity,
	config: {
		trackChar?: string | undefined;
		thumbChar?: string | undefined;
		fillChar?: string | undefined;
		trackFg?: number | undefined;
		trackBg?: number | undefined;
		thumbFg?: number | undefined;
		thumbBg?: number | undefined;
		fillFg?: number | undefined;
		fillBg?: number | undefined;
	},
): void {
	const options: typeof config = {};
	if (config.trackChar !== undefined) options.trackChar = config.trackChar;
	if (config.thumbChar !== undefined) options.thumbChar = config.thumbChar;
	if (config.fillChar !== undefined) options.fillChar = config.fillChar;
	if (config.trackFg !== undefined) options.trackFg = config.trackFg;
	if (config.trackBg !== undefined) options.trackBg = config.trackBg;
	if (config.thumbFg !== undefined) options.thumbFg = config.thumbFg;
	if (config.thumbBg !== undefined) options.thumbBg = config.thumbBg;
	if (config.fillFg !== undefined) options.fillFg = config.fillFg;
	if (config.fillBg !== undefined) options.fillBg = config.fillBg;
	setSliderDisplay(world, eid, options);
}
