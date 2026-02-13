/**
 * SearchOverlay Widget Tests
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { addEntity, createWorld } from '../core/ecs';
import type { Entity, World } from '../core/types';
import {
	attachSearchOverlay,
	createSearchOverlay,
	getSearchOverlayColors,
	getSearchOverlayTarget,
	isSearchOverlay,
	resetSearchOverlayStore,
	type SearchableContent,
	type SearchOverlayWidget,
} from './searchOverlay';

describe('SearchOverlay Widget', () => {
	let world: World;
	let eid: Entity;
	let overlay: SearchOverlayWidget;

	const sampleContent: SearchableContent = {
		getLineCount: () => 5,
		getLine: (index: number) => {
			const lines = [
				'Hello world',
				'foo bar baz',
				'Hello again',
				'testing 123',
				'Hello world again',
			];
			return lines[index];
		},
	};

	beforeEach(() => {
		resetSearchOverlayStore();
		world = createWorld() as World;
		eid = addEntity(world) as Entity;
	});

	describe('createSearchOverlay', () => {
		it('should create a search overlay widget', () => {
			overlay = createSearchOverlay(world);

			expect(overlay.eid).toBeDefined();
			expect(isSearchOverlay(world, overlay.eid)).toBe(true);
		});

		it('should start hidden', () => {
			overlay = createSearchOverlay(world);

			expect(overlay.isVisible()).toBe(false);
		});

		it('should initialize with default values', () => {
			overlay = createSearchOverlay(world);

			expect(overlay.getQuery()).toBe('');
			expect(overlay.getMode()).toBe('plain');
			expect(overlay.isCaseSensitive()).toBe(false);
			expect(overlay.getMatchCount()).toBe(0);
			expect(overlay.getCurrentMatchIndex()).toBe(-1);
		});

		it('should accept custom configuration', () => {
			overlay = createSearchOverlay(world, {
				mode: 'regex',
				caseSensitive: true,
				width: 60,
			});

			expect(overlay.getMode()).toBe('regex');
			expect(overlay.isCaseSensitive()).toBe(true);
		});
	});

	describe('visibility', () => {
		beforeEach(() => {
			overlay = createSearchOverlay(world);
		});

		it('should show the overlay', () => {
			const result = overlay.show();
			expect(result).toBe(overlay);
			expect(overlay.isVisible()).toBe(true);
		});

		it('should hide the overlay', () => {
			overlay.show();
			const result = overlay.hide();
			expect(result).toBe(overlay);
			expect(overlay.isVisible()).toBe(false);
		});

		it('should clear query when hidden', () => {
			overlay.show().setQuery('test');
			overlay.hide();
			expect(overlay.getQuery()).toBe('');
		});

		it('should fire close callbacks when hidden', () => {
			const callback = vi.fn();
			overlay.onClose(callback);
			overlay.show();
			overlay.hide();
			expect(callback).toHaveBeenCalled();
		});
	});

	describe('search query', () => {
		beforeEach(() => {
			overlay = createSearchOverlay(world);
			overlay.attachContent(sampleContent).show();
		});

		it('should set query', () => {
			const result = overlay.setQuery('Hello');
			expect(result).toBe(overlay);
			expect(overlay.getQuery()).toBe('Hello');
		});

		it('should append character', () => {
			overlay.appendChar('H').appendChar('e');
			expect(overlay.getQuery()).toBe('He');
		});

		it('should backspace', () => {
			overlay.setQuery('Hello');
			overlay.backspace();
			expect(overlay.getQuery()).toBe('Hell');
		});

		it('should not backspace past empty', () => {
			overlay.backspace();
			expect(overlay.getQuery()).toBe('');
		});

		it('should clear query', () => {
			overlay.setQuery('test');
			overlay.clearQuery();
			expect(overlay.getQuery()).toBe('');
		});
	});

	describe('plain text search', () => {
		beforeEach(() => {
			overlay = createSearchOverlay(world, { mode: 'plain' });
			overlay.attachContent(sampleContent).show();
		});

		it('should find matches case-insensitively by default', () => {
			overlay.setQuery('hello');
			expect(overlay.getMatchCount()).toBe(3);
		});

		it('should find matches case-sensitively when enabled', () => {
			overlay.setCaseSensitive(true).setQuery('Hello');
			expect(overlay.getMatchCount()).toBe(3);
		});

		it('should not find non-existent text', () => {
			overlay.setQuery('nonexistent');
			expect(overlay.getMatchCount()).toBe(0);
		});

		it('should return correct match positions', () => {
			overlay.setQuery('Hello');
			const matches = overlay.getMatches();
			expect(matches[0]).toEqual({ lineIndex: 0, charOffset: 0, length: 5 });
			expect(matches[1]).toEqual({ lineIndex: 2, charOffset: 0, length: 5 });
			expect(matches[2]).toEqual({ lineIndex: 4, charOffset: 0, length: 5 });
		});

		it('should clear matches when query is empty', () => {
			overlay.setQuery('Hello');
			expect(overlay.getMatchCount()).toBe(3);
			overlay.clearQuery();
			expect(overlay.getMatchCount()).toBe(0);
		});

		it('should escape regex characters in plain mode', () => {
			const specialContent: SearchableContent = {
				getLineCount: () => 2,
				getLine: (i) => ['test.file', 'testXfile'][i],
			};
			overlay.attachContent(specialContent);
			overlay.setQuery('test.file');
			expect(overlay.getMatchCount()).toBe(1);
		});
	});

	describe('regex search', () => {
		beforeEach(() => {
			overlay = createSearchOverlay(world, { mode: 'regex' });
			overlay.attachContent(sampleContent).show();
		});

		it('should support regex patterns', () => {
			overlay.setQuery('Hello.*$');
			expect(overlay.getMatchCount()).toBe(3);
		});

		it('should handle invalid regex gracefully', () => {
			overlay.setQuery('[invalid');
			expect(overlay.getMatchCount()).toBe(0);
		});

		it('should match digit patterns', () => {
			overlay.setQuery('\\d+');
			expect(overlay.getMatchCount()).toBe(1);
			expect(overlay.getMatches()[0]?.lineIndex).toBe(3);
		});
	});

	describe('match navigation', () => {
		beforeEach(() => {
			overlay = createSearchOverlay(world);
			overlay.attachContent(sampleContent).show();
			overlay.setQuery('Hello');
		});

		it('should start at first match', () => {
			expect(overlay.getCurrentMatchIndex()).toBe(0);
		});

		it('should navigate to next match', () => {
			overlay.nextMatch();
			expect(overlay.getCurrentMatchIndex()).toBe(1);
		});

		it('should wrap around to first match', () => {
			overlay.nextMatch(); // 1
			overlay.nextMatch(); // 2
			overlay.nextMatch(); // wraps to 0
			expect(overlay.getCurrentMatchIndex()).toBe(0);
		});

		it('should navigate to previous match', () => {
			overlay.nextMatch(); // 1
			overlay.prevMatch();
			expect(overlay.getCurrentMatchIndex()).toBe(0);
		});

		it('should wrap around to last match going backward', () => {
			overlay.prevMatch(); // wraps to 2
			expect(overlay.getCurrentMatchIndex()).toBe(2);
		});

		it('should not navigate when no matches', () => {
			overlay.setQuery('nonexistent');
			overlay.nextMatch();
			expect(overlay.getCurrentMatchIndex()).toBe(-1);
		});
	});

	describe('match status', () => {
		beforeEach(() => {
			overlay = createSearchOverlay(world);
			overlay.attachContent(sampleContent).show();
		});

		it('should return empty string when no query', () => {
			expect(overlay.getMatchStatus()).toBe('');
		});

		it('should return "No matches" when query has no matches', () => {
			overlay.setQuery('zzzzz');
			expect(overlay.getMatchStatus()).toBe('No matches');
		});

		it('should return "1 of N" format', () => {
			overlay.setQuery('Hello');
			expect(overlay.getMatchStatus()).toBe('1 of 3');
		});

		it('should update status on navigation', () => {
			overlay.setQuery('Hello');
			overlay.nextMatch();
			expect(overlay.getMatchStatus()).toBe('2 of 3');
		});
	});

	describe('search mode', () => {
		beforeEach(() => {
			overlay = createSearchOverlay(world);
		});

		it('should toggle mode between plain and regex', () => {
			expect(overlay.getMode()).toBe('plain');
			overlay.toggleMode();
			expect(overlay.getMode()).toBe('regex');
			overlay.toggleMode();
			expect(overlay.getMode()).toBe('plain');
		});

		it('should set mode directly', () => {
			overlay.setMode('regex');
			expect(overlay.getMode()).toBe('regex');
		});

		it('should re-search when mode changes', () => {
			overlay.attachContent(sampleContent).show();
			overlay.setQuery('\\d+');

			// In plain mode, looks for literal "\d+"
			expect(overlay.getMatchCount()).toBe(0);

			// Switch to regex
			overlay.setMode('regex');
			expect(overlay.getMatchCount()).toBe(1);
		});
	});

	describe('content attachment', () => {
		beforeEach(() => {
			overlay = createSearchOverlay(world);
		});

		it('should attach content', () => {
			const result = overlay.attachContent(sampleContent);
			expect(result).toBe(overlay);
		});

		it('should search attached content', () => {
			overlay.attachContent(sampleContent).show();
			overlay.setQuery('foo');
			expect(overlay.getMatchCount()).toBe(1);
		});

		it('should detach content', () => {
			overlay.attachContent(sampleContent).show();
			overlay.setQuery('foo');
			overlay.detachContent();
			expect(overlay.getMatchCount()).toBe(0);
		});

		it('should clear matches on detach', () => {
			overlay.attachContent(sampleContent).show();
			overlay.setQuery('Hello');
			overlay.detachContent();
			expect(overlay.getCurrentMatchIndex()).toBe(-1);
		});
	});

	describe('events', () => {
		beforeEach(() => {
			overlay = createSearchOverlay(world);
			overlay.attachContent(sampleContent).show();
		});

		it('should fire match change callback on query change', () => {
			const callback = vi.fn();
			overlay.onMatchChange(callback);

			overlay.setQuery('Hello');
			expect(callback).toHaveBeenCalledWith(expect.any(Array), 0);
		});

		it('should fire match change callback on navigation', () => {
			const callback = vi.fn();
			overlay.setQuery('Hello');
			overlay.onMatchChange(callback);

			overlay.nextMatch();
			expect(callback).toHaveBeenCalledWith(expect.any(Array), 1);
		});

		it('should unsubscribe match change callback', () => {
			const callback = vi.fn();
			const unsub = overlay.onMatchChange(callback);

			unsub();
			overlay.setQuery('Hello');
			expect(callback).not.toHaveBeenCalled();
		});

		it('should fire close callback', () => {
			const callback = vi.fn();
			overlay.onClose(callback);

			overlay.hide();
			expect(callback).toHaveBeenCalled();
		});

		it('should unsubscribe close callback', () => {
			const callback = vi.fn();
			const unsub = overlay.onClose(callback);

			unsub();
			overlay.hide();
			expect(callback).not.toHaveBeenCalled();
		});
	});

	describe('key handling', () => {
		beforeEach(() => {
			overlay = createSearchOverlay(world);
			overlay.attachContent(sampleContent);
		});

		it('should open on Ctrl+F', () => {
			const handled = overlay.handleKey('f', true);
			expect(handled).toBe(true);
			expect(overlay.isVisible()).toBe(true);
		});

		it('should not handle Ctrl+F when already visible', () => {
			overlay.show();
			// When visible, Ctrl+F is not consumed (key is 'f' without ctrl check)
			const handled = overlay.handleKey('f', true);
			// It should still return false for 'f' with ctrl when overlay is visible
			// because 'f' with ctrl is not a regular character
			expect(handled).toBe(false);
		});

		it('should close on Escape', () => {
			overlay.show();
			const handled = overlay.handleKey('escape');
			expect(handled).toBe(true);
			expect(overlay.isVisible()).toBe(false);
		});

		it('should append characters', () => {
			overlay.show();
			overlay.handleKey('h');
			overlay.handleKey('i');
			expect(overlay.getQuery()).toBe('hi');
		});

		it('should handle backspace', () => {
			overlay.show();
			overlay.setQuery('test');
			overlay.handleKey('backspace');
			expect(overlay.getQuery()).toBe('tes');
		});

		it('should navigate forward on Enter', () => {
			overlay.show();
			overlay.setQuery('Hello');
			overlay.handleKey('enter');
			expect(overlay.getCurrentMatchIndex()).toBe(1);
		});

		it('should navigate backward on Shift+Enter', () => {
			overlay.show();
			overlay.setQuery('Hello');
			overlay.handleKey('enter', false, true);
			expect(overlay.getCurrentMatchIndex()).toBe(2);
		});

		it('should toggle regex mode on Ctrl+R', () => {
			overlay.show();
			overlay.handleKey('r', true);
			expect(overlay.getMode()).toBe('regex');
		});

		it('should toggle case sensitivity on Ctrl+I', () => {
			overlay.show();
			overlay.handleKey('i', true);
			expect(overlay.isCaseSensitive()).toBe(true);
		});

		it('should not handle keys when hidden (except Ctrl+F)', () => {
			const handled = overlay.handleKey('a');
			expect(handled).toBe(false);
		});
	});

	describe('attachSearchOverlay', () => {
		it('should attach overlay to target entity', () => {
			overlay = createSearchOverlay(world);
			const targetEid = addEntity(world) as Entity;

			attachSearchOverlay(world, overlay, targetEid, sampleContent);

			expect(getSearchOverlayTarget(overlay.eid)).toBe(targetEid);
		});

		it('should search through attached content', () => {
			overlay = createSearchOverlay(world);
			const targetEid = addEntity(world) as Entity;

			attachSearchOverlay(world, overlay, targetEid, sampleContent);
			overlay.show().setQuery('Hello');

			expect(overlay.getMatchCount()).toBe(3);
		});
	});

	describe('utility functions', () => {
		it('should check if entity is search overlay', () => {
			overlay = createSearchOverlay(world);
			expect(isSearchOverlay(world, overlay.eid)).toBe(true);
			expect(isSearchOverlay(world, eid)).toBe(false);
		});

		it('should get target entity', () => {
			overlay = createSearchOverlay(world);
			expect(getSearchOverlayTarget(overlay.eid)).toBeNull();
		});

		it('should get colors', () => {
			overlay = createSearchOverlay(world, {
				matchFg: 0x111111ff,
				matchBg: 0x222222ff,
			});

			const colors = getSearchOverlayColors(overlay.eid);
			expect(colors).toBeDefined();
			expect(colors?.matchFg).toBe(0x111111ff);
			expect(colors?.matchBg).toBe(0x222222ff);
		});

		it('should return null colors for non-overlay entity', () => {
			const colors = getSearchOverlayColors(eid);
			expect(colors).toBeNull();
		});
	});

	describe('lifecycle', () => {
		it('should destroy the widget', () => {
			overlay = createSearchOverlay(world);
			const overlayEid = overlay.eid;

			expect(isSearchOverlay(world, overlayEid)).toBe(true);

			overlay.destroy();
			expect(isSearchOverlay(world, overlayEid)).toBe(false);
		});

		it('should fire close callbacks on destroy if visible', () => {
			overlay = createSearchOverlay(world);
			const callback = vi.fn();
			overlay.onClose(callback);
			overlay.show();
			overlay.destroy();
			expect(callback).toHaveBeenCalled();
		});
	});

	describe('edge cases', () => {
		beforeEach(() => {
			overlay = createSearchOverlay(world);
		});

		it('should handle empty content', () => {
			const emptyContent: SearchableContent = {
				getLineCount: () => 0,
				getLine: () => undefined,
			};
			overlay.attachContent(emptyContent).show();
			overlay.setQuery('test');
			expect(overlay.getMatchCount()).toBe(0);
		});

		it('should handle content with undefined lines', () => {
			const sparseContent: SearchableContent = {
				getLineCount: () => 3,
				getLine: (i) => (i === 1 ? 'match' : undefined),
			};
			overlay.attachContent(sparseContent).show();
			overlay.setQuery('match');
			expect(overlay.getMatchCount()).toBe(1);
		});

		it('should handle multiple matches on same line', () => {
			const content: SearchableContent = {
				getLineCount: () => 1,
				getLine: () => 'aaa',
			};
			overlay.attachContent(content).show();
			overlay.setQuery('a');
			expect(overlay.getMatchCount()).toBe(3);
		});

		it('should handle case-sensitive search', () => {
			overlay.attachContent(sampleContent).show();
			overlay.setCaseSensitive(true).setQuery('hello');
			expect(overlay.getMatchCount()).toBe(0);

			overlay.setQuery('Hello');
			expect(overlay.getMatchCount()).toBe(3);
		});
	});
});
