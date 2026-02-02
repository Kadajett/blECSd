/**
 * Tests for terminfo parameterized string compiler.
 *
 * @module terminal/terminfo/compiler.test
 */

import { afterEach, describe, expect, it } from 'vitest';
import {
	clearCapabilityCache,
	compileCapability,
	getCapabilityCacheSize,
	hasParameters,
	precompileCapabilities,
	tparm,
} from './compiler';

// Clean up cache between tests
afterEach(() => {
	clearCapabilityCache();
});

describe('terminfo compiler', () => {
	describe('tparm', () => {
		describe('basic parameter substitution', () => {
			it('handles string without parameters', () => {
				expect(tparm('\x1b[H')).toBe('\x1b[H');
				expect(tparm('hello')).toBe('hello');
			});

			it('handles literal percent', () => {
				expect(tparm('50%%')).toBe('50%');
				expect(tparm('%%test%%')).toBe('%test%');
			});

			it('substitutes single parameter as decimal', () => {
				expect(tparm('%p1%d', 42)).toBe('42');
				expect(tparm('value=%p1%d', 123)).toBe('value=123');
			});

			it('substitutes multiple parameters', () => {
				expect(tparm('%p1%d,%p2%d', 10, 20)).toBe('10,20');
				expect(tparm('[%p1%d;%p2%d]', 5, 15)).toBe('[5;15]');
			});

			it('handles out of range parameters', () => {
				expect(tparm('%p1%d,%p2%d,%p3%d', 1)).toBe('1,0,0');
			});

			it('substitutes as character', () => {
				expect(tparm('%p1%c', 65)).toBe('A');
				expect(tparm('%p1%c%p2%c', 72, 105)).toBe('Hi');
			});
		});

		describe('increment operator', () => {
			it('increments first two parameters', () => {
				expect(tparm('%i%p1%d;%p2%d', 0, 0)).toBe('1;1');
				expect(tparm('%i%p1%d;%p2%d', 10, 20)).toBe('11;21');
			});

			it('handles cursor addressing (cup)', () => {
				const cup = '\x1b[%i%p1%d;%p2%dH';
				expect(tparm(cup, 0, 0)).toBe('\x1b[1;1H');
				expect(tparm(cup, 23, 79)).toBe('\x1b[24;80H');
			});
		});

		describe('constants', () => {
			it('pushes character constants', () => {
				expect(tparm("%'A'%d")).toBe('65');
				expect(tparm("%'0'%d")).toBe('48');
			});

			it('pushes integer constants', () => {
				expect(tparm('%{42}%d')).toBe('42');
				expect(tparm('%{255}%d')).toBe('255');
			});

			it('combines constants with parameters', () => {
				expect(tparm('%p1%{10}%+%d', 5)).toBe('15');
			});
		});

		describe('arithmetic operations', () => {
			it('performs addition', () => {
				expect(tparm('%p1%p2%+%d', 10, 20)).toBe('30');
			});

			it('performs subtraction', () => {
				expect(tparm('%p1%p2%-%d', 20, 8)).toBe('12');
			});

			it('performs multiplication', () => {
				expect(tparm('%p1%p2%*%d', 6, 7)).toBe('42');
			});

			it('performs division', () => {
				expect(tparm('%p1%p2%/%d', 20, 4)).toBe('5');
				expect(tparm('%p1%p2%/%d', 7, 3)).toBe('2'); // Integer division
			});

			it('handles division by zero', () => {
				expect(tparm('%p1%p2%/%d', 10, 0)).toBe('0');
			});

			it('performs modulo', () => {
				expect(tparm('%p1%p2%m%d', 17, 5)).toBe('2');
			});

			it('handles modulo by zero', () => {
				expect(tparm('%p1%p2%m%d', 10, 0)).toBe('0');
			});
		});

		describe('bitwise operations', () => {
			it('performs bitwise AND', () => {
				expect(tparm('%p1%p2%&%d', 0xff, 0x0f)).toBe('15');
			});

			it('performs bitwise OR', () => {
				expect(tparm('%p1%p2%|%d', 0xf0, 0x0f)).toBe('255');
			});

			it('performs bitwise XOR', () => {
				expect(tparm('%p1%p2%^%d', 0xff, 0x0f)).toBe('240');
			});

			it('performs bitwise NOT', () => {
				expect(tparm('%p1%~%d', 0)).toBe('-1');
			});
		});

		describe('comparison operations', () => {
			it('performs equality comparison', () => {
				expect(tparm('%p1%p2%=%d', 5, 5)).toBe('1');
				expect(tparm('%p1%p2%=%d', 5, 6)).toBe('0');
			});

			it('performs less than comparison', () => {
				expect(tparm('%p1%p2%<%d', 5, 10)).toBe('1');
				expect(tparm('%p1%p2%<%d', 10, 5)).toBe('0');
				expect(tparm('%p1%p2%<%d', 5, 5)).toBe('0');
			});

			it('performs greater than comparison', () => {
				expect(tparm('%p1%p2%>%d', 10, 5)).toBe('1');
				expect(tparm('%p1%p2%>%d', 5, 10)).toBe('0');
			});
		});

		describe('logical operations', () => {
			it('performs logical AND', () => {
				expect(tparm('%p1%p2%A%d', 1, 1)).toBe('1');
				expect(tparm('%p1%p2%A%d', 1, 0)).toBe('0');
				expect(tparm('%p1%p2%A%d', 0, 0)).toBe('0');
			});

			it('performs logical OR', () => {
				expect(tparm('%p1%p2%O%d', 0, 0)).toBe('0');
				expect(tparm('%p1%p2%O%d', 1, 0)).toBe('1');
				expect(tparm('%p1%p2%O%d', 1, 1)).toBe('1');
			});

			it('performs logical NOT', () => {
				expect(tparm('%p1%!%d', 0)).toBe('1');
				expect(tparm('%p1%!%d', 1)).toBe('0');
				expect(tparm('%p1%!%d', 42)).toBe('0');
			});
		});

		describe('conditionals', () => {
			it('handles simple if-then', () => {
				expect(tparm('%?%p1%tyes%;', 1)).toBe('yes');
				expect(tparm('%?%p1%tyes%;', 0)).toBe('');
			});

			it('handles if-then-else', () => {
				expect(tparm('%?%p1%tyes%eNo%;', 1)).toBe('yes');
				expect(tparm('%?%p1%tyes%eNo%;', 0)).toBe('No');
			});

			it('handles comparison in conditional', () => {
				expect(tparm('%?%p1%{5}%<%tsmall%ebig%;', 3)).toBe('small');
				expect(tparm('%?%p1%{5}%<%tsmall%ebig%;', 10)).toBe('big');
			});

			it('handles nested conditionals', () => {
				const nested = '%?%p1%{0}%=%tzero%e%?%p1%{1}%=%tone%emany%;%;';
				expect(tparm(nested, 0)).toBe('zero');
				expect(tparm(nested, 1)).toBe('one');
				expect(tparm(nested, 5)).toBe('many');
			});
		});

		describe('output formats', () => {
			it('outputs decimal', () => {
				expect(tparm('%p1%d', 42)).toBe('42');
				expect(tparm('%p1%d', -5)).toBe('-5');
			});

			it('outputs octal', () => {
				expect(tparm('%p1%o', 8)).toBe('10');
				expect(tparm('%p1%o', 64)).toBe('100');
			});

			it('outputs hexadecimal', () => {
				expect(tparm('%p1%x', 255)).toBe('ff');
				expect(tparm('%p1%x', 16)).toBe('10');
			});
		});

		describe('real-world capabilities', () => {
			it('handles cursor address (cup)', () => {
				const cup = '\x1b[%i%p1%d;%p2%dH';
				expect(tparm(cup, 0, 0)).toBe('\x1b[1;1H');
				expect(tparm(cup, 9, 19)).toBe('\x1b[10;20H');
			});

			it('handles set foreground (setaf) 8-color', () => {
				const setaf = '\x1b[3%p1%dm';
				expect(tparm(setaf, 1)).toBe('\x1b[31m');
				expect(tparm(setaf, 7)).toBe('\x1b[37m');
			});

			it('handles set foreground (setaf) 256-color', () => {
				const setaf = '\x1b[38;5;%p1%dm';
				expect(tparm(setaf, 196)).toBe('\x1b[38;5;196m');
				expect(tparm(setaf, 255)).toBe('\x1b[38;5;255m');
			});

			it('handles complex setaf with conditionals', () => {
				// Simplified version of typical setaf
				const setaf = '\x1b[%?%p1%{8}%<%t3%p1%d%e%p1%{16}%<%t9%p1%{8}%-%d%e38;5;%p1%d%;m';
				expect(tparm(setaf, 1)).toBe('\x1b[31m'); // Basic color
				expect(tparm(setaf, 9)).toBe('\x1b[91m'); // Bright color (9-8=1)
				expect(tparm(setaf, 196)).toBe('\x1b[38;5;196m'); // 256 color
			});

			it('handles parameterized line operations', () => {
				const parmInsertLine = '\x1b[%p1%dL';
				expect(tparm(parmInsertLine, 5)).toBe('\x1b[5L');

				const parmDeleteLine = '\x1b[%p1%dM';
				expect(tparm(parmDeleteLine, 3)).toBe('\x1b[3M');
			});

			it('handles scroll region', () => {
				const csr = '\x1b[%i%p1%d;%p2%dr';
				expect(tparm(csr, 0, 23)).toBe('\x1b[1;24r');
				expect(tparm(csr, 5, 15)).toBe('\x1b[6;16r');
			});
		});
	});

	describe('compileCapability', () => {
		it('returns CompiledCapability object', () => {
			const compiled = compileCapability('\x1b[%p1%dH');

			expect(compiled.source).toBe('\x1b[%p1%dH');
			expect(typeof compiled.execute).toBe('function');
			expect(Array.isArray(compiled.instructions)).toBe(true);
		});

		it('compiled capability executes correctly', () => {
			const cup = compileCapability('\x1b[%i%p1%d;%p2%dH');

			expect(cup.execute(0, 0)).toBe('\x1b[1;1H');
			expect(cup.execute(10, 20)).toBe('\x1b[11;21H');
		});

		it('caches compiled capabilities', () => {
			const source = '\x1b[%p1%dm';

			expect(getCapabilityCacheSize()).toBe(0);

			const first = compileCapability(source);
			expect(getCapabilityCacheSize()).toBe(1);

			const second = compileCapability(source);
			expect(getCapabilityCacheSize()).toBe(1);

			expect(first).toBe(second); // Same object
		});
	});

	describe('clearCapabilityCache', () => {
		it('clears the cache', () => {
			compileCapability('\x1b[H');
			compileCapability('\x1b[2J');

			expect(getCapabilityCacheSize()).toBe(2);

			clearCapabilityCache();

			expect(getCapabilityCacheSize()).toBe(0);
		});
	});

	describe('precompileCapabilities', () => {
		it('compiles multiple capabilities', () => {
			const compiled = precompileCapabilities({
				cup: '\x1b[%i%p1%d;%p2%dH',
				setaf: '\x1b[38;5;%p1%dm',
				setab: '\x1b[48;5;%p1%dm',
			});

			expect(compiled.size).toBe(3);
			expect(compiled.get('cup')?.execute(0, 0)).toBe('\x1b[1;1H');
			expect(compiled.get('setaf')?.execute(196)).toBe('\x1b[38;5;196m');
			expect(compiled.get('setab')?.execute(21)).toBe('\x1b[48;5;21m');
		});
	});

	describe('hasParameters', () => {
		it('returns true for parameterized strings', () => {
			expect(hasParameters('%p1%d')).toBe(true);
			expect(hasParameters('\x1b[%i%p1%d;%p2%dH')).toBe(true);
			expect(hasParameters('%{10}%d')).toBe(true);
			expect(hasParameters("%'A'%d")).toBe(true);
		});

		it('returns false for non-parameterized strings', () => {
			expect(hasParameters('\x1b[H')).toBe(false);
			expect(hasParameters('\x1b[2J')).toBe(false);
			expect(hasParameters('hello')).toBe(false);
			expect(hasParameters('50%%')).toBe(false); // %% is literal
		});
	});

	describe('edge cases', () => {
		it('handles empty string', () => {
			expect(tparm('')).toBe('');
		});

		it('handles string ending with %', () => {
			expect(tparm('test%')).toBe('test%');
		});

		it('handles multiple stack operations', () => {
			// Push 3 and 5, add, multiply by 2, output
			expect(tparm('%{3}%{5}%+%{2}%*%d')).toBe('16');
		});

		it('handles variables', () => {
			// Set variable a to param 1, get it back
			expect(tparm('%p1%Pa%ga%d', 42)).toBe('42');
		});
	});
});
