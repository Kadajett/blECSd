/**
 * LayoutWidget namespace.
 *
 * @example
 * ```typescript
 * import { layoutWidget } from 'blecsd/widgets';
 * const layout = layoutWidget.create(world, { mode: 'flex' });
 * const mode = layoutWidget.getMode(world, layout.eid);
 * ```
 */
import {
	calculateFlexLayout,
	calculateGridLayout,
	calculateInlineLayout,
	createLayout,
	getLayoutMode,
	isLayout,
	resetLayoutStore,
} from '../layout';

export const layoutWidget = Object.freeze({
	create: createLayout,
	is: isLayout,
	getMode: getLayoutMode,
	calculateFlex: calculateFlexLayout,
	calculateGrid: calculateGridLayout,
	calculateInline: calculateInlineLayout,
	resetStore: resetLayoutStore,
});

export type LayoutWidgetModule = typeof layoutWidget;
