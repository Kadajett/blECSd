/**
 * Tabs Widget
 *
 * A tabbed container widget that manages multiple content panels
 * with a tab bar for navigation.
 *
 * @module widgets/tabs
 */

// Re-export types
export type {
	DimensionValue,
	PositionValue,
	TabPosition,
	TabConfig,
	TabStyleConfig,
	ContentStyleConfig,
	TabsBorderConfig,
	TabsStyleConfig,
	TabsConfig,
	TabData,
	TabsWidget,
	TabsAction,
} from './types';

// Re-export configuration schema and constants
export {
	TabsConfigSchema,
	DEFAULT_TAB_POSITION,
	TAB_SEPARATOR,
	TAB_CLOSE_CHAR,
} from './config';

// Re-export state and component
export { Tabs } from './state';

// Re-export factory function
export { createTabs } from './factory';

// Re-export API functions
export {
	isTabs,
	getActiveTabIndex,
	getTabCount,
	getTabPosition,
	renderTabBar,
	resetTabsStore,
} from './api';
