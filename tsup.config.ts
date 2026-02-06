import { defineConfig } from 'tsup';

export default defineConfig({
	entry: [
		'src/index.ts',
		'src/components/index.ts',
		'src/systems/index.ts',
		'src/widgets/index.ts',
		'src/widgets/bigText.ts',
		'src/widgets/fonts/index.ts',
		'src/terminal/index.ts',
		'src/3d/index.ts',
		'src/schemas/index.ts',
		'src/utils/index.ts',
		'src/game/index.ts',
		'src/audio/index.ts',
		'src/cli/init.ts',
	],
	format: ['esm'],
	dts: true,
	sourcemap: true,
	clean: true,
	minify: false,
	target: 'node22',
	outDir: 'dist',
	treeshake: true,
});
