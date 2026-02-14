/**
 * Tests for Gauge widget.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getContent } from '../components/content';
import { getDimensions } from '../components/dimensions';
import { getPosition } from '../components/position';
import { createWorld } from '../core/ecs';
import type { World } from '../core/types';
import { createGauge, Gauge, GaugeConfigSchema, isGauge, resetGaugeStore } from './gauge';

describe('Gauge widget', () => {
	let world: World;

	beforeEach(() => {
		world = createWorld();
		resetGaugeStore();
	});

	afterEach(() => {
		resetGaugeStore();
	});

	describe('GaugeConfigSchema', () => {
		it('validates empty config', () => {
			const result = GaugeConfigSchema.safeParse({});
			expect(result.success).toBe(true);
		});

		it('validates position values', () => {
			const result = GaugeConfigSchema.safeParse({
				x: 10,
				y: 20,
			});
			expect(result.success).toBe(true);
		});

		it('validates dimensions', () => {
			const result = GaugeConfigSchema.safeParse({
				width: 30,
				height: 2,
			});
			expect(result.success).toBe(true);
		});

		it('rejects negative dimensions', () => {
			const result = GaugeConfigSchema.safeParse({
				width: -1,
				height: -1,
			});
			expect(result.success).toBe(false);
		});

		it('validates value between 0 and 1', () => {
			const result = GaugeConfigSchema.safeParse({
				value: 0.75,
			});
			expect(result.success).toBe(true);
		});

		it('rejects value > 1', () => {
			const result = GaugeConfigSchema.safeParse({
				value: 1.5,
			});
			expect(result.success).toBe(false);
		});

		it('rejects negative value', () => {
			const result = GaugeConfigSchema.safeParse({
				value: -0.5,
			});
			expect(result.success).toBe(false);
		});

		it('validates label', () => {
			const result = GaugeConfigSchema.safeParse({
				label: 'CPU Usage',
			});
			expect(result.success).toBe(true);
		});

		it('validates custom characters', () => {
			const result = GaugeConfigSchema.safeParse({
				fillChar: '▓',
				emptyChar: '▒',
			});
			expect(result.success).toBe(true);
		});

		it('rejects multi-character fillChar', () => {
			const result = GaugeConfigSchema.safeParse({
				fillChar: '▓▓',
			});
			expect(result.success).toBe(false);
		});

		it('validates colors', () => {
			const result = GaugeConfigSchema.safeParse({
				fillColor: '#00ff00',
				emptyColor: 0xff808080,
			});
			expect(result.success).toBe(true);
		});

		it('validates boolean flags', () => {
			const result = GaugeConfigSchema.safeParse({
				showPercentage: true,
				showValue: false,
			});
			expect(result.success).toBe(true);
		});

		it('validates thresholds', () => {
			const result = GaugeConfigSchema.safeParse({
				thresholds: [
					{ value: 0.7, color: '#ff9800' },
					{ value: 0.9, color: '#f44336' },
				],
			});
			expect(result.success).toBe(true);
		});

		it('rejects invalid threshold value', () => {
			const result = GaugeConfigSchema.safeParse({
				thresholds: [{ value: 1.5, color: '#ff0000' }],
			});
			expect(result.success).toBe(false);
		});

		it('validates min/max range', () => {
			const result = GaugeConfigSchema.safeParse({
				min: 0,
				max: 100,
			});
			expect(result.success).toBe(true);
		});
	});

	describe('createGauge', () => {
		it('creates gauge with default config', () => {
			const widget = createGauge(world);
			expect(widget.eid).toBeGreaterThanOrEqual(0);
		});

		it('sets position correctly', () => {
			const widget = createGauge(world, { x: 10, y: 5 });
			const pos = getPosition(world, widget.eid);
			expect(pos?.x).toBe(10);
			expect(pos?.y).toBe(5);
		});

		it('sets dimensions correctly', () => {
			const widget = createGauge(world, { width: 40, height: 2 });
			const dims = getDimensions(world, widget.eid);
			expect(dims?.width).toBe(40);
			expect(dims?.height).toBe(2);
		});

		it('sets value correctly', () => {
			const widget = createGauge(world, { value: 0.75 });
			expect(widget.getValue()).toBe(0.75);
		});

		it('sets label correctly', () => {
			const widget = createGauge(world, { label: 'CPU' });
			expect(widget.getLabel()).toBe('CPU');
		});

		it('sets showPercentage flag', () => {
			const widget = createGauge(world, { showPercentage: false });
			expect(Gauge.showPercentage[widget.eid]).toBe(0);
		});

		it('sets showValue flag', () => {
			const widget = createGauge(world, { showValue: true });
			expect(Gauge.showValue[widget.eid]).toBe(1);
		});

		it('renders content on creation', () => {
			const widget = createGauge(world, { value: 0.5, width: 20 });
			const content = getContent(world, widget.eid);
			expect(content).toBeDefined();
			expect(content?.length).toBeGreaterThan(0);
		});
	});

	describe('isGauge', () => {
		it('returns true for gauge widget', () => {
			const widget = createGauge(world);
			expect(isGauge(world, widget.eid)).toBe(true);
		});

		it('returns false for non-gauge entity', () => {
			expect(isGauge(world, 999)).toBe(false);
		});
	});

	describe('Widget methods', () => {
		describe('setValue', () => {
			it('updates value', () => {
				const widget = createGauge(world, { value: 0.5 });
				widget.setValue(0.75);
				expect(widget.getValue()).toBe(0.75);
			});

			it('clamps value to 0-1 range', () => {
				const widget = createGauge(world);
				widget.setValue(1.5);
				expect(widget.getValue()).toBe(1);
				widget.setValue(-0.5);
				expect(widget.getValue()).toBe(0);
			});

			it('updates rendered content', () => {
				const widget = createGauge(world, { value: 0.2, width: 20 });
				const content1 = getContent(world, widget.eid);
				widget.setValue(0.8);
				const content2 = getContent(world, widget.eid);
				expect(content1).not.toBe(content2);
			});

			it('returns widget for chaining', () => {
				const widget = createGauge(world);
				const result = widget.setValue(0.5);
				expect(result).toBe(widget);
			});
		});

		describe('getValue', () => {
			it('returns current value', () => {
				const widget = createGauge(world, { value: 0.75 });
				expect(widget.getValue()).toBe(0.75);
			});

			it('returns default value for no config', () => {
				const widget = createGauge(world);
				expect(widget.getValue()).toBe(0);
			});
		});

		describe('setLabel', () => {
			it('updates label', () => {
				const widget = createGauge(world, { label: 'CPU' });
				widget.setLabel('Memory');
				expect(widget.getLabel()).toBe('Memory');
			});

			it('updates rendered content', () => {
				const widget = createGauge(world, { label: 'CPU', width: 20 });
				const content1 = getContent(world, widget.eid);
				widget.setLabel('Memory');
				const content2 = getContent(world, widget.eid);
				expect(content1).not.toBe(content2);
			});

			it('returns widget for chaining', () => {
				const widget = createGauge(world);
				const result = widget.setLabel('Test');
				expect(result).toBe(widget);
			});
		});

		describe('getLabel', () => {
			it('returns current label', () => {
				const widget = createGauge(world, { label: 'CPU Usage' });
				expect(widget.getLabel()).toBe('CPU Usage');
			});

			it('returns empty string for no label', () => {
				const widget = createGauge(world);
				expect(widget.getLabel()).toBe('');
			});
		});

		describe('setPosition', () => {
			it('updates position', () => {
				const widget = createGauge(world, { x: 0, y: 0 });
				widget.setPosition(10, 20);
				const pos = getPosition(world, widget.eid);
				expect(pos?.x).toBe(10);
				expect(pos?.y).toBe(20);
			});

			it('returns widget for chaining', () => {
				const widget = createGauge(world);
				const result = widget.setPosition(5, 5);
				expect(result).toBe(widget);
			});
		});

		describe('destroy', () => {
			it('clears component flags', () => {
				const widget = createGauge(world, { showPercentage: true, showValue: true });
				widget.destroy();
				expect(Gauge.isGauge[widget.eid]).toBe(0);
				expect(Gauge.showPercentage[widget.eid]).toBe(0);
				expect(Gauge.showValue[widget.eid]).toBe(0);
			});

			it('clears data from map', () => {
				const widget = createGauge(world, { value: 0.75, label: 'CPU' });
				widget.destroy();
				expect(widget.getValue()).toBe(0);
				expect(widget.getLabel()).toBe('');
			});
		});
	});

	describe('Rendering', () => {
		describe('Basic rendering', () => {
			it('renders empty gauge', () => {
				const widget = createGauge(world, { value: 0, width: 20 });
				const content = getContent(world, widget.eid);
				expect(content).toBeDefined();
				expect(content?.length).toBeGreaterThan(0);
			});

			it('renders half-filled gauge', () => {
				const widget = createGauge(world, { value: 0.5, width: 20 });
				const content = getContent(world, widget.eid);
				expect(content).toBeDefined();
				// Should contain both fill and empty characters
				expect(content).toContain('█');
				expect(content).toContain('░');
			});

			it('renders full gauge', () => {
				const widget = createGauge(world, { value: 1, width: 20 });
				const content = getContent(world, widget.eid);
				expect(content).toBeDefined();
				expect(content).toContain('█');
			});

			it('uses custom fill character', () => {
				const widget = createGauge(world, { value: 0.5, width: 20, fillChar: '▓' });
				const content = getContent(world, widget.eid);
				expect(content).toContain('▓');
			});

			it('uses custom empty character', () => {
				const widget = createGauge(world, { value: 0.5, width: 20, emptyChar: '▒' });
				const content = getContent(world, widget.eid);
				expect(content).toContain('▒');
			});
		});

		describe('Single line (height=1)', () => {
			it('renders label on single line', () => {
				const widget = createGauge(world, {
					value: 0.5,
					label: 'CPU',
					width: 20,
					height: 1,
				});
				const content = getContent(world, widget.eid);
				expect(content).toContain('CPU');
			});

			it('renders percentage on single line', () => {
				const widget = createGauge(world, {
					value: 0.75,
					showPercentage: true,
					width: 20,
					height: 1,
				});
				const content = getContent(world, widget.eid);
				expect(content).toContain('75%');
			});

			it('overlays text on gauge bar', () => {
				const widget = createGauge(world, {
					value: 0.5,
					label: 'CPU',
					width: 30,
					height: 1,
				});
				const content = getContent(world, widget.eid);
				// Content should contain both bar characters and text
				expect(content).toBeDefined();
				expect(content?.length).toBe(30);
			});
		});

		describe('Multi-line (height>1)', () => {
			it('renders bar on first line', () => {
				const widget = createGauge(world, {
					value: 0.5,
					width: 20,
					height: 2,
				});
				const content = getContent(world, widget.eid);
				const lines = content?.split('\n');
				expect(lines?.[0]).toContain('█');
			});

			it('renders label on second line', () => {
				const widget = createGauge(world, {
					value: 0.5,
					label: 'CPU',
					width: 20,
					height: 2,
				});
				const content = getContent(world, widget.eid);
				const lines = content?.split('\n');
				expect(lines?.[1]).toContain('CPU');
			});

			it('pads to full height', () => {
				const widget = createGauge(world, {
					value: 0.5,
					width: 20,
					height: 3,
				});
				const content = getContent(world, widget.eid);
				const lines = content?.split('\n');
				expect(lines).toHaveLength(3);
			});
		});

		describe('Percentage display', () => {
			it('shows percentage when enabled', () => {
				const widget = createGauge(world, {
					value: 0.75,
					showPercentage: true,
					width: 20,
				});
				const content = getContent(world, widget.eid);
				expect(content).toContain('75%');
			});

			it('hides percentage when disabled', () => {
				const widget = createGauge(world, {
					value: 0.75,
					showPercentage: false,
					width: 20,
				});
				const content = getContent(world, widget.eid);
				expect(content).not.toContain('%');
			});

			it('combines label and percentage', () => {
				const widget = createGauge(world, {
					value: 0.5,
					label: 'CPU',
					showPercentage: true,
					width: 30,
				});
				const content = getContent(world, widget.eid);
				expect(content).toContain('CPU');
				expect(content).toContain('50%');
			});
		});

		describe('Value display', () => {
			it('shows value when enabled', () => {
				const widget = createGauge(world, {
					value: 0.75,
					min: 0,
					max: 100,
					showValue: true,
					width: 30,
				});
				const content = getContent(world, widget.eid);
				expect(content).toContain('75.0');
				expect(content).toContain('100');
			});

			it('hides value when disabled', () => {
				const widget = createGauge(world, {
					value: 0.75,
					min: 0,
					max: 100,
					showValue: false,
					width: 30,
				});
				const content = getContent(world, widget.eid);
				expect(content).not.toContain('75.0');
			});

			it('calculates actual value from min/max', () => {
				const widget = createGauge(world, {
					value: 0.5,
					min: 0,
					max: 200,
					showValue: true,
					width: 30,
				});
				const content = getContent(world, widget.eid);
				expect(content).toContain('100.0');
			});
		});

		describe('Thresholds', () => {
			it('changes color based on threshold', () => {
				const widget = createGauge(world, {
					value: 0.8,
					thresholds: [
						{ value: 0.7, color: '#ff9800' },
						{ value: 0.9, color: '#f44336' },
					],
					width: 20,
				});
				const content = getContent(world, widget.eid);
				expect(content).toBeDefined();
			});

			it('uses highest matching threshold', () => {
				const widget = createGauge(world, {
					value: 0.95,
					thresholds: [
						{ value: 0.5, color: '#ffff00' },
						{ value: 0.7, color: '#ff9800' },
						{ value: 0.9, color: '#f44336' },
					],
					width: 20,
				});
				const content = getContent(world, widget.eid);
				expect(content).toBeDefined();
			});

			it('uses default color when no threshold met', () => {
				const widget = createGauge(world, {
					value: 0.3,
					fillColor: '#00ff00',
					thresholds: [{ value: 0.5, color: '#ff0000' }],
					width: 20,
				});
				const content = getContent(world, widget.eid);
				expect(content).toBeDefined();
			});
		});

		describe('Width variations', () => {
			it('renders at small width', () => {
				const widget = createGauge(world, { value: 0.5, width: 5 });
				const content = getContent(world, widget.eid);
				expect(content?.length).toBeGreaterThanOrEqual(5);
			});

			it('renders at large width', () => {
				const widget = createGauge(world, { value: 0.5, width: 80 });
				const content = getContent(world, widget.eid);
				expect(content).toBeDefined();
			});

			it('calculates fill width correctly', () => {
				const widget = createGauge(world, { value: 0.5, width: 20, showPercentage: false });
				const content = getContent(world, widget.eid);
				// At 0.5, should have 10 filled characters (half of 20)
				const fillCount = (content?.match(/█/g) || []).length;
				// Should be exactly 10 filled characters
				expect(fillCount).toBe(10);
			});
		});

		describe('Value edge cases', () => {
			it('renders 0% correctly', () => {
				const widget = createGauge(world, { value: 0, width: 20 });
				const content = getContent(world, widget.eid);
				expect(content).not.toContain('█');
				expect(content).toContain('░');
			});

			it('renders 100% correctly', () => {
				const widget = createGauge(world, { value: 1, width: 20 });
				const content = getContent(world, widget.eid);
				expect(content).toContain('█');
				expect(content).not.toContain('░');
			});

			it('renders 1% correctly', () => {
				const widget = createGauge(world, { value: 0.01, width: 100 });
				const content = getContent(world, widget.eid);
				const fillCount = (content?.match(/█/g) || []).length;
				expect(fillCount).toBeGreaterThanOrEqual(1);
			});

			it('renders 99% correctly', () => {
				const widget = createGauge(world, { value: 0.99, width: 100 });
				const content = getContent(world, widget.eid);
				const emptyCount = (content?.match(/░/g) || []).length;
				expect(emptyCount).toBeGreaterThanOrEqual(1);
			});
		});
	});

	describe('Edge cases', () => {
		it('handles very long labels', () => {
			const widget = createGauge(world, {
				value: 0.5,
				label: 'Very Long Label That Might Overflow',
				width: 20,
			});
			const content = getContent(world, widget.eid);
			expect(content).toBeDefined();
		});

		it('handles empty label', () => {
			const widget = createGauge(world, { value: 0.5, label: '', width: 20 });
			const content = getContent(world, widget.eid);
			expect(content).toBeDefined();
		});

		it('handles label with special characters', () => {
			const widget = createGauge(world, {
				value: 0.5,
				label: '🔥 CPU 🔥',
				width: 20,
			});
			const content = getContent(world, widget.eid);
			expect(content).toBeDefined();
		});

		it('handles all percentage/value combinations', () => {
			const widget = createGauge(world, {
				value: 0.75,
				label: 'CPU',
				showPercentage: true,
				showValue: true,
				min: 0,
				max: 100,
				width: 40,
			});
			const content = getContent(world, widget.eid);
			expect(content).toContain('CPU');
			expect(content).toContain('75%');
			expect(content).toContain('75.0');
		});

		it('handles very small width with text', () => {
			const widget = createGauge(world, {
				value: 0.5,
				label: 'CPU',
				showPercentage: true,
				width: 3,
			});
			const content = getContent(world, widget.eid);
			expect(content).toBeDefined();
		});
	});

	describe('resetGaugeStore', () => {
		it('clears all gauge data', () => {
			const widget1 = createGauge(world, { showPercentage: true });
			const widget2 = createGauge(world, { showValue: true });

			resetGaugeStore();

			expect(Gauge.isGauge[widget1.eid]).toBe(0);
			expect(Gauge.isGauge[widget2.eid]).toBe(0);
			expect(Gauge.showPercentage[widget1.eid]).toBe(0);
			expect(Gauge.showValue[widget2.eid]).toBe(0);
		});
	});
});
