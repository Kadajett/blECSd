import { defineConfig } from 'tsup';

export default defineConfig({
	entry: ['src/index.ts'],
	format: ['esm'],
	// TODO: Re-enable DTS and fix type errors
	dts: false,
	sourcemap: true,
	clean: true,
	minify: false,
	target: 'node22',
	outDir: 'dist',
	treeshake: true,
});
