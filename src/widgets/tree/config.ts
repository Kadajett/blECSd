/**
 * Configuration schemas and constants for Tree Widget.
 *
 * @module widgets/tree/config
 */

import { z } from 'zod';
import type { TreeNode } from './types';

/** Default tree line characters */
export const TREE_LINES = {
	VERTICAL: '│',
	HORIZONTAL: '─',
	BRANCH: '├',
	CORNER: '└',
	EXPANDED: '▼',
	COLLAPSED: '▶',
	SPACE: ' ',
} as const;

/**
 * Zod schema for tree node.
 */
export const TreeNodeSchema: z.ZodType<TreeNode> = z.lazy(() =>
	z.object({
		label: z.string(),
		value: z.unknown().optional(),
		children: z.array(TreeNodeSchema).optional(),
		expanded: z.boolean().optional(),
		icon: z.string().optional(),
		id: z.string().optional(),
	}),
);

/**
 * Zod schema for tree widget configuration.
 */
export const TreeWidgetConfigSchema = z.object({
	x: z.number().int().default(0),
	y: z.number().int().default(0),
	width: z.number().int().positive().default(40),
	height: z.number().int().positive().default(10),
	nodes: z.array(TreeNodeSchema).default([]),
	selected: z.string().optional(),
	style: z
		.object({
			node: z
				.object({
					fg: z.number().optional(),
					bg: z.number().optional(),
				})
				.optional(),
			selected: z
				.object({
					fg: z.number().optional(),
					bg: z.number().optional(),
				})
				.optional(),
			expanded: z
				.object({
					fg: z.number().optional(),
				})
				.optional(),
			collapsed: z
				.object({
					fg: z.number().optional(),
				})
				.optional(),
		})
		.optional(),
	showLines: z.boolean().default(true),
	keys: z.boolean().default(true),
	indent: z.number().int().min(1).max(8).default(2),
});
