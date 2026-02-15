/**
 * Message Widget Types
 *
 * Type definitions for message widget configuration and API.
 *
 * @module widgets/message/types
 */

import type { BorderCharset } from '../../components/border';
import type { Entity } from '../../core/types';

/**
 * Message type determines the visual style.
 */
export type MessageType = 'info' | 'warning' | 'error' | 'success';

/**
 * Position value that can be a number, percentage string, or keyword.
 */
export type PositionValue = number | `${number}%` | 'center' | 'left' | 'right' | 'top' | 'bottom';

/**
 * Border configuration for the message widget.
 */
export interface BorderConfig {
	/** Border type */
	readonly type?: 'line' | 'bg' | 'none';
	/** Foreground color for border (hex string or packed number) */
	readonly fg?: string | number;
	/** Background color for border (hex string or packed number) */
	readonly bg?: string | number;
	/** Border charset ('single', 'double', 'rounded', 'bold', 'ascii', or custom) */
	readonly ch?: 'single' | 'double' | 'rounded' | 'bold' | 'ascii' | BorderCharset;
}

/**
 * Style configuration for message types.
 */
export interface MessageStyleConfig {
	/** Foreground color */
	readonly fg?: string | number;
	/** Background color */
	readonly bg?: string | number;
	/** Border color */
	readonly borderFg?: string | number;
}

/**
 * Configuration for creating a Message widget.
 */
export interface MessageConfig {
	// Position
	/** Left position (absolute, percentage, or 'center') */
	readonly left?: PositionValue;
	/** Top position (absolute, percentage, or 'center') */
	readonly top?: PositionValue;
	/** Width (default: auto-calculated from content) */
	readonly width?: number;
	/** Height (default: auto-calculated from content) */
	readonly height?: number;

	// Content
	/** Message text */
	readonly content?: string;

	// Behavior
	/** Auto-dismiss timeout in milliseconds (0 = manual dismiss only, default: 3000) */
	readonly timeout?: number;
	/** Dismiss when clicked (default: true) */
	readonly dismissOnClick?: boolean;
	/** Dismiss on any key press (default: true) */
	readonly dismissOnKey?: boolean;

	// Style
	/** Message type for preset styling */
	readonly type?: MessageType;
	/** Custom foreground color (overrides type style) */
	readonly fg?: string | number;
	/** Custom background color (overrides type style) */
	readonly bg?: string | number;
	/** Border configuration */
	readonly border?: BorderConfig;
	/** Padding around content (default: 1) */
	readonly padding?: number;

	// Style overrides per type
	/** Custom styles for info messages */
	readonly infoStyle?: MessageStyleConfig;
	/** Custom styles for warning messages */
	readonly warningStyle?: MessageStyleConfig;
	/** Custom styles for error messages */
	readonly errorStyle?: MessageStyleConfig;
	/** Custom styles for success messages */
	readonly successStyle?: MessageStyleConfig;
}

/**
 * Message widget interface providing chainable methods.
 */
export interface MessageWidget {
	/** The underlying entity ID */
	readonly eid: Entity;

	// Content
	/** Sets the message text */
	setContent(text: string): MessageWidget;
	/** Gets the message text */
	getContent(): string;

	// Visibility
	/** Shows the message */
	show(): MessageWidget;
	/** Hides the message */
	hide(): MessageWidget;

	// Position
	/** Moves the message by dx, dy */
	move(dx: number, dy: number): MessageWidget;
	/** Sets the absolute position */
	setPosition(x: number, y: number): MessageWidget;
	/** Centers the message on screen */
	center(screenWidth: number, screenHeight: number): MessageWidget;

	// Dismissal
	/** Manually dismisses the message */
	dismiss(): void;
	/** Checks if the message has been dismissed */
	isDismissed(): boolean;

	// Events
	/** Called when the message is dismissed */
	onDismiss(callback: () => void): MessageWidget;

	// Lifecycle
	/** Destroys the widget and removes it from the world */
	destroy(): void;
}
