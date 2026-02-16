/**
 * DevTools widget namespace.
 *
 * @example
 * ```typescript
 * import { devTools } from 'blecsd/widgets';
 * const dt = devTools.create(world, { position: 'right' });
 * ```
 */
import { createDevTools, isDevTools, resetDevToolsStore } from '../devTools';

export const devTools = Object.freeze({
	create: createDevTools,
	is: isDevTools,
	resetStore: resetDevToolsStore,
});

export type DevToolsModule = typeof devTools;
