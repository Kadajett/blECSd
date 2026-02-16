/**
 * Configuration validation for Agent Workflow widget.
 * @module widgets/agentWorkflow/config
 */

import { z } from 'zod';
import type { WorkflowStepStatus } from './types';

/**
 * Zod schema for AgentWorkflowConfig validation.
 */
export const AgentWorkflowConfigSchema = z.object({
	x: z.number().default(0),
	y: z.number().default(0),
	width: z.number().positive().default(60),
	height: z.number().positive().default(20),
	showTimestamps: z.boolean().default(true),
	showDuration: z.boolean().default(true),
	showAgentName: z.boolean().default(true),
	fg: z.union([z.string(), z.number()]).optional(),
	bg: z.union([z.string(), z.number()]).optional(),
	statusColors: z
		.object({
			pending: z.union([z.string(), z.number()]).optional(),
			running: z.union([z.string(), z.number()]).optional(),
			complete: z.union([z.string(), z.number()]).optional(),
			failed: z.union([z.string(), z.number()]).optional(),
			waiting: z.union([z.string(), z.number()]).optional(),
		})
		.optional(),
});

/** Default status colors for reference (used when configuring statusColors). */
export const DEFAULT_STATUS_COLORS: Record<WorkflowStepStatus, number> = {
	pending: 0x888888, // gray
	running: 0x3388ff, // blue
	complete: 0x33cc33, // green
	failed: 0xff3333, // red
	waiting: 0xcccc33, // yellow
};
