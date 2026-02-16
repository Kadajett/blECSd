/**
 * Renderable component namespace.
 *
 * Provides all operations for entity rendering, styling, visibility, and dirty tracking.
 *
 * @example
 * ```typescript
 * import { renderable } from 'blecsd/components';
 * renderable.setStyle(world, eid, { fg: 0xff0000, bg: 0x000000 });
 * renderable.show(world, eid);
 * renderable.markDirty(world, eid);
 * ```
 */
import {
	colorToHex,
	getRenderable,
	getStyle,
	hasRenderable,
	hexToColor,
	hide,
	isDetached,
	isDirty,
	isEffectivelyVisible,
	isVisible,
	markClean,
	markDirty,
	packColor,
	setStyle,
	setVisible,
	show,
	toggle,
	unpackColor,
} from '../renderable';

export const renderable = Object.freeze({
	get: getRenderable,
	has: hasRenderable,

	getStyle,
	setStyle,

	show,
	hide,
	toggle,
	setVisible,
	isVisible,
	isEffectivelyVisible,
	isDetached,

	markDirty,
	markClean,
	isDirty,

	color: Object.freeze({
		toHex: colorToHex,
		fromHex: hexToColor,
		pack: packColor,
		unpack: unpackColor,
	}),
});

export type RenderableModule = typeof renderable;
