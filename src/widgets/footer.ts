/**
 * Footer Widget
 *
 * A fixed footer widget that stays at the bottom of the screen with configurable
 * sections for left, center, and right content. Similar to a status bar.
 *
 * @module widgets/footer
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
 * Footer component marker for identifying footer entities.
 */
export const Footer = {
	/** Tag indicating this is a footer widget (1 = yes) */
	isFooter: new Uint8Array(DEFAULT_CAPACITY),
};

// =============================================================================
// TYPES
// =============================================================================

/**
 * Horizontal alignment for footer sections.
 *
 * @example
 * ```typescript
 * align: 'left'    // Align to left edge
 * align: 'center'  // Center horizontally
 * align: 'right'   // Align to right edge
 * ```
 */
export type FooterAlign = 'left' | 'center' | 'right';

/**
 * Configuration for creating a Footer widget.
 *
 * @example
 * ```typescript
 * const footer = createFooter(world, eid, {
 *   left: 'Ready',
 *   center: '50%',
 *   right: 'Ln 42, Col 10',
 *   height: 1,
 *   fg: '#FFFFFF',
 *   bg: '#000080'
 * });
 * ```
 */
export interface FooterConfig {
	/**
	 * Main status text (displayed based on layout)
	 * @default '' (empty string)
	 */
	readonly status?: string;

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
	 * Alignment for the status text when no sections are defined
	 * @default 'left'
	 */
	readonly align?: FooterAlign;
}

/**
 * Footer widget interface providing chainable methods.
 */
export interface FooterWidget {
	/** The underlying entity ID */
	readonly eid: Entity;

	// Visibility
	/** Shows the footer */
	show(): FooterWidget;
	/** Hides the footer */
	hide(): FooterWidget;

	// Content
	/** Sets the status text */
	setStatus(text: string): FooterWidget;
	/** Sets the left section content */
	setLeft(text: string): FooterWidget;
	/** Sets the center section content */
	setCenter(text: string): FooterWidget;
	/** Sets the right section content */
	setRight(text: string): FooterWidget;
	/** Gets the current content */
	getContent(): string;

	// Lifecycle
	/** Destroys the widget and removes it from the world */
	destroy(): void;
}

// =============================================================================
// SCHEMA
// =============================================================================

export const FooterConfigSchema = z.object({
	status: z.string().optional().default(''),
	left: z.string().optional(),
	center: z.string().optional(),
	right: z.string().optional(),
	height: z.number().int().positive().optional().default(1),
	fg: z.union([z.string(), z.number()]).optional(),
	bg: z.union([z.string(), z.number()]).optional(),
	align: z.enum(['left', 'center', 'right']).optional().default('left'),
});

type ValidatedFooterConfig = z.infer<typeof FooterConfigSchema>;

// =============================================================================
// STATE
// =============================================================================

interface FooterState {
	left: string;
	center: string;
	right: string;
	status: string;
}

const footerStateMap = new Map<Entity, FooterState>();

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Formats footer content based on sections and width.
 */
function formatFooterContent(state: FooterState, width: number, align: FooterAlign): string {
	const { left, center, right, status } = state;

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

	// Single status mode
	if (status) {
		if (align === 'center') {
			const padding = Math.max(0, Math.floor((width - status.length) / 2));
			return ' '.repeat(padding) + status;
		}
		if (align === 'right') {
			const padding = Math.max(0, width - status.length);
			return ' '.repeat(padding) + status;
		}
		// left alignment (default)
		return status;
	}

	return '';
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Creates a Footer widget fixed at the bottom of the screen.
 *
 * The footer is a single-line (or configurable height) widget that spans the
 * full width of the screen. It supports three-section layout (left, center, right)
 * or a simple status text with alignment.
 *
 * @param world - The ECS world
 * @param entity - The entity to wrap
 * @param config - Widget configuration
 * @returns The Footer widget instance
 *
 * @example
 * ```typescript
 * import { createWorld, addEntity } from '../core/ecs';
 * import { createFooter } from 'blecsd/widgets';
 *
 * const world = createWorld();
 * const eid = addEntity(world);
 *
 * // Simple status footer
 * const footer = createFooter(world, eid, {
 *   status: 'Ready',
 *   align: 'left',
 *   fg: '#FFFFFF',
 *   bg: '#000080'
 * });
 *
 * // Three-section layout (status bar style)
 * const footer2 = createFooter(world, eid, {
 *   left: 'Ready | INS',
 *   center: '50% | UTF-8',
 *   right: 'Ln 42, Col 10',
 *   bg: '#1E1E1E'
 * });
 *
 * // Update sections dynamically
 * footer2.setLeft('Processing...');
 * footer2.setCenter('75%');
 * footer2.setRight('Ln 100, Col 5');
 * ```
 */
export function createFooter(
	world: World,
	entity: Entity,
	config: FooterConfig = {},
): FooterWidget {
	const validated = FooterConfigSchema.parse(config) as ValidatedFooterConfig;
	const eid = entity;

	// Mark as footer
	Footer.isFooter[eid] = 1;

	// Position at bottom (0, screen_height - 1) with full width
	// Y position will be set by the layout system or user
	// For now, we'll use 0 as a placeholder
	setPosition(world, eid, 0, 0);
	setDimensions(world, eid, 'auto', validated.height);

	// Set up style
	const fgColor = validated.fg ? parseColor(validated.fg) : undefined;
	const bgColor = validated.bg ? parseColor(validated.bg) : undefined;
	if (fgColor !== undefined || bgColor !== undefined) {
		setStyle(world, eid, { fg: fgColor, bg: bgColor });
	}

	// Initialize state
	const state: FooterState = {
		status: validated.status,
		left: validated.left || '',
		center: validated.center || '',
		right: validated.right || '',
	};
	footerStateMap.set(eid, state);

	// Set initial content
	// Note: In a real implementation, we'd need to know the screen width
	// For now, we'll use a reasonable default of 80 columns
	const defaultWidth = 80;
	const content = formatFooterContent(state, defaultWidth, validated.align);
	setContent(world, eid, content, { align: TextAlign.Left });

	// Create the widget object with chainable methods
	const widget: FooterWidget = {
		eid,

		// Visibility
		show(): FooterWidget {
			setVisible(world, eid, true);
			markDirty(world, eid);
			return widget;
		},

		hide(): FooterWidget {
			setVisible(world, eid, false);
			markDirty(world, eid);
			return widget;
		},

		// Content
		setStatus(text: string): FooterWidget {
			const currentState = footerStateMap.get(eid);
			if (currentState) {
				currentState.status = text;
				const content = formatFooterContent(currentState, defaultWidth, validated.align);
				setContent(world, eid, content);
				markDirty(world, eid);
			}
			return widget;
		},

		setLeft(text: string): FooterWidget {
			const currentState = footerStateMap.get(eid);
			if (currentState) {
				currentState.left = text;
				const content = formatFooterContent(currentState, defaultWidth, validated.align);
				setContent(world, eid, content);
				markDirty(world, eid);
			}
			return widget;
		},

		setCenter(text: string): FooterWidget {
			const currentState = footerStateMap.get(eid);
			if (currentState) {
				currentState.center = text;
				const content = formatFooterContent(currentState, defaultWidth, validated.align);
				setContent(world, eid, content);
				markDirty(world, eid);
			}
			return widget;
		},

		setRight(text: string): FooterWidget {
			const currentState = footerStateMap.get(eid);
			if (currentState) {
				currentState.right = text;
				const content = formatFooterContent(currentState, defaultWidth, validated.align);
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
			footerStateMap.delete(eid);
			removeEntity(world, eid);
		},
	};

	return widget;
}
