/**
 * Tests for terminfo capability name mappings.
 *
 * @module terminal/terminfo/capabilities.test
 */

import { describe, expect, it } from 'vitest';
import {
	BOOLEAN_CAPS,
	CAPABILITY_ALIASES,
	CAPABILITY_REVERSE_ALIASES,
	getCapabilitiesByType,
	getCapabilityIndex,
	getCapabilityType,
	getTermcapName,
	isBooleanCapability,
	isCapabilityName,
	isNumberCapability,
	isStringCapability,
	NUMBER_CAPS,
	resolveCapabilityName,
	STRING_CAPS,
} from './capabilities';

describe('terminfo capabilities', () => {
	describe('BOOLEAN_CAPS', () => {
		it('contains standard boolean capabilities', () => {
			expect(BOOLEAN_CAPS).toContain('auto_left_margin');
			expect(BOOLEAN_CAPS).toContain('auto_right_margin');
			expect(BOOLEAN_CAPS).toContain('has_meta_key');
			expect(BOOLEAN_CAPS).toContain('back_color_erase');
		});

		it('has correct number of capabilities', () => {
			// Standard terminfo has 37 boolean capabilities
			expect(BOOLEAN_CAPS.length).toBe(37);
		});

		it('contains no duplicates', () => {
			const unique = [...new Set(BOOLEAN_CAPS)];
			expect(unique.length).toBe(BOOLEAN_CAPS.length);
		});
	});

	describe('NUMBER_CAPS', () => {
		it('contains standard numeric capabilities', () => {
			expect(NUMBER_CAPS).toContain('columns');
			expect(NUMBER_CAPS).toContain('lines');
			expect(NUMBER_CAPS).toContain('max_colors');
			expect(NUMBER_CAPS).toContain('max_pairs');
		});

		it('has correct number of capabilities', () => {
			// Standard terminfo has 33 numeric capabilities
			expect(NUMBER_CAPS.length).toBe(33);
		});

		it('contains no duplicates', () => {
			const unique = [...new Set(NUMBER_CAPS)];
			expect(unique.length).toBe(NUMBER_CAPS.length);
		});
	});

	describe('STRING_CAPS', () => {
		it('contains standard string capabilities', () => {
			expect(STRING_CAPS).toContain('cursor_address');
			expect(STRING_CAPS).toContain('clear_screen');
			expect(STRING_CAPS).toContain('enter_ca_mode');
			expect(STRING_CAPS).toContain('exit_ca_mode');
			expect(STRING_CAPS).toContain('set_a_foreground');
			expect(STRING_CAPS).toContain('set_a_background');
		});

		it('contains key definitions', () => {
			expect(STRING_CAPS).toContain('key_up');
			expect(STRING_CAPS).toContain('key_down');
			expect(STRING_CAPS).toContain('key_left');
			expect(STRING_CAPS).toContain('key_right');
			expect(STRING_CAPS).toContain('key_f1');
			expect(STRING_CAPS).toContain('key_f12');
		});

		it('contains no duplicates', () => {
			const unique = [...new Set(STRING_CAPS)];
			expect(unique.length).toBe(STRING_CAPS.length);
		});
	});

	describe('CAPABILITY_ALIASES', () => {
		it('maps termcap to terminfo names', () => {
			expect(CAPABILITY_ALIASES.cm).toBe('cursor_address');
			expect(CAPABILITY_ALIASES.cl).toBe('clear_screen');
			expect(CAPABILITY_ALIASES.AF).toBe('set_a_foreground');
			expect(CAPABILITY_ALIASES.AB).toBe('set_a_background');
		});

		it('maps common boolean aliases', () => {
			expect(CAPABILITY_ALIASES.am).toBe('auto_right_margin');
			expect(CAPABILITY_ALIASES.km).toBe('has_meta_key');
			expect(CAPABILITY_ALIASES.ut).toBe('back_color_erase');
		});

		it('maps common numeric aliases', () => {
			expect(CAPABILITY_ALIASES.co).toBe('columns');
			expect(CAPABILITY_ALIASES.li).toBe('lines');
			expect(CAPABILITY_ALIASES.Co).toBe('max_colors');
		});

		it('maps key aliases', () => {
			expect(CAPABILITY_ALIASES.ku).toBe('key_up');
			expect(CAPABILITY_ALIASES.kd).toBe('key_down');
			expect(CAPABILITY_ALIASES.kl).toBe('key_left');
			expect(CAPABILITY_ALIASES.kr).toBe('key_right');
		});
	});

	describe('CAPABILITY_REVERSE_ALIASES', () => {
		it('maps terminfo to termcap names', () => {
			expect(CAPABILITY_REVERSE_ALIASES.cursor_address).toBe('cm');
			expect(CAPABILITY_REVERSE_ALIASES.clear_screen).toBe('cl');
			expect(CAPABILITY_REVERSE_ALIASES.set_a_foreground).toBe('AF');
		});

		it('has same number of entries as CAPABILITY_ALIASES', () => {
			const aliasCount = Object.keys(CAPABILITY_ALIASES).length;
			const reverseCount = Object.keys(CAPABILITY_REVERSE_ALIASES).length;
			// May have fewer if there are duplicate terminfo names
			expect(reverseCount).toBeLessThanOrEqual(aliasCount);
		});
	});

	describe('resolveCapabilityName', () => {
		it('resolves termcap aliases', () => {
			expect(resolveCapabilityName('cm')).toBe('cursor_address');
			expect(resolveCapabilityName('cl')).toBe('clear_screen');
			expect(resolveCapabilityName('AF')).toBe('set_a_foreground');
		});

		it('returns terminfo names unchanged', () => {
			expect(resolveCapabilityName('cursor_address')).toBe('cursor_address');
			expect(resolveCapabilityName('clear_screen')).toBe('clear_screen');
		});

		it('returns unknown names unchanged', () => {
			expect(resolveCapabilityName('unknown_cap')).toBe('unknown_cap');
			expect(resolveCapabilityName('')).toBe('');
		});
	});

	describe('getTermcapName', () => {
		it('returns termcap name for terminfo capabilities', () => {
			expect(getTermcapName('cursor_address')).toBe('cm');
			expect(getTermcapName('clear_screen')).toBe('cl');
			expect(getTermcapName('set_a_foreground')).toBe('AF');
		});

		it('returns null for unknown capabilities', () => {
			expect(getTermcapName('unknown_cap')).toBeNull();
		});
	});

	describe('getCapabilityType', () => {
		it('identifies boolean capabilities', () => {
			expect(getCapabilityType('auto_right_margin')).toBe('boolean');
			expect(getCapabilityType('has_meta_key')).toBe('boolean');
			expect(getCapabilityType('back_color_erase')).toBe('boolean');
		});

		it('identifies numeric capabilities', () => {
			expect(getCapabilityType('columns')).toBe('number');
			expect(getCapabilityType('lines')).toBe('number');
			expect(getCapabilityType('max_colors')).toBe('number');
		});

		it('identifies string capabilities', () => {
			expect(getCapabilityType('cursor_address')).toBe('string');
			expect(getCapabilityType('clear_screen')).toBe('string');
			expect(getCapabilityType('key_up')).toBe('string');
		});

		it('handles termcap aliases', () => {
			expect(getCapabilityType('cm')).toBe('string');
			expect(getCapabilityType('co')).toBe('number');
			expect(getCapabilityType('am')).toBe('boolean');
		});

		it('returns null for unknown capabilities', () => {
			expect(getCapabilityType('unknown_cap')).toBeNull();
		});
	});

	describe('isCapabilityName', () => {
		it('returns true for valid capabilities', () => {
			expect(isCapabilityName('cursor_address')).toBe(true);
			expect(isCapabilityName('max_colors')).toBe(true);
			expect(isCapabilityName('auto_right_margin')).toBe(true);
		});

		it('returns true for termcap aliases', () => {
			expect(isCapabilityName('cm')).toBe(true);
			expect(isCapabilityName('Co')).toBe(true);
			expect(isCapabilityName('am')).toBe(true);
		});

		it('returns false for invalid names', () => {
			expect(isCapabilityName('unknown')).toBe(false);
			expect(isCapabilityName('')).toBe(false);
		});
	});

	describe('isBooleanCapability', () => {
		it('returns true for boolean capabilities', () => {
			expect(isBooleanCapability('auto_right_margin')).toBe(true);
			expect(isBooleanCapability('has_meta_key')).toBe(true);
		});

		it('returns true for boolean termcap aliases', () => {
			expect(isBooleanCapability('am')).toBe(true);
			expect(isBooleanCapability('km')).toBe(true);
		});

		it('returns false for non-boolean capabilities', () => {
			expect(isBooleanCapability('columns')).toBe(false);
			expect(isBooleanCapability('cursor_address')).toBe(false);
		});
	});

	describe('isNumberCapability', () => {
		it('returns true for numeric capabilities', () => {
			expect(isNumberCapability('columns')).toBe(true);
			expect(isNumberCapability('max_colors')).toBe(true);
		});

		it('returns true for numeric termcap aliases', () => {
			expect(isNumberCapability('co')).toBe(true);
			expect(isNumberCapability('Co')).toBe(true);
		});

		it('returns false for non-numeric capabilities', () => {
			expect(isNumberCapability('auto_right_margin')).toBe(false);
			expect(isNumberCapability('cursor_address')).toBe(false);
		});
	});

	describe('isStringCapability', () => {
		it('returns true for string capabilities', () => {
			expect(isStringCapability('cursor_address')).toBe(true);
			expect(isStringCapability('clear_screen')).toBe(true);
		});

		it('returns true for string termcap aliases', () => {
			expect(isStringCapability('cm')).toBe(true);
			expect(isStringCapability('cl')).toBe(true);
		});

		it('returns false for non-string capabilities', () => {
			expect(isStringCapability('columns')).toBe(false);
			expect(isStringCapability('auto_right_margin')).toBe(false);
		});
	});

	describe('getCapabilityIndex', () => {
		it('returns correct index for boolean capabilities', () => {
			expect(getCapabilityIndex('auto_left_margin')).toBe(0);
			expect(getCapabilityIndex('auto_right_margin')).toBe(1);
		});

		it('returns correct index for numeric capabilities', () => {
			expect(getCapabilityIndex('columns')).toBe(0);
			expect(getCapabilityIndex('init_tabs')).toBe(1);
		});

		it('returns correct index for string capabilities', () => {
			expect(getCapabilityIndex('back_tab')).toBe(0);
			expect(getCapabilityIndex('bell')).toBe(1);
			expect(getCapabilityIndex('cursor_address')).toBe(10);
		});

		it('handles termcap aliases', () => {
			expect(getCapabilityIndex('cm')).toBe(10);
			expect(getCapabilityIndex('co')).toBe(0);
		});

		it('returns -1 for unknown capabilities', () => {
			expect(getCapabilityIndex('unknown')).toBe(-1);
		});
	});

	describe('getCapabilitiesByType', () => {
		it('returns boolean capabilities', () => {
			const caps = getCapabilitiesByType('boolean');
			expect(caps).toBe(BOOLEAN_CAPS);
		});

		it('returns numeric capabilities', () => {
			const caps = getCapabilitiesByType('number');
			expect(caps).toBe(NUMBER_CAPS);
		});

		it('returns string capabilities', () => {
			const caps = getCapabilitiesByType('string');
			expect(caps).toBe(STRING_CAPS);
		});
	});

	describe('consistency', () => {
		it('all aliases resolve to valid capabilities', () => {
			for (const [, name] of Object.entries(CAPABILITY_ALIASES)) {
				const type = getCapabilityType(name);
				expect(type).not.toBeNull();
			}
		});

		it('no overlap between capability types', () => {
			const boolSet = new Set<string>(BOOLEAN_CAPS);
			const numSet = new Set<string>(NUMBER_CAPS);
			const strSet = new Set<string>(STRING_CAPS);

			for (const cap of BOOLEAN_CAPS) {
				expect(numSet.has(cap)).toBe(false);
				expect(strSet.has(cap)).toBe(false);
			}

			for (const cap of NUMBER_CAPS) {
				expect(boolSet.has(cap)).toBe(false);
				expect(strSet.has(cap)).toBe(false);
			}

			for (const cap of STRING_CAPS) {
				expect(boolSet.has(cap)).toBe(false);
				expect(numSet.has(cap)).toBe(false);
			}
		});
	});
});
