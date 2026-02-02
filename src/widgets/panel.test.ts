/**
 * Tests for the Panel widget.
 */

import { addEntity, createWorld } from 'bitecs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getDimensions } from '../components/dimensions';
import { resetFocusState } from '../components/focusable';
import { getParent } from '../components/hierarchy';
import { getPosition } from '../components/position';
import { getRenderable, hexToColor } from '../components/renderable';
import type { World } from '../core/types';
import {
	createPanel,
	DEFAULT_PANEL_TITLE,
	getPanelTitle,
	getPanelTitleAlign,
	isPanel,
	isPanelCollapsed,
	Panel,
	PanelConfigSchema,
	renderPanelTitleBar,
	resetPanelStore,
	setPanelTitle,
	CLOSE_BUTTON_CHAR,
	COLLAPSE_CHAR,
	EXPAND_CHAR,
} from './panel';

describe('Panel widget', () => {
	let world: World;

	beforeEach(() => {
		world = createWorld();
		resetFocusState();
		resetPanelStore();
	});

	afterEach(() => {
		resetFocusState();
	});

	describe('PanelConfigSchema', () => {
		it('validates empty config', () => {
			const result = PanelConfigSchema.safeParse({});
			expect(result.success).toBe(true);
		});

		it('validates position values', () => {
			const result = PanelConfigSchema.safeParse({
				left: 10,
				top: 20,
			});
			expect(result.success).toBe(true);
		});

		it('validates percentage position values', () => {
			const result = PanelConfigSchema.safeParse({
				left: '50%',
				top: '25%',
			});
			expect(result.success).toBe(true);
		});

		it('validates dimension values', () => {
			const result = PanelConfigSchema.safeParse({
				width: 40,
				height: 15,
			});
			expect(result.success).toBe(true);
		});

		it('validates title option', () => {
			const result = PanelConfigSchema.safeParse({
				title: 'My Panel',
			});
			expect(result.success).toBe(true);
		});

		it('validates titleAlign option', () => {
			const result = PanelConfigSchema.safeParse({
				titleAlign: 'center',
			});
			expect(result.success).toBe(true);
		});

		it('validates closable option', () => {
			const result = PanelConfigSchema.safeParse({
				closable: true,
			});
			expect(result.success).toBe(true);
		});

		it('validates collapsible option', () => {
			const result = PanelConfigSchema.safeParse({
				collapsible: true,
			});
			expect(result.success).toBe(true);
		});

		it('validates collapsed option', () => {
			const result = PanelConfigSchema.safeParse({
				collapsed: true,
			});
			expect(result.success).toBe(true);
		});

		it('validates style options', () => {
			const result = PanelConfigSchema.safeParse({
				style: {
					title: { fg: '#ffffff', bg: '#0000ff', align: 'center' },
					content: { fg: '#000000', bg: '#ffffff' },
					border: { type: 'line', fg: '#888888' },
				},
			});
			expect(result.success).toBe(true);
		});

		it('validates padding as number', () => {
			const result = PanelConfigSchema.safeParse({
				padding: 2,
			});
			expect(result.success).toBe(true);
		});

		it('validates padding as object', () => {
			const result = PanelConfigSchema.safeParse({
				padding: { left: 1, top: 2, right: 1, bottom: 0 },
			});
			expect(result.success).toBe(true);
		});

		it('validates colors', () => {
			const result = PanelConfigSchema.safeParse({
				fg: '#ff0000',
				bg: '#00ff00',
			});
			expect(result.success).toBe(true);
		});

		it('rejects invalid titleAlign value', () => {
			const result = PanelConfigSchema.safeParse({
				titleAlign: 'invalid',
			});
			expect(result.success).toBe(false);
		});

		it('rejects negative padding', () => {
			const result = PanelConfigSchema.safeParse({
				padding: -5,
			});
			expect(result.success).toBe(false);
		});
	});

	describe('createPanel', () => {
		it('creates a panel with default values', () => {
			const eid = addEntity(world);
			const panel = createPanel(world, eid);

			expect(panel.eid).toBe(eid);
			expect(isPanel(world, eid)).toBe(true);
		});

		it('defaults to empty title', () => {
			const eid = addEntity(world);
			const panel = createPanel(world, eid);

			expect(panel.getTitle()).toBe(DEFAULT_PANEL_TITLE);
		});

		it('sets title from config', () => {
			const eid = addEntity(world);
			const panel = createPanel(world, eid, { title: 'Test Panel' });

			expect(panel.getTitle()).toBe('Test Panel');
		});

		it('sets position from config', () => {
			const eid = addEntity(world);
			createPanel(world, eid, { left: 10, top: 20 });

			const pos = getPosition(world, eid);
			expect(pos).toBeDefined();
			expect(pos?.x).toBe(10);
			expect(pos?.y).toBe(20);
		});

		it('sets dimensions from config', () => {
			const eid = addEntity(world);
			createPanel(world, eid, { width: 40, height: 15 });

			const dims = getDimensions(world, eid);
			expect(dims).toBeDefined();
			expect(dims?.width).toBe(40);
			expect(dims?.height).toBe(15);
		});

		it('sets style colors from config', () => {
			const eid = addEntity(world);
			createPanel(world, eid, { fg: '#ff0000', bg: '#00ff00' });

			const renderable = getRenderable(world, eid);
			expect(renderable).toBeDefined();
			expect(renderable?.fg).toBe(hexToColor('#ff0000'));
			expect(renderable?.bg).toBe(hexToColor('#00ff00'));
		});

		it('stores closable flag in component', () => {
			const eid = addEntity(world);
			createPanel(world, eid, { closable: true });

			expect(Panel.closable[eid]).toBe(1);
		});

		it('stores collapsible flag in component', () => {
			const eid = addEntity(world);
			createPanel(world, eid, { collapsible: true });

			expect(Panel.collapsible[eid]).toBe(1);
		});

		it('stores collapsed state in component', () => {
			const eid = addEntity(world);
			createPanel(world, eid, { collapsible: true, collapsed: true, height: 15 });

			expect(Panel.collapsed[eid]).toBe(1);
		});

		it('reduces height when initially collapsed', () => {
			const eid = addEntity(world);
			createPanel(world, eid, { collapsible: true, collapsed: true, width: 40, height: 15 });

			const dims = getDimensions(world, eid);
			expect(dims?.height).toBe(3); // Title bar only
		});

		it('sets title alignment from config', () => {
			const eid1 = addEntity(world);
			const eid2 = addEntity(world);
			const eid3 = addEntity(world);

			createPanel(world, eid1, { titleAlign: 'left' });
			createPanel(world, eid2, { titleAlign: 'center' });
			createPanel(world, eid3, { titleAlign: 'right' });

			expect(Panel.titleAlign[eid1]).toBe(0);
			expect(Panel.titleAlign[eid2]).toBe(1);
			expect(Panel.titleAlign[eid3]).toBe(2);
		});
	});

	describe('PanelWidget methods', () => {
		describe('visibility', () => {
			it('show() makes the panel visible', () => {
				const eid = addEntity(world);
				const panel = createPanel(world, eid);

				panel.hide().show();

				const renderable = getRenderable(world, eid);
				expect(renderable?.visible).toBe(true);
			});

			it('hide() makes the panel invisible', () => {
				const eid = addEntity(world);
				const panel = createPanel(world, eid);

				panel.hide();

				const renderable = getRenderable(world, eid);
				expect(renderable?.visible).toBe(false);
			});

			it('show() returns widget for chaining', () => {
				const eid = addEntity(world);
				const panel = createPanel(world, eid);

				const result = panel.show();
				expect(result).toBe(panel);
			});
		});

		describe('position', () => {
			it('move() changes position by delta', () => {
				const eid = addEntity(world);
				const panel = createPanel(world, eid, { left: 10, top: 20 });

				panel.move(5, -3);

				const pos = getPosition(world, eid);
				expect(pos?.x).toBe(15);
				expect(pos?.y).toBe(17);
			});

			it('setPosition() sets absolute position', () => {
				const eid = addEntity(world);
				const panel = createPanel(world, eid);

				panel.setPosition(50, 30);

				const pos = getPosition(world, eid);
				expect(pos?.x).toBe(50);
				expect(pos?.y).toBe(30);
			});

			it('move() returns widget for chaining', () => {
				const eid = addEntity(world);
				const panel = createPanel(world, eid);

				const result = panel.move(1, 1);
				expect(result).toBe(panel);
			});
		});

		describe('title', () => {
			it('setTitle() updates the title', () => {
				const eid = addEntity(world);
				const panel = createPanel(world, eid, { title: 'Old Title' });

				panel.setTitle('New Title');

				expect(panel.getTitle()).toBe('New Title');
			});

			it('setTitle() returns widget for chaining', () => {
				const eid = addEntity(world);
				const panel = createPanel(world, eid);

				const result = panel.setTitle('Test');
				expect(result).toBe(panel);
			});

			it('getTitle() returns the current title', () => {
				const eid = addEntity(world);
				const panel = createPanel(world, eid, { title: 'My Panel' });

				expect(panel.getTitle()).toBe('My Panel');
			});
		});

		describe('content', () => {
			it('setContent() updates the content', () => {
				const eid = addEntity(world);
				const panel = createPanel(world, eid);

				panel.setContent('Hello World');

				expect(panel.getContent()).toBe('Hello World');
			});

			it('setContent() returns widget for chaining', () => {
				const eid = addEntity(world);
				const panel = createPanel(world, eid);

				const result = panel.setContent('Test');
				expect(result).toBe(panel);
			});
		});

		describe('collapse/expand', () => {
			it('collapse() collapses the panel', () => {
				const eid = addEntity(world);
				const panel = createPanel(world, eid, {
					collapsible: true,
					width: 40,
					height: 15,
				});

				panel.collapse();

				expect(panel.isCollapsed()).toBe(true);
				const dims = getDimensions(world, eid);
				expect(dims?.height).toBe(3); // Title bar only
			});

			it('expand() expands the panel', () => {
				const eid = addEntity(world);
				const panel = createPanel(world, eid, {
					collapsible: true,
					collapsed: true,
					width: 40,
					height: 15,
				});

				panel.expand();

				expect(panel.isCollapsed()).toBe(false);
				const dims = getDimensions(world, eid);
				expect(dims?.height).toBe(15); // Original height
			});

			it('toggle() toggles collapse state', () => {
				const eid = addEntity(world);
				const panel = createPanel(world, eid, {
					collapsible: true,
					width: 40,
					height: 15,
				});

				expect(panel.isCollapsed()).toBe(false);
				panel.toggle();
				expect(panel.isCollapsed()).toBe(true);
				panel.toggle();
				expect(panel.isCollapsed()).toBe(false);
			});

			it('collapse() does nothing if not collapsible', () => {
				const eid = addEntity(world);
				const panel = createPanel(world, eid, {
					collapsible: false,
					width: 40,
					height: 15,
				});

				panel.collapse();

				expect(panel.isCollapsed()).toBe(false);
				const dims = getDimensions(world, eid);
				expect(dims?.height).toBe(15);
			});

			it('collapse() returns widget for chaining', () => {
				const eid = addEntity(world);
				const panel = createPanel(world, eid, { collapsible: true });

				const result = panel.collapse();
				expect(result).toBe(panel);
			});
		});

		describe('close', () => {
			it('isClosable() returns correct value', () => {
				const eid1 = addEntity(world);
				const eid2 = addEntity(world);

				const closablePanel = createPanel(world, eid1, { closable: true });
				const nonClosablePanel = createPanel(world, eid2, { closable: false });

				expect(closablePanel.isClosable()).toBe(true);
				expect(nonClosablePanel.isClosable()).toBe(false);
			});

			it('close() hides the panel if closable', () => {
				const eid = addEntity(world);
				const panel = createPanel(world, eid, { closable: true });

				panel.close();

				const renderable = getRenderable(world, eid);
				expect(renderable?.visible).toBe(false);
			});

			it('close() does nothing if not closable', () => {
				const eid = addEntity(world);
				const panel = createPanel(world, eid, { closable: false });

				panel.close();

				const renderable = getRenderable(world, eid);
				expect(renderable?.visible).toBe(true);
			});
		});

		describe('focus', () => {
			it('focus() focuses the panel', () => {
				const eid = addEntity(world);
				const panel = createPanel(world, eid);

				panel.focus();
				expect(panel.isFocused()).toBe(true);
			});

			it('blur() unfocuses the panel', () => {
				const eid = addEntity(world);
				const panel = createPanel(world, eid);

				panel.focus();
				panel.blur();
				expect(panel.isFocused()).toBe(false);
			});

			it('isFocused() returns false by default', () => {
				const eid = addEntity(world);
				const panel = createPanel(world, eid);

				expect(panel.isFocused()).toBe(false);
			});
		});

		describe('children', () => {
			it('append() adds a child entity', () => {
				const parentEid = addEntity(world);
				const childEid = addEntity(world);
				const panel = createPanel(world, parentEid);

				panel.append(childEid);

				const parent = getParent(world, childEid);
				expect(parent).toBe(parentEid);
			});

			it('getChildren() returns child entities', () => {
				const parentEid = addEntity(world);
				const child1 = addEntity(world);
				const child2 = addEntity(world);
				const panel = createPanel(world, parentEid);

				panel.append(child1).append(child2);

				const children = panel.getChildren();
				expect(children).toHaveLength(2);
				expect(children).toContain(child1);
				expect(children).toContain(child2);
			});
		});

		describe('destroy', () => {
			it('destroy() removes the panel marker', () => {
				const eid = addEntity(world);
				const panel = createPanel(world, eid);

				expect(isPanel(world, eid)).toBe(true);
				panel.destroy();
				expect(isPanel(world, eid)).toBe(false);
			});
		});
	});

	describe('utility functions', () => {
		describe('isPanel', () => {
			it('returns true for panel entities', () => {
				const eid = addEntity(world);
				createPanel(world, eid);

				expect(isPanel(world, eid)).toBe(true);
			});

			it('returns false for non-panel entities', () => {
				const eid = addEntity(world);

				expect(isPanel(world, eid)).toBe(false);
			});
		});

		describe('getPanelTitle', () => {
			it('returns the panel title', () => {
				const eid = addEntity(world);
				createPanel(world, eid, { title: 'Test Title' });

				expect(getPanelTitle(world, eid)).toBe('Test Title');
			});
		});

		describe('setPanelTitle', () => {
			it('sets the panel title', () => {
				const eid = addEntity(world);
				createPanel(world, eid, { title: 'Old' });

				setPanelTitle(world, eid, 'New');

				expect(getPanelTitle(world, eid)).toBe('New');
			});

			it('returns entity ID for chaining', () => {
				const eid = addEntity(world);
				createPanel(world, eid);

				const result = setPanelTitle(world, eid, 'Test');
				expect(result).toBe(eid);
			});
		});

		describe('isPanelCollapsed', () => {
			it('returns the collapsed state', () => {
				const eid1 = addEntity(world);
				const eid2 = addEntity(world);

				createPanel(world, eid1, { collapsible: true, collapsed: true, height: 15 });
				createPanel(world, eid2, { collapsible: true, collapsed: false });

				expect(isPanelCollapsed(world, eid1)).toBe(true);
				expect(isPanelCollapsed(world, eid2)).toBe(false);
			});
		});

		describe('getPanelTitleAlign', () => {
			it('returns the title alignment', () => {
				const eid1 = addEntity(world);
				const eid2 = addEntity(world);
				const eid3 = addEntity(world);

				createPanel(world, eid1, { titleAlign: 'left' });
				createPanel(world, eid2, { titleAlign: 'center' });
				createPanel(world, eid3, { titleAlign: 'right' });

				expect(getPanelTitleAlign(world, eid1)).toBe('left');
				expect(getPanelTitleAlign(world, eid2)).toBe('center');
				expect(getPanelTitleAlign(world, eid3)).toBe('right');
			});
		});

		describe('renderPanelTitleBar', () => {
			it('renders title with left alignment', () => {
				const eid = addEntity(world);
				createPanel(world, eid, { title: 'Test', titleAlign: 'left' });

				const bar = renderPanelTitleBar(world, eid, 20);
				expect(bar.startsWith('Test')).toBe(true);
			});

			it('renders title with center alignment', () => {
				const eid = addEntity(world);
				createPanel(world, eid, { title: 'Test', titleAlign: 'center' });

				const bar = renderPanelTitleBar(world, eid, 20);
				const titleStart = bar.indexOf('Test');
				expect(titleStart).toBeGreaterThan(0);
			});

			it('renders title with right alignment', () => {
				const eid = addEntity(world);
				createPanel(world, eid, { title: 'Test', titleAlign: 'right' });

				const bar = renderPanelTitleBar(world, eid, 20);
				expect(bar.trimEnd().endsWith('Test')).toBe(true);
			});

			it('includes close button when closable', () => {
				const eid = addEntity(world);
				createPanel(world, eid, { title: 'Test', closable: true });

				const bar = renderPanelTitleBar(world, eid, 30);
				expect(bar).toContain(CLOSE_BUTTON_CHAR);
			});

			it('includes collapse button when collapsible and expanded', () => {
				const eid = addEntity(world);
				createPanel(world, eid, { title: 'Test', collapsible: true });

				const bar = renderPanelTitleBar(world, eid, 30);
				expect(bar).toContain(COLLAPSE_CHAR);
			});

			it('includes expand button when collapsible and collapsed', () => {
				const eid = addEntity(world);
				createPanel(world, eid, { title: 'Test', collapsible: true, collapsed: true, height: 15 });

				const bar = renderPanelTitleBar(world, eid, 30);
				expect(bar).toContain(EXPAND_CHAR);
			});

			it('truncates long titles', () => {
				const eid = addEntity(world);
				createPanel(world, eid, { title: 'This is a very long title that needs truncation' });

				const bar = renderPanelTitleBar(world, eid, 15);
				expect(bar.length).toBe(15);
				expect(bar).toContain('…');
			});
		});
	});

	describe('method chaining', () => {
		it('supports full method chaining', () => {
			const eid = addEntity(world);
			const panel = createPanel(world, eid, {
				left: 0,
				top: 0,
				width: 40,
				height: 15,
				collapsible: true,
			});

			panel
				.setPosition(10, 10)
				.move(5, 5)
				.setTitle('Chained Title')
				.setContent('Chained Content')
				.collapse()
				.expand()
				.show();

			const pos = getPosition(world, eid);
			expect(pos?.x).toBe(15);
			expect(pos?.y).toBe(15);
			expect(panel.getTitle()).toBe('Chained Title');
			expect(panel.getContent()).toBe('Chained Content');
			expect(panel.isCollapsed()).toBe(false);
		});
	});
});
