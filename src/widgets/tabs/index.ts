/**
 * Tabs Widget
 *
 * A tabbed container widget that manages multiple content panels
 * with a tab bar for navigation.
 *
 * @module widgets/tabs
 */

// Re-export API functions
export {
	getActiveTabIndex,
	getTabCount,
	getTabPosition,
	isTabs,
	renderTabBar,
	resetTabsStore,
} from './api';

// Re-export configuration schema and constants
export {
	DEFAULT_TAB_POSITION,
	TAB_CLOSE_CHAR,
	TAB_SEPARATOR,
	TabsConfigSchema,
} from './config';
// Re-export factory function
export { createTabs } from './factory';
// Re-export state and component
export { Tabs } from './state';
// Re-export types
export type {
	ContentStyleConfig,
	DimensionValue,
	PositionValue,
	TabConfig,
	TabData,
	TabPosition,
	TabStyleConfig,
	TabsAction,
	TabsBorderConfig,
	TabsConfig,
	TabsStyleConfig,
	TabsWidget,
} from './types';
