/**
 * Panel widget namespace.
 *
 * @example
 * ```typescript
 * import { panel } from 'blecsd/widgets';
 * const p = panel.create(world, { title: 'Settings' });
 * const title = panel.getTitle(world, p.eid);
 * panel.setTitle(world, p.eid, 'New Title');
 * const align = panel.getTitleAlign(world, p.eid);
 * const collapsed = panel.isCollapsed(world, p.eid);
 * panel.renderTitleBar(world, p.eid);
 * ```
 */
import {
	CLOSE_BUTTON_CHAR,
	COLLAPSE_CHAR,
	createPanel,
	DEFAULT_PANEL_TITLE,
	EXPAND_CHAR,
	getPanelTitle,
	getPanelTitleAlign,
	isPanel,
	isPanelCollapsed,
	renderPanelTitleBar,
	resetPanelStore,
	setPanelTitle,
} from '../panel';

export const panel = Object.freeze({
	create: createPanel,
	is: isPanel,
	getTitle: getPanelTitle,
	setTitle: setPanelTitle,
	getTitleAlign: getPanelTitleAlign,
	isCollapsed: isPanelCollapsed,
	renderTitleBar: renderPanelTitleBar,
	resetStore: resetPanelStore,
	CLOSE_BUTTON_CHAR,
	COLLAPSE_CHAR,
	EXPAND_CHAR,
	DEFAULT_PANEL_TITLE,
});

export type PanelModule = typeof panel;
