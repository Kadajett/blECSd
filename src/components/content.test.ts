import { beforeEach, describe, expect, it } from 'vitest';
import { addEntity, createWorld } from '../core/ecs';
import { TEXT_HELLO, TEXT_HELLO_WORLD, TEXT_TEST } from '../testing/fixtures';
import {
	appendContent,
	Content,
	clearContent,
	getContent,
	getContentData,
	getContentHash,
	getContentLength,
	getText,
	hasContent,
	isParsingTags,
	isTextWrapped,
	resetContentStore,
	setContent,
	setParseTags,
	setText,
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

			setContent(world, entity, TEXT_HELLO);

			expect(hasContent(world, entity)).toBe(true);
		});

		it('stores text content', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setContent(world, entity, TEXT_HELLO_WORLD);

			expect(getContent(world, entity)).toBe(TEXT_HELLO_WORLD);
		});

		it('sets content length', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setContent(world, entity, TEXT_HELLO);

			expect(Content.length[entity]).toBe(5);
		});

		it('sets content hash', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setContent(world, entity, TEXT_HELLO);

			expect(Content.hash[entity]).toBeGreaterThan(0);
		});

		it('updates hash when content changes', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setContent(world, entity, TEXT_HELLO);
			const hash1 = Content.hash[entity];

			setContent(world, entity, 'World');
			const hash2 = Content.hash[entity];

			expect(hash1).not.toBe(hash2);
		});

		it('sets options', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setContent(world, entity, TEXT_TEST, {
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

			setContent(world, entity, TEXT_TEST, {
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

			setContent(world, entity, TEXT_HELLO);
			appendContent(world, entity, ', World!');

			expect(getContent(world, entity)).toBe(TEXT_HELLO_WORLD);
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

			setContent(world, entity, TEXT_HELLO);
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

			setContent(world, entity, TEXT_HELLO);

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

	describe('setText', () => {
		it('strips ANSI codes from content', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setText(world, entity, '\x1b[31mRed Text\x1b[0m');

			expect(getContent(world, entity)).toBe('Red Text');
		});

		it('strips multiple ANSI codes', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setText(world, entity, '\x1b[1m\x1b[31mBold Red\x1b[0m Normal');

			expect(getContent(world, entity)).toBe('Bold Red Normal');
		});

		it('handles text without ANSI codes', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setText(world, entity, 'Plain text');

			expect(getContent(world, entity)).toBe('Plain text');
		});

		it('accepts options', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setText(world, entity, '\x1b[32mGreen\x1b[0m', { align: TextAlign.Center });

			expect(getContent(world, entity)).toBe('Green');
			expect(Content.align[entity]).toBe(TextAlign.Center);
		});

		it('returns entity for chaining', () => {
			const world = createWorld();
			const entity = addEntity(world);

			const result = setText(world, entity, 'test');

			expect(result).toBe(entity);
		});
	});

	describe('getText', () => {
		it('returns empty string for entity without Content', () => {
			const world = createWorld();
			const entity = addEntity(world);

			expect(getText(world, entity)).toBe('');
		});

		it('returns content with ANSI codes stripped', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setContent(world, entity, '\x1b[31mRed\x1b[0m');

			expect(getText(world, entity)).toBe('Red');
		});

		it('returns plain content unchanged', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setContent(world, entity, 'Plain text');

			expect(getText(world, entity)).toBe('Plain text');
		});

		it('strips complex ANSI sequences', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setContent(world, entity, '\x1b[38;5;196mColored\x1b[0m');

			expect(getText(world, entity)).toBe('Colored');
		});
	});
});
