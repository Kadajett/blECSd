/**
 * Token tracker namespace for tracking LLM token usage.
 *
 * @example
 * ```typescript
 * import { tokenTracker } from '@blecsd/ai';
 *
 * const tracker = tokenTracker.createTokenTracker(world, { width: 40, height: 10 });
 * tokenTracker.recordTokens(eid, { inputTokens: 100, outputTokens: 200 });
 * const stats = tokenTracker.getTokenStats(eid);
 * const display = tokenTracker.formatTokenDisplay(stats, config);
 * ```
 */

import {
	createTokenState,
	createTokenTracker,
	formatTokenDisplay,
	getTokenStats,
	isTokenTracker,
	recordTokens,
	resetTokenState,
	resetTokenTrackerStore,
	tokenTrackerStateMap,
} from '../widgets/tokenTracker';

export const tokenTracker = Object.freeze({
	createTokenTracker,
	isTokenTracker,
	createTokenState,
	recordTokens,
	resetTokenState,
	getTokenStats,
	formatTokenDisplay,
	tokenTrackerStateMap,
	resetTokenTrackerStore,
});

export type TokenTrackerModule = typeof tokenTracker;
