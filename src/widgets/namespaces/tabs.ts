/**
 * Tabs widget namespace.
 *
 * @example
 * ```typescript
 * import { tabs } from 'blecsd/widgets';
 * const t = tabs.create(world, { tabs: [...] });
 * const activeIndex = tabs.getActiveIndex(world, t.eid);
 * const count = tabs.getCount(world, t.eid);
 * const position = tabs.getPosition(world, t.eid);
 * tabs.renderTabBar(world, t.eid);
 * ```
 */
import {
	createTabs,
	DEFAULT_TAB_POSITION,
	getActiveTabIndex,
	getTabCount,
	getTabPosition,
	isTabs,
	renderTabBar,
	resetTabsStore,
	TAB_CLOSE_CHAR,
	TAB_SEPARATOR,
} from '../tabs';

export const tabs = Object.freeze({
	create: createTabs,
	is: isTabs,
	getActiveIndex: getActiveTabIndex,
	getCount: getTabCount,
	getPosition: getTabPosition,
	renderTabBar,
	resetStore: resetTabsStore,
	DEFAULT_TAB_POSITION,
	TAB_CLOSE_CHAR,
	TAB_SEPARATOR,
});

export type TabsModule = typeof tabs;
