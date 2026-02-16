/**
 * Keyboard protocol namespace.
 *
 * Functions for managing enhanced keyboard protocols, particularly
 * the Kitty keyboard protocol which provides better key event reporting.
 *
 * @example
 * ```typescript
 * import { keyboardProto } from 'blecsd/terminal';
 *
 * // Check if Kitty protocol is supported
 * if (keyboardProto.isKittySupported()) {
 *   // Create protocol state
 *   const state = keyboardProto.createKittyProtocolState();
 *   const config = keyboardProto.createKittyConfig({
 *     disambiguateEscapeCodes: true,
 *     reportEventTypes: true,
 *   });
 *
 *   // Activate protocol
 *   keyboardProto.activateProtocol(program, config);
 *
 *   // Parse Kitty key events
 *   const event = keyboardProto.parseKittyKeyEvent(buffer);
 *   if (keyboardProto.isKittyKeyEvent(event)) {
 *     const name = keyboardProto.kittyKeyToName(event.key);
 *     console.log(`Key: ${name}, Mods: ${event.modifiers}`);
 *   }
 *
 *   // Deactivate when done
 *   keyboardProto.deactivateProtocol(program);
 * }
 * ```
 */

import {
	activateProtocol,
	createKittyConfig,
	createKittyProtocolState,
	deactivateProtocol,
	generatePopSequence,
	generatePushSequence,
	generateQuerySequence,
	isKittyKeyEvent,
	isKittyResponse,
	isKittySupported,
	KittyFlags,
	kittyKeyToName,
	parseKittyKeyEvent,
	parseKittyQueryResponse,
	updateProtocolState,
} from '../keyboardProtocols';

/**
 * Keyboard protocol namespace.
 */
export const keyboardProto = Object.freeze({
	activateProtocol,
	createKittyConfig,
	createKittyProtocolState,
	deactivateProtocol,
	generatePopSequence,
	generatePushSequence,
	generateQuerySequence,
	isKittyKeyEvent,
	isKittyResponse,
	isKittySupported,
	KittyFlags: Object.freeze(KittyFlags),
	kittyKeyToName,
	parseKittyKeyEvent,
	parseKittyQueryResponse,
	updateProtocolState,
});

export type KeyboardProtoModule = typeof keyboardProto;
