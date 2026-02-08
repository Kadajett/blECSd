/**
 * Real-World Scenario Benchmark: File Browser with Tree Navigation
 *
 * Simulates a file browser with:
 * - Tree structure navigation
 * - Expanding/collapsing folders
 * - Keyboard navigation
 * - Rendering updates
 */

import { describe, bench } from 'vitest';
import { addEntity } from '../src/core/ecs';
import type { World } from '../src/core/types';
import { createWorld } from '../src/core/world';
import { setPosition } from '../src/components/position';
import { setDimensions } from '../src/components/dimensions';
import {
	createTree,
	addTreeNode,
	expandTreeNode,
	collapseTreeNode,
	selectTreeNode,
} from '../src/widgets/tree';
import { layoutSystem } from '../src/systems/layoutSystem';
import { renderSystem } from '../src/systems/renderSystem';
import { createScheduler, LoopPhase } from '../src/core/scheduler';
import { initializeScreen } from '../src/components/screen';

/**
 * Creates a mock file tree structure
 */
function createFileTree(world: World, entity: number, depth: number, breadth: number) {
	const tree = createTree(world, entity, {
		showIcons: true,
		indent: 2,
	});

	// Build tree structure recursively
	function buildNode(parentId: number | null, currentDepth: number, path: string) {
		if (currentDepth >= depth) return;

		for (let i = 0; i < breadth; i++) {
			const isFolder = currentDepth < depth - 1;
			const name = isFolder ? `folder-${i}` : `file-${i}.txt`;
			const fullPath = parentId === null ? name : `${path}/${name}`;

			const nodeId = addTreeNode(tree, {
				label: name,
				value: fullPath,
				parentId,
				expanded: false,
				icon: isFolder ? '📁' : '📄',
			});

			if (isFolder) {
				buildNode(nodeId, currentDepth + 1, fullPath);
			}
		}
	}

	buildNode(null, 0, '');
	return tree;
}

describe('File Browser Scenario', () => {
	bench('3-level tree, 10 items/level - navigate 1000 times', () => {
		const world = createWorld();
		initializeScreen(world, 80, 24);
		const scheduler = createScheduler();
		scheduler.registerSystem(LoopPhase.LAYOUT, layoutSystem);
		scheduler.registerSystem(LoopPhase.RENDER, renderSystem);

		const entity = addEntity(world);
		setPosition(world, entity, 0, 0);
		setDimensions(world, entity, { width: 40, height: 24 });

		const tree = createFileTree(world, entity, 3, 10);
		const allNodes = Object.keys(tree.nodes).map(Number);

		// Simulate navigation
		for (let i = 0; i < 1000; i++) {
			const nodeId = allNodes[i % allNodes.length] as number;
			selectTreeNode(tree, nodeId);
			scheduler.run(world, 1 / 60);
		}
	});

	bench('4-level tree, 5 items/level - expand/collapse 500 times', () => {
		const world = createWorld();
		initializeScreen(world, 80, 24);
		const scheduler = createScheduler();
		scheduler.registerSystem(LoopPhase.LAYOUT, layoutSystem);
		scheduler.registerSystem(LoopPhase.RENDER, renderSystem);

		const entity = addEntity(world);
		setPosition(world, entity, 0, 0);
		setDimensions(world, entity, { width: 40, height: 24 });

		const tree = createFileTree(world, entity, 4, 5);
		const folderNodes = Object.values(tree.nodes)
			.filter((node) => {
				// Find nodes with children (folders)
				return Object.values(tree.nodes).some((n) => n.parentId === node.id);
			})
			.map((node) => node.id);

		// Simulate expanding/collapsing folders
		for (let i = 0; i < 500; i++) {
			const nodeId = folderNodes[i % folderNodes.length] as number;
			const node = tree.nodes[nodeId];

			if (node?.expanded) {
				collapseTreeNode(tree, nodeId);
			} else {
				expandTreeNode(tree, nodeId);
			}

			scheduler.run(world, 1 / 60);
		}
	});

	bench('5-level tree, 8 items/level - full tree expansion', () => {
		const world = createWorld();
		initializeScreen(world, 80, 24);
		const scheduler = createScheduler();
		scheduler.registerSystem(LoopPhase.LAYOUT, layoutSystem);
		scheduler.registerSystem(LoopPhase.RENDER, renderSystem);

		const entity = addEntity(world);
		setPosition(world, entity, 0, 0);
		setDimensions(world, entity, { width: 40, height: 24 });

		const tree = createFileTree(world, entity, 5, 8);
		const folderNodes = Object.values(tree.nodes)
			.filter((node) => {
				return Object.values(tree.nodes).some((n) => n.parentId === node.id);
			})
			.map((node) => node.id);

		// Expand entire tree
		for (const nodeId of folderNodes) {
			expandTreeNode(tree, nodeId);
			scheduler.run(world, 1 / 60);
		}

		// Collapse entire tree
		for (const nodeId of folderNodes) {
			collapseTreeNode(tree, nodeId);
			scheduler.run(world, 1 / 60);
		}
	});

	bench('Large tree (1000 nodes) - keyboard navigation', () => {
		const world = createWorld();
		initializeScreen(world, 80, 24);
		const scheduler = createScheduler();
		scheduler.registerSystem(LoopPhase.LAYOUT, layoutSystem);
		scheduler.registerSystem(LoopPhase.RENDER, renderSystem);

		const entity = addEntity(world);
		setPosition(world, entity, 0, 0);
		setDimensions(world, entity, { width: 40, height: 24 });

		// Create a flat tree with 1000 nodes
		const tree = createTree(world, entity, { showIcons: true, indent: 2 });
		for (let i = 0; i < 1000; i++) {
			addTreeNode(tree, {
				label: `item-${i}`,
				value: i,
				parentId: null,
			});
		}

		// Simulate arrow key navigation (down then up)
		const allNodes = Object.keys(tree.nodes).map(Number);

		// Navigate down
		for (let i = 0; i < allNodes.length; i++) {
			selectTreeNode(tree, allNodes[i] as number);
			scheduler.run(world, 1 / 60);
		}

		// Navigate up
		for (let i = allNodes.length - 1; i >= 0; i--) {
			selectTreeNode(tree, allNodes[i] as number);
			scheduler.run(world, 1 / 60);
		}
	});
});
