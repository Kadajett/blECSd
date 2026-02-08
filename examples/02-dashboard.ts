/**
 * Dashboard Example
 *
 * This example demonstrates:
 * - Creating panels with titles
 * - Creating lists with items
 * - Layout management
 * - Keyboard navigation
 *
 * Run with: tsx examples/02-dashboard.ts
 */

import {
	addEntity,
	appendChild,
	createList,
	createPanel,
	createText,
	createWorld,
	enableInput,
	getInputEventBus,
	render,
	selectNext,
	selectPrevious,
	setContent,
} from '../src/index';

// Create the ECS world
const world = createWorld();
enableInput(world);

// Create header panel
const header = createPanel(world, {
	x: 1,
	y: 1,
	width: 78,
	height: 3,
	title: 'System Dashboard',
	border: { type: 'double' },
});

// Create sidebar panel with menu
const sidebar = createPanel(world, {
	x: 1,
	y: 5,
	width: 25,
	height: 20,
	title: 'Menu',
	border: { type: 'single' },
});

const menuList = addEntity(world);
appendChild(world, sidebar, menuList);
createList(world, menuList, {
	items: [
		{ label: 'Overview', value: 'overview' },
		{ label: 'Performance', value: 'performance' },
		{ label: 'Logs', value: 'logs' },
		{ label: 'Settings', value: 'settings' },
		{ label: 'Help', value: 'help' },
	],
});

// Create main content panel
const mainPanel = createPanel(world, {
	x: 27,
	y: 5,
	width: 52,
	height: 15,
	title: 'Content',
	border: { type: 'single' },
});

const contentText = addEntity(world);
appendChild(world, mainPanel, contentText);
createText(world, {
	entity: contentText,
	content: 'Welcome to the Dashboard!\n\nUse arrow keys to navigate the menu.\nPress Enter to select.\nPress q to quit.',
	align: 'left',
});

// Create status bar
const statusBar = createPanel(world, {
	x: 27,
	y: 21,
	width: 52,
	height: 4,
	title: 'Status',
	border: { type: 'single' },
});

const statusText = addEntity(world);
appendChild(world, statusBar, statusText);
createText(world, {
	entity: statusText,
	content: 'System: Ready | Memory: 45% | CPU: 12%',
	align: 'center',
});

// Render initial frame
render(world);

// Handle input
const inputBus = getInputEventBus(world);
inputBus.on('key', (event) => {
	if (event.name === 'q') {
		process.exit(0);
	}

	if (event.name === 'up') {
		selectPrevious(world, menuList);
		render(world);
	}

	if (event.name === 'down') {
		selectNext(world, menuList);
		render(world);
	}

	if (event.name === 'return') {
		// Handle menu selection
		import { getSelectedItem } from '../src/index';
		const selected = getSelectedItem(world, menuList);
		if (selected) {
			setContent(
				world,
				contentText,
				`Selected: ${selected.label}\n\nThis would show the ${selected.label} page.`,
			);
			render(world);
		}
	}
});

console.log('\nDashboard Example');
console.log('Use arrow keys to navigate, Enter to select, q to quit\n');
