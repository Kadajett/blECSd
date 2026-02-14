/**
 * Tests for the BigText widget.
 */

import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it } from 'vitest';
import { getContent } from '../components/content';
import { resetFocusState } from '../components/focusable';
import { addEntity, createWorld } from '../core/ecs';
import type { World } from '../core/types';
import { createBigText, loadFontFromPath, resetBigTextStore, setBigText } from './bigText';
import { loadFont } from './fonts';

describe('BigText widget', () => {
	let world: World;

	beforeEach(() => {
		world = createWorld();
		resetFocusState();
		resetBigTextStore();
	});

	it('loads a font from disk', () => {
		const path = fileURLToPath(new URL('./fonts/terminus-14-bold.json', import.meta.url));
		const font = loadFontFromPath(path);

		expect(font.name).toBe('Terminus');
		expect(font.charWidth).toBe(8);
		expect(font.charHeight).toBe(14);
	});

	it('renders text using built-in fonts', async () => {
		const eid = addEntity(world);
		await createBigText(world, eid, { text: 'A', font: 'terminus-14-bold' });

		const content = getContent(world, eid);
		const lines = content.split('\n');
		expect(lines).toHaveLength(14);
		expect(lines).toMatchSnapshot();
	});

	it('renders multi-line text', async () => {
		const eid = addEntity(world);
		await createBigText(world, eid, { text: 'A\nB', font: 'terminus-14-bold' });

		const content = getContent(world, eid);
		const lines = content.split('\n');
		expect(lines).toHaveLength(28);
		expect(lines[2]).toContain('█');
		expect(lines[16]).toContain('█');
	});

	it('updates text content', async () => {
		const eid = addEntity(world);
		await createBigText(world, eid, { text: 'A', font: 'terminus-14-bold' });

		// Font is now cached from createBigText, so setText works synchronously
		await loadFont('terminus-14-bold');
		setBigText(world, eid, 'B', 'terminus-14-bold');

		const content = getContent(world, eid);
		expect(content.split('\n')).toMatchSnapshot();
	});
});
