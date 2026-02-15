/**
 * Utility functions for Terminal Widget.
 *
 * @module widgets/terminal/utils
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
import { setStyle } from '../../components/renderable';
import type { Entity, World } from '../../core/types';
import { parseColor } from '../../utils/color';
import type { BorderConfig, TerminalStyle } from './types';

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
 * Gets the appropriate BorderCharset for a named style.
 */
export function getBorderCharset(
	ch: 'single' | 'double' | 'rounded' | 'bold' | 'ascii',
): BorderCharset {
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
 * Sets up the border configuration for a terminal widget.
 */
export function setupTerminalBorder(
	world: World,
	eid: Entity,
	borderConfig: BorderConfig | undefined,
): void {
	if (!borderConfig) {
		return;
	}

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
 * Sets up the style configuration for a terminal widget.
 */
export function setupTerminalStyle(
	world: World,
	eid: Entity,
	style: TerminalStyle | undefined,
): void {
	if (!style) {
		return;
	}

	setStyle(world, eid, {
		fg: style.fg !== undefined ? parseColor(style.fg) : undefined,
		bg: style.bg !== undefined ? parseColor(style.bg) : undefined,
	});
}

/**
 * Calculates display dimensions including border if present.
 */
export function calculateDisplayDimensions(
	width: number,
	height: number,
	borderConfig: BorderConfig | undefined,
): { displayWidth: number; displayHeight: number } {
	const hasBorder = borderConfig !== undefined && borderConfig.type !== 'none';
	return {
		displayWidth: width + (hasBorder ? 2 : 0),
		displayHeight: height + (hasBorder ? 2 : 0),
	};
}
