/**
 * Tests for the WebSocket HTML client page generator.
 */

import { describe, expect, it } from 'vitest';
import { getClientPage } from './webClient';

describe('webClient', () => {
	describe('getClientPage', () => {
		it('generates valid HTML with title', () => {
			const html = getClientPage('My App');
			expect(html).toContain('<!DOCTYPE html>');
			expect(html).toContain('<title>My App</title>');
			expect(html).toContain('xterm');
		});

		it('escapes HTML in title', () => {
			const html = getClientPage('<script>alert("xss")</script>');
			expect(html).not.toContain('<script>alert("xss")</script>');
			expect(html).toContain('&lt;script&gt;');
		});

		it('includes auth token when provided', () => {
			const html = getClientPage('App', 'my-secret');
			expect(html).toContain('"my-secret"');
		});

		it('sets auth token to null when not provided', () => {
			const html = getClientPage('App');
			expect(html).toContain('AUTH_TOKEN = null');
		});

		it('includes xterm.js CDN link', () => {
			const html = getClientPage('App');
			expect(html).toContain('cdn.jsdelivr.net/npm/@xterm/xterm');
		});

		it('includes fit addon', () => {
			const html = getClientPage('App');
			expect(html).toContain('addon-fit');
			expect(html).toContain('FitAddon');
		});

		it('includes WebSocket connection logic', () => {
			const html = getClientPage('App');
			expect(html).toContain('new WebSocket');
			expect(html).toContain('/ws');
		});

		it('includes resize handling', () => {
			const html = getClientPage('App');
			expect(html).toContain('resize');
			expect(html).toContain('term.cols');
			expect(html).toContain('term.rows');
		});

		it('includes reconnection logic', () => {
			const html = getClientPage('App');
			expect(html).toContain('reconnect');
		});
	});
});
