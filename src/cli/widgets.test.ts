import { describe, expect, it } from 'vitest';
import type { z } from 'zod';
import { createWidgetRegistry, registerBuiltinWidgets } from '../widgets/registry';
import { listWidgets, searchWidgets, widgetInfo } from './widgets';

describe('cli/widgets', () => {
	describe('listWidgets', () => {
		it('returns formatted table with all registered widgets', () => {
			const registry = createWidgetRegistry();
			registerBuiltinWidgets(registry);

			const output = listWidgets(registry);

			// Should contain header
			expect(output).toContain('Name');
			expect(output).toContain('Category');
			expect(output).toContain('Description');

			// Should contain separator line
			expect(output).toContain('---');

			// Should contain some known widgets
			expect(output).toContain('box');
			expect(output).toContain('text');
			expect(output).toContain('layout');
			expect(output).toContain('list');
		});

		it('truncates long descriptions to 50 characters', () => {
			const registry = createWidgetRegistry();
			registry.register('longdesc', {
				factory: () => ({}),
				description:
					'This is a very long description that should be truncated because it exceeds the maximum allowed length',
				category: 'test',
			});

			const output = listWidgets(registry);
			const lines = output.split('\n');

			// Find the longdesc row
			const longdescRow = lines.find((line) => line.includes('longdesc'));
			expect(longdescRow).toBeDefined();

			// Should be truncated with ellipsis
			expect(longdescRow).toContain('...');
			// Should not contain the full description
			expect(longdescRow).not.toContain('maximum allowed length');
		});

		it('handles widgets with missing category gracefully', () => {
			const registry = createWidgetRegistry();
			registry.register('nocategory', {
				factory: () => ({}),
				description: 'Widget without category',
			});

			const output = listWidgets(registry);

			expect(output).toContain('nocategory');
			expect(output).toContain('unknown'); // Default category
		});

		it('returns message when no widgets are registered', () => {
			const registry = createWidgetRegistry();
			const output = listWidgets(registry);

			expect(output).toBe('No widgets found.');
		});

		it('uses default builtin registry when none provided', () => {
			const output = listWidgets();

			// Should contain builtin widgets
			expect(output).toContain('box');
			expect(output).toContain('text');
			expect(output).toContain('layout');
		});

		it('aligns columns properly', () => {
			const registry = createWidgetRegistry();
			registry.register('a', {
				factory: () => ({}),
				description: 'Short',
				category: 'test',
			});
			registry.register('verylongname', {
				factory: () => ({}),
				description: 'Also short',
				category: 'test',
			});

			const output = listWidgets(registry);
			const lines = output.split('\n');

			// All lines should have consistent spacing between columns
			const dataLines = lines.slice(2); // Skip header and separator
			const columnPositions = dataLines.map((line) => {
				const parts = line.split(/\s{2,}/); // Split on 2+ spaces
				return parts.length;
			});

			// All rows should have the same number of columns
			expect(new Set(columnPositions).size).toBe(1);
		});
	});

	describe('widgetInfo', () => {
		it('returns detailed info for a known widget', () => {
			const registry = createWidgetRegistry();
			registerBuiltinWidgets(registry);

			const output = widgetInfo('box', registry);

			expect(output).toContain('Widget: box');
			expect(output).toContain('Description:');
			expect(output).toContain('Basic container widget');
			expect(output).toContain('Category: basic');
			expect(output).toContain('Tags:');
			expect(output).toContain('container');
			expect(output).toContain('Version: 0.4.0');
			expect(output).toContain('Required Components:');
			expect(output).toContain('Position');
			expect(output).toContain('Dimensions');
			expect(output).toContain('Supported Events:');
		});

		it('returns error for unknown widget', () => {
			const registry = createWidgetRegistry();
			registerBuiltinWidgets(registry);

			const output = widgetInfo('nonexistent', registry);

			expect(output).toContain('Error:');
			expect(output).toContain("Widget type 'nonexistent' not found");
			expect(output).toContain('Available widgets:');
		});

		it('handles widget with supported events', () => {
			const registry = createWidgetRegistry();
			registry.register('eventful', {
				factory: () => ({}),
				description: 'Widget with events',
				category: 'test',
				supportedEvents: ['click', 'hover', 'focus'],
			});

			const output = widgetInfo('eventful', registry);

			expect(output).toContain('Supported Events: click, hover, focus');
		});

		it('shows "(none)" for widgets without events', () => {
			const registry = createWidgetRegistry();
			registry.register('eventless', {
				factory: () => ({}),
				description: 'Widget without events',
				category: 'test',
			});

			const output = widgetInfo('eventless', registry);

			expect(output).toContain('Supported Events: (none)');
		});

		it('displays schema availability', () => {
			const registry = createWidgetRegistry();
			registry.register('withschema', {
				factory: () => ({}),
				description: 'Widget with schema',
				category: 'test',
				configSchema: {
					safeParse: () => ({ success: true, data: {} }),
				} as unknown as z.ZodType,
			});

			const output = widgetInfo('withschema', registry);

			expect(output).toContain('Config Schema: Schema validation available');
		});

		it('shows no schema for widgets without config schema', () => {
			const registry = createWidgetRegistry();
			registry.register('noschema', {
				factory: () => ({}),
				description: 'Widget without schema',
				category: 'test',
			});

			const output = widgetInfo('noschema', registry);

			expect(output).toContain('Config Schema: No config schema available');
		});

		it('uses default builtin registry when none provided', () => {
			const output = widgetInfo('box');

			expect(output).toContain('Widget: box');
			expect(output).toContain('basic');
		});

		it('is case-insensitive', () => {
			const registry = createWidgetRegistry();
			registry.register('mywidget', {
				factory: () => ({}),
				description: 'Test widget',
				category: 'test',
			});

			const lower = widgetInfo('mywidget', registry);
			const upper = widgetInfo('MYWIDGET', registry);
			const mixed = widgetInfo('MyWidget', registry);

			expect(lower).toContain('Widget: mywidget');
			expect(upper).toContain('Widget: mywidget');
			expect(mixed).toContain('Widget: mywidget');
		});

		it('handles widgets with no description', () => {
			const registry = createWidgetRegistry();
			registry.register('nodesc', {
				factory: () => ({}),
				category: 'test',
			});

			const output = widgetInfo('nodesc', registry);

			expect(output).toContain('Widget: nodesc');
			// Should not show description section if empty
			expect(output).not.toContain('Description:');
		});

		it('handles widgets with no tags', () => {
			const registry = createWidgetRegistry();
			registry.register('notags', {
				factory: () => ({}),
				description: 'Widget without tags',
				category: 'test',
			});

			const output = widgetInfo('notags', registry);

			// Should not include empty tags line
			expect(output).not.toContain('Tags:');
		});
	});

	describe('searchWidgets', () => {
		it('filters widgets by name', () => {
			const registry = createWidgetRegistry();
			registerBuiltinWidgets(registry);

			const output = searchWidgets('scroll', registry);

			expect(output).toContain('scrollablebox');
			expect(output).toContain('scrollabletext');
			// plain box should not match (check it's not on its own line)
			const lines = output.split('\n');
			const boxLine = lines.find((line) => line.startsWith('box '));
			expect(boxLine).toBeUndefined();
		});

		it('filters widgets by description', () => {
			const registry = createWidgetRegistry();
			registry.register('widget1', {
				factory: () => ({}),
				description: 'This widget handles user input',
				category: 'test',
			});
			registry.register('widget2', {
				factory: () => ({}),
				description: 'This widget displays output',
				category: 'test',
			});

			const output = searchWidgets('input', registry);

			expect(output).toContain('widget1');
			expect(output).not.toContain('widget2');
		});

		it('is case-insensitive', () => {
			const registry = createWidgetRegistry();
			registerBuiltinWidgets(registry);

			const lower = searchWidgets('scroll', registry);
			const upper = searchWidgets('SCROLL', registry);
			const mixed = searchWidgets('ScRoLl', registry);

			expect(lower).toContain('scrollablebox');
			expect(upper).toContain('scrollablebox');
			expect(mixed).toContain('scrollablebox');
		});

		it('returns message when no matches found', () => {
			const registry = createWidgetRegistry();
			registerBuiltinWidgets(registry);

			const output = searchWidgets('nonexistentquery', registry);

			expect(output).toContain("No widgets found matching 'nonexistentquery'");
		});

		it('returns error for empty query', () => {
			const registry = createWidgetRegistry();

			const output = searchWidgets('', registry);

			expect(output).toContain('Error:');
			expect(output).toContain('Search query cannot be empty');
		});

		it('returns error for whitespace-only query', () => {
			const registry = createWidgetRegistry();

			const output = searchWidgets('   ', registry);

			expect(output).toContain('Error:');
			expect(output).toContain('Search query cannot be empty');
		});

		it('uses default builtin registry when none provided', () => {
			const output = searchWidgets('scroll');

			expect(output).toContain('scrollablebox');
			expect(output).toContain('scrollabletext');
		});

		it('returns formatted table with proper alignment', () => {
			const registry = createWidgetRegistry();
			registry.register('short', {
				factory: () => ({}),
				description: 'Match this query',
				category: 'test',
			});
			registry.register('verylongnamematch', {
				factory: () => ({}),
				description: 'Also has query keyword',
				category: 'test',
			});

			const output = searchWidgets('query', registry);
			const lines = output.split('\n');

			// Should have header
			expect(lines[0]).toContain('Name');
			expect(lines[0]).toContain('Category');
			expect(lines[0]).toContain('Description');

			// Should have separator
			expect(lines[1]).toContain('---');

			// Should have both widgets
			expect(output).toContain('short');
			expect(output).toContain('verylongnamematch');
		});

		it('truncates long descriptions', () => {
			const registry = createWidgetRegistry();
			registry.register('longmatch', {
				factory: () => ({}),
				description:
					'This widget matches the query and has a very long description that should be truncated to fit',
				category: 'test',
			});

			const output = searchWidgets('query', registry);

			expect(output).toContain('...');
			expect(output).not.toContain('fit'); // Last word should be truncated
		});
	});

	describe('integration', () => {
		it('all functions work with builtin widgets', () => {
			const registry = createWidgetRegistry();
			registerBuiltinWidgets(registry);

			// List should show multiple widgets
			const list = listWidgets(registry);
			expect(list.split('\n').length).toBeGreaterThan(10);

			// Info should work for any builtin widget
			const info = widgetInfo('panel', registry);
			expect(info).toContain('Widget: panel');

			// Search should find specific widgets
			const search = searchWidgets('table', registry);
			expect(search).toContain('table');
			expect(search).toContain('listtable');
		});

		it('handles custom registry with custom widgets', () => {
			const registry = createWidgetRegistry();
			registry.register('custom1', {
				factory: () => ({}),
				description: 'First custom widget',
				category: 'custom',
				tags: ['test'],
			});
			registry.register('custom2', {
				factory: () => ({}),
				description: 'Second custom widget',
				category: 'custom',
				tags: ['test'],
			});

			const list = listWidgets(registry);
			expect(list).toContain('custom1');
			expect(list).toContain('custom2');

			const info = widgetInfo('custom1', registry);
			expect(info).toContain('First custom widget');

			const search = searchWidgets('custom', registry);
			expect(search).toContain('custom1');
			expect(search).toContain('custom2');
		});
	});
});
