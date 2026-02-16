/**
 * Render system namespace.
 *
 * @example
 * ```typescript
 * import { renderSys } from 'blecsd/systems';
 * const world = createWorld();
 * const system = renderSys.create(world);
 * renderSys.markAllDirty(world);
 * renderSys.renderContent(world, eid);
 * const buffer = renderSys.getBuffer(world);
 * ```
 */
import {
	clearRenderBuffer,
	createRenderSystem,
	getRenderBuffer,
	getViewportBounds,
	isOcclusionCullingEnabled,
	markAllDirty,
	renderBackground,
	renderBorder,
	renderContent,
	renderRect,
	renderScrollbar,
	renderSystem,
	renderText,
	setOcclusionCulling,
	setRenderBuffer,
	setViewportBounds,
} from '../renderSystem';

export const renderSys = Object.freeze({
	create: createRenderSystem,
	system: renderSystem,
	getBuffer: getRenderBuffer,
	setBuffer: setRenderBuffer,
	clearBuffer: clearRenderBuffer,
	markAllDirty,
	renderContent,
	renderBackground,
	renderBorder,
	renderScrollbar,
	renderText,
	renderRect,
	viewport: Object.freeze({
		getBounds: getViewportBounds,
		setBounds: setViewportBounds,
	}),
	occlusion: Object.freeze({
		isEnabled: isOcclusionCullingEnabled,
		set: setOcclusionCulling,
	}),
});

export type RenderSysModule = typeof renderSys;
