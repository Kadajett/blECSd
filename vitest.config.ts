import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		// Test file patterns
		include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],

		// Enable globals (describe, it, expect)
		globals: true,

		// Environment
		environment: 'node',

		// Coverage configuration
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
			include: ['src/**/*.ts'],
			exclude: ['src/**/*.test.ts', 'src/**/*.spec.ts', 'src/**/index.ts'],
			thresholds: {
				lines: 80,
				functions: 80,
				branches: 80,
				statements: 80,
			},
		},

		// Timeouts
		testTimeout: 10000,
		hookTimeout: 10000,

		// Watch mode options
		watch: false,

		// Reporter
		reporters: ['default'],
	},
});
