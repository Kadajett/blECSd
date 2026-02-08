/**
 * Tests for the theme system
 * @module style/theme.test
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { Renderable } from '../components/renderable';
import { addEntity, createWorld, hasComponent } from '../core/ecs';
import type { World } from '../core/types';
import { packColor } from '../utils/color';
import {
	applyTheme,
	applyThemeToAll,
	createDarkTheme,
	createDefaultTheme,
	createHighContrastTheme,
	createLightTheme,
	createTheme,
	getActiveTheme,
	getTheme,
	mergeThemes,
	registerTheme,
	resetThemeRegistry,
	setActiveTheme,
	type Theme,
} from './theme';

describe('Theme System', () => {
	let world: World;

	beforeEach(() => {
		world = createWorld();
		resetThemeRegistry();
	});

	describe('Built-in Themes', () => {
		it('creates default theme with correct structure', () => {
			const theme = createDefaultTheme();

			expect(theme.name).toBe('default');
			expect(theme.colors).toBeDefined();
			expect(theme.borders).toBeDefined();
			expect(theme.focus).toBeDefined();
			expect(theme.widgets).toBeDefined();

			// Check colors
			expect(typeof theme.colors.primary).toBe('number');
			expect(typeof theme.colors.secondary).toBe('number');
			expect(typeof theme.colors.accent).toBe('number');
			expect(typeof theme.colors.background).toBe('number');
			expect(typeof theme.colors.foreground).toBe('number');
			expect(typeof theme.colors.error).toBe('number');
			expect(typeof theme.colors.warning).toBe('number');
			expect(typeof theme.colors.success).toBe('number');
			expect(typeof theme.colors.info).toBe('number');
			expect(typeof theme.colors.muted).toBe('number');
			expect(typeof theme.colors.border).toBe('number');

			// Check borders
			expect(theme.borders.style).toBe('single');
			expect(typeof theme.borders.fg).toBe('number');
			expect(typeof theme.borders.bg).toBe('number');

			// Check focus
			expect(typeof theme.focus.fg).toBe('number');
			expect(typeof theme.focus.bg).toBe('number');
			expect(typeof theme.focus.borderFg).toBe('number');

			// Check widget styles
			expect(theme.widgets.button).toBeDefined();
			expect(theme.widgets.input).toBeDefined();
			expect(theme.widgets.list).toBeDefined();
			expect(theme.widgets.panel).toBeDefined();
		});

		it('creates dark theme with darker colors', () => {
			const theme = createDarkTheme();

			expect(theme.name).toBe('dark');
			expect(theme.colors).toBeDefined();

			// Dark theme should have a dark background
			const { r, g, b } = unpackColor(theme.colors.background);
			expect(r + g + b).toBeLessThan(100); // Very dark
		});

		it('creates light theme with lighter colors', () => {
			const theme = createLightTheme();

			expect(theme.name).toBe('light');
			expect(theme.colors).toBeDefined();

			// Light theme should have a light background
			const { r, g, b } = unpackColor(theme.colors.background);
			expect(r + g + b).toBeGreaterThan(600); // Very light
		});

		it('creates high contrast theme with maximum contrast', () => {
			const theme = createHighContrastTheme();

			expect(theme.name).toBe('high-contrast');
			expect(theme.colors).toBeDefined();

			// High contrast should use pure black and white
			const bg = unpackColor(theme.colors.background);
			const fg = unpackColor(theme.colors.foreground);

			// Background should be black
			expect(bg.r + bg.g + bg.b).toBe(0);

			// Foreground should be white
			expect(fg.r + fg.g + fg.b).toBe(765); // 255 * 3
		});
	});

	describe('Theme Registry', () => {
		it('registers a theme', () => {
			const theme = createDefaultTheme();
			registerTheme(theme);

			const retrieved = getTheme('default');
			expect(retrieved).toBeDefined();
			expect(retrieved?.name).toBe('default');
		});

		it('retrieves undefined for unregistered theme', () => {
			const retrieved = getTheme('nonexistent');
			expect(retrieved).toBeUndefined();
		});

		it('overwrites existing theme with same name', () => {
			const theme1 = createDefaultTheme();
			registerTheme(theme1);

			const theme2: Theme = {
				...theme1,
				colors: { ...theme1.colors, primary: packColor(255, 0, 0) },
			};
			registerTheme(theme2);

			const retrieved = getTheme('default');
			expect(retrieved?.colors.primary).toBe(packColor(255, 0, 0));
		});

		it('resets theme registry', () => {
			registerTheme(createDefaultTheme());
			registerTheme(createDarkTheme());

			resetThemeRegistry();

			expect(getTheme('default')).toBeUndefined();
			expect(getTheme('dark')).toBeUndefined();
		});
	});

	describe('Active Theme', () => {
		beforeEach(() => {
			registerTheme(createDefaultTheme());
			registerTheme(createDarkTheme());
		});

		it('sets and gets active theme', () => {
			setActiveTheme(world, 'dark');
			const active = getActiveTheme(world);

			expect(active.name).toBe('dark');
		});

		it('defaults to "default" theme when none set', () => {
			const active = getActiveTheme(world);
			expect(active.name).toBe('default');
		});

		it('throws when setting unregistered theme', () => {
			expect(() => {
				setActiveTheme(world, 'nonexistent');
			}).toThrow();
		});

		it('throws when getting active theme with no registered themes', () => {
			resetThemeRegistry();

			expect(() => {
				getActiveTheme(world);
			}).toThrow();
		});
	});

	describe('Custom Themes', () => {
		it('creates custom theme with full color override', () => {
			const base = createDefaultTheme();
			const custom = createTheme('custom', {
				colors: {
					...base.colors,
					primary: packColor(255, 0, 0),
				},
			});

			expect(custom.name).toBe('custom');
			expect(custom.colors.primary).toBe(packColor(255, 0, 0));

			// Other colors should use defaults
			expect(custom.colors.secondary).toBe(base.colors.secondary);
			expect(custom.colors.background).toBe(base.colors.background);
		});

		it('merges themes preserving base values', () => {
			const base = createDefaultTheme();
			const override: Partial<Omit<Theme, 'name'>> = {
				colors: {
					...base.colors,
					primary: packColor(0, 255, 0),
					accent: packColor(0, 0, 255),
				},
			};

			const merged = mergeThemes(base, override);

			expect(merged.colors.primary).toBe(packColor(0, 255, 0));
			expect(merged.colors.accent).toBe(packColor(0, 0, 255));
			expect(merged.colors.secondary).toBe(base.colors.secondary);
			expect(merged.colors.background).toBe(base.colors.background);
		});

		it('merges nested properties correctly', () => {
			const base = createDefaultTheme();
			const override: Partial<Omit<Theme, 'name'>> = {
				borders: {
					...base.borders,
					style: 'double' as const,
				},
			};

			const merged = mergeThemes(base, override);

			expect(merged.borders.style).toBe('double');
			expect(merged.borders.fg).toBe(base.borders.fg);
			expect(merged.borders.bg).toBe(base.borders.bg);
		});
	});

	describe('Theme Application', () => {
		let entity: number;

		beforeEach(() => {
			registerTheme(createDefaultTheme());
			setActiveTheme(world, 'default');
			entity = addEntity(world);
		});

		it('applies theme to entity', () => {
			applyTheme(world, entity);

			expect(hasComponent(world, entity, Renderable)).toBe(true);

			const theme = getActiveTheme(world);
			expect(Renderable.fg[entity]).toBe(theme.colors.foreground);
			expect(Renderable.bg[entity]).toBe(theme.colors.background);
		});

		it('marks entity dirty after theme application', () => {
			applyTheme(world, entity);

			expect(Renderable.dirty[entity]).toBe(1);
		});

		it('applies theme to all entities with Renderable', () => {
			const entity1 = addEntity(world);
			const entity2 = addEntity(world);
			const entity3 = addEntity(world);

			// Apply theme to some entities first
			applyTheme(world, entity1);
			applyTheme(world, entity2);

			// entity3 has no Renderable
			expect(hasComponent(world, entity3, Renderable)).toBe(false);

			// Switch theme
			registerTheme(createDarkTheme());
			setActiveTheme(world, 'dark');

			applyThemeToAll(world);

			// Check all entities with Renderable got updated
			const darkTheme = getActiveTheme(world);
			expect(Renderable.fg[entity1]).toBe(darkTheme.colors.foreground);
			expect(Renderable.fg[entity2]).toBe(darkTheme.colors.foreground);

			// entity3 should still not have Renderable
			expect(hasComponent(world, entity3, Renderable)).toBe(false);

			// All should be dirty
			expect(Renderable.dirty[entity1]).toBe(1);
			expect(Renderable.dirty[entity2]).toBe(1);
		});
	});

	describe('Theme Validation', () => {
		it('validates theme structure with Zod', () => {
			const invalidTheme = {
				name: 'invalid',
				colors: {
					primary: 'not-a-number', // Invalid
				},
			} as unknown as Theme;

			expect(() => {
				registerTheme(invalidTheme);
			}).toThrow();
		});

		it('validates border style enum', () => {
			const invalidBorder = {
				...createDefaultTheme(),
				borders: {
					style: 'invalid-style' as 'single',
					fg: packColor(255, 255, 255),
					bg: packColor(0, 0, 0),
				},
			};

			expect(() => {
				registerTheme(invalidBorder);
			}).toThrow();
		});
	});
});

// Helper to unpack color for testing
function unpackColor(color: number): { r: number; g: number; b: number; a: number } {
	return {
		r: (color >> 16) & 0xff,
		g: (color >> 8) & 0xff,
		b: color & 0xff,
		a: (color >> 24) & 0xff,
	};
}
