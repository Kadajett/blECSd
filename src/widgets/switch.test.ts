/**
 * Tests for Switch widget
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getContent } from '../components/content';
import { getDimensions } from '../components/dimensions';
import { getPosition } from '../components/position';
import { getStyle, isVisible } from '../components/renderable';
import type { World } from '../core/types';
import { createWorld } from '../core/world';
import { parseColor } from '../utils/color';
import {
	createSwitch,
	handleSwitchClick,
	handleSwitchKey,
	isSwitch,
	resetSwitchStore,
	type SwitchWidget,
} from './switch';

describe('Switch Widget', () => {
	let world: World;

	beforeEach(() => {
		world = createWorld();
		resetSwitchStore();
	});

	afterEach(() => {
		resetSwitchStore();
	});

	describe('createSwitch', () => {
		it('should create a switch with default config', () => {
			const sw = createSwitch(world);

			expect(isSwitch(world, sw.eid)).toBe(true);
			expect(sw.isChecked()).toBe(false);

			const content = getContent(world, sw.eid);
			expect(content).toBe(' OFF ');

			const pos = getPosition(world, sw.eid);
			expect(pos).toMatchObject({ x: 0, y: 0, z: 0 });
		});

		it('should create a checked switch', () => {
			const sw = createSwitch(world, { checked: true });

			expect(sw.isChecked()).toBe(true);

			const content = getContent(world, sw.eid);
			expect(content).toBe(' ON ');
		});

		it('should use custom labels', () => {
			const sw = createSwitch(world, {
				onLabel: 'Enabled',
				offLabel: 'Disabled',
				checked: false,
			});

			expect(getContent(world, sw.eid)).toBe(' Disabled ');

			sw.setChecked(true);
			expect(getContent(world, sw.eid)).toBe(' Enabled ');
		});

		it('should set position', () => {
			const sw = createSwitch(world, { x: 10, y: 5 });

			const pos = getPosition(world, sw.eid);
			expect(pos).toMatchObject({ x: 10, y: 5, z: 0 });
		});

		it('should set dimensions based on longest label', () => {
			const sw = createSwitch(world, {
				onLabel: 'ON',
				offLabel: 'DISABLED',
			});

			const dims = getDimensions(world, sw.eid);
			expect(dims).toMatchObject({ width: 10, height: 1 }); // "DISABLED" (8) + 2 padding
		});

		it('should apply on/off colors', () => {
			const sw = createSwitch(world, {
				checked: false,
				onFg: '#ff0000',
				onBg: '#00ff00',
				offFg: '#0000ff',
				offBg: '#ffff00',
			});

			// Check off colors
			let style = getStyle(world, sw.eid);
			expect(style?.fg).toBe(parseColor('#0000ff'));
			expect(style?.bg).toBe(parseColor('#ffff00'));

			// Toggle to on
			sw.setChecked(true);
			style = getStyle(world, sw.eid);
			expect(style?.fg).toBe(parseColor('#ff0000'));
			expect(style?.bg).toBe(parseColor('#00ff00'));
		});

		it('should be visible by default', () => {
			const sw = createSwitch(world);
			expect(isVisible(world, sw.eid)).toBe(true);
		});

		it('should respect visible config', () => {
			const sw = createSwitch(world, { visible: false });
			expect(isVisible(world, sw.eid)).toBe(false);
		});
	});

	describe('toggle', () => {
		it('should toggle from off to on', () => {
			const sw = createSwitch(world, { checked: false });

			expect(sw.isChecked()).toBe(false);
			sw.toggle();
			expect(sw.isChecked()).toBe(true);
		});

		it('should toggle from on to off', () => {
			const sw = createSwitch(world, { checked: true });

			expect(sw.isChecked()).toBe(true);
			sw.toggle();
			expect(sw.isChecked()).toBe(false);
		});

		it('should update visual state when toggled', () => {
			const sw = createSwitch(world, {
				checked: false,
				onLabel: 'YES',
				offLabel: 'NO',
			});

			expect(getContent(world, sw.eid)).toBe(' NO ');

			sw.toggle();
			expect(getContent(world, sw.eid)).toBe(' YES ');
		});
	});

	describe('setChecked', () => {
		it('should set checked state', () => {
			const sw = createSwitch(world, { checked: false });

			sw.setChecked(true);
			expect(sw.isChecked()).toBe(true);

			sw.setChecked(false);
			expect(sw.isChecked()).toBe(false);
		});

		it('should return the widget for chaining', () => {
			const sw = createSwitch(world);
			const result = sw.setChecked(true);
			expect(result).toBe(sw);
		});
	});

	describe('labels', () => {
		it('should get on/off labels', () => {
			const sw = createSwitch(world, {
				onLabel: 'Active',
				offLabel: 'Inactive',
			});

			expect(sw.getOnLabel()).toBe('Active');
			expect(sw.getOffLabel()).toBe('Inactive');
		});

		it('should set on label', () => {
			const sw = createSwitch(world, { checked: true });

			sw.setOnLabel('Enabled');
			expect(sw.getOnLabel()).toBe('Enabled');
			expect(getContent(world, sw.eid)).toBe(' Enabled ');
		});

		it('should set off label', () => {
			const sw = createSwitch(world, { checked: false });

			sw.setOffLabel('Disabled');
			expect(sw.getOffLabel()).toBe('Disabled');
			expect(getContent(world, sw.eid)).toBe(' Disabled ');
		});

		it('should return widget for chaining', () => {
			const sw = createSwitch(world);

			const result1 = sw.setOnLabel('YES');
			expect(result1).toBe(sw);

			const result2 = sw.setOffLabel('NO');
			expect(result2).toBe(sw);
		});
	});

	describe('onChange callback', () => {
		it('should call onChange when toggled', () => {
			const sw = createSwitch(world, { checked: false });
			const callback = vi.fn();

			sw.onChange(callback);
			sw.toggle();

			expect(callback).toHaveBeenCalledOnce();
			expect(callback).toHaveBeenCalledWith(true);
		});

		it('should call onChange when setChecked changes state', () => {
			const sw = createSwitch(world, { checked: false });
			const callback = vi.fn();

			sw.onChange(callback);
			sw.setChecked(true);

			expect(callback).toHaveBeenCalledOnce();
			expect(callback).toHaveBeenCalledWith(true);
		});

		it('should not call onChange when setChecked does not change state', () => {
			const sw = createSwitch(world, { checked: true });
			const callback = vi.fn();

			sw.onChange(callback);
			sw.setChecked(true); // Already true

			expect(callback).not.toHaveBeenCalled();
		});

		it('should return widget for chaining', () => {
			const sw = createSwitch(world);
			const result = sw.onChange(() => {});
			expect(result).toBe(sw);
		});
	});

	describe('visibility', () => {
		it('should show the switch', () => {
			const sw = createSwitch(world, { visible: false });

			sw.show();
			expect(isVisible(world, sw.eid)).toBe(true);
		});

		it('should hide the switch', () => {
			const sw = createSwitch(world, { visible: true });

			sw.hide();
			expect(isVisible(world, sw.eid)).toBe(false);
		});

		it('should return widget for chaining', () => {
			const sw = createSwitch(world);

			const result1 = sw.show();
			expect(result1).toBe(sw);

			const result2 = sw.hide();
			expect(result2).toBe(sw);
		});
	});

	describe('setPosition', () => {
		it('should set position', () => {
			const sw = createSwitch(world, { x: 0, y: 0 });

			sw.setPosition(20, 10);

			const pos = getPosition(world, sw.eid);
			expect(pos).toMatchObject({ x: 20, y: 10, z: 0 });
		});

		it('should return widget for chaining', () => {
			const sw = createSwitch(world);
			const result = sw.setPosition(5, 5);
			expect(result).toBe(sw);
		});
	});

	describe('handleSwitchKey', () => {
		let sw: SwitchWidget;
		let callback: ReturnType<typeof vi.fn<(checked: boolean) => void>>;

		beforeEach(() => {
			sw = createSwitch(world, { checked: false });
			callback = vi.fn<(checked: boolean) => void>();
			sw.onChange(callback);
		});

		it('should toggle on Space key', () => {
			const handled = handleSwitchKey(world, sw.eid, ' ');

			expect(handled).toBe(true);
			expect(sw.isChecked()).toBe(true);
			expect(callback).toHaveBeenCalledWith(true);
		});

		it('should toggle on Enter key', () => {
			const handled = handleSwitchKey(world, sw.eid, 'enter');

			expect(handled).toBe(true);
			expect(sw.isChecked()).toBe(true);
			expect(callback).toHaveBeenCalledWith(true);
		});

		it('should not toggle on other keys', () => {
			const handled = handleSwitchKey(world, sw.eid, 'a');

			expect(handled).toBe(false);
			expect(sw.isChecked()).toBe(false);
			expect(callback).not.toHaveBeenCalled();
		});

		it('should return false for non-switch entities', () => {
			const handled = handleSwitchKey(world, 999, ' ');
			expect(handled).toBe(false);
		});
	});

	describe('handleSwitchClick', () => {
		let sw: SwitchWidget;
		let callback: ReturnType<typeof vi.fn<(checked: boolean) => void>>;

		beforeEach(() => {
			sw = createSwitch(world, { checked: false });
			callback = vi.fn<(checked: boolean) => void>();
			sw.onChange(callback);
		});

		it('should toggle on click', () => {
			const handled = handleSwitchClick(world, sw.eid);

			expect(handled).toBe(true);
			expect(sw.isChecked()).toBe(true);
			expect(callback).toHaveBeenCalledWith(true);
		});

		it('should toggle from on to off', () => {
			sw.setChecked(true);
			callback.mockClear();

			const handled = handleSwitchClick(world, sw.eid);

			expect(handled).toBe(true);
			expect(sw.isChecked()).toBe(false);
			expect(callback).toHaveBeenCalledWith(false);
		});

		it('should return false for non-switch entities', () => {
			const handled = handleSwitchClick(world, 999);
			expect(handled).toBe(false);
		});
	});

	describe('destroy', () => {
		it('should clean up the switch', () => {
			const sw = createSwitch(world);

			sw.destroy();

			expect(isSwitch(world, sw.eid)).toBe(false);
		});
	});

	describe('isSwitch', () => {
		it('should return true for switch entities', () => {
			const sw = createSwitch(world);
			expect(isSwitch(world, sw.eid)).toBe(true);
		});

		it('should return false for non-switch entities', () => {
			expect(isSwitch(world, 999)).toBe(false);
		});
	});
});
