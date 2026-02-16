/**
 * Canvas widget namespace.
 *
 * @example
 * ```typescript
 * import { canvas } from 'blecsd/widgets';
 * const c = canvas.create(world, { width: 80, height: 24 });
 * canvas.clear(world, c.eid);
 * canvas.drawLine(world, c.eid, 0, 0, 10, 10);
 * canvas.drawRect(world, c.eid, 5, 5, 20, 10);
 * canvas.drawCircle(world, c.eid, 10, 10, 5);
 * canvas.drawText(world, c.eid, 'Hello', 0, 0);
 * canvas.setPixel(world, c.eid, 5, 5, '#');
 * ```
 */
import {
	clearCanvas,
	createCanvas,
	drawCircle,
	drawLine,
	drawRect,
	drawText,
	getCanvasContent,
	isCanvas,
	resetCanvasStore,
	setPixel,
} from '../canvas';

export const canvas = Object.freeze({
	create: createCanvas,
	is: isCanvas,
	clear: clearCanvas,
	getContent: getCanvasContent,
	drawLine,
	drawRect,
	drawCircle,
	drawText,
	setPixel,
	resetStore: resetCanvasStore,
});

export type CanvasModule = typeof canvas;
