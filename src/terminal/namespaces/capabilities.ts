/**
 * Terminal capability negotiation namespace.
 *
 * Functions for detecting and negotiating terminal capabilities
 * including graphics protocols, keyboard enhancements, and feature support.
 *
 * @example
 * ```typescript
 * import { capabilities } from 'blecsd/terminal';
 *
 * // Create capability negotiator
 * const negotiator = capabilities.createCapabilityNegotiator(config);
 *
 * // Query terminal capabilities
 * const caps = capabilities.getTerminalCapabilities(program);
 * if (capabilities.hasCapability(caps, 'kittyKeyboard')) {
 *   // Enable enhanced keyboard protocol
 * }
 *
 * // Use default negotiator
 * const defaultNeg = capabilities.getDefaultNegotiator();
 * ```
 */

import {
	capabilityQuery,
	createCapabilityNegotiator,
	DEFAULT_QUERY_TIMEOUT,
	GraphicsProtocol,
	getDefaultNegotiator,
	getTerminalCapabilities,
	hasCapability,
	KittyKeyboardLevel,
	MAX_QUERY_TIMEOUT,
	MIN_QUERY_TIMEOUT,
	NegotiationTiming,
	resetDefaultNegotiator,
} from '../capabilities';

/**
 * Terminal capability negotiation namespace.
 */
export const capabilities = Object.freeze({
	capabilityQuery,
	createCapabilityNegotiator,
	DEFAULT_QUERY_TIMEOUT,
	getDefaultNegotiator,
	getTerminalCapabilities,
	GraphicsProtocol: Object.freeze(GraphicsProtocol),
	hasCapability,
	KittyKeyboardLevel: Object.freeze(KittyKeyboardLevel),
	MAX_QUERY_TIMEOUT,
	MIN_QUERY_TIMEOUT,
	NegotiationTiming: Object.freeze(NegotiationTiming),
	resetDefaultNegotiator,
});

export type CapabilitiesModule = typeof capabilities;
