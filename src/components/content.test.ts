import { addEntity, createWorld } from 'bitecs';
import { beforeEach, describe, expect, it } from 'vitest';
import {
	appendContent,
	Content,
	clearContent,
	getContent,
	getContentData,
	getContentHash,
	getContentLength,
	hasContent,
	isParsingTags,
	isTextWrapped,
	resetContentStore,
	setContent,
	setParseTags,
	setTextAlign,
	setTextVAlign,
	setTextWrap,
	TextAlign,
	TextVAlign,
} from './content';

describe('Content component', () => {
	beforeEach(() => {
		resetContentStore();
	});

	describe('setContent', () => {
		it('adds Content component to entity', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setContent(world, entity, 'Hello');

			expect(hasContent(world, entity)).toBe(true);
		});

		it('stores text content', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setContent(world, entity, 'Hello, World!');

			expect(getContent(world, entity)).toBe('Hello, World!');
		});

		it('sets content length', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setContent(world, entity, 'Hello');

			expect(Content.length[entity]).toBe(5);
		});

		it('sets content hash', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setContent(world, entity, 'Hello');

			expect(Content.hash[entity]).toBeGreaterThan(0);
		});

		it('updates hash when content changes', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setContent(world, entity, 'Hello');
			const hash1 = Content.hash[entity];

			setContent(world, entity, 'World');
			const hash2 = Content.hash[entity];

			expect(hash1).not.toBe(hash2);
		});

		it('sets options', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setContent(world, entity, 'Test', {
				wrap: true,
				align: TextAlign.Center,
				valign: TextVAlign.Middle,
				parseTags: true,
			});

			expect(Content.wrap[entity]).toBe(1);
			expect(Content.align[entity]).toBe(TextAlign.Center);
			expect(Content.valign[entity]).toBe(TextVAlign.Middle);
			expect(Content.parseTags[entity]).toBe(1);
		});

		it('returns entity for chaining', () => {
			const world = createWorld();
			const entity = addEntity(world);

			const result = setContent(world, entity, 'Test');

			expect(result).toBe(entity);
		});

		it('handles empty string', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setContent(world, entity, '');

			expect(getContent(world, entity)).toBe('');
			expect(Content.length[entity]).toBe(0);
		});

		it('handles unicode content', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setContent(world, entity, '你好世界 🌍');

			expect(getContent(world, entity)).toBe('你好世界 🌍');
		});
	});

	describe('getContent', () => {
		it('returns empty string for entity without Content', () => {
			const world = createWorld();
			const entity = addEntity(world);

			expect(getContent(world, entity)).toBe('');
		});

		it('returns stored content', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setContent(world, entity, 'Test content');

			expect(getContent(world, entity)).toBe('Test content');
		});
	});

	describe('getContentData', () => {
		it('returns undefined for entity without Content', () => {
			const world = createWorld();
			const entity = addEntity(world);

			expect(getContentData(world, entity)).toBeUndefined();
		});

		it('returns full content data', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setContent(world, entity, 'Test', {
				wrap: true,
				align: TextAlign.Right,
				valign: TextVAlign.Bottom,
				parseTags: true,
			});

			const data = getContentData(world, entity);

			expect(data).toBeDefined();
			expect(data?.text).toBe('Test');
			expect(data?.length).toBe(4);
			expect(data?.hash).toBeGreaterThan(0);
			expect(data?.wrap).toBe(true);
			expect(data?.align).toBe(TextAlign.Right);
			expect(data?.valign).toBe(TextVAlign.Bottom);
			expect(data?.parseTags).toBe(true);
		});
	});

	describe('appendContent', () => {
		it('appends to existing content', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setContent(world, entity, 'Hello');
			appendContent(world, entity, ', World!');

			expect(getContent(world, entity)).toBe('Hello, World!');
		});

		it('creates content if none exists', () => {
			const world = createWorld();
			const entity = addEntity(world);

			appendContent(world, entity, 'New content');

			expect(getContent(world, entity)).toBe('New content');
		});

		it('updates length and hash', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setContent(world, entity, 'Hello');
			const hash1 = Content.hash[entity];

			appendContent(world, entity, '!');

			expect(Content.length[entity]).toBe(6);
			expect(Content.hash[entity]).not.toBe(hash1);
		});

		it('returns entity for chaining', () => {
			const world = createWorld();
			const entity = addEntity(world);

			const result = appendContent(world, entity, 'Test');

			expect(result).toBe(entity);
		});
	});

	describe('clearContent', () => {
		it('clears content', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setContent(world, entity, 'Test');
			clearContent(world, entity);

			expect(getContent(world, entity)).toBe('');
		});

		it('resets length and hash', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setContent(world, entity, 'Test');
			clearContent(world, entity);

			expect(Content.length[entity]).toBe(0);
			expect(Content.hash[entity]).toBe(0);
		});

		it('keeps component', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setContent(world, entity, 'Test');
			clearContent(world, entity);

			expect(hasContent(world, entity)).toBe(true);
		});

		it('returns entity for chaining', () => {
			const world = createWorld();
			const entity = addEntity(world);

			const result = clearContent(world, entity);

			expect(result).toBe(entity);
		});

		it('handles entity without Content', () => {
			const world = createWorld();
			const entity = addEntity(world);

			// Should not throw
			clearContent(world, entity);

			expect(hasContent(world, entity)).toBe(false);
		});
	});

	describe('hasContent', () => {
		it('returns true when entity has Content', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setContent(world, entity, 'Test');

			expect(hasContent(world, entity)).toBe(true);
		});

		it('returns false when entity lacks Content', () => {
			const world = createWorld();
			const entity = addEntity(world);

			expect(hasContent(world, entity)).toBe(false);
		});
	});

	describe('getContentLength', () => {
		it('returns 0 for entity without Content', () => {
			const world = createWorld();
			const entity = addEntity(world);

			expect(getContentLength(world, entity)).toBe(0);
		});

		it('returns content length', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setContent(world, entity, 'Hello');

			expect(getContentLength(world, entity)).toBe(5);
		});
	});

	describe('getContentHash', () => {
		it('returns 0 for entity without Content', () => {
			const world = createWorld();
			const entity = addEntity(world);

			expect(getContentHash(world, entity)).toBe(0);
		});

		it('returns content hash', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setContent(world, entity, 'Test');

			expect(getContentHash(world, entity)).toBeGreaterThan(0);
		});

		it('same content produces same hash', () => {
			const world = createWorld();
			const e1 = addEntity(world);
			const e2 = addEntity(world);

			setContent(world, e1, 'Same');
			setContent(world, e2, 'Same');

			expect(getContentHash(world, e1)).toBe(getContentHash(world, e2));
		});
	});

	describe('setTextAlign', () => {
		it('sets horizontal alignment', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setTextAlign(world, entity, TextAlign.Center);

			expect(Content.align[entity]).toBe(TextAlign.Center);
		});

		it('adds component if not present', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setTextAlign(world, entity, TextAlign.Right);

			expect(hasContent(world, entity)).toBe(true);
		});

		it('returns entity for chaining', () => {
			const world = createWorld();
			const entity = addEntity(world);

			const result = setTextAlign(world, entity, TextAlign.Left);

			expect(result).toBe(entity);
		});
	});

	describe('setTextVAlign', () => {
		it('sets vertical alignment', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setTextVAlign(world, entity, TextVAlign.Middle);

			expect(Content.valign[entity]).toBe(TextVAlign.Middle);
		});

		it('returns entity for chaining', () => {
			const world = createWorld();
			const entity = addEntity(world);

			const result = setTextVAlign(world, entity, TextVAlign.Bottom);

			expect(result).toBe(entity);
		});
	});

	describe('setTextWrap', () => {
		it('sets text wrap', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setTextWrap(world, entity, true);

			expect(Content.wrap[entity]).toBe(1);
		});

		it('can disable wrap', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setTextWrap(world, entity, true);
			setTextWrap(world, entity, false);

			expect(Content.wrap[entity]).toBe(0);
		});

		it('returns entity for chaining', () => {
			const world = createWorld();
			const entity = addEntity(world);

			const result = setTextWrap(world, entity, true);

			expect(result).toBe(entity);
		});
	});

	describe('isTextWrapped', () => {
		it('returns false for entity without Content', () => {
			const world = createWorld();
			const entity = addEntity(world);

			expect(isTextWrapped(world, entity)).toBe(false);
		});

		it('returns wrap status', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setTextWrap(world, entity, true);

			expect(isTextWrapped(world, entity)).toBe(true);
		});
	});

	describe('setParseTags', () => {
		it('sets parse tags', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setParseTags(world, entity, true);

			expect(Content.parseTags[entity]).toBe(1);
		});

		it('returns entity for chaining', () => {
			const world = createWorld();
			const entity = addEntity(world);

			const result = setParseTags(world, entity, true);

			expect(result).toBe(entity);
		});
	});

	describe('isParsingTags', () => {
		it('returns false for entity without Content', () => {
			const world = createWorld();
			const entity = addEntity(world);

			expect(isParsingTags(world, entity)).toBe(false);
		});

		it('returns parse tags status', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setParseTags(world, entity, true);

			expect(isParsingTags(world, entity)).toBe(true);
		});
	});

	describe('TextAlign enum', () => {
		it('has correct values', () => {
			expect(TextAlign.Left).toBe(0);
			expect(TextAlign.Center).toBe(1);
			expect(TextAlign.Right).toBe(2);
		});
	});

	describe('TextVAlign enum', () => {
		it('has correct values', () => {
			expect(TextVAlign.Top).toBe(0);
			expect(TextVAlign.Middle).toBe(1);
			expect(TextVAlign.Bottom).toBe(2);
		});
	});
});
