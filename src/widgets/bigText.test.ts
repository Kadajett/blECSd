/**
 * Tests for the BigText widget.
 */

import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it } from 'vitest';
import { getContent } from '../components/content';
import { resetFocusState } from '../components/focusable';
import { addEntity, createWorld } from '../core/ecs';
import type { World } from '../core/types';
import { createBigText, loadFont, resetBigTextStore, setText } from './bigText';

describe('BigText widget', () => {
	let world: World;

	beforeEach(() => {
		world = createWorld();
		resetFocusState();
		resetBigTextStore();
	});

	it('loads a font from disk', () => {
		const path = fileURLToPath(new URL('./fonts/terminus-14-bold.json', import.meta.url));
		const font = loadFont(path);

		expect(font.name).toBe('Terminus');
		expect(font.charWidth).toBe(8);
		expect(font.charHeight).toBe(14);
	});

	it('renders text using built-in fonts', () => {
		const eid = addEntity(world);
		createBigText(world, eid, { text: 'A', font: 'terminus-14-bold' });

		const content = getContent(world, eid);
		const lines = content.split('\n');
		expect(lines).toHaveLength(14);
		expect(lines).toMatchSnapshot();
	});

	it('renders multi-line text', () => {
		const eid = addEntity(world);
		createBigText(world, eid, { text: 'A\nB', font: 'terminus-14-bold' });

		const content = getContent(world, eid);
		const lines = content.split('\n');
		expect(lines).toHaveLength(28);
		expect(lines[2]).toContain('█');
		expect(lines[16]).toContain('█');
	});

	it('updates text content', () => {
		const eid = addEntity(world);
		createBigText(world, eid, { text: 'A', font: 'terminus-14-bold' });
		setText(world, eid, 'B', 'terminus-14-bold');

		const content = getContent(world, eid);
		expect(content.split('\n')).toMatchSnapshot();
	});
});
