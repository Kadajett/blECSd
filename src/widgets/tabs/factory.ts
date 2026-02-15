/**
 * Tabs Widget Factory
 *
 * Factory function for creating Tabs widgets.
 *
 * @module widgets/tabs/factory
 */

import { setDimensions } from '../../components/dimensions';
import { blur, focus, isFocused, setFocusable } from '../../components/focusable';
import { getChildren } from '../../components/hierarchy';
import { moveBy, setPosition } from '../../components/position';
import { markDirty, setVisible } from '../../components/renderable';
import { removeEntity } from '../../core/ecs';
import type { Entity, World } from '../../core/types';
import { TabsConfigSchema, type ValidatedTabsConfig } from './config';
import {
	applyTabsBorder,
	applyTabsStyle,
	handleTabsKey,
	initializeTabData,
	loadTabContentImpl,
	parseDimension,
	parsePositionToNumber,
	updateTabContentVisibility,
} from './helpers';
import { Tabs, tabDataStore } from './state';
import type { TabConfig, TabData, TabsAction, TabsConfig, TabsWidget } from './types';

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Creates a Tabs widget with the given configuration.
 *
 * The Tabs widget is a container with a tab bar for navigating
 * between multiple content panels.
 *
 * @param world - The ECS world
 * @param entity - The entity to wrap
 * @param config - Widget configuration
 * @returns The Tabs widget instance
 *
 * @example
 * ```typescript
 * import { createWorld, addEntity } from '../core/ecs';
 * import { createTabs } from 'blecsd/widgets';
 *
 * const world = createWorld();
 * const eid = addEntity(world);
 *
 * // Basic tabs
 * const tabs = createTabs(world, eid, {
 *   left: 0,
 *   top: 0,
 *   width: 60,
 *   height: 20,
 *   tabs: [
 *     { label: 'Tab 1' },
 *     { label: 'Tab 2' },
 *     { label: 'Tab 3', closable: true },
 *   ],
 * });
 *
 * // Navigate between tabs
 * tabs.nextTab();
 * tabs.setActiveTab(2);
 * ```
 */
export function createTabs(world: World, entity: Entity, config: TabsConfig = {}): TabsWidget {
	const validated = TabsConfigSchema.parse(config) as ValidatedTabsConfig;
	const eid = entity;

	// Mark as tabs and initialize data
	Tabs.isTabs[eid] = 1;
	Tabs.position[eid] = validated.position === 'bottom' ? 1 : 0;
	const tabData = initializeTabData(eid, validated.tabs);
	Tabs.tabCount[eid] = tabData.length;
	const activeTab = Math.min(validated.activeTab ?? 0, Math.max(0, tabData.length - 1));
	Tabs.activeTab[eid] = activeTab;

	// Set up layout
	setPosition(
		world,
		eid,
		parsePositionToNumber(validated.left),
		parsePositionToNumber(validated.top),
	);
	setDimensions(world, eid, parseDimension(validated.width), parseDimension(validated.height));

	// Set up style and border
	applyTabsStyle(world, eid, validated);
	applyTabsBorder(world, eid, validated);

	// Set default state
	setFocusable(world, eid, { focusable: true });
	setVisible(world, eid, true);

	// Load and show initial active tab content
	if (tabData.length > 0) {
		loadTabContentImpl(world, eid, activeTab);
		updateTabContentVisibility(world, eid);
	}

	// Create the widget object with chainable methods
	const widget: TabsWidget = {
		eid,

		// Visibility
		show(): TabsWidget {
			setVisible(world, eid, true);
			return widget;
		},

		hide(): TabsWidget {
			setVisible(world, eid, false);
			return widget;
		},

		// Position
		move(dx: number, dy: number): TabsWidget {
			moveBy(world, eid, dx, dy);
			markDirty(world, eid);
			return widget;
		},

		setPosition(newX: number, newY: number): TabsWidget {
			setPosition(world, eid, newX, newY);
			markDirty(world, eid);
			return widget;
		},

		// Tab management
		addTab(tabConfig: TabConfig): TabsWidget {
			const data = tabDataStore.get(eid) ?? [];
			const newTab: TabData = {
				label: tabConfig.label,
				contentEntity: typeof tabConfig.content === 'number' ? tabConfig.content : null,
				lazyLoader:
					typeof tabConfig.content === 'function' ? (tabConfig.content as () => Entity) : null,
				closable: tabConfig.closable ?? false,
				loaded: typeof tabConfig.content === 'number',
			};
			data.push(newTab);
			tabDataStore.set(eid, data);
			Tabs.tabCount[eid] = data.length;
			markDirty(world, eid);
			return widget;
		},

		removeTab(index: number): TabsWidget {
			const data = tabDataStore.get(eid);
			if (!data || index < 0 || index >= data.length) return widget;

			data.splice(index, 1);
			Tabs.tabCount[eid] = data.length;

			// Adjust active tab if needed
			const activeIdx = Tabs.activeTab[eid] as number;
			if (activeIdx >= data.length && data.length > 0) {
				Tabs.activeTab[eid] = data.length - 1;
			} else if (data.length === 0) {
				Tabs.activeTab[eid] = 0;
			}

			updateTabContentVisibility(world, eid);
			markDirty(world, eid);
			return widget;
		},

		getActiveTab(): number {
			return Tabs.activeTab[eid] as number;
		},

		setActiveTab(index: number): TabsWidget {
			const data = tabDataStore.get(eid);
			if (!data || index < 0 || index >= data.length) return widget;

			Tabs.activeTab[eid] = index;
			loadTabContentImpl(world, eid, index);
			updateTabContentVisibility(world, eid);
			markDirty(world, eid);
			return widget;
		},

		getTabCount(): number {
			return Tabs.tabCount[eid] as number;
		},

		getTab(index: number): TabData | undefined {
			const data = tabDataStore.get(eid);
			if (!data || index < 0 || index >= data.length) return undefined;
			return data[index];
		},

		setTabLabel(index: number, label: string): TabsWidget {
			const data = tabDataStore.get(eid);
			if (!data || index < 0 || index >= data.length) return widget;

			const tab = data[index];
			if (tab) {
				tab.label = label;
			}
			markDirty(world, eid);
			return widget;
		},

		// Navigation
		nextTab(): TabsWidget {
			const count = Tabs.tabCount[eid] as number;
			if (count === 0) return widget;

			const currentIdx = Tabs.activeTab[eid] as number;
			const nextIdx = (currentIdx + 1) % count;
			return widget.setActiveTab(nextIdx);
		},

		prevTab(): TabsWidget {
			const count = Tabs.tabCount[eid] as number;
			if (count === 0) return widget;

			const currentIdx = Tabs.activeTab[eid] as number;
			const prevIdx = currentIdx === 0 ? count - 1 : currentIdx - 1;
			return widget.setActiveTab(prevIdx);
		},

		// Focus
		focus(): TabsWidget {
			focus(world, eid);
			return widget;
		},

		blur(): TabsWidget {
			blur(world, eid);
			return widget;
		},

		isFocused(): boolean {
			return isFocused(world, eid);
		},

		// Children
		getChildren(): Entity[] {
			return getChildren(world, eid);
		},

		// Key handling
		handleKey(key: string): TabsAction | null {
			if (!widget.isFocused()) return null;
			return handleTabsKey(key, widget);
		},

		// Lifecycle
		destroy(): void {
			Tabs.isTabs[eid] = 0;
			Tabs.activeTab[eid] = 0;
			Tabs.position[eid] = 0;
			Tabs.tabCount[eid] = 0;
			tabDataStore.delete(eid);
			removeEntity(world, eid);
		},
	};

	return widget;
}
