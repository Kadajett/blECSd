/**
 * Message Widget Helpers
 *
 * Internal helper functions for message widget logic.
 *
 * @module widgets/message/helpers
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
import type { Entity, World } from '../../core/types';
import { parseColor } from '../../utils/color';
import { DEFAULT_MESSAGE_PADDING, DEFAULT_MESSAGE_STYLES, type ValidatedMessageConfig } from './config';
import { Message, messageStateMap } from './state';
import type { MessageStyleConfig, MessageType } from './types';

// =============================================================================
// INTERNAL HELPERS
// =============================================================================

/**
 * Gets the appropriate BorderCharset for a named style.
 * @internal
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
 * @internal
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
 * Gets the style for a message type.
 * @internal
 */
export function getTypeStyle(type: MessageType, config: ValidatedMessageConfig): MessageStyleConfig {
	const customStyles: Record<MessageType, MessageStyleConfig | undefined> = {
		info: config.infoStyle,
		warning: config.warningStyle,
		error: config.errorStyle,
		success: config.successStyle,
	};

	return customStyles[type] ?? DEFAULT_MESSAGE_STYLES[type];
}

/**
 * Calculates dimensions based on content.
 * @internal
 */
export function calculateDimensions(content: string, padding: number): { width: number; height: number } {
	const lines = content.split('\n');
	const maxLineLength = Math.max(...lines.map((l) => l.length), 10);
	const lineCount = lines.length;

	// Add padding and border space
	const width = maxLineLength + padding * 2 + 2; // +2 for borders
	const height = lineCount + padding * 2 + 2; // +2 for borders

	return { width, height };
}

// =============================================================================
// SETUP HELPERS
// =============================================================================

/**
 * Sets up message-specific component options.
 * @internal
 */
export function setupMessageOptions(eid: Entity, config: ValidatedMessageConfig): void {
	Message.isMessage[eid] = 1;
	Message.dismissOnClick[eid] = config.dismissOnClick !== false ? 1 : 0;
	Message.dismissOnKey[eid] = config.dismissOnKey !== false ? 1 : 0;
	Message.dismissed[eid] = 0;

	messageStateMap.set(eid, {
		content: config.content ?? '',
	});
}

/**
 * Sets up position and dimensions on the message entity.
 * @internal
 */
export function setupPositionAndDimensions(
	world: World,
	eid: Entity,
	config: ValidatedMessageConfig,
): void {
	const content = config.content ?? '';
	const padding = config.padding ?? DEFAULT_MESSAGE_PADDING;
	const { width: calcWidth, height: calcHeight } = calculateDimensions(content, padding);

	const width = config.width ?? calcWidth;
	const height = config.height ?? calcHeight;

	setDimensions(world, eid, width, height);

	// Parse position
	let x = 0;
	let y = 0;

	if (config.left !== undefined) {
		if (typeof config.left === 'number') {
			x = config.left;
		} else if (config.left === 'center') {
			x = 0; // Will be centered later
		}
	}

	if (config.top !== undefined) {
		if (typeof config.top === 'number') {
			y = config.top;
		} else if (config.top === 'center') {
			y = 0; // Will be centered later
		}
	}

	setPosition(world, eid, x, y);
}

/**
 * Sets up style on the message entity.
 * @internal
 */
export function setupStyle(world: World, eid: Entity, config: ValidatedMessageConfig): void {
	const type = config.type ?? 'info';
	const typeStyle = getTypeStyle(type, config);

	// Custom colors override type styles
	const fg = config.fg ?? typeStyle.fg;
	const bg = config.bg ?? typeStyle.bg;

	if (fg !== undefined || bg !== undefined) {
		setStyle(world, eid, {
			fg: fg !== undefined ? parseColor(fg) : undefined,
			bg: bg !== undefined ? parseColor(bg) : undefined,
		});
	}
}

/**
 * Sets up border on the message entity.
 * @internal
 */
export function setupBorder(world: World, eid: Entity, config: ValidatedMessageConfig): void {
	const type = config.type ?? 'info';
	const typeStyle = getTypeStyle(type, config);

	const borderType = config.border?.type ? borderTypeToEnum(config.border.type) : BorderType.Line;
	const borderFg = config.border?.fg ?? typeStyle.borderFg;

	setBorder(world, eid, {
		type: borderType,
		fg: borderFg !== undefined ? parseColor(borderFg) : undefined,
		bg: config.border?.bg !== undefined ? parseColor(config.border.bg) : undefined,
	});

	const charset = config.border?.ch
		? typeof config.border.ch === 'string'
			? getBorderCharset(config.border.ch)
			: config.border.ch
		: BORDER_ROUNDED;
	setBorderChars(world, eid, charset);
}

/**
 * Sets up content on the message entity.
 * @internal
 */
export function setupContent(world: World, eid: Entity, config: ValidatedMessageConfig): void {
	const content = config.content ?? '';
	setContent(world, eid, content, {
		align: TextAlign.Center,
		valign: TextVAlign.Middle,
	});
}

/**
 * Sets up padding on the message entity.
 * @internal
 */
export function setupPadding(world: World, eid: Entity, config: ValidatedMessageConfig): void {
	const padding = config.padding ?? DEFAULT_MESSAGE_PADDING;
	setPadding(world, eid, {
		left: padding,
		top: padding,
		right: padding,
		bottom: padding,
	});
}

/**
 * Sets up auto-dismiss timer.
 * @internal
 */
export function setupTimer(
	_world: World,
	eid: Entity,
	config: ValidatedMessageConfig,
	dismissFn: () => void,
): void {
	const timeout = config.timeout ?? 3000; // DEFAULT_MESSAGE_TIMEOUT
	if (timeout <= 0) return;

	const state = messageStateMap.get(eid);
	if (!state) return;

	state.timerId = setTimeout(() => {
		dismissFn();
	}, timeout);
}
