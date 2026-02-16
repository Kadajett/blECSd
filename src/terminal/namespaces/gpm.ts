/**
 * GPM (General Purpose Mouse) client namespace.
 *
 * Functions for Linux virtual console mouse support via the GPM daemon.
 * Enables mouse input on Linux console (tty) without X11 or Wayland.
 *
 * @example
 * ```typescript
 * import { gpm } from 'blecsd/terminal';
 *
 * // Check if GPM is available
 * if (gpm.isGpmAvailable() && gpm.detectVirtualConsole()) {
 *   // Create GPM client for Linux console
 *   const client = gpm.createGpmClient(config);
 *
 *   // Handle mouse events
 *   client.on('mouse', (event) => {
 *     const mouseEvent = gpm.gpmEventToMouseEvent(event);
 *     console.log(`Mouse: ${mouseEvent.x}, ${mouseEvent.y}`);
 *   });
 *
 *   // Convert GPM events to standard format
 *   const button = gpm.gpmButtonToMouseButton(gpmEvent.buttons);
 *   const action = gpm.gpmTypeToMouseAction(gpmEvent.type);
 * }
 * ```
 */

import {
	buildGpmConnectPacket,
	createGpmClient,
	detectVirtualConsole,
	GpmButton,
	GpmEventType,
	gpmButtonToMouseButton,
	gpmEventToMouseEvent,
	gpmTypeToMouseAction,
	isGpmAvailable,
	parseGpmEventBuffer,
	parseGpmModifiers,
} from '../gpmClient';

/**
 * GPM (General Purpose Mouse) client namespace.
 */
export const gpm = Object.freeze({
	buildGpmConnectPacket,
	createGpmClient,
	detectVirtualConsole,
	GpmButton: Object.freeze(GpmButton),
	gpmButtonToMouseButton,
	gpmEventToMouseEvent,
	GpmEventType: Object.freeze(GpmEventType),
	gpmTypeToMouseAction,
	isGpmAvailable,
	parseGpmEventBuffer,
	parseGpmModifiers,
});

export type GpmModule = typeof gpm;
