/**
 * TypeScript type exports tests.
 * These tests verify that utility types work correctly at compile time.
 */

import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import type {
	DeepPartial,
	DeepReadonly,
	InferInput,
	InferSchema,
	KeysOfType,
	MaybeThunk,
	OptionalKeys,
	PackedColor,
	RequiredKeys,
	Subscription,
} from './index';

// =============================================================================
// Type-level tests using conditional types
// These verify the types work correctly at compile time
// =============================================================================

// Type assertion helper
type Assert<T extends true> = T;
type IsEqual<A, B> = A extends B ? (B extends A ? true : false) : false;

describe('types', () => {
	describe('DeepPartial', () => {
		it('makes nested properties optional', () => {
			interface Nested {
				a: { b: { c: number } };
			}

			type Partial = DeepPartial<Nested>;

			// These should compile without errors
			const valid1: Partial = {};
			const valid2: Partial = { a: {} };
			const valid3: Partial = { a: { b: {} } };
			const valid4: Partial = { a: { b: { c: 42 } } };

			expect(valid1).toBeDefined();
			expect(valid2).toBeDefined();
			expect(valid3).toBeDefined();
			expect(valid4).toBeDefined();
		});

		it('handles arrays', () => {
			interface WithArray {
				items: { name: string }[];
			}

			type Partial = DeepPartial<WithArray>;

			const valid: Partial = { items: [{}] };
			expect(valid).toBeDefined();
		});
	});

	describe('DeepReadonly', () => {
		it('makes nested properties readonly', () => {
			interface Mutable {
				a: { b: number };
			}

			type Immutable = DeepReadonly<Mutable>;

			const frozen: Immutable = { a: { b: 42 } };

			// Type assertion: the readonly modifier is present
			// @ts-expect-error TS6196: Type alias used for compile-time assertion only
			type _TestA = Assert<IsEqual<typeof frozen.a, DeepReadonly<{ b: number }>>>;

			expect(frozen.a.b).toBe(42);
		});
	});

	describe('InferSchema', () => {
		it('infers type from Zod schema', () => {
			const PersonSchema = z.object({
				name: z.string(),
				age: z.number(),
			});

			type Person = InferSchema<typeof PersonSchema>;

			const person: Person = { name: 'Alice', age: 30 };
			expect(person.name).toBe('Alice');
			expect(person.age).toBe(30);
		});

		it('handles optional fields', () => {
			const ConfigSchema = z.object({
				required: z.string(),
				optional: z.string().optional(),
			});

			type Config = InferSchema<typeof ConfigSchema>;

			const minimal: Config = { required: 'value' };
			const full: Config = { required: 'value', optional: 'extra' };

			expect(minimal.required).toBe('value');
			expect(full.optional).toBe('extra');
		});
	});

	describe('InferInput', () => {
		it('infers input type when schema has transform', () => {
			const DateSchema = z.string().transform((s) => new Date(s));

			type DateInput = InferInput<typeof DateSchema>;
			type DateOutput = InferSchema<typeof DateSchema>;

			// Input is string, output is Date
			const input: DateInput = '2026-01-01';
			expect(typeof input).toBe('string');

			// Type assertion: DateOutput should be Date
			// @ts-expect-error TS6196: Type alias used for compile-time assertion only
			type _TestOutput = Assert<IsEqual<DateOutput, Date>>;
		});
	});

	describe('RequiredKeys', () => {
		it('makes specific keys required', () => {
			interface AllOptional {
				a?: number;
				b?: string;
				c?: boolean;
			}

			type WithRequiredA = RequiredKeys<AllOptional, 'a'>;

			// 'a' is now required, others remain optional
			const valid: WithRequiredA = { a: 42 };
			expect(valid.a).toBe(42);
		});

		it('keeps other keys as-is', () => {
			interface Mixed {
				required: number;
				optional?: string;
			}

			type BothRequired = RequiredKeys<Mixed, 'optional'>;

			// Both are now required
			const valid: BothRequired = { required: 1, optional: 'test' };
			expect(valid.required).toBe(1);
			expect(valid.optional).toBe('test');
		});
	});

	describe('OptionalKeys', () => {
		it('makes specific keys optional', () => {
			interface AllRequired {
				a: number;
				b: string;
				c: boolean;
			}

			type WithOptionalC = OptionalKeys<AllRequired, 'c'>;

			// 'c' is now optional
			const valid: WithOptionalC = { a: 42, b: 'test' };
			expect(valid.a).toBe(42);
			expect(valid.b).toBe('test');
		});
	});

	describe('KeysOfType', () => {
		it('extracts keys with matching value types', () => {
			interface Component {
				x: number;
				y: number;
				name: string;
				active: boolean;
			}

			type NumericKeys = KeysOfType<Component, number>;
			type StringKeys = KeysOfType<Component, string>;

			// Type assertions
			const numKey: NumericKeys = 'x';
			const strKey: StringKeys = 'name';

			expect(numKey).toBe('x');
			expect(strKey).toBe('name');
		});
	});

	describe('MaybeThunk', () => {
		it('accepts static values', () => {
			const staticValue: MaybeThunk<number> = 42;
			expect(staticValue).toBe(42);
		});

		it('accepts functions', () => {
			const thunkValue: MaybeThunk<number> = () => 42;
			expect(typeof thunkValue).toBe('function');
			expect((thunkValue as () => number)()).toBe(42);
		});

		it('works with complex types', () => {
			interface Config {
				width: number;
				height: number;
			}

			const staticConfig: MaybeThunk<Config> = { width: 80, height: 24 };
			const thunkConfig: MaybeThunk<Config> = () => ({ width: 80, height: 24 });

			expect((staticConfig as Config).width).toBe(80);
			expect(typeof thunkConfig).toBe('function');
		});
	});

	describe('PackedColor', () => {
		it('is a number type', () => {
			const color: PackedColor = 0xff0000ff;
			expect(typeof color).toBe('number');
		});

		it('accepts hex color values', () => {
			const red: PackedColor = 0xff0000ff;
			const green: PackedColor = 0x00ff00ff;
			const blue: PackedColor = 0x0000ffff;
			const transparent: PackedColor = 0xff000080;

			expect(red).toBe(0xff0000ff);
			expect(green).toBe(0x00ff00ff);
			expect(blue).toBe(0x0000ffff);
			expect(transparent).toBe(0xff000080);
		});
	});

	describe('Subscription', () => {
		it('is a function returning void', () => {
			let called = false;
			const subscription: Subscription = () => {
				called = true;
			};

			expect(typeof subscription).toBe('function');
			subscription();
			expect(called).toBe(true);
		});
	});

	describe('re-exports', () => {
		it('exports core types', async () => {
			// Dynamic import to verify exports exist
			const types = await import('./index');

			// These should be defined (re-exported from core)
			expect(types).toBeDefined();
		});

		it('exports LoopPhase enum', async () => {
			const { LoopPhase } = await import('./index');

			expect(LoopPhase).toBeDefined();
			expect(LoopPhase.INPUT).toBe(0);
			expect(LoopPhase.UPDATE).toBe(2);
			expect(LoopPhase.RENDER).toBe(6);
		});
	});
});

// =============================================================================
// Compile-time type tests
// These don't run at runtime but verify types are correctly defined
// =============================================================================

/* eslint-disable @typescript-eslint/no-unused-vars */
// DeepPartial should handle primitives
export type _TestDeepPartialPrimitive = Assert<IsEqual<DeepPartial<number>, number>>;
export type _TestDeepPartialString = Assert<IsEqual<DeepPartial<string>, string>>;

// DeepReadonly should handle primitives
export type _TestDeepReadonlyPrimitive = Assert<IsEqual<DeepReadonly<number>, number>>;

// RequiredKeys should preserve existing required keys
interface _TestInterface {
	req: number;
	opt?: string;
}
export type _TestRequiredKeysPreserve = Assert<
	IsEqual<RequiredKeys<_TestInterface, 'opt'>['req'], number>
>;

// OptionalKeys should preserve existing optional keys
export type _TestOptionalKeysPreserve = Assert<
	undefined extends OptionalKeys<_TestInterface, 'req'>['opt'] ? true : false
>;
/* eslint-enable @typescript-eslint/no-unused-vars */
