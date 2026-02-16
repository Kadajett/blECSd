/**
 * Configuration validation for Token Tracker widget.
 * @module widgets/tokenTracker/config
 */

import { z } from 'zod';
import type { ModelPricing } from './types';

/**
 * Zod schema for model pricing.
 */
const ModelPricingSchema = z.object({
	name: z.string(),
	inputCostPer1k: z.number().nonnegative(),
	outputCostPer1k: z.number().nonnegative(),
});

/**
 * Zod schema for token tracker configuration.
 */
export const TokenTrackerConfigSchema = z.object({
	x: z.number().int().default(0),
	y: z.number().int().default(0),
	width: z.number().int().positive().default(40),
	height: z.number().int().positive().default(6),
	model: z.string().optional(),
	pricing: ModelPricingSchema.optional(),
	showCost: z.boolean().default(true),
	showThroughput: z.boolean().default(true),
	showSparkline: z.boolean().default(false),
	maxHistorySamples: z.number().int().positive().default(20),
	fg: z.union([z.string(), z.number()]).optional(),
	bg: z.union([z.string(), z.number()]).optional(),
});

/**
 * Built-in model pricing (cost per 1000 tokens in USD).
 */
export const DEFAULT_MODEL_PRICING: Record<string, ModelPricing> = {
	'claude-opus-4-6': {
		name: 'claude-opus-4-6',
		inputCostPer1k: 0.015,
		outputCostPer1k: 0.075,
	},
	'claude-sonnet-4-5': {
		name: 'claude-sonnet-4-5',
		inputCostPer1k: 0.003,
		outputCostPer1k: 0.015,
	},
	'claude-haiku-4-5': {
		name: 'claude-haiku-4-5',
		inputCostPer1k: 0.0008,
		outputCostPer1k: 0.004,
	},
	'gpt-4o': {
		name: 'gpt-4o',
		inputCostPer1k: 0.0025,
		outputCostPer1k: 0.01,
	},
	'gpt-4o-mini': {
		name: 'gpt-4o-mini',
		inputCostPer1k: 0.00015,
		outputCostPer1k: 0.0006,
	},
};

/** Default entity capacity for typed arrays */
export const DEFAULT_CAPACITY = 10000;
