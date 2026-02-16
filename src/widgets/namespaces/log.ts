/**
 * Log widget namespace.
 *
 * @example
 * ```typescript
 * import { log } from 'blecsd/widgets';
 * const l = log.create(world, { scrollback: 1000 });
 * const scrollback = log.getScrollback(world, l.eid);
 * const keysEnabled = log.isKeysScrollEnabled(world, l.eid);
 * const mouseEnabled = log.isMouseScrollEnabled(world, l.eid);
 * ```
 */
import {
	createLog,
	getScrollback,
	isLog,
	isKeysScrollEnabled as isLogKeysScrollEnabled,
	isMouseScrollEnabled as isLogMouseScrollEnabled,
	resetLogStore,
} from '../log';

export const log = Object.freeze({
	create: createLog,
	is: isLog,
	getScrollback,
	isKeysScrollEnabled: isLogKeysScrollEnabled,
	isMouseScrollEnabled: isLogMouseScrollEnabled,
	resetStore: resetLogStore,
});

export type LogModule = typeof log;
