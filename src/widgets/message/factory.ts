/**
 * Message Widget Factory
 *
 * Factory function for creating Message widgets.
 *
 * @module widgets/message/factory
 */

import { setContent, TextAlign, TextVAlign } from '../../components/content';
import { getDimensions } from '../../components/dimensions';
import { setFocusable } from '../../components/focusable';
import { moveBy, setPosition } from '../../components/position';
import { markDirty, setVisible } from '../../components/renderable';
import { addEntity, removeEntity } from '../../core/ecs';
import type { World } from '../../core/types';
import { MessageConfigSchema, type ValidatedMessageConfig } from './config';
import {
	setupBorder,
	setupContent,
	setupMessageOptions,
	setupPadding,
	setupPositionAndDimensions,
	setupStyle,
	setupTimer,
} from './helpers';
import { Message, messageStateMap } from './state';
import type { MessageConfig, MessageWidget } from './types';

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Creates a Message widget with the given configuration.
 *
 * The Message widget displays temporary notifications with auto-dismiss,
 * click/key dismiss, and styled message types (info, warning, error, success).
 *
 * @param world - The ECS world
 * @param config - Widget configuration
 * @returns The Message widget instance
 *
 * @example
 * ```typescript
 * import { createWorld } from '../core/ecs';
 * import { createMessage } from 'blecsd/widgets';
 *
 * const world = createWorld();
 *
 * // Create an info message
 * const msg = createMessage(world, {
 *   content: 'File saved successfully',
 *   type: 'success',
 *   timeout: 2000,
 * });
 *
 * // Center on screen
 * msg.center(80, 24);
 *
 * // Manual dismiss
 * msg.dismiss();
 * ```
 */
export function createMessage(world: World, config: MessageConfig = {}): MessageWidget {
	const validated = MessageConfigSchema.parse(config) as ValidatedMessageConfig;
	const eid = addEntity(world);

	// Set up components using helper functions
	setupMessageOptions(eid, validated);
	setupPositionAndDimensions(world, eid, validated);
	setupStyle(world, eid, validated);
	setupBorder(world, eid, validated);
	setupContent(world, eid, validated);
	setupPadding(world, eid, validated);

	// Make focusable
	setFocusable(world, eid, { focusable: true });

	// Create dismiss function
	const dismiss = (): void => {
		if (Message.dismissed[eid] === 1) return;

		Message.dismissed[eid] = 1;
		setVisible(world, eid, false);

		const state = messageStateMap.get(eid);
		if (state) {
			if (state.timerId) {
				clearTimeout(state.timerId);
				state.timerId = undefined;
			}
			if (state.onDismissCallback) {
				state.onDismissCallback();
			}
		}
	};

	// Set up auto-dismiss timer
	setupTimer(world, eid, validated, dismiss);

	// Create the widget object with chainable methods
	const widget: MessageWidget = {
		eid,

		// Content
		setContent(text: string): MessageWidget {
			const state = messageStateMap.get(eid);
			if (state) {
				state.content = text;
			}
			setContent(world, eid, text, {
				align: TextAlign.Center,
				valign: TextVAlign.Middle,
			});
			markDirty(world, eid);
			return widget;
		},

		getContent(): string {
			const state = messageStateMap.get(eid);
			return state?.content ?? '';
		},

		// Visibility
		show(): MessageWidget {
			setVisible(world, eid, true);
			return widget;
		},

		hide(): MessageWidget {
			setVisible(world, eid, false);
			return widget;
		},

		// Position
		move(dx: number, dy: number): MessageWidget {
			moveBy(world, eid, dx, dy);
			markDirty(world, eid);
			return widget;
		},

		setPosition(x: number, y: number): MessageWidget {
			setPosition(world, eid, x, y);
			markDirty(world, eid);
			return widget;
		},

		center(screenWidth: number, screenHeight: number): MessageWidget {
			const dims = getDimensions(world, eid);
			const width = dims?.width ?? 20;
			const height = dims?.height ?? 5;

			const x = Math.floor((screenWidth - width) / 2);
			const y = Math.floor((screenHeight - height) / 2);

			setPosition(world, eid, x, y);
			markDirty(world, eid);
			return widget;
		},

		// Dismissal
		dismiss,

		isDismissed(): boolean {
			return Message.dismissed[eid] === 1;
		},

		// Events
		onDismiss(callback: () => void): MessageWidget {
			const state = messageStateMap.get(eid);
			if (state) {
				state.onDismissCallback = callback;
			}
			return widget;
		},

		// Lifecycle
		destroy(): void {
			const state = messageStateMap.get(eid);
			if (state?.timerId) {
				clearTimeout(state.timerId);
			}

			Message.isMessage[eid] = 0;
			Message.dismissOnClick[eid] = 0;
			Message.dismissOnKey[eid] = 0;
			Message.dismissed[eid] = 0;
			messageStateMap.delete(eid);
			removeEntity(world, eid);
		},
	};

	return widget;
}
