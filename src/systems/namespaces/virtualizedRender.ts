/**
 * Virtualized render system namespace.
 *
 * @example
 * ```typescript
 * import { virtualizedRender } from 'blecsd/systems';
 * const world = createWorld();
 * const system = virtualizedRender.create(world);
 * virtualizedRender.registerLineStore(world, eid, lineStore);
 * virtualizedRender.setConfig(world, eid, { startLine: 0, lineCount: 100 });
 * ```
 */
import {
	cleanupEntityResources,
	cleanupVirtualizedRenderSystem,
	clearLineRenderConfig,
	clearVirtualizedRenderBuffer,
	createVirtualizedRenderSystem,
	getLineRenderConfig,
	getLineStore,
	getVirtualizedRenderBuffer,
	LineRenderConfigSchema,
	registerLineStore,
	setLineRenderConfig,
	setVirtualizedRenderBuffer,
	unregisterLineStore,
	updateLineStore,
	virtualizedRenderSystem,
} from '../virtualizedRenderSystem';

export const virtualizedRender = Object.freeze({
	create: createVirtualizedRenderSystem,
	system: virtualizedRenderSystem,
	registerLineStore,
	unregisterLineStore,
	updateLineStore,
	getLineStore,
	getConfig: getLineRenderConfig,
	setConfig: setLineRenderConfig,
	clearConfig: clearLineRenderConfig,
	getBuffer: getVirtualizedRenderBuffer,
	setBuffer: setVirtualizedRenderBuffer,
	clearBuffer: clearVirtualizedRenderBuffer,
	cleanupEntity: cleanupEntityResources,
	cleanup: cleanupVirtualizedRenderSystem,
	LineRenderConfigSchema,
});

export type VirtualizedRenderSystemModule = typeof virtualizedRender;
