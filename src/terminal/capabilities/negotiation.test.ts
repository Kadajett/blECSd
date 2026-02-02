/**
 * Capability Negotiation Tests
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
	capabilityQuery,
	createCapabilityNegotiator,
	DEFAULT_QUERY_TIMEOUT,
	GraphicsProtocol,
	getDefaultNegotiator,
	getTerminalCapabilities,
	hasCapability,
	KittyKeyboardLevel,
	MAX_QUERY_TIMEOUT,
	MIN_QUERY_TIMEOUT,
	NegotiationTiming,
	resetDefaultNegotiator,
} from './negotiation';

describe('negotiation', () => {
	// Store original env
	const originalEnv = { ...process.env };

	beforeEach(() => {
		// Reset env
		process.env = { ...originalEnv };
		// Reset default negotiator
		resetDefaultNegotiator();
	});

	afterEach(() => {
		// Restore env
		process.env = originalEnv;
		// Clean up
		resetDefaultNegotiator();
	});

	describe('constants', () => {
		it('should have correct default timeout', () => {
			expect(DEFAULT_QUERY_TIMEOUT).toBe(100);
		});

		it('should have correct min timeout', () => {
			expect(MIN_QUERY_TIMEOUT).toBe(10);
		});

		it('should have correct max timeout', () => {
			expect(MAX_QUERY_TIMEOUT).toBe(5000);
		});
	});

	describe('KittyKeyboardLevel', () => {
		it('should have correct level values', () => {
			expect(KittyKeyboardLevel.DISABLED).toBe(0);
			expect(KittyKeyboardLevel.DISAMBIGUATE).toBe(1);
			expect(KittyKeyboardLevel.REPORT_EVENTS).toBe(2);
			expect(KittyKeyboardLevel.REPORT_ALTERNATES).toBe(4);
			expect(KittyKeyboardLevel.REPORT_ALL).toBe(8);
			expect(KittyKeyboardLevel.REPORT_TEXT).toBe(16);
		});
	});

	describe('GraphicsProtocol', () => {
		it('should have correct protocol values', () => {
			expect(GraphicsProtocol.NONE).toBe('none');
			expect(GraphicsProtocol.KITTY).toBe('kitty');
			expect(GraphicsProtocol.ITERM2).toBe('iterm2');
			expect(GraphicsProtocol.SIXEL).toBe('sixel');
		});
	});

	describe('NegotiationTiming', () => {
		it('should have correct timing values', () => {
			expect(NegotiationTiming.EAGER).toBe('eager');
			expect(NegotiationTiming.LAZY).toBe('lazy');
			expect(NegotiationTiming.SKIP).toBe('skip');
		});
	});

	describe('createCapabilityNegotiator', () => {
		it('should create a negotiator with default config', () => {
			const negotiator = createCapabilityNegotiator({
				timing: 'skip',
			});

			expect(negotiator).toBeDefined();
			expect(negotiator.getTimeout()).toBe(DEFAULT_QUERY_TIMEOUT);
			expect(negotiator.isNegotiated()).toBe(false);

			negotiator.destroy();
		});

		it('should respect custom timeout', () => {
			const negotiator = createCapabilityNegotiator({
				timing: 'skip',
				timeout: 200,
			});

			expect(negotiator.getTimeout()).toBe(200);

			negotiator.destroy();
		});

		it('should clamp timeout to min', () => {
			const negotiator = createCapabilityNegotiator({
				timing: 'skip',
				timeout: 1,
			});

			expect(negotiator.getTimeout()).toBe(MIN_QUERY_TIMEOUT);

			negotiator.destroy();
		});

		it('should clamp timeout to max', () => {
			const negotiator = createCapabilityNegotiator({
				timing: 'skip',
				timeout: 100000,
			});

			expect(negotiator.getTimeout()).toBe(MAX_QUERY_TIMEOUT);

			negotiator.destroy();
		});

		it('should allow setting timeout', () => {
			const negotiator = createCapabilityNegotiator({
				timing: 'skip',
			});

			negotiator.setTimeout(500);
			expect(negotiator.getTimeout()).toBe(500);

			negotiator.setTimeout(1); // Below min
			expect(negotiator.getTimeout()).toBe(MIN_QUERY_TIMEOUT);

			negotiator.destroy();
		});
	});

	describe('skip timing', () => {
		it('should return environment-detected capabilities immediately', async () => {
			const negotiator = createCapabilityNegotiator({
				timing: 'skip',
			});

			const caps = await negotiator.getCapabilities();

			expect(caps).toBeDefined();
			expect(typeof caps.truecolor).toBe('boolean');
			expect(typeof caps.focusEvents).toBe('boolean');
			expect(typeof caps.bracketedPaste).toBe('boolean');
			expect(negotiator.isNegotiated()).toBe(true);

			negotiator.destroy();
		});

		it('should cache capabilities', async () => {
			const negotiator = createCapabilityNegotiator({
				timing: 'skip',
			});

			const caps1 = await negotiator.getCapabilities();
			const caps2 = await negotiator.getCapabilities();

			expect(caps1).toBe(caps2); // Same reference

			negotiator.destroy();
		});

		it('should return cached capabilities', async () => {
			const negotiator = createCapabilityNegotiator({
				timing: 'skip',
			});

			expect(negotiator.getCachedCapabilities()).toBeNull();

			await negotiator.getCapabilities();

			expect(negotiator.getCachedCapabilities()).not.toBeNull();

			negotiator.destroy();
		});
	});

	describe('forceCapabilities', () => {
		it('should override detected capabilities', async () => {
			const negotiator = createCapabilityNegotiator({
				timing: 'skip',
				forceCapabilities: {
					truecolor: true,
					kittyKeyboard: KittyKeyboardLevel.REPORT_ALL,
					graphics: GraphicsProtocol.KITTY,
				},
			});

			const caps = await negotiator.getCapabilities();

			expect(caps.truecolor).toBe(true);
			expect(caps.kittyKeyboard).toBe(KittyKeyboardLevel.REPORT_ALL);
			expect(caps.graphics).toBe(GraphicsProtocol.KITTY);

			negotiator.destroy();
		});
	});

	describe('renegotiate', () => {
		it('should clear cache and re-negotiate', async () => {
			const negotiator = createCapabilityNegotiator({
				timing: 'skip',
			});

			const caps1 = await negotiator.getCapabilities();
			expect(negotiator.isNegotiated()).toBe(true);

			const caps2 = await negotiator.renegotiate();
			expect(negotiator.isNegotiated()).toBe(true);

			// Should be new object (different reference)
			// In skip mode with same env, values should be same
			expect(caps2).not.toBe(caps1);
			expect(caps2.truecolor).toBe(caps1.truecolor);

			negotiator.destroy();
		});
	});

	describe('destroy', () => {
		it('should clean up and throw on subsequent calls', async () => {
			const negotiator = createCapabilityNegotiator({
				timing: 'skip',
			});

			negotiator.destroy();

			await expect(negotiator.getCapabilities()).rejects.toThrow('Negotiator has been destroyed');

			await expect(negotiator.renegotiate()).rejects.toThrow('Negotiator has been destroyed');
		});
	});

	describe('environment detection', () => {
		describe('truecolor', () => {
			it('should detect COLORTERM=truecolor', async () => {
				process.env['COLORTERM'] = 'truecolor';

				const negotiator = createCapabilityNegotiator({ timing: 'skip' });
				const caps = await negotiator.getCapabilities();

				expect(caps.truecolor).toBe(true);

				negotiator.destroy();
			});

			it('should detect COLORTERM=24bit', async () => {
				process.env['COLORTERM'] = '24bit';

				const negotiator = createCapabilityNegotiator({ timing: 'skip' });
				const caps = await negotiator.getCapabilities();

				expect(caps.truecolor).toBe(true);

				negotiator.destroy();
			});

			it('should detect Kitty terminal', async () => {
				process.env['KITTY_WINDOW_ID'] = '1';

				const negotiator = createCapabilityNegotiator({ timing: 'skip' });
				const caps = await negotiator.getCapabilities();

				expect(caps.truecolor).toBe(true);

				negotiator.destroy();
			});

			it('should detect Windows Terminal', async () => {
				process.env['WT_SESSION'] = 'session-id';

				const negotiator = createCapabilityNegotiator({ timing: 'skip' });
				const caps = await negotiator.getCapabilities();

				expect(caps.truecolor).toBe(true);

				negotiator.destroy();
			});

			it('should detect Alacritty', async () => {
				process.env['TERM'] = 'alacritty';

				const negotiator = createCapabilityNegotiator({ timing: 'skip' });
				const caps = await negotiator.getCapabilities();

				expect(caps.truecolor).toBe(true);

				negotiator.destroy();
			});

			it('should detect iTerm2', async () => {
				process.env['TERM_PROGRAM'] = 'iTerm.app';

				const negotiator = createCapabilityNegotiator({ timing: 'skip' });
				const caps = await negotiator.getCapabilities();

				expect(caps.truecolor).toBe(true);

				negotiator.destroy();
			});

			it('should detect VTE 3600+', async () => {
				process.env['VTE_VERSION'] = '5000';

				const negotiator = createCapabilityNegotiator({ timing: 'skip' });
				const caps = await negotiator.getCapabilities();

				expect(caps.truecolor).toBe(true);

				negotiator.destroy();
			});
		});

		describe('kittyKeyboard', () => {
			it('should detect Kitty terminal', async () => {
				process.env['KITTY_WINDOW_ID'] = '1';

				const negotiator = createCapabilityNegotiator({ timing: 'skip' });
				const caps = await negotiator.getCapabilities();

				expect(caps.kittyKeyboard).toBe(KittyKeyboardLevel.REPORT_ALL);

				negotiator.destroy();
			});

			it('should detect WezTerm', async () => {
				process.env['TERM_PROGRAM'] = 'WezTerm';

				const negotiator = createCapabilityNegotiator({ timing: 'skip' });
				const caps = await negotiator.getCapabilities();

				expect(caps.kittyKeyboard).toBe(KittyKeyboardLevel.REPORT_ALL);

				negotiator.destroy();
			});

			it('should detect foot terminal', async () => {
				process.env['TERM'] = 'foot';

				const negotiator = createCapabilityNegotiator({ timing: 'skip' });
				const caps = await negotiator.getCapabilities();

				expect(caps.kittyKeyboard).toBe(KittyKeyboardLevel.REPORT_ALL);

				negotiator.destroy();
			});

			it('should return false for unknown terminals', async () => {
				process.env['TERM'] = 'xterm';
				delete process.env['KITTY_WINDOW_ID'];
				delete process.env['TERM_PROGRAM'];

				const negotiator = createCapabilityNegotiator({ timing: 'skip' });
				const caps = await negotiator.getCapabilities();

				expect(caps.kittyKeyboard).toBe(false);

				negotiator.destroy();
			});
		});

		describe('graphics', () => {
			it('should detect Kitty graphics', async () => {
				process.env['KITTY_WINDOW_ID'] = '1';

				const negotiator = createCapabilityNegotiator({ timing: 'skip' });
				const caps = await negotiator.getCapabilities();

				expect(caps.graphics).toBe(GraphicsProtocol.KITTY);

				negotiator.destroy();
			});

			it('should detect iTerm2 graphics', async () => {
				process.env['TERM_PROGRAM'] = 'iTerm.app';

				const negotiator = createCapabilityNegotiator({ timing: 'skip' });
				const caps = await negotiator.getCapabilities();

				expect(caps.graphics).toBe(GraphicsProtocol.ITERM2);

				negotiator.destroy();
			});

			it('should return false for unknown terminals', async () => {
				process.env['TERM'] = 'xterm';
				delete process.env['KITTY_WINDOW_ID'];
				delete process.env['TERM_PROGRAM'];

				const negotiator = createCapabilityNegotiator({ timing: 'skip' });
				const caps = await negotiator.getCapabilities();

				expect(caps.graphics).toBe(false);

				negotiator.destroy();
			});
		});

		describe('synchronizedOutput', () => {
			it('should detect Kitty', async () => {
				process.env['KITTY_WINDOW_ID'] = '1';

				const negotiator = createCapabilityNegotiator({ timing: 'skip' });
				const caps = await negotiator.getCapabilities();

				expect(caps.synchronizedOutput).toBe(true);

				negotiator.destroy();
			});

			it('should detect Windows Terminal', async () => {
				process.env['WT_SESSION'] = 'session';

				const negotiator = createCapabilityNegotiator({ timing: 'skip' });
				const caps = await negotiator.getCapabilities();

				expect(caps.synchronizedOutput).toBe(true);

				negotiator.destroy();
			});
		});

		describe('hyperlinks', () => {
			it('should detect Kitty', async () => {
				process.env['KITTY_WINDOW_ID'] = '1';

				const negotiator = createCapabilityNegotiator({ timing: 'skip' });
				const caps = await negotiator.getCapabilities();

				expect(caps.hyperlinks).toBe(true);

				negotiator.destroy();
			});

			it('should detect VTE 5000+', async () => {
				process.env['VTE_VERSION'] = '5500';

				const negotiator = createCapabilityNegotiator({ timing: 'skip' });
				const caps = await negotiator.getCapabilities();

				expect(caps.hyperlinks).toBe(true);

				negotiator.destroy();
			});
		});
	});

	describe('getDefaultNegotiator', () => {
		it('should return same instance on multiple calls', () => {
			const n1 = getDefaultNegotiator();
			const n2 = getDefaultNegotiator();

			expect(n1).toBe(n2);
		});

		it('should return new instance after reset', () => {
			const n1 = getDefaultNegotiator();
			resetDefaultNegotiator();
			const n2 = getDefaultNegotiator();

			expect(n1).not.toBe(n2);
		});
	});

	describe('getTerminalCapabilities', () => {
		it('should return capabilities using default negotiator', async () => {
			// Force skip mode by setting force capabilities
			const negotiator = createCapabilityNegotiator({
				timing: 'skip',
				forceCapabilities: { truecolor: true },
			});

			// Can't easily mock, so just verify the function exists
			const caps = await getTerminalCapabilities();

			expect(caps).toBeDefined();
			expect(typeof caps.truecolor).toBe('boolean');

			negotiator.destroy();
		});
	});

	describe('hasCapability', () => {
		it('should check boolean capabilities', async () => {
			// This will use environment detection
			const result = await hasCapability('focusEvents');

			expect(typeof result).toBe('boolean');
		});

		it('should check non-boolean capabilities', async () => {
			// kittyKeyboard returns level or false
			const result = await hasCapability('kittyKeyboard');

			expect(typeof result).toBe('boolean');
		});
	});

	describe('capabilityQuery', () => {
		it('should generate primaryDA query', () => {
			const q = capabilityQuery.primaryDA();
			expect(q).toBe('\x1b[c');
		});

		it('should generate secondaryDA query', () => {
			const q = capabilityQuery.secondaryDA();
			expect(q).toBe('\x1b[>c');
		});

		it('should generate xtversion query', () => {
			const q = capabilityQuery.xtversion();
			expect(q).toBe('\x1b[>q');
		});

		it('should generate kittyKeyboard query', () => {
			const q = capabilityQuery.kittyKeyboard();
			expect(q).toBe('\x1b[?u');
		});
	});

	describe('TerminalCapabilities interface', () => {
		it('should have all required properties', async () => {
			const negotiator = createCapabilityNegotiator({ timing: 'skip' });
			const caps = await negotiator.getCapabilities();

			// Check all properties exist
			expect('truecolor' in caps).toBe(true);
			expect('kittyKeyboard' in caps).toBe(true);
			expect('graphics' in caps).toBe(true);
			expect('focusEvents' in caps).toBe(true);
			expect('bracketedPaste' in caps).toBe(true);
			expect('synchronizedOutput' in caps).toBe(true);
			expect('hyperlinks' in caps).toBe(true);
			expect('styledUnderlines' in caps).toBe(true);
			expect('primaryDA' in caps).toBe(true);
			expect('secondaryDA' in caps).toBe(true);
			expect('terminalType' in caps).toBe(true);
			expect('firmwareVersion' in caps).toBe(true);

			negotiator.destroy();
		});
	});
});
