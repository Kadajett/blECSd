/**
 * blECSd Widget Gallery
 *
 * A showcase of every registered widget type with example configurations,
 * usage snippets, and formatted output. Run with: pnpm gallery
 *
 * This gallery uses the widget registry to enumerate all available widgets
 * and displays their metadata alongside example code.
 *
 * @module playground/gallery
 */

import {
	createWidgetRegistry,
	registerBuiltinWidgets,
} from '../src/widgets/registry';

// =============================================================================
// TYPES
// =============================================================================

/**
 * A single widget demo entry with metadata and example code.
 */
interface WidgetDemo {
	readonly name: string;
	readonly title: string;
	readonly description: string;
	readonly category: string;
	readonly tags: readonly string[];
	readonly exampleCode: string;
	readonly notes: string;
}

/**
 * Gallery section grouping widgets by category.
 */
interface GallerySection {
	readonly category: string;
	readonly widgets: readonly WidgetDemo[];
}

// =============================================================================
// EXAMPLE CODE SNIPPETS
// =============================================================================

const WIDGET_EXAMPLES: Record<string, { code: string; notes: string }> = {
	box: {
		code: `const box = createBox(world, {
  width: 40, height: 10,
  border: { type: 'line' },
  padding: { top: 1, left: 2 },
  label: 'My Box',
});`,
		notes: 'Foundation container. Supports borders, padding, labels, and child elements.',
	},
	text: {
		code: `const text = createText(world, {
  content: 'Hello, blECSd!',
  width: 30,
  style: { fg: 'green', bold: true },
});`,
		notes: 'Simple text display with ANSI color and style support.',
	},
	line: {
		code: `const divider = createLine(world, {
  orientation: 'horizontal',
  width: 40,
  char: '-',
});`,
		notes: 'Visual separator. Horizontal or vertical orientation.',
	},
	layout: {
		code: `const container = createLayout(world, {
  type: 'flex',
  direction: 'row',
  gap: 1,
  width: 80, height: 24,
});`,
		notes: 'Auto-arranging container supporting flex, grid, and inline layouts.',
	},
	panel: {
		code: `const panel = createPanel(world, {
  title: 'System Monitor',
  width: 60, height: 20,
  closable: true,
  collapsible: true,
});`,
		notes: 'Container with title bar. Optional close and collapse buttons.',
	},
	tabs: {
		code: `const tabs = createTabs(world, {
  tabs: [
    { label: 'Overview', content: 'Dashboard view' },
    { label: 'Details', content: 'Detailed stats' },
    { label: 'Logs', content: 'System logs' },
  ],
  width: 60, height: 20,
});`,
		notes: 'Tabbed navigation container. Keyboard shortcuts for tab switching.',
	},
	scrollablebox: {
		code: `const scrollBox = createScrollableBox(world, {
  width: 40, height: 10,
  scrollbar: true,
  content: longTextContent,
});`,
		notes: 'Scrollable container with optional scrollbar. Supports mouse wheel.',
	},
	scrollabletext: {
		code: `const log = createScrollableText(world, {
  width: 60, height: 15,
  scrollbar: true,
  autoScroll: true,
});
// Append lines dynamically
log.pushLine('Server started on :3000');`,
		notes: 'Scrollable text area ideal for logs. Auto-scroll follows new content.',
	},
	list: {
		code: `const list = createList(world, {
  items: ['Alpha', 'Bravo', 'Charlie', 'Delta'],
  width: 30, height: 10,
  selectedStyle: { bg: 'blue', fg: 'white' },
});`,
		notes: 'Selectable list with keyboard navigation (up/down/enter).',
	},
	listbar: {
		code: `const menubar = createListbar(world, {
  items: {
    'File': { keys: ['f'] },
    'Edit': { keys: ['e'] },
    'View': { keys: ['v'] },
    'Help': { keys: ['h'] },
  },
  width: 80,
});`,
		notes: 'Horizontal menu bar with keyboard shortcuts.',
	},
	table: {
		code: `const table = createTable(world, {
  headers: ['Name', 'Status', 'CPU%'],
  rows: [
    ['nginx', 'running', '2.1'],
    ['postgres', 'running', '8.4'],
    ['redis', 'stopped', '0.0'],
  ],
  width: 50, height: 10,
});`,
		notes: 'Data table with column headers and row display.',
	},
	listtable: {
		code: `const dataTable = createListTable(world, {
  headers: ['PID', 'Name', 'Memory'],
  rows: [
    ['1234', 'node', '128MB'],
    ['5678', 'python', '256MB'],
  ],
  width: 50, height: 12,
  selectable: true,
});`,
		notes: 'Selectable data table. Keyboard navigation for row selection.',
	},
	tree: {
		code: `const tree = createTree(world, {
  data: {
    label: 'root',
    children: [
      { label: 'src', children: [
        { label: 'index.ts' },
        { label: 'utils.ts' },
      ]},
      { label: 'package.json' },
    ],
  },
  width: 40, height: 15,
});`,
		notes: 'Hierarchical tree view with expand/collapse. Arrow key navigation.',
	},
	loading: {
		code: `const spinner = createLoading(world, {
  text: 'Processing...',
  style: 'dots',
  interval: 80,
});`,
		notes: 'Animated loading indicator. Multiple spinner styles: dots, line, braille, etc.',
	},
	hovertext: {
		code: `const tooltip = createHoverTextManager(world, {
  delay: 500,
  maxWidth: 40,
});
tooltip.show(targetEntity, 'Click to expand');`,
		notes: 'Tooltip/hover text system. Configurable delay and positioning.',
	},
	bigtext: {
		code: `const banner = createBigText(world, {
  text: 'blECSd',
  font: 'block',
  width: 60,
});`,
		notes: 'Large ASCII art text using figlet-style fonts.',
	},
	viewport3d: {
		code: `const viewport = createViewport3D(world, {
  width: 60, height: 30,
  camera: { fov: 60, near: 0.1, far: 100 },
  backend: 'halfblock',
});`,
		notes: '3D rendering viewport. Supports halfblock, braille, sextant, and kitty backends.',
	},
};

// =============================================================================
// GALLERY BUILDER
// =============================================================================

/**
 * Builds the full gallery data from the widget registry.
 *
 * @returns Array of gallery sections grouped by category
 */
function buildGallery(): readonly GallerySection[] {
	const registry = createWidgetRegistry();
	registerBuiltinWidgets(registry);

	const names = registry.list();
	const demos: WidgetDemo[] = [];

	for (const name of names) {
		const widgetInfo = registry.info(name);
		if (!widgetInfo) {
			continue;
		}

		const example = WIDGET_EXAMPLES[name.toLowerCase()];
		demos.push({
			name,
			title: name.charAt(0).toUpperCase() + name.slice(1),
			description: widgetInfo.description,
			category: widgetInfo.category,
			tags: widgetInfo.tags,
			exampleCode: example?.code ?? `const widget = registry.create(world, '${name}', {});`,
			notes: example?.notes ?? widgetInfo.description,
		});
	}

	// Group by category
	const categoryMap = new Map<string, WidgetDemo[]>();
	for (const demo of demos) {
		const cat = demo.category || 'uncategorized';
		const existing = categoryMap.get(cat);
		if (existing) {
			existing.push(demo);
		} else {
			categoryMap.set(cat, [demo]);
		}
	}

	const sections: GallerySection[] = [];
	for (const [category, widgets] of categoryMap) {
		sections.push({ category, widgets });
	}

	return sections;
}

// =============================================================================
// FORMATTERS
// =============================================================================

/**
 * Formats a horizontal rule with optional label.
 */
function hr(label?: string, width = 70): string {
	if (!label) {
		return '\u2500'.repeat(width);
	}
	const padding = 2;
	const labelStr = ` ${label} `;
	const remaining = width - labelStr.length - padding;
	const left = Math.floor(remaining / 2);
	const right = remaining - left;
	return `${'─'.repeat(left + 1)}${labelStr}${'─'.repeat(right + 1)}`;
}

/**
 * Wraps text to a given width.
 */
function wrap(text: string, width: number, indent = 0): string {
	const prefix = ' '.repeat(indent);
	const words = text.split(' ');
	const lines: string[] = [];
	let current = prefix;

	for (const word of words) {
		if (current.length + word.length + 1 > width) {
			lines.push(current);
			current = prefix + word;
		} else {
			current = current === prefix ? prefix + word : `${current} ${word}`;
		}
	}
	if (current.trim()) {
		lines.push(current);
	}
	return lines.join('\n');
}

/**
 * Formats a single widget demo for display.
 */
function formatWidgetDemo(demo: WidgetDemo): string {
	const lines: string[] = [];

	lines.push('');
	lines.push(`  \x1b[1;36m${demo.title}\x1b[0m  \x1b[2m(${demo.category})\x1b[0m`);
	lines.push(`  ${'-'.repeat(demo.title.length + demo.category.length + 5)}`);
	lines.push('');
	lines.push(wrap(demo.description, 68, 2));
	lines.push('');

	if (demo.tags.length > 0) {
		lines.push(`  \x1b[33mTags:\x1b[0m ${demo.tags.join(', ')}`);
	}

	lines.push('');
	lines.push('  \x1b[32mExample:\x1b[0m');
	for (const codeLine of demo.exampleCode.split('\n')) {
		lines.push(`    ${codeLine}`);
	}

	if (demo.notes !== demo.description) {
		lines.push('');
		lines.push(`  \x1b[2m${demo.notes}\x1b[0m`);
	}

	return lines.join('\n');
}

/**
 * Formats the entire gallery for terminal output.
 *
 * @returns Formatted string ready for console output
 */
function formatGallery(): string {
	const sections = buildGallery();
	const lines: string[] = [];

	lines.push('');
	lines.push(hr());
	lines.push(`\x1b[1;37m  blECSd Widget Gallery\x1b[0m`);
	lines.push(`\x1b[2m  ${sections.reduce((sum, s) => sum + s.widgets.length, 0)} widgets across ${sections.length} categories\x1b[0m`);
	lines.push(hr());

	for (const section of sections) {
		lines.push('');
		lines.push(hr(section.category.toUpperCase()));

		for (const widget of section.widgets) {
			lines.push(formatWidgetDemo(widget));
		}
	}

	lines.push('');
	lines.push(hr());
	lines.push('');
	lines.push('  \x1b[2mFor detailed widget info: pnpm tsx src/cli/widgets.ts info <name>\x1b[0m');
	lines.push('  \x1b[2mTo search widgets: pnpm tsx src/cli/widgets.ts search <query>\x1b[0m');
	lines.push('');

	return lines.join('\n');
}

// =============================================================================
// EXPORTS
// =============================================================================

export { buildGallery, formatGallery, formatWidgetDemo, hr, wrap };
export type { GallerySection, WidgetDemo };

// =============================================================================
// MAIN
// =============================================================================

// When run directly, output the gallery
const output = formatGallery();
console.log(output);
