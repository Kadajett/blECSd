/**
 * Panel movement namespace.
 *
 * @example
 * ```typescript
 * import { panelMove } from 'blecsd/systems';
 * const state = panelMove.createState();
 * const config = panelMove.createConfig({ minWidth: 100, minHeight: 50 });
 * panelMove.beginMove(state, eid, startX, startY);
 * const result = panelMove.updateMove(state, currentX, currentY);
 * panelMove.end(state);
 * ```
 */
import {
	beginMove,
	beginResize,
	cancelMoveOrResize,
	createPanelConstraints,
	createPanelMoveConfig,
	createPanelMoveState,
	detectResizeHandle,
	endMoveOrResize,
	keyboardMove,
	keyboardResize,
	mergeDirtyRects,
	updateMove,
	updateResize,
} from '../panelMovement';

export const panelMove = Object.freeze({
	createState: createPanelMoveState,
	createConfig: createPanelMoveConfig,
	createConstraints: createPanelConstraints,
	beginMove,
	beginResize,
	updateMove,
	updateResize,
	end: endMoveOrResize,
	cancel: cancelMoveOrResize,
	detectHandle: detectResizeHandle,
	mergeDirtyRects,
	keyboard: Object.freeze({
		move: keyboardMove,
		resize: keyboardResize,
	}),
});

export type PanelMoveModule = typeof panelMove;
