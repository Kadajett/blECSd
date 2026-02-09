/**
 * Header Widget
 *
 * A fixed header widget that stays at the top of the screen with configurable
 * sections for left, center, and right content.
 *
 * @module widgets/header
 */

import { z } from 'zod';
import { getContent, setContent, TextAlign } from '../components/content';
import { setDimensions } from '../components/dimensions';
import { setPosition } from '../components/position';
import { markDirty, setStyle, setVisible } from '../components/renderable';
import { removeEntity } from '../core/ecs';
import type { Entity, World } from '../core/types';
import { parseColor } from '../utils/color';

/** Default entity capacity for typed arrays */
const DEFAULT_CAPACITY = 10000;

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Header component marker for identifying header entities.
 */
export const Header = {
	/** Tag indicating this is a header widget (1 = yes) */
	isHeader: new Uint8Array(DEFAULT_CAPACITY),
};

// =============================================================================
// TYPES
// =============================================================================

/**
 * Horizontal alignment for header sections.
 *
 * @example
 * ```typescript
 * align: 'left'    // Align to left edge
 * align: 'center'  // Center horizontally
 * align: 'right'   // Align to right edge
 * ```
 */
export type HeaderAlign = 'left' | 'center' | 'right';

/**
 * Configuration for creating a Header widget.
 *
 * @example
 * ```typescript
 * const header = createHeader(world, eid, {
 *   title: 'My Application',
 *   left: 'File',
 *   center: 'Document.txt',
 *   right: 'v1.0.0',
 *   height: 1,
 *   fg: '#FFFFFF',
 *   bg: '#000080'
 * });
 * ```
 */
export interface HeaderConfig {
	/**
	 * Main title text (displayed based on layout)
	 * @default '' (empty string)
	 */
	readonly title?: string;

	/**
	 * Left section content
	 * @default undefined
	 */
	readonly left?: string;

	/**
	 * Center section content
	 * @default undefined
	 */
	readonly center?: string;

	/**
	 * Right section content
	 * @default undefined
	 */
	readonly right?: string;

	/**
	 * Height in cells (lines)
	 * @default 1
	 */
	readonly height?: number;

	/**
	 * Foreground (text) color (hex string like "#RRGGBB" or packed RGBA number)
	 * @default Terminal default foreground color
	 */
	readonly fg?: string | number;

	/**
	 * Background color (hex string like "#RRGGBB" or packed RGBA number)
	 * @default Terminal default background color
	 */
	readonly bg?: string | number;

	/**
	 * Alignment for the title text when no sections are defined
	 * @default 'left'
	 */
	readonly align?: HeaderAlign;
}

/**
 * Header widget interface providing chainable methods.
 */
export interface HeaderWidget {
	/** The underlying entity ID */
	readonly eid: Entity;

	// Visibility
	/** Shows the header */
	show(): HeaderWidget;
	/** Hides the header */
	hide(): HeaderWidget;

	// Content
	/** Sets the title text */
	setTitle(text: string): HeaderWidget;
	/** Sets the left section content */
	setLeft(text: string): HeaderWidget;
	/** Sets the center section content */
	setCenter(text: string): HeaderWidget;
	/** Sets the right section content */
	setRight(text: string): HeaderWidget;
	/** Gets the current content */
	getContent(): string;

	// Lifecycle
	/** Destroys the widget and removes it from the world */
	destroy(): void;
}

// =============================================================================
// SCHEMA
// =============================================================================

export const HeaderConfigSchema = z.object({
	title: z.string().optional().default(''),
	left: z.string().optional(),
	center: z.string().optional(),
	right: z.string().optional(),
	height: z.number().int().positive().optional().default(1),
	fg: z.union([z.string(), z.number()]).optional(),
	bg: z.union([z.string(), z.number()]).optional(),
	align: z.enum(['left', 'center', 'right']).optional().default('left'),
});

type ValidatedHeaderConfig = z.infer<typeof HeaderConfigSchema>;

// =============================================================================
// STATE
// =============================================================================

interface HeaderState {
	left: string;
	center: string;
	right: string;
	title: string;
}

const headerStateMap = new Map<Entity, HeaderState>();

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Formats header content based on sections and width.
 */
function formatHeaderContent(state: HeaderState, width: number, align: HeaderAlign): string {
	const { left, center, right, title } = state;

	// If we have sections, use three-column layout
	if (left || center || right) {
		const leftText = left || '';
		const centerText = center || '';
		const rightText = right || '';

		// Calculate available space
		const leftLen = leftText.length;
		const centerLen = centerText.length;
		const rightLen = rightText.length;

		// Calculate padding
		const totalContent = leftLen + centerLen + rightLen;
		const availableSpace = width - totalContent;

		if (availableSpace >= 2) {
			// Calculate center position
			const centerStart = Math.floor((width - centerLen) / 2);
			const leftPadding = Math.max(0, centerStart - leftLen);
			const rightStart = centerStart + centerLen;
			const rightPadding = Math.max(0, width - rightStart - rightLen);

			return leftText + ' '.repeat(leftPadding) + centerText + ' '.repeat(rightPadding) + rightText;
		}

		// Not enough space for proper layout, concatenate
		return `${leftText} ${centerText} ${rightText}`.slice(0, width);
	}

	// Single title mode
	if (title) {
		if (align === 'center') {
			const padding = Math.max(0, Math.floor((width - title.length) / 2));
			return ' '.repeat(padding) + title;
		}
		if (align === 'right') {
			const padding = Math.max(0, width - title.length);
			return ' '.repeat(padding) + title;
		}
		// left alignment (default)
		return title;
	}

	return '';
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Creates a Header widget fixed at the top of the screen.
 *
 * The header is a single-line (or configurable height) widget that spans the
 * full width of the screen. It supports three-section layout (left, center, right)
 * or a simple title with alignment.
 *
 * @param world - The ECS world
 * @param entity - The entity to wrap
 * @param config - Widget configuration
 * @returns The Header widget instance
 *
 * @example
 * ```typescript
 * import { createWorld, addEntity } from '../core/ecs';
 * import { createHeader } from 'blecsd/widgets';
 *
 * const world = createWorld();
 * const eid = addEntity(world);
 *
 * // Simple title header
 * const header = createHeader(world, eid, {
 *   title: 'My Application',
 *   align: 'center',
 *   fg: '#FFFFFF',
 *   bg: '#000080'
 * });
 *
 * // Three-section layout
 * const header2 = createHeader(world, eid, {
 *   left: 'File | Edit | View',
 *   center: 'Document.txt - Modified',
 *   right: 'Line 42, Col 10',
 *   bg: '#1E1E1E'
 * });
 *
 * // Update sections dynamically
 * header2.setCenter('New Document.txt');
 * header2.setRight('Line 1, Col 1');
 * ```
 */
export function createHeader(
	world: World,
	entity: Entity,
	config: HeaderConfig = {},
): HeaderWidget {
	const validated = HeaderConfigSchema.parse(config) as ValidatedHeaderConfig;
	const eid = entity;

	// Mark as header
	Header.isHeader[eid] = 1;

	// Position at top (0, 0) with full width
	// Width will be set by the layout system or user
	setPosition(world, eid, 0, 0);
	setDimensions(world, eid, 'auto', validated.height);

	// Set up style
	const fgColor = validated.fg ? parseColor(validated.fg) : undefined;
	const bgColor = validated.bg ? parseColor(validated.bg) : undefined;
	if (fgColor !== undefined || bgColor !== undefined) {
		setStyle(world, eid, { fg: fgColor, bg: bgColor });
	}

	// Initialize state
	const state: HeaderState = {
		title: validated.title,
		left: validated.left || '',
		center: validated.center || '',
		right: validated.right || '',
	};
	headerStateMap.set(eid, state);

	// Set initial content
	// Note: In a real implementation, we'd need to know the screen width
	// For now, we'll use a reasonable default of 80 columns
	const defaultWidth = 80;
	const content = formatHeaderContent(state, defaultWidth, validated.align);
	setContent(world, eid, content, { align: TextAlign.Left });

	// Create the widget object with chainable methods
	const widget: HeaderWidget = {
		eid,

		// Visibility
		show(): HeaderWidget {
			setVisible(world, eid, true);
			markDirty(world, eid);
			return widget;
		},

		hide(): HeaderWidget {
			setVisible(world, eid, false);
			markDirty(world, eid);
			return widget;
		},

		// Content
		setTitle(text: string): HeaderWidget {
			const currentState = headerStateMap.get(eid);
			if (currentState) {
				currentState.title = text;
				const content = formatHeaderContent(currentState, defaultWidth, validated.align);
				setContent(world, eid, content);
				markDirty(world, eid);
			}
			return widget;
		},

		setLeft(text: string): HeaderWidget {
			const currentState = headerStateMap.get(eid);
			if (currentState) {
				currentState.left = text;
				const content = formatHeaderContent(currentState, defaultWidth, validated.align);
				setContent(world, eid, content);
				markDirty(world, eid);
			}
			return widget;
		},

		setCenter(text: string): HeaderWidget {
			const currentState = headerStateMap.get(eid);
			if (currentState) {
				currentState.center = text;
				const content = formatHeaderContent(currentState, defaultWidth, validated.align);
				setContent(world, eid, content);
				markDirty(world, eid);
			}
			return widget;
		},

		setRight(text: string): HeaderWidget {
			const currentState = headerStateMap.get(eid);
			if (currentState) {
				currentState.right = text;
				const content = formatHeaderContent(currentState, defaultWidth, validated.align);
				setContent(world, eid, content);
				markDirty(world, eid);
			}
			return widget;
		},

		getContent(): string {
			return getContent(world, eid);
		},

		// Lifecycle
		destroy(): void {
			headerStateMap.delete(eid);
			removeEntity(world, eid);
		},
	};

	return widget;
}
