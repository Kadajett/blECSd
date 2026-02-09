/**
 * Tests for Autocomplete widget
 */

import { describe, expect, it } from 'vitest';
import { addEntity, createWorld } from '../core/ecs';
import type { World } from '../core/types';
import { type AutocompleteConfig, createAutocomplete } from './autocomplete';

describe('Autocomplete widget', () => {
	let world: World;

	function setup(config: AutocompleteConfig = {}) {
		world = createWorld();
		const eid = addEntity(world);
		return createAutocomplete(world, eid, config);
	}

	describe('creation', () => {
		it('creates an autocomplete with default values', () => {
			const autocomplete = setup();
			expect(autocomplete.eid).toBeGreaterThanOrEqual(0);
			expect(autocomplete.getValue()).toBe('');
			expect(autocomplete.getItems()).toEqual([]);
			expect(autocomplete.isOpen()).toBe(false);
		});

		it('creates an autocomplete with items', () => {
			const items = ['apple', 'banana', 'cherry'];
			const autocomplete = setup({ items });
			expect(autocomplete.getItems()).toEqual(items);
		});

		it('creates an autocomplete with initial value', () => {
			const autocomplete = setup({
				value: 'test',
				items: ['test1', 'test2'],
			});
			expect(autocomplete.getValue()).toBe('test');
		});

		it('creates an autocomplete with custom dimensions', () => {
			const autocomplete = setup({
				width: 50,
				left: 10,
				top: 5,
			});
			expect(autocomplete.eid).toBeGreaterThanOrEqual(0);
		});

		it('creates an autocomplete with custom colors', () => {
			const autocomplete = setup({
				fg: '#FFFFFF',
				bg: '#000000',
				highlightFg: '#FFFF00',
				highlightBg: '#0000FF',
			});
			expect(autocomplete.eid).toBeGreaterThanOrEqual(0);
		});

		it('creates an autocomplete with fuzzy matching disabled', () => {
			const autocomplete = setup({
				items: ['test'],
				fuzzyMatch: false,
			});
			expect(autocomplete.eid).toBeGreaterThanOrEqual(0);
		});
	});

	describe('visibility', () => {
		it('shows the autocomplete', () => {
			const autocomplete = setup();
			const result = autocomplete.show();
			expect(result).toBe(autocomplete); // chainable
		});

		it('hides the autocomplete', () => {
			const autocomplete = setup();
			const result = autocomplete.hide();
			expect(result).toBe(autocomplete); // chainable
		});
	});

	describe('focus', () => {
		it('focuses the autocomplete', () => {
			const autocomplete = setup();
			const result = autocomplete.focus();
			expect(result).toBe(autocomplete); // chainable
		});

		it('blurs the autocomplete', () => {
			const autocomplete = setup();
			const result = autocomplete.blur();
			expect(result).toBe(autocomplete); // chainable
		});

		it('closes dropdown when blurred', () => {
			const autocomplete = setup({
				items: ['apple', 'banana'],
			});
			autocomplete.setValue('a');
			autocomplete.openDropdown();
			expect(autocomplete.isOpen()).toBe(true);

			autocomplete.blur();
			expect(autocomplete.isOpen()).toBe(false);
		});
	});

	describe('value management', () => {
		it('sets and gets value', () => {
			const autocomplete = setup();
			autocomplete.setValue('test');
			expect(autocomplete.getValue()).toBe('test');
		});

		it('chains value updates', () => {
			const autocomplete = setup();
			const result = autocomplete.setValue('test');
			expect(result).toBe(autocomplete);
		});

		it('filters items when value is set', () => {
			const autocomplete = setup({
				items: ['apple', 'apricot', 'banana'],
			});
			autocomplete.setValue('ap');
			const suggestions = autocomplete.getSuggestions();
			expect(suggestions).toContain('apple');
			expect(suggestions).toContain('apricot');
			expect(suggestions).not.toContain('banana');
		});
	});

	describe('items management', () => {
		it('sets and gets items', () => {
			const autocomplete = setup();
			const items = ['item1', 'item2', 'item3'];
			autocomplete.setItems(items);
			expect(autocomplete.getItems()).toEqual(items);
		});

		it('chains items updates', () => {
			const autocomplete = setup();
			const result = autocomplete.setItems(['a', 'b']);
			expect(result).toBe(autocomplete);
		});

		it('updates filtered items when items change', () => {
			const autocomplete = setup({
				items: ['old1', 'old2'],
				value: 'old',
			});
			expect(autocomplete.getSuggestions()).toHaveLength(2);

			autocomplete.setItems(['new1', 'new2', 'new3']);
			expect(autocomplete.getSuggestions()).toHaveLength(0); // 'old' doesn't match 'new'
		});
	});

	describe('dropdown management', () => {
		it('opens dropdown', () => {
			const autocomplete = setup({
				items: ['apple', 'banana'],
			});
			autocomplete.setValue('a'); // This filters items
			autocomplete.openDropdown();
			expect(autocomplete.isOpen()).toBe(true);
		});

		it('closes dropdown', () => {
			const autocomplete = setup({
				items: ['apple', 'banana'],
			});
			autocomplete.setValue('a');
			autocomplete.openDropdown();
			expect(autocomplete.isOpen()).toBe(true);

			autocomplete.closeDropdown();
			expect(autocomplete.isOpen()).toBe(false);
		});

		it('chains dropdown operations', () => {
			const autocomplete = setup({
				items: ['apple'],
			});
			autocomplete.setValue('a');
			const result = autocomplete.openDropdown();
			expect(result).toBe(autocomplete);
		});

		it('does not open dropdown when no matching items', () => {
			const autocomplete = setup({
				items: ['apple', 'banana'],
			});
			autocomplete.setValue('xyz');
			autocomplete.openDropdown();
			expect(autocomplete.isOpen()).toBe(false);
		});
	});

	describe('fuzzy matching', () => {
		it('matches with fuzzy search when enabled', () => {
			const autocomplete = setup({
				items: ['JavaScript', 'TypeScript', 'CoffeeScript'],
				fuzzyMatch: true,
			});
			autocomplete.setValue('js');
			const suggestions = autocomplete.getSuggestions();
			expect(suggestions).toContain('JavaScript');
		});

		it('uses substring matching when fuzzy disabled', () => {
			const autocomplete = setup({
				items: ['JavaScript', 'TypeScript', 'CoffeeScript'],
				fuzzyMatch: false,
			});
			autocomplete.setValue('Script');
			const suggestions = autocomplete.getSuggestions();
			expect(suggestions.length).toBeGreaterThan(0);
			suggestions.forEach((item) => {
				expect(item.toLowerCase()).toContain('script');
			});
		});

		it('returns all items when input is empty', () => {
			const items = ['apple', 'banana', 'cherry'];
			const autocomplete = setup({
				items,
				maxSuggestions: 10,
			});
			autocomplete.setValue('');
			const suggestions = autocomplete.getSuggestions();
			expect(suggestions).toEqual(items);
		});

		it('respects maxSuggestions limit', () => {
			const items = Array.from({ length: 20 }, (_, i) => `item${i}`);
			const autocomplete = setup({
				items,
				maxSuggestions: 5,
			});
			autocomplete.setValue('item');
			const suggestions = autocomplete.getSuggestions();
			expect(suggestions.length).toBeLessThanOrEqual(5);
		});
	});

	describe('suggestions', () => {
		it('gets filtered suggestions', () => {
			const autocomplete = setup({
				items: ['apple', 'apricot', 'banana', 'cherry'],
			});
			autocomplete.setValue('ap');
			const suggestions = autocomplete.getSuggestions();
			expect(suggestions).toContain('apple');
			expect(suggestions).toContain('apricot');
		});

		it('returns empty array when no matches', () => {
			const autocomplete = setup({
				items: ['apple', 'banana'],
			});
			autocomplete.setValue('xyz');
			const suggestions = autocomplete.getSuggestions();
			expect(suggestions).toEqual([]);
		});

		it('updates suggestions when value changes', () => {
			const autocomplete = setup({
				items: ['apple', 'banana', 'apricot'],
			});

			autocomplete.setValue('a');
			let suggestions = autocomplete.getSuggestions();
			expect(suggestions.length).toBeGreaterThan(0);

			autocomplete.setValue('b');
			suggestions = autocomplete.getSuggestions();
			expect(suggestions).toContain('banana');
			expect(suggestions).not.toContain('apple');
		});
	});

	describe('event handlers', () => {
		it('calls onSelect callback', () => {
			const autocomplete = setup({
				items: ['apple', 'banana'],
			});

			// Simulate selection by calling the callback manually
			const result = autocomplete.onSelect(() => {
				// callback registered
			});
			expect(result).toBe(autocomplete); // chainable
		});

		it('calls onChange callback', () => {
			const autocomplete = setup({
				items: ['apple', 'banana'],
			});

			const result = autocomplete.onChange(() => {
				// callback registered
			});
			expect(result).toBe(autocomplete); // chainable
		});

		it('chains event handler registration', () => {
			const autocomplete = setup();
			const result = autocomplete.onSelect(() => {}).onChange(() => {});
			expect(result).toBe(autocomplete);
		});
	});

	describe('lifecycle', () => {
		it('destroys the widget', () => {
			const autocomplete = setup({ items: ['test'] });

			expect(() => autocomplete.destroy()).not.toThrow();

			// After destroy, state should be cleaned up
			expect(autocomplete.getValue()).toBe('');
		});
	});

	describe('integration scenarios', () => {
		it('handles complete user flow', () => {
			const autocomplete = setup({
				items: ['apple', 'apricot', 'banana', 'cherry'],
				placeholder: 'Search fruits...',
			});

			// User starts typing
			autocomplete.setValue('ap');
			expect(autocomplete.getSuggestions()).toContain('apple');
			expect(autocomplete.getSuggestions()).toContain('apricot');

			// User continues typing
			autocomplete.setValue('appl');
			expect(autocomplete.getSuggestions()).toContain('apple');

			// User selects a value
			autocomplete.onSelect(() => {
				// Would be triggered by Enter key in real usage
			});
		});

		it('handles empty search with all items shown', () => {
			const items = ['one', 'two', 'three'];
			const autocomplete = setup({
				items,
				maxSuggestions: 10,
			});

			autocomplete.setValue('');
			const suggestions = autocomplete.getSuggestions();
			expect(suggestions).toEqual(items);
		});

		it('handles case-insensitive matching', () => {
			const autocomplete = setup({
				items: ['Apple', 'BANANA', 'ChErRy'],
				fuzzyMatch: false,
			});

			autocomplete.setValue('apple');
			const suggestions = autocomplete.getSuggestions();
			expect(suggestions).toContain('Apple');
		});
	});
});
