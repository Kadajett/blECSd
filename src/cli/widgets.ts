/**
 * CLI commands for widget discovery and information.
 *
 * Provides CLI-friendly functions to list, search, and inspect widgets
 * in the registry. These functions return formatted strings for display.
 *
 * @module cli/widgets
 *
 * @example
 * ```typescript
 * import { listWidgets, widgetInfo } from 'blecsd/cli/widgets';
 *
 * // List all widgets
 * console.log(listWidgets());
 *
 * // Get detailed info for a specific widget
 * console.log(widgetInfo('box'));
 *
 * // Search for widgets
 * console.log(searchWidgets('scroll'));
 * ```
 */

import {
	createWidgetRegistry,
	registerBuiltinWidgets,
	type WidgetInfo,
	type WidgetRegistry,
} from '../widgets/registry';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Widget metadata for table display.
 */
interface WidgetTableRow {
	readonly name: string;
	readonly category: string;
	readonly description: string;
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Gets the default widget registry with builtin widgets.
 */
function getDefaultRegistry(): WidgetRegistry {
	const registry = createWidgetRegistry();
	registerBuiltinWidgets(registry);
	return registry;
}

/**
 * Truncates text to a maximum length with ellipsis.
 */
function truncate(text: string, maxLength: number): string {
	if (text.length <= maxLength) {
		return text;
	}
	return `${text.slice(0, maxLength - 3)}...`;
}

/**
 * Pads text to a specific width.
 */
function pad(text: string, width: number): string {
	return text.padEnd(width, ' ');
}

/**
 * Formats a table of widgets.
 */
function formatWidgetTable(widgets: readonly WidgetTableRow[]): string {
	if (widgets.length === 0) {
		return 'No widgets found.';
	}

	// Calculate column widths
	const nameWidth = Math.max('Name'.length, ...widgets.map((w) => w.name.length));
	const categoryWidth = Math.max('Category'.length, ...widgets.map((w) => w.category.length));
	const descriptionWidth = 50; // Fixed width for description

	// Build header
	const lines: string[] = [];
	lines.push(
		`${pad('Name', nameWidth)}  ${pad('Category', categoryWidth)}  ${pad('Description', descriptionWidth)}`,
	);
	lines.push(
		`${pad('-'.repeat(nameWidth), nameWidth)}  ${pad('-'.repeat(categoryWidth), categoryWidth)}  ${pad('-'.repeat(descriptionWidth), descriptionWidth)}`,
	);

	// Build rows
	for (const widget of widgets) {
		const desc = truncate(widget.description, descriptionWidth);
		lines.push(`${pad(widget.name, nameWidth)}  ${pad(widget.category, categoryWidth)}  ${desc}`);
	}

	return lines.join('\n');
}

/**
 * Formats a Zod schema description for display.
 */
function formatSchemaDescription(info: WidgetInfo): string {
	if (!info.hasConfigSchema) {
		return 'No config schema available';
	}
	return 'Schema validation available';
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Lists all registered widgets in a formatted table.
 *
 * @param registry - Optional widget registry (defaults to builtin registry)
 * @returns Formatted table string
 *
 * @example
 * ```typescript
 * import { listWidgets } from 'blecsd/cli/widgets';
 *
 * console.log(listWidgets());
 * // Name       Category  Description
 * // --------   --------  -----------
 * // box        basic     Basic container widget with optional border...
 * // layout     layout    Auto-arranging container with flex/grid/in...
 * // ...
 * ```
 */
export function listWidgets(registry?: WidgetRegistry): string {
	const reg = registry ?? getDefaultRegistry();
	const widgetNames = reg.list();

	const rows: WidgetTableRow[] = widgetNames
		.map((name) => {
			const info = reg.info(name);
			if (!info) {
				return null;
			}
			return {
				name,
				category: info.category || 'unknown',
				description: info.description || '',
			};
		})
		.filter((row): row is WidgetTableRow => row !== null);

	return formatWidgetTable(rows);
}

/**
 * Returns detailed information about a specific widget.
 *
 * @param name - Widget type name (case-insensitive)
 * @param registry - Optional widget registry (defaults to builtin registry)
 * @returns Formatted widget info string or error message
 *
 * @example
 * ```typescript
 * import { widgetInfo } from 'blecsd/cli/widgets';
 *
 * console.log(widgetInfo('box'));
 * // Widget: box
 * //
 * // Description:
 * //   Basic container widget with optional border and padding
 * //
 * // Category: basic
 * // Tags: container, layout, basic
 * // Version: 0.4.0
 * //
 * // Required Components: Position, Dimensions, Border, Padding
 * // Supported Events: (none)
 * // Config Schema: Schema validation available
 * ```
 */
export function widgetInfo(name: string, registry?: WidgetRegistry): string {
	const reg = registry ?? getDefaultRegistry();
	const info = reg.info(name);

	if (!info) {
		return `Error: Widget type '${name}' not found.\n\nAvailable widgets: ${reg.list().join(', ')}`;
	}

	const lines: string[] = [];
	lines.push(`Widget: ${info.name}`);
	lines.push('');

	if (info.description) {
		lines.push('Description:');
		lines.push(`  ${info.description}`);
		lines.push('');
	}

	if (info.category) {
		lines.push(`Category: ${info.category}`);
	}

	if (info.tags.length > 0) {
		lines.push(`Tags: ${info.tags.join(', ')}`);
	}

	if (info.version) {
		lines.push(`Version: ${info.version}`);
	}

	lines.push('');

	if (info.requiredComponents.length > 0) {
		lines.push(`Required Components: ${info.requiredComponents.join(', ')}`);
	}

	const events = info.supportedEvents.length > 0 ? info.supportedEvents.join(', ') : '(none)';
	lines.push(`Supported Events: ${events}`);

	lines.push(`Config Schema: ${formatSchemaDescription(info)}`);

	return lines.join('\n');
}

/**
 * Searches for widgets matching a query string.
 *
 * @param query - Search query (matches name or description, case-insensitive)
 * @param registry - Optional widget registry (defaults to builtin registry)
 * @returns Formatted table of matching widgets
 *
 * @example
 * ```typescript
 * import { searchWidgets } from 'blecsd/cli/widgets';
 *
 * console.log(searchWidgets('scroll'));
 * // Name            Category  Description
 * // -------------   --------  -----------
 * // scrollableBox   layout    Scrollable container with scrollbar support
 * // scrollableText  display   Scrollable text display optimized for logs...
 * ```
 */
export function searchWidgets(query: string, registry?: WidgetRegistry): string {
	const reg = registry ?? getDefaultRegistry();

	if (!query || query.trim().length === 0) {
		return 'Error: Search query cannot be empty.';
	}

	const results = reg.search(query);

	if (results.length === 0) {
		return `No widgets found matching '${query}'.`;
	}

	const rows: WidgetTableRow[] = results
		.map((name) => {
			const info = reg.info(name);
			if (!info) {
				return null;
			}
			return {
				name,
				category: info.category || 'unknown',
				description: info.description || '',
			};
		})
		.filter((row): row is WidgetTableRow => row !== null);

	return formatWidgetTable(rows);
}
