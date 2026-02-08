/**
 * Tests for tab size functionality in Content component.
 */

import { describe, expect, it } from 'vitest';
import { ZodError } from 'zod';
import { addEntity, createWorld } from '../core/ecs';
import type { World } from '../core/types';
import { DEFAULT_TAB_SIZE, getContentData, getTabSize, setContent, setTabSize } from './content';

describe('Content - tabSize', () => {
	let world: World;

	function setup(): World {
		return createWorld();
	}

	it('should have default tab size of 8', () => {
		world = setup();
		const entity = addEntity(world);

		setContent(world, entity, 'test');

		expect(getTabSize(world, entity)).toBe(8);
		expect(DEFAULT_TAB_SIZE).toBe(8);
	});

	it('should set tab size via setTabSize', () => {
		world = setup();
		const entity = addEntity(world);

		setTabSize(world, entity, 4);

		expect(getTabSize(world, entity)).toBe(4);
	});

	it('should set tab size via content options', () => {
		world = setup();
		const entity = addEntity(world);

		setContent(world, entity, 'test', { tabSize: 2 });

		expect(getTabSize(world, entity)).toBe(2);
	});

	it('should return tabSize in getContentData', () => {
		world = setup();
		const entity = addEntity(world);

		setContent(world, entity, 'test', { tabSize: 4 });
		const data = getContentData(world, entity);

		expect(data?.tabSize).toBe(4);
	});

	it('should validate tab size minimum (1)', () => {
		world = setup();
		const entity = addEntity(world);

		expect(() => setTabSize(world, entity, 0)).toThrow(ZodError);
		expect(() => setTabSize(world, entity, -1)).toThrow(ZodError);
	});

	it('should validate tab size maximum (16)', () => {
		world = setup();
		const entity = addEntity(world);

		expect(() => setTabSize(world, entity, 17)).toThrow(ZodError);
		expect(() => setTabSize(world, entity, 100)).toThrow(ZodError);
	});

	it('should accept valid tab sizes (1-16)', () => {
		world = setup();
		const entity = addEntity(world);

		// Test boundary values
		setTabSize(world, entity, 1);
		expect(getTabSize(world, entity)).toBe(1);

		setTabSize(world, entity, 16);
		expect(getTabSize(world, entity)).toBe(16);

		// Test common values
		setTabSize(world, entity, 2);
		expect(getTabSize(world, entity)).toBe(2);

		setTabSize(world, entity, 4);
		expect(getTabSize(world, entity)).toBe(4);

		setTabSize(world, entity, 8);
		expect(getTabSize(world, entity)).toBe(8);
	});

	it('should require integer tab size', () => {
		world = setup();
		const entity = addEntity(world);

		expect(() => setTabSize(world, entity, 4.5)).toThrow(ZodError);
		expect(() => setTabSize(world, entity, 3.14)).toThrow(ZodError);
	});

	it('should return default tab size for entity without Content component', () => {
		world = setup();
		const entity = addEntity(world);

		expect(getTabSize(world, entity)).toBe(DEFAULT_TAB_SIZE);
	});

	it('should chain setTabSize calls', () => {
		world = setup();
		const entity = addEntity(world);

		const result = setTabSize(world, entity, 4);

		expect(result).toBe(entity);
	});

	it('should preserve tab size when updating content', () => {
		world = setup();
		const entity = addEntity(world);

		setContent(world, entity, 'first', { tabSize: 4 });
		setContent(world, entity, 'second');

		// Tab size should be preserved
		expect(getTabSize(world, entity)).toBe(4);
	});

	it('should override tab size when explicitly set in options', () => {
		world = setup();
		const entity = addEntity(world);

		setContent(world, entity, 'first', { tabSize: 4 });
		setContent(world, entity, 'second', { tabSize: 2 });

		expect(getTabSize(world, entity)).toBe(2);
	});
});
