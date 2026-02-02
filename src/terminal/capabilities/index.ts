/**
 * Terminal Capabilities Module
 *
 * Dynamic capability negotiation and detection for modern terminal features.
 *
 * @module terminal/capabilities
 */

export type {
	CapabilityNegotiator,
	GraphicsProtocolValue,
	KittyKeyboardLevelValue,
	NegotiationTimingValue,
	NegotiatorConfig,
	TerminalCapabilities,
} from './negotiation';

export {
	capabilityQuery,
	createCapabilityNegotiator,
	DEFAULT_QUERY_TIMEOUT,
	getDefaultNegotiator,
	getTerminalCapabilities,
	GraphicsProtocol,
	hasCapability,
	KittyKeyboardLevel,
	MAX_QUERY_TIMEOUT,
	MIN_QUERY_TIMEOUT,
	NegotiationTiming,
	NegotiatorConfigSchema,
	resetDefaultNegotiator,
} from './negotiation';
