/**
 * Tests for the Tabs widget.
 */

import { addEntity, createWorld } from 'bitecs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getDimensions } from '../components/dimensions';
import { resetFocusState } from '../components/focusable';
import { getPosition } from '../components/position';
import { getRenderable, hexToColor } from '../components/renderable';
import type { World } from '../core/types';
import {
	createTabs,
	getActiveTabIndex,
	getTabCount,
	getTabPosition,
	isTabs,
	renderTabBar,
	resetTabsStore,
	TAB_CLOSE_CHAR,
	TAB_SEPARATOR,
	Tabs,
	TabsConfigSchema,
} from './tabs';

describe('Tabs widget', () => {
	let world: World;

	beforeEach(() => {
		world = createWorld();
		resetFocusState();
		resetTabsStore();
	});

	afterEach(() => {
		resetFocusState();
	});

	describe('TabsConfigSchema', () => {
		it('validates empty config', () => {
			const result = TabsConfigSchema.safeParse({});
			expect(result.success).toBe(true);
		});

		it('validates position values', () => {
			const result = TabsConfigSchema.safeParse({
				left: 10,
				top: 20,
			});
			expect(result.success).toBe(true);
		});

		it('validates percentage position values', () => {
			const result = TabsConfigSchema.safeParse({
				left: '50%',
				top: '25%',
			});
			expect(result.success).toBe(true);
		});

		it('validates dimension values', () => {
			const result = TabsConfigSchema.safeParse({
				width: 60,
				height: 20,
			});
			expect(result.success).toBe(true);
		});

		it('validates tabs array', () => {
			const result = TabsConfigSchema.safeParse({
				tabs: [{ label: 'Tab 1' }, { label: 'Tab 2', closable: true }],
			});
			expect(result.success).toBe(true);
		});

		it('validates activeTab option', () => {
			const result = TabsConfigSchema.safeParse({
				activeTab: 1,
			});
			expect(result.success).toBe(true);
		});

		it('validates position option', () => {
			const result = TabsConfigSchema.safeParse({
				position: 'top',
			});
			expect(result.success).toBe(true);
		});

		it('validates bottom position', () => {
			const result = TabsConfigSchema.safeParse({
				position: 'bottom',
			});
			expect(result.success).toBe(true);
		});

		it('validates style options', () => {
			const result = TabsConfigSchema.safeParse({
				style: {
					tab: { activeFg: '#ffffff', activeBg: '#0000ff' },
					content: { fg: '#000000', bg: '#ffffff' },
					border: { type: 'line', fg: '#888888' },
				},
			});
			expect(result.success).toBe(true);
		});

		it('validates colors', () => {
			const result = TabsConfigSchema.safeParse({
				fg: '#ff0000',
				bg: '#00ff00',
			});
			expect(result.success).toBe(true);
		});

		it('rejects negative activeTab', () => {
			const result = TabsConfigSchema.safeParse({
				activeTab: -1,
			});
			expect(result.success).toBe(false);
		});

		it('rejects invalid position value', () => {
			const result = TabsConfigSchema.safeParse({
				position: 'left',
			});
			expect(result.success).toBe(false);
		});
	});

	describe('createTabs', () => {
		it('creates a tabs widget with default values', () => {
			const eid = addEntity(world);
			const tabs = createTabs(world, eid);

			expect(tabs.eid).toBe(eid);
			expect(isTabs(world, eid)).toBe(true);
		});

		it('defaults to top position', () => {
			const eid = addEntity(world);
			createTabs(world, eid);

			expect(Tabs.position[eid]).toBe(0); // top
		});

		it('sets bottom position from config', () => {
			const eid = addEntity(world);
			createTabs(world, eid, { position: 'bottom' });

			expect(Tabs.position[eid]).toBe(1); // bottom
		});

		it('sets position from config', () => {
			const eid = addEntity(world);
			createTabs(world, eid, { left: 10, top: 20 });

			const pos = getPosition(world, eid);
			expect(pos).toBeDefined();
			expect(pos?.x).toBe(10);
			expect(pos?.y).toBe(20);
		});

		it('sets dimensions from config', () => {
			const eid = addEntity(world);
			createTabs(world, eid, { width: 60, height: 20 });

			const dims = getDimensions(world, eid);
			expect(dims).toBeDefined();
			expect(dims?.width).toBe(60);
			expect(dims?.height).toBe(20);
		});

		it('sets style colors from config', () => {
			const eid = addEntity(world);
			createTabs(world, eid, { fg: '#ff0000', bg: '#00ff00' });

			const renderable = getRenderable(world, eid);
			expect(renderable).toBeDefined();
			expect(renderable?.fg).toBe(hexToColor('#ff0000'));
			expect(renderable?.bg).toBe(hexToColor('#00ff00'));
		});

		it('initializes with tabs from config', () => {
			const eid = addEntity(world);
			const tabs = createTabs(world, eid, {
				tabs: [{ label: 'Tab 1' }, { label: 'Tab 2' }, { label: 'Tab 3' }],
			});

			expect(tabs.getTabCount()).toBe(3);
		});

		it('sets initial active tab from config', () => {
			const eid = addEntity(world);
			const tabs = createTabs(world, eid, {
				tabs: [{ label: 'Tab 1' }, { label: 'Tab 2' }, { label: 'Tab 3' }],
				activeTab: 1,
			});

			expect(tabs.getActiveTab()).toBe(1);
		});

		it('clamps activeTab to valid range', () => {
			const eid = addEntity(world);
			const tabs = createTabs(world, eid, {
				tabs: [{ label: 'Tab 1' }, { label: 'Tab 2' }],
				activeTab: 10,
			});

			expect(tabs.getActiveTab()).toBe(1); // clamped to last tab
		});

		it('stores closable flag for tabs', () => {
			const eid = addEntity(world);
			const tabs = createTabs(world, eid, {
				tabs: [{ label: 'Tab 1', closable: true }, { label: 'Tab 2', closable: false }],
			});

			expect(tabs.getTab(0)?.closable).toBe(true);
			expect(tabs.getTab(1)?.closable).toBe(false);
		});
	});

	describe('TabsWidget methods', () => {
		describe('visibility', () => {
			it('show() makes the tabs visible', () => {
				const eid = addEntity(world);
				const tabs = createTabs(world, eid);

				tabs.hide().show();

				const renderable = getRenderable(world, eid);
				expect(renderable?.visible).toBe(true);
			});

			it('hide() makes the tabs invisible', () => {
				const eid = addEntity(world);
				const tabs = createTabs(world, eid);

				tabs.hide();

				const renderable = getRenderable(world, eid);
				expect(renderable?.visible).toBe(false);
			});

			it('show() returns widget for chaining', () => {
				const eid = addEntity(world);
				const tabs = createTabs(world, eid);

				const result = tabs.show();
				expect(result).toBe(tabs);
			});
		});

		describe('position', () => {
			it('move() changes position by delta', () => {
				const eid = addEntity(world);
				const tabs = createTabs(world, eid, { left: 10, top: 20 });

				tabs.move(5, -3);

				const pos = getPosition(world, eid);
				expect(pos?.x).toBe(15);
				expect(pos?.y).toBe(17);
			});

			it('setPosition() sets absolute position', () => {
				const eid = addEntity(world);
				const tabs = createTabs(world, eid);

				tabs.setPosition(50, 30);

				const pos = getPosition(world, eid);
				expect(pos?.x).toBe(50);
				expect(pos?.y).toBe(30);
			});

			it('move() returns widget for chaining', () => {
				const eid = addEntity(world);
				const tabs = createTabs(world, eid);

				const result = tabs.move(1, 1);
				expect(result).toBe(tabs);
			});
		});

		describe('tab management', () => {
			it('addTab() adds a new tab', () => {
				const eid = addEntity(world);
				const tabs = createTabs(world, eid);

				expect(tabs.getTabCount()).toBe(0);

				tabs.addTab({ label: 'New Tab' });

				expect(tabs.getTabCount()).toBe(1);
				expect(tabs.getTab(0)?.label).toBe('New Tab');
			});

			it('addTab() returns widget for chaining', () => {
				const eid = addEntity(world);
				const tabs = createTabs(world, eid);

				const result = tabs.addTab({ label: 'Tab' });
				expect(result).toBe(tabs);
			});

			it('removeTab() removes a tab', () => {
				const eid = addEntity(world);
				const tabs = createTabs(world, eid, {
					tabs: [{ label: 'Tab 1' }, { label: 'Tab 2' }, { label: 'Tab 3' }],
				});

				tabs.removeTab(1);

				expect(tabs.getTabCount()).toBe(2);
				expect(tabs.getTab(0)?.label).toBe('Tab 1');
				expect(tabs.getTab(1)?.label).toBe('Tab 3');
			});

			it('removeTab() adjusts active tab when needed', () => {
				const eid = addEntity(world);
				const tabs = createTabs(world, eid, {
					tabs: [{ label: 'Tab 1' }, { label: 'Tab 2' }],
					activeTab: 1,
				});

				tabs.removeTab(1);

				expect(tabs.getActiveTab()).toBe(0);
			});

			it('removeTab() returns widget for chaining', () => {
				const eid = addEntity(world);
				const tabs = createTabs(world, eid, {
					tabs: [{ label: 'Tab 1' }],
				});

				const result = tabs.removeTab(0);
				expect(result).toBe(tabs);
			});

			it('getActiveTab() returns current active tab index', () => {
				const eid = addEntity(world);
				const tabs = createTabs(world, eid, {
					tabs: [{ label: 'Tab 1' }, { label: 'Tab 2' }],
					activeTab: 1,
				});

				expect(tabs.getActiveTab()).toBe(1);
			});

			it('setActiveTab() changes active tab', () => {
				const eid = addEntity(world);
				const tabs = createTabs(world, eid, {
					tabs: [{ label: 'Tab 1' }, { label: 'Tab 2' }, { label: 'Tab 3' }],
				});

				tabs.setActiveTab(2);

				expect(tabs.getActiveTab()).toBe(2);
			});

			it('setActiveTab() ignores invalid index', () => {
				const eid = addEntity(world);
				const tabs = createTabs(world, eid, {
					tabs: [{ label: 'Tab 1' }, { label: 'Tab 2' }],
				});

				tabs.setActiveTab(10);

				expect(tabs.getActiveTab()).toBe(0); // unchanged
			});

			it('setActiveTab() returns widget for chaining', () => {
				const eid = addEntity(world);
				const tabs = createTabs(world, eid, {
					tabs: [{ label: 'Tab 1' }],
				});

				const result = tabs.setActiveTab(0);
				expect(result).toBe(tabs);
			});

			it('getTabCount() returns number of tabs', () => {
				const eid = addEntity(world);
				const tabs = createTabs(world, eid, {
					tabs: [{ label: 'Tab 1' }, { label: 'Tab 2' }, { label: 'Tab 3' }],
				});

				expect(tabs.getTabCount()).toBe(3);
			});

			it('getTab() returns tab data by index', () => {
				const eid = addEntity(world);
				const tabs = createTabs(world, eid, {
					tabs: [{ label: 'First Tab', closable: true }],
				});

				const tab = tabs.getTab(0);
				expect(tab).toBeDefined();
				expect(tab?.label).toBe('First Tab');
				expect(tab?.closable).toBe(true);
			});

			it('getTab() returns undefined for invalid index', () => {
				const eid = addEntity(world);
				const tabs = createTabs(world, eid, {
					tabs: [{ label: 'Tab 1' }],
				});

				expect(tabs.getTab(-1)).toBeUndefined();
				expect(tabs.getTab(10)).toBeUndefined();
			});

			it('setTabLabel() changes tab label', () => {
				const eid = addEntity(world);
				const tabs = createTabs(world, eid, {
					tabs: [{ label: 'Old Label' }],
				});

				tabs.setTabLabel(0, 'New Label');

				expect(tabs.getTab(0)?.label).toBe('New Label');
			});

			it('setTabLabel() returns widget for chaining', () => {
				const eid = addEntity(world);
				const tabs = createTabs(world, eid, {
					tabs: [{ label: 'Tab' }],
				});

				const result = tabs.setTabLabel(0, 'New');
				expect(result).toBe(tabs);
			});
		});

		describe('navigation', () => {
			it('nextTab() moves to the next tab', () => {
				const eid = addEntity(world);
				const tabs = createTabs(world, eid, {
					tabs: [{ label: 'Tab 1' }, { label: 'Tab 2' }, { label: 'Tab 3' }],
				});

				tabs.nextTab();

				expect(tabs.getActiveTab()).toBe(1);
			});

			it('nextTab() wraps around to first tab', () => {
				const eid = addEntity(world);
				const tabs = createTabs(world, eid, {
					tabs: [{ label: 'Tab 1' }, { label: 'Tab 2' }],
					activeTab: 1,
				});

				tabs.nextTab();

				expect(tabs.getActiveTab()).toBe(0);
			});

			it('prevTab() moves to the previous tab', () => {
				const eid = addEntity(world);
				const tabs = createTabs(world, eid, {
					tabs: [{ label: 'Tab 1' }, { label: 'Tab 2' }, { label: 'Tab 3' }],
					activeTab: 2,
				});

				tabs.prevTab();

				expect(tabs.getActiveTab()).toBe(1);
			});

			it('prevTab() wraps around to last tab', () => {
				const eid = addEntity(world);
				const tabs = createTabs(world, eid, {
					tabs: [{ label: 'Tab 1' }, { label: 'Tab 2' }],
					activeTab: 0,
				});

				tabs.prevTab();

				expect(tabs.getActiveTab()).toBe(1);
			});

			it('nextTab() returns widget for chaining', () => {
				const eid = addEntity(world);
				const tabs = createTabs(world, eid, {
					tabs: [{ label: 'Tab 1' }, { label: 'Tab 2' }],
				});

				const result = tabs.nextTab();
				expect(result).toBe(tabs);
			});
		});

		describe('focus', () => {
			it('focus() focuses the tabs widget', () => {
				const eid = addEntity(world);
				const tabs = createTabs(world, eid);

				tabs.focus();
				expect(tabs.isFocused()).toBe(true);
			});

			it('blur() unfocuses the tabs widget', () => {
				const eid = addEntity(world);
				const tabs = createTabs(world, eid);

				tabs.focus();
				tabs.blur();
				expect(tabs.isFocused()).toBe(false);
			});

			it('isFocused() returns false by default', () => {
				const eid = addEntity(world);
				const tabs = createTabs(world, eid);

				expect(tabs.isFocused()).toBe(false);
			});
		});

		describe('key handling', () => {
			it('Tab key goes to next tab when focused', () => {
				const eid = addEntity(world);
				const tabs = createTabs(world, eid, {
					tabs: [{ label: 'Tab 1' }, { label: 'Tab 2' }],
				});

				tabs.focus();
				const action = tabs.handleKey('Tab');

				expect(action).toEqual({ type: 'next' });
				expect(tabs.getActiveTab()).toBe(1);
			});

			it('Shift+Tab goes to previous tab when focused', () => {
				const eid = addEntity(world);
				const tabs = createTabs(world, eid, {
					tabs: [{ label: 'Tab 1' }, { label: 'Tab 2' }],
					activeTab: 1,
				});

				tabs.focus();
				const action = tabs.handleKey('S-Tab');

				expect(action).toEqual({ type: 'prev' });
				expect(tabs.getActiveTab()).toBe(0);
			});

			it('right arrow goes to next tab when focused', () => {
				const eid = addEntity(world);
				const tabs = createTabs(world, eid, {
					tabs: [{ label: 'Tab 1' }, { label: 'Tab 2' }],
				});

				tabs.focus();
				const action = tabs.handleKey('right');

				expect(action).toEqual({ type: 'next' });
			});

			it('left arrow goes to previous tab when focused', () => {
				const eid = addEntity(world);
				const tabs = createTabs(world, eid, {
					tabs: [{ label: 'Tab 1' }, { label: 'Tab 2' }],
					activeTab: 1,
				});

				tabs.focus();
				const action = tabs.handleKey('left');

				expect(action).toEqual({ type: 'prev' });
			});

			it('number keys jump to tab', () => {
				const eid = addEntity(world);
				const tabs = createTabs(world, eid, {
					tabs: [{ label: 'Tab 1' }, { label: 'Tab 2' }, { label: 'Tab 3' }],
				});

				tabs.focus();
				const action = tabs.handleKey('3');

				expect(action).toEqual({ type: 'goto', index: 2 });
				expect(tabs.getActiveTab()).toBe(2);
			});

			it('number keys do nothing for invalid tab', () => {
				const eid = addEntity(world);
				const tabs = createTabs(world, eid, {
					tabs: [{ label: 'Tab 1' }, { label: 'Tab 2' }],
				});

				tabs.focus();
				const action = tabs.handleKey('5');

				expect(action).toBeNull();
				expect(tabs.getActiveTab()).toBe(0);
			});

			it('returns null when not focused', () => {
				const eid = addEntity(world);
				const tabs = createTabs(world, eid, {
					tabs: [{ label: 'Tab 1' }, { label: 'Tab 2' }],
				});

				const action = tabs.handleKey('Tab');

				expect(action).toBeNull();
			});

			it('returns null for unhandled keys', () => {
				const eid = addEntity(world);
				const tabs = createTabs(world, eid, {
					tabs: [{ label: 'Tab 1' }],
				});

				tabs.focus();
				const action = tabs.handleKey('Enter');

				expect(action).toBeNull();
			});
		});

		describe('lazy loading', () => {
			it('calls lazy loader when tab is activated', () => {
				const eid = addEntity(world);
				const contentEntity = addEntity(world);
				const lazyLoader = vi.fn(() => contentEntity);

				const tabs = createTabs(world, eid, {
					tabs: [{ label: 'Tab 1' }, { label: 'Tab 2', content: lazyLoader }],
				});

				// Tab 2 not loaded yet
				expect(lazyLoader).not.toHaveBeenCalled();

				// Activate tab 2
				tabs.setActiveTab(1);

				expect(lazyLoader).toHaveBeenCalledTimes(1);
			});

			it('only calls lazy loader once', () => {
				const eid = addEntity(world);
				const contentEntity = addEntity(world);
				const lazyLoader = vi.fn(() => contentEntity);

				const tabs = createTabs(world, eid, {
					tabs: [{ label: 'Tab 1' }, { label: 'Tab 2', content: lazyLoader }],
				});

				tabs.setActiveTab(1);
				tabs.setActiveTab(0);
				tabs.setActiveTab(1);

				expect(lazyLoader).toHaveBeenCalledTimes(1);
			});
		});

		describe('destroy', () => {
			it('destroy() removes the tabs marker', () => {
				const eid = addEntity(world);
				const tabs = createTabs(world, eid);

				expect(isTabs(world, eid)).toBe(true);
				tabs.destroy();
				expect(isTabs(world, eid)).toBe(false);
			});
		});
	});

	describe('utility functions', () => {
		describe('isTabs', () => {
			it('returns true for tabs entities', () => {
				const eid = addEntity(world);
				createTabs(world, eid);

				expect(isTabs(world, eid)).toBe(true);
			});

			it('returns false for non-tabs entities', () => {
				const eid = addEntity(world);

				expect(isTabs(world, eid)).toBe(false);
			});
		});

		describe('getActiveTabIndex', () => {
			it('returns the active tab index', () => {
				const eid = addEntity(world);
				createTabs(world, eid, {
					tabs: [{ label: 'Tab 1' }, { label: 'Tab 2' }],
					activeTab: 1,
				});

				expect(getActiveTabIndex(world, eid)).toBe(1);
			});
		});

		describe('getTabCount', () => {
			it('returns the tab count', () => {
				const eid = addEntity(world);
				createTabs(world, eid, {
					tabs: [{ label: 'Tab 1' }, { label: 'Tab 2' }, { label: 'Tab 3' }],
				});

				expect(getTabCount(world, eid)).toBe(3);
			});
		});

		describe('getTabPosition', () => {
			it('returns the tab position', () => {
				const eid1 = addEntity(world);
				const eid2 = addEntity(world);

				createTabs(world, eid1, { position: 'top' });
				createTabs(world, eid2, { position: 'bottom' });

				expect(getTabPosition(world, eid1)).toBe('top');
				expect(getTabPosition(world, eid2)).toBe('bottom');
			});
		});

		describe('renderTabBar', () => {
			it('renders tab labels', () => {
				const eid = addEntity(world);
				createTabs(world, eid, {
					tabs: [{ label: 'Tab 1' }, { label: 'Tab 2' }],
				});

				const bar = renderTabBar(world, eid, 40);
				expect(bar).toContain('Tab 1');
				expect(bar).toContain('Tab 2');
			});

			it('highlights active tab', () => {
				const eid = addEntity(world);
				createTabs(world, eid, {
					tabs: [{ label: 'Tab 1' }, { label: 'Tab 2' }],
					activeTab: 0,
				});

				const bar = renderTabBar(world, eid, 40);
				expect(bar).toContain('[Tab 1]');
			});

			it('includes separator between tabs', () => {
				const eid = addEntity(world);
				createTabs(world, eid, {
					tabs: [{ label: 'Tab 1' }, { label: 'Tab 2' }],
				});

				const bar = renderTabBar(world, eid, 40);
				expect(bar).toContain(TAB_SEPARATOR);
			});

			it('includes close button for closable tabs', () => {
				const eid = addEntity(world);
				createTabs(world, eid, {
					tabs: [{ label: 'Tab 1', closable: true }],
				});

				const bar = renderTabBar(world, eid, 40);
				expect(bar).toContain(TAB_CLOSE_CHAR);
			});

			it('truncates long tab bar', () => {
				const eid = addEntity(world);
				createTabs(world, eid, {
					tabs: [{ label: 'Very Long Tab Name 1' }, { label: 'Very Long Tab Name 2' }],
				});

				const bar = renderTabBar(world, eid, 20);
				expect(bar.length).toBe(20);
				expect(bar).toContain('…');
			});

			it('returns empty string for no tabs', () => {
				const eid = addEntity(world);
				createTabs(world, eid);

				const bar = renderTabBar(world, eid, 20);
				expect(bar.trim()).toBe('');
			});
		});
	});

	describe('method chaining', () => {
		it('supports full method chaining', () => {
			const eid = addEntity(world);
			const tabs = createTabs(world, eid, {
				left: 0,
				top: 0,
				width: 60,
				height: 20,
			});

			tabs
				.addTab({ label: 'Tab 1' })
				.addTab({ label: 'Tab 2' })
				.addTab({ label: 'Tab 3' })
				.setPosition(10, 10)
				.move(5, 5)
				.setActiveTab(1)
				.nextTab()
				.show();

			const pos = getPosition(world, eid);
			expect(pos?.x).toBe(15);
			expect(pos?.y).toBe(15);
			expect(tabs.getTabCount()).toBe(3);
			expect(tabs.getActiveTab()).toBe(2);
		});
	});
});
