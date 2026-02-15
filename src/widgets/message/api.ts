/**
 * Message Widget API
 *
 * Standalone API functions and convenience functions for working with Message widgets.
 *
 * @module widgets/message/api
 */

import { setVisible } from '../../components/renderable';
import type { Entity, World } from '../../core/types';
import { createMessage } from './factory';
import { Message, messageStateMap } from './state';
import type { MessageConfig, MessageWidget } from './types';

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Shows an info message.
 *
 * @param world - The ECS world
 * @param text - Message text
 * @param options - Additional options
 * @returns The Message widget
 *
 * @example
 * ```typescript
 * const msg = showInfo(world, 'Operation completed');
 * ```
 */
export function showInfo(
	world: World,
	text: string,
	options: Omit<MessageConfig, 'content' | 'type'> = {},
): MessageWidget {
	return createMessage(world, { ...options, content: text, type: 'info' });
}

/**
 * Shows a warning message.
 *
 * @param world - The ECS world
 * @param text - Message text
 * @param options - Additional options
 * @returns The Message widget
 *
 * @example
 * ```typescript
 * const msg = showWarning(world, 'This action cannot be undone');
 * ```
 */
export function showWarning(
	world: World,
	text: string,
	options: Omit<MessageConfig, 'content' | 'type'> = {},
): MessageWidget {
	return createMessage(world, { ...options, content: text, type: 'warning' });
}

/**
 * Shows an error message.
 *
 * @param world - The ECS world
 * @param text - Message text
 * @param options - Additional options
 * @returns The Message widget
 *
 * @example
 * ```typescript
 * const msg = showError(world, 'Failed to save file');
 * ```
 */
export function showError(
	world: World,
	text: string,
	options: Omit<MessageConfig, 'content' | 'type'> = {},
): MessageWidget {
	return createMessage(world, { ...options, content: text, type: 'error' });
}

/**
 * Shows a success message.
 *
 * @param world - The ECS world
 * @param text - Message text
 * @param options - Additional options
 * @returns The Message widget
 *
 * @example
 * ```typescript
 * const msg = showSuccess(world, 'File saved successfully');
 * ```
 */
export function showSuccess(
	world: World,
	text: string,
	options: Omit<MessageConfig, 'content' | 'type'> = {},
): MessageWidget {
	return createMessage(world, { ...options, content: text, type: 'success' });
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Checks if an entity is a message widget.
 *
 * @param _world - The ECS world (unused, for API consistency)
 * @param eid - The entity ID
 * @returns true if the entity is a message widget
 *
 * @example
 * ```typescript
 * import { isMessage } from 'blecsd/widgets';
 *
 * if (isMessage(world, entity)) {
 *   // Handle message-specific logic
 * }
 * ```
 */
export function isMessage(_world: World, eid: Entity): boolean {
	return Message.isMessage[eid] === 1;
}

/**
 * Checks if dismiss on click is enabled for a message widget.
 *
 * @param _world - The ECS world (unused, for API consistency)
 * @param eid - The entity ID
 * @returns true if dismiss on click is enabled
 */
export function isDismissOnClick(_world: World, eid: Entity): boolean {
	return Message.dismissOnClick[eid] === 1;
}

/**
 * Checks if dismiss on key is enabled for a message widget.
 *
 * @param _world - The ECS world (unused, for API consistency)
 * @param eid - The entity ID
 * @returns true if dismiss on key is enabled
 */
export function isDismissOnKey(_world: World, eid: Entity): boolean {
	return Message.dismissOnKey[eid] === 1;
}

/**
 * Handles click event on a message widget.
 * Dismisses the message if dismissOnClick is enabled.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if the message was dismissed
 */
export function handleMessageClick(world: World, eid: Entity): boolean {
	if (!isMessage(world, eid)) return false;
	if (!isDismissOnClick(world, eid)) return false;
	if (Message.dismissed[eid] === 1) return false;

	// Find and dismiss the message
	const state = messageStateMap.get(eid);
	if (state) {
		Message.dismissed[eid] = 1;
		setVisible(world, eid, false);

		if (state.timerId) {
			clearTimeout(state.timerId);
			state.timerId = undefined;
		}
		if (state.onDismissCallback) {
			state.onDismissCallback();
		}
	}

	return true;
}

/**
 * Handles key event on a message widget.
 * Dismisses the message if dismissOnKey is enabled.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if the message was dismissed
 */
export function handleMessageKey(world: World, eid: Entity): boolean {
	if (!isMessage(world, eid)) return false;
	if (!isDismissOnKey(world, eid)) return false;
	if (Message.dismissed[eid] === 1) return false;

	// Find and dismiss the message
	const state = messageStateMap.get(eid);
	if (state) {
		Message.dismissed[eid] = 1;
		setVisible(world, eid, false);

		if (state.timerId) {
			clearTimeout(state.timerId);
			state.timerId = undefined;
		}
		if (state.onDismissCallback) {
			state.onDismissCallback();
		}
	}

	return true;
}

/**
 * Resets the Message component store. Useful for testing.
 * @internal
 */
export function resetMessageStore(): void {
	// Clear all timers
	for (const state of messageStateMap.values()) {
		if (state.timerId) {
			clearTimeout(state.timerId);
		}
	}

	Message.isMessage.fill(0);
	Message.dismissOnClick.fill(0);
	Message.dismissOnKey.fill(0);
	Message.dismissed.fill(0);
	messageStateMap.clear();
}
