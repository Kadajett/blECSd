/**
 * ContextMenu widget namespace.
 *
 * @example
 * ```typescript
 * import { contextMenu } from 'blecsd/widgets';
 * const cm = contextMenu.create(world, { items: [...] });
 * const selectedIndex = contextMenu.getSelectedIndex(world, cm.eid);
 * contextMenu.handleKey(world, cm.eid, keyEvent);
 * ```
 */
import {
	createContextMenu,
	getContextMenuSelectedIndex,
	handleContextMenuKey,
} from '../contextMenu';

export const contextMenu = Object.freeze({
	create: createContextMenu,
	getSelectedIndex: getContextMenuSelectedIndex,
	handleKey: handleContextMenuKey,
});

export type ContextMenuModule = typeof contextMenu;
