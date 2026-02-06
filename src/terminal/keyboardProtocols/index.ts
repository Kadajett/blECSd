/**
 * Keyboard protocol implementations
 *
 * Modern keyboard protocol support for enhanced input handling.
 *
 * @module terminal/keyboardProtocols
 */

// Kitty keyboard protocol
export type {
	KittyConfig,
	KittyEventType,
	KittyKeyEvent,
	KittyModifiers,
	KittyProtocolLevel,
	KittyProtocolState,
} from './kitty';
export {
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
} from './kitty';
