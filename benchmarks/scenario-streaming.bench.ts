/**
 * Real-World Scenario Benchmark: High-Throughput Streaming Content
 *
 * Simulates streaming text/markdown widgets receiving high-throughput content:
 * - Real-time log streaming
 * - Markdown rendering with code blocks
 * - Syntax highlighting
 * - ANSI escape sequence parsing
 * - Scrollback buffer management
 *
 * Measures performance under continuous content updates.
 */

import { bench, describe } from 'vitest';

describe('Streaming Content Scenario', () => {
	bench('log streaming: 1000 lines @ high throughput', () => {
		const { createWorld } = require('../src/core/world');
		const { addEntity, removeEntity } = require('../src/core/ecs');
		const { initializeScreen } = require('../src/components/screen');
		const { createStreamingText } = require('../src/widgets/streamingText');
		const { layoutSystem } = require('../src/systems/layoutSystem');
		const { renderSystem } = require('../src/systems/renderSystem');

		const world = createWorld();
		initializeScreen(world, 120, 40);

		const eid = addEntity(world);
		const widget = createStreamingText(world, eid, {
			position: { x: 0, y: 0 },
			dimensions: { width: 120, height: 40 },
			scrollback: 5000,
		});

		// Initial render
		layoutSystem(world);
		renderSystem(world);

		// Stream 1000 log lines
		const logLevels = ['INFO', 'DEBUG', 'WARN', 'ERROR'];
		const services = ['api', 'db', 'cache', 'queue', 'worker'];
		const messages = [
			'Request processed successfully',
			'Connection established',
			'Query executed in 45ms',
			'Cache miss for key',
			'Rate limit exceeded',
			'Retry attempt 3/5',
			'Authentication failed',
			'Job completed',
		];

		for (let i = 0; i < 1000; i++) {
			const timestamp = new Date(Date.now() + i * 1000).toISOString();
			const level = logLevels[Math.floor(Math.random() * logLevels.length)];
			const service = services[Math.floor(Math.random() * services.length)];
			const message = messages[Math.floor(Math.random() * messages.length)];
			const line = `${timestamp} [${level}] [${service}] ${message}`;

			widget.appendLine(line);

			// Re-render every 10 lines
			if (i % 10 === 0) {
				layoutSystem(world);
				renderSystem(world);
			}
		}

		// Final render
		layoutSystem(world);
		renderSystem(world);

		// Cleanup
		removeEntity(world, eid);
	});

	bench('markdown streaming: 100 blocks with code and formatting', () => {
		const { createWorld } = require('../src/core/world');
		const { addEntity, removeEntity } = require('../src/core/ecs');
		const { initializeScreen } = require('../src/components/screen');
		const { createMarkdown } = require('../src/widgets/markdown');
		const { layoutSystem } = require('../src/systems/layoutSystem');
		const { renderSystem } = require('../src/systems/renderSystem');

		const world = createWorld();
		initializeScreen(world, 100, 50);

		const eid = addEntity(world);
		const widget = createMarkdown(world, eid, {
			position: { x: 0, y: 0 },
			dimensions: { width: 100, height: 50 },
			content: '',
		});

		// Initial render
		layoutSystem(world);
		renderSystem(world);

		// Stream 100 markdown blocks with mixed content
		const codeLanguages = ['javascript', 'python', 'rust', 'sql'];
		const codeSnippets = [
			'function hello() {\n  console.log("Hello, world!");\n}',
			'def calculate(x, y):\n    return x * y + 10',
			'fn main() {\n    println!("Hello!");\n}',
			'SELECT * FROM users WHERE id = 1;',
		];

		let content = '';

		for (let i = 0; i < 100; i++) {
			// Add heading
			content += `\n## Section ${i + 1}\n\n`;

			// Add paragraph
			content += `This is paragraph ${i + 1} with **bold text** and *italic text*.\n\n`;

			// Add code block (every 3rd iteration)
			if (i % 3 === 0) {
				const lang = codeLanguages[Math.floor(Math.random() * codeLanguages.length)];
				const snippet = codeSnippets[Math.floor(Math.random() * codeSnippets.length)];
				content += `\`\`\`${lang}\n${snippet}\n\`\`\`\n\n`;
			}

			// Add list (every 5th iteration)
			if (i % 5 === 0) {
				content += '- Item 1\n- Item 2\n- Item 3\n\n';
			}

			// Update widget with accumulated content
			createMarkdown(world, eid, { content });

			// Re-render every 10 blocks
			if (i % 10 === 0) {
				layoutSystem(world);
				renderSystem(world);
			}
		}

		// Final render
		layoutSystem(world);
		renderSystem(world);

		// Cleanup
		removeEntity(world, eid);
	});

	bench('ANSI streaming: 500 lines with colors and formatting', () => {
		const { createWorld } = require('../src/core/world');
		const { addEntity, removeEntity } = require('../src/core/ecs');
		const { initializeScreen } = require('../src/components/screen');
		const { createStreamingText } = require('../src/widgets/streamingText');
		const { layoutSystem } = require('../src/systems/layoutSystem');
		const { renderSystem } = require('../src/systems/renderSystem');

		const world = createWorld();
		initializeScreen(world, 100, 40);

		const eid = addEntity(world);
		const widget = createStreamingText(world, eid, {
			position: { x: 0, y: 0 },
			dimensions: { width: 100, height: 40 },
			scrollback: 2000,
			parseANSI: true,
		});

		// Initial render
		layoutSystem(world);
		renderSystem(world);

		// ANSI color codes
		const colors = {
			reset: '\x1b[0m',
			red: '\x1b[31m',
			green: '\x1b[32m',
			yellow: '\x1b[33m',
			blue: '\x1b[34m',
			bold: '\x1b[1m',
			dim: '\x1b[2m',
		};

		// Stream 500 lines with ANSI formatting
		for (let i = 0; i < 500; i++) {
			const colorKeys = Object.keys(colors).filter((k) => k !== 'reset');
			const randomColor = colorKeys[Math.floor(Math.random() * colorKeys.length)] as keyof typeof colors;
			const color = colors[randomColor];

			const line = `${color}${colors.bold}Line ${i + 1}:${colors.reset} This is a test line with ${color}colored text${colors.reset}`;

			widget.appendLine(line);

			// Re-render every 20 lines
			if (i % 20 === 0) {
				layoutSystem(world);
				renderSystem(world);
			}
		}

		// Final render
		layoutSystem(world);
		renderSystem(world);

		// Cleanup
		removeEntity(world, eid);
	});

	bench('multi-stream: 5 parallel log feeds @ high throughput', () => {
		const { createWorld } = require('../src/core/world');
		const { addEntity, removeEntity } = require('../src/core/ecs');
		const { initializeScreen } = require('../src/components/screen');
		const { createStreamingText } = require('../src/widgets/streamingText');
		const { layoutSystem } = require('../src/systems/layoutSystem');
		const { renderSystem } = require('../src/systems/renderSystem');

		const world = createWorld();
		initializeScreen(world, 200, 50);

		// Create 5 parallel streaming widgets
		const feeds: Array<{ eid: number; widget: any }> = [];
		for (let i = 0; i < 5; i++) {
			const eid = addEntity(world);
			const widget = createStreamingText(world, eid, {
				position: { x: i * 40, y: 0 },
				dimensions: { width: 40, height: 50 },
				scrollback: 2000,
			});
			feeds.push({ eid, widget });
		}

		// Initial render
		layoutSystem(world);
		renderSystem(world);

		const logMessages = [
			'[INFO] Service started',
			'[DEBUG] Processing batch',
			'[WARN] Queue backlog growing',
			'[ERROR] Connection failed',
			'[INFO] Request completed',
		];

		// Stream 200 lines to each feed (1000 total lines)
		for (let i = 0; i < 200; i++) {
			// Add line to each feed
			for (let f = 0; f < feeds.length; f++) {
				const feed = feeds[f] as { eid: number; widget: any };
				const timestamp = new Date(Date.now() + i * 100).toISOString();
				const msg = logMessages[Math.floor(Math.random() * logMessages.length)];
				const line = `${timestamp} Feed ${f}: ${msg}`;

				feed.widget.appendLine(line);
			}

			// Re-render every 10 iterations (50 total lines added per render)
			if (i % 10 === 0) {
				layoutSystem(world);
				renderSystem(world);
			}
		}

		// Final render
		layoutSystem(world);
		renderSystem(world);

		// Cleanup
		for (const feed of feeds) {
			removeEntity(world, feed.eid);
		}
	});

	bench('streaming with scrollback pruning: 10,000 lines with 1000-line buffer', () => {
		const { createWorld } = require('../src/core/world');
		const { addEntity, removeEntity } = require('../src/core/ecs');
		const { initializeScreen } = require('../src/components/screen');
		const { createStreamingText } = require('../src/widgets/streamingText');
		const { layoutSystem } = require('../src/systems/layoutSystem');
		const { renderSystem } = require('../src/systems/renderSystem');

		const world = createWorld();
		initializeScreen(world, 100, 30);

		const eid = addEntity(world);
		const widget = createStreamingText(world, eid, {
			position: { x: 0, y: 0 },
			dimensions: { width: 100, height: 30 },
			scrollback: 1000, // Buffer limited to 1000 lines
		});

		// Initial render
		layoutSystem(world);
		renderSystem(world);

		// Stream 10,000 lines (will trigger scrollback pruning)
		for (let i = 0; i < 10000; i++) {
			const line = `Log entry ${i + 1}: This is a test message with some content`;
			widget.appendLine(line);

			// Re-render every 100 lines
			if (i % 100 === 0) {
				layoutSystem(world);
				renderSystem(world);
			}
		}

		// Final render
		layoutSystem(world);
		renderSystem(world);

		// Cleanup
		removeEntity(world, eid);
	});
});
