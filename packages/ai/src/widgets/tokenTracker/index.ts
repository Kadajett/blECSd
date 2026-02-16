/**
 * Token Tracker Widget
 *
 * A widget for tracking LLM token usage in real time, displaying input/output
 * tokens, estimated cost, throughput, and optional sparkline history.
 *
 * @module widgets/tokenTracker
 */

import type { Entity, World } from 'blecsd/core';

// Re-export schema and constants
export { DEFAULT_MODEL_PRICING, TokenTrackerConfigSchema } from './config';
// Re-export factory
export { createTokenTracker } from './factory';
// Re-export state management
export {
	createTokenState,
	formatTokenDisplay,
	getTokenStats,
	recordTokens,
	resetTokenState,
	resetTokenTrackerStore,
	TokenTracker,
	tokenTrackerStateMap,
} from './state';
// Re-export types
export type {
	ModelPricing,
	TokenStats,
	TokenTrackerConfig,
	TokenTrackerWidget,
} from './types';

import { TokenTracker } from './state';

/**
 * Checks if an entity is a token tracker widget.
 *
 * @param _world - The ECS world (unused, for API consistency)
 * @param eid - The entity ID
 * @returns true if the entity is a token tracker widget
 */
export function isTokenTracker(_world: World, eid: Entity): boolean {
	return TokenTracker.isTokenTracker[eid] === 1;
}
