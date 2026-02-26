/**
 * Render system namespace.
 *
 * @example
 * ```typescript
 * import { render } from 'blecsd/systems';
 * const world = createWorld();
 * const system = render.create(world);
 * render.markAllDirty(world);
 * render.renderContent(world, eid);
 * const buffer = render.getBuffer(world);
 * ```
 */
import type { BorderTitleOptions } from '../renderSystem';
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

export const render = Object.freeze({
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

export type RenderSystemModule = typeof render;
export type { BorderTitleOptions };
