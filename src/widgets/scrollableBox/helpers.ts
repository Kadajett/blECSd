/**
 * ScrollableBox Widget Helpers
 *
 * Internal helper functions for scrollable box widget logic.
 *
 * @module widgets/scrollableBox/helpers
 */

import {
	BORDER_ASCII,
	BORDER_BOLD,
	BORDER_DOUBLE,
	BORDER_ROUNDED,
	BORDER_SINGLE,
	type BorderCharset,
	BorderType,
	setBorder,
	setBorderChars,
} from '../../components/border';
import { setContent, TextAlign, TextVAlign } from '../../components/content';
import { setDimensions } from '../../components/dimensions';
import { setPadding } from '../../components/padding';
import { setPosition } from '../../components/position';
import { setStyle } from '../../components/renderable';
import {
	type ScrollableOptions,
	ScrollbarVisibility,
} from '../../components/scrollable';
import type { Entity, World } from '../../core/types';
import { setScrollable } from '../../systems/scrollableSystem';
import { parseColor } from '../../utils/color';
import { ScrollableBox } from './state';
import type { Align, ScrollbarMode, VAlign } from './types';

// =============================================================================
// TYPE CONVERSIONS
// =============================================================================

/**
 * Converts align string to TextAlign enum.
 */
export function alignToEnum(align: Align): TextAlign {
	switch (align) {
		case 'left':
			return TextAlign.Left;
		case 'center':
			return TextAlign.Center;
		case 'right':
			return TextAlign.Right;
	}
}

/**
 * Converts valign string to TextVAlign enum.
 */
export function valignToEnum(valign: VAlign): TextVAlign {
	switch (valign) {
		case 'top':
			return TextVAlign.Top;
		case 'middle':
			return TextVAlign.Middle;
		case 'bottom':
			return TextVAlign.Bottom;
	}
}

/**
 * Gets the appropriate BorderCharset for a named style.
 */
export function getBorderCharset(ch: 'single' | 'double' | 'rounded' | 'bold' | 'ascii'): BorderCharset {
	switch (ch) {
		case 'single':
			return BORDER_SINGLE;
		case 'double':
			return BORDER_DOUBLE;
		case 'rounded':
			return BORDER_ROUNDED;
		case 'bold':
			return BORDER_BOLD;
		case 'ascii':
			return BORDER_ASCII;
	}
}

/**
 * Converts border type string to BorderType enum.
 */
export function borderTypeToEnum(type: 'line' | 'bg' | 'none'): BorderType {
	switch (type) {
		case 'line':
			return BorderType.Line;
		case 'bg':
			return BorderType.Background;
		case 'none':
			return BorderType.None;
	}
}

/**
 * Parses a position value to a number.
 */
export function parsePositionToNumber(value: string | number | undefined): number {
	if (value === undefined) return 0;
	if (typeof value === 'number') return value;
	if (value === 'left' || value === 'top') return 0;
	return 0;
}

/**
 * Parses a dimension value for setDimensions.
 */
export function parseDimension(value: string | number | undefined): number | `${number}%` | 'auto' {
	if (value === undefined) return 'auto';
	if (typeof value === 'string') {
		if (value === 'auto') return 'auto';
		return value as `${number}%`;
	}
	return value;
}

/**
 * Converts scrollbar mode to ScrollbarVisibility enum.
 */
export function scrollbarModeToVisibility(mode: ScrollbarMode): ScrollbarVisibility {
	switch (mode) {
		case 'auto':
			return ScrollbarVisibility.Auto;
		case 'visible':
			return ScrollbarVisibility.Visible;
		case 'hidden':
			return ScrollbarVisibility.Hidden;
	}
}

// =============================================================================
// SETUP FUNCTIONS
// =============================================================================

/**
 * Validated config type (internal).
 * @internal
 */
export interface ValidatedScrollableBoxConfig {
	left?: string | number;
	top?: string | number;
	right?: string | number;
	bottom?: string | number;
	width?: string | number;
	height?: string | number;
	fg?: string | number;
	bg?: string | number;
	border?: {
		type?: 'line' | 'bg' | 'none';
		fg?: string | number;
		bg?: string | number;
		ch?: 'single' | 'double' | 'rounded' | 'bold' | 'ascii' | BorderCharset;
	};
	padding?:
		| number
		| {
				left?: number;
				top?: number;
				right?: number;
				bottom?: number;
		  };
	content?: string;
	align?: 'left' | 'center' | 'right';
	valign?: 'top' | 'middle' | 'bottom';
	scrollbar?:
		| boolean
		| {
				mode?: 'auto' | 'visible' | 'hidden';
				fg?: string | number;
				bg?: string | number;
				trackChar?: string;
				thumbChar?: string;
		  };
	alwaysScroll?: boolean;
	mouse?: boolean;
	keys?: boolean;
	scrollWidth?: number;
	scrollHeight?: number;
	scrollX?: number;
	scrollY?: number;
}

/**
 * Sets up position and dimensions on an entity.
 * @internal
 */
export function setupPositionAndDimensions(
	world: World,
	eid: Entity,
	config: ValidatedScrollableBoxConfig,
): void {
	const x = parsePositionToNumber(config.left);
	const y = parsePositionToNumber(config.top);
	setPosition(world, eid, x, y);

	const width = parseDimension(config.width);
	const height = parseDimension(config.height);
	setDimensions(world, eid, width, height);
}

/**
 * Sets up style colors on an entity.
 * @internal
 */
export function setupStyle(world: World, eid: Entity, config: ValidatedScrollableBoxConfig): void {
	if (config.fg === undefined && config.bg === undefined) return;

	setStyle(world, eid, {
		fg: config.fg !== undefined ? parseColor(config.fg) : undefined,
		bg: config.bg !== undefined ? parseColor(config.bg) : undefined,
	});
}

/**
 * Sets up border on an entity.
 * @internal
 */
export function setupBorder(
	world: World,
	eid: Entity,
	borderConfig: NonNullable<ValidatedScrollableBoxConfig['border']>,
): void {
	const borderType = borderConfig.type ? borderTypeToEnum(borderConfig.type) : BorderType.Line;

	setBorder(world, eid, {
		type: borderType,
		fg: borderConfig.fg !== undefined ? parseColor(borderConfig.fg) : undefined,
		bg: borderConfig.bg !== undefined ? parseColor(borderConfig.bg) : undefined,
	});

	if (borderConfig.ch) {
		const charset =
			typeof borderConfig.ch === 'string' ? getBorderCharset(borderConfig.ch) : borderConfig.ch;
		setBorderChars(world, eid, charset);
	}
}

/**
 * Sets up padding on an entity.
 * @internal
 */
export function setupPadding(
	world: World,
	eid: Entity,
	paddingConfig: NonNullable<ValidatedScrollableBoxConfig['padding']>,
): void {
	if (typeof paddingConfig === 'number') {
		setPadding(world, eid, {
			left: paddingConfig,
			top: paddingConfig,
			right: paddingConfig,
			bottom: paddingConfig,
		});
	} else {
		setPadding(world, eid, paddingConfig);
	}
}

/**
 * Sets up content on an entity.
 * @internal
 */
export function setupContent(world: World, eid: Entity, config: ValidatedScrollableBoxConfig): void {
	if (config.content === undefined) return;

	const contentOptions: { align?: TextAlign; valign?: TextVAlign } = {};
	if (config.align) contentOptions.align = alignToEnum(config.align);
	if (config.valign) contentOptions.valign = valignToEnum(config.valign);
	setContent(world, eid, config.content, contentOptions);
}

/**
 * Sets up scrollable component on an entity.
 * @internal
 */
export function setupScrollable(world: World, eid: Entity, config: ValidatedScrollableBoxConfig): void {
	const scrollableOptions: ScrollableOptions = {};

	// Set scroll size
	if (config.scrollWidth !== undefined) scrollableOptions.scrollWidth = config.scrollWidth;
	if (config.scrollHeight !== undefined) scrollableOptions.scrollHeight = config.scrollHeight;

	// Set initial scroll position
	if (config.scrollX !== undefined) scrollableOptions.scrollX = config.scrollX;
	if (config.scrollY !== undefined) scrollableOptions.scrollY = config.scrollY;

	// Set always scroll
	if (config.alwaysScroll !== undefined) scrollableOptions.alwaysScroll = config.alwaysScroll;

	// Handle scrollbar config
	if (config.scrollbar === true) {
		scrollableOptions.scrollbarVisible = ScrollbarVisibility.Auto;
	} else if (config.scrollbar === false) {
		scrollableOptions.scrollbarVisible = ScrollbarVisibility.Hidden;
	} else if (typeof config.scrollbar === 'object') {
		if (config.scrollbar.mode) {
			scrollableOptions.scrollbarVisible = scrollbarModeToVisibility(config.scrollbar.mode);
		}
	}

	setScrollable(world, eid, scrollableOptions);

	// Set mouse/keys enabled flags
	ScrollableBox.mouseEnabled[eid] = config.mouse !== false ? 1 : 0;
	ScrollableBox.keysEnabled[eid] = config.keys !== false ? 1 : 0;
}
