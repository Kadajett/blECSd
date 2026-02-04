import { defineConfig } from 'tsup';

export default defineConfig({
	entry: ['src/index.ts', 'src/widgets/index.ts', 'src/widgets/fonts/index.ts'],
	format: ['esm'],
	dts: true,
	sourcemap: true,
	clean: true,
	minify: false,
	target: 'node22',
	outDir: 'dist',
	treeshake: true,
});
