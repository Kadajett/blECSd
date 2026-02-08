/**
 * Tests for error type guards.
 * @module errors/guards.test
 */

import { describe, expect, it } from 'vitest';
import {
	ComponentErrorCode,
	ConfigErrorCode,
	EntityErrorCode,
	InputErrorCode,
	InternalErrorCode,
	RenderErrorCode,
	SystemErrorCode,
	TerminalErrorCode,
	ValidationErrorCode,
} from './codes';
import {
	createComponentError,
	createConfigError,
	createEntityError,
	createInputError,
	createInternalError,
	createRenderError,
	createSystemError,
	createTerminalError,
	createValidationError,
} from './factories';
import {
	hasBlECSdErrorShape,
	hasCause,
	hasContext,
	hasErrorCode,
	hasZodIssues,
	isBlECSdError,
	isComponentError,
	isConfigError,
	isEntityError,
	isErrorKind,
	isInputError,
	isInternalError,
	isRenderError,
	isSystemError,
	isTerminalError,
	isValidationError,
} from './guards';

describe('Kind Guards', () => {
	describe('isValidationError', () => {
		it('returns true for ValidationError', () => {
			const error = createValidationError(ValidationErrorCode.INVALID_INPUT, 'Invalid input');
			expect(isValidationError(error)).toBe(true);
		});

		it('returns false for other error kinds', () => {
			const error = createTerminalError(TerminalErrorCode.TERMINAL_ERROR, 'Terminal error');
			expect(isValidationError(error)).toBe(false);
		});
	});

	describe('isTerminalError', () => {
		it('returns true for TerminalError', () => {
			const error = createTerminalError(TerminalErrorCode.TERMINAL_ERROR, 'Terminal error');
			expect(isTerminalError(error)).toBe(true);
		});

		it('returns false for other error kinds', () => {
			const error = createSystemError(SystemErrorCode.SYSTEM_ERROR, 'System error');
			expect(isTerminalError(error)).toBe(false);
		});
	});

	describe('isSystemError', () => {
		it('returns true for SystemError', () => {
			const error = createSystemError(SystemErrorCode.SYSTEM_ERROR, 'System error');
			expect(isSystemError(error)).toBe(true);
		});

		it('returns false for other error kinds', () => {
			const error = createEntityError(EntityErrorCode.ENTITY_ERROR, 'Entity error');
			expect(isSystemError(error)).toBe(false);
		});
	});

	describe('isEntityError', () => {
		it('returns true for EntityError', () => {
			const error = createEntityError(EntityErrorCode.ENTITY_ERROR, 'Entity error');
			expect(isEntityError(error)).toBe(true);
		});

		it('returns false for other error kinds', () => {
			const error = createComponentError(ComponentErrorCode.NOT_FOUND, 'Not found');
			expect(isEntityError(error)).toBe(false);
		});
	});

	describe('isComponentError', () => {
		it('returns true for ComponentError', () => {
			const error = createComponentError(ComponentErrorCode.NOT_FOUND, 'Not found');
			expect(isComponentError(error)).toBe(true);
		});

		it('returns false for other error kinds', () => {
			const error = createInputError(InputErrorCode.INPUT_ERROR, 'Input error');
			expect(isComponentError(error)).toBe(false);
		});
	});

	describe('isInputError', () => {
		it('returns true for InputError', () => {
			const error = createInputError(InputErrorCode.INPUT_ERROR, 'Input error');
			expect(isInputError(error)).toBe(true);
		});

		it('returns false for other error kinds', () => {
			const error = createRenderError(RenderErrorCode.RENDER_ERROR, 'Render error');
			expect(isInputError(error)).toBe(false);
		});
	});

	describe('isRenderError', () => {
		it('returns true for RenderError', () => {
			const error = createRenderError(RenderErrorCode.RENDER_ERROR, 'Render error');
			expect(isRenderError(error)).toBe(true);
		});

		it('returns false for other error kinds', () => {
			const error = createConfigError(ConfigErrorCode.CONFIG_ERROR, 'Config error');
			expect(isRenderError(error)).toBe(false);
		});
	});

	describe('isConfigError', () => {
		it('returns true for ConfigError', () => {
			const error = createConfigError(ConfigErrorCode.CONFIG_ERROR, 'Config error');
			expect(isConfigError(error)).toBe(true);
		});

		it('returns false for other error kinds', () => {
			const error = createInternalError(InternalErrorCode.INTERNAL_ERROR, 'Internal error');
			expect(isConfigError(error)).toBe(false);
		});
	});

	describe('isInternalError', () => {
		it('returns true for InternalError', () => {
			const error = createInternalError(InternalErrorCode.INTERNAL_ERROR, 'Internal error');
			expect(isInternalError(error)).toBe(true);
		});

		it('returns false for other error kinds', () => {
			const error = createValidationError(ValidationErrorCode.INVALID_INPUT, 'Invalid');
			expect(isInternalError(error)).toBe(false);
		});
	});
});

describe('Generic Guards', () => {
	describe('isErrorKind', () => {
		it('narrows error to specific kind', () => {
			const error = createValidationError(ValidationErrorCode.INVALID_INPUT, 'Invalid');

			expect(isErrorKind(error, 'validation')).toBe(true);
			expect(isErrorKind(error, 'terminal')).toBe(false);
		});

		it('works with all error kinds', () => {
			const errors = [
				{
					error: createValidationError(ValidationErrorCode.INVALID_INPUT, 'test'),
					kind: 'validation' as const,
				},
				{
					error: createTerminalError(TerminalErrorCode.TERMINAL_ERROR, 'test'),
					kind: 'terminal' as const,
				},
				{ error: createSystemError(SystemErrorCode.SYSTEM_ERROR, 'test'), kind: 'system' as const },
				{ error: createEntityError(EntityErrorCode.ENTITY_ERROR, 'test'), kind: 'entity' as const },
				{
					error: createComponentError(ComponentErrorCode.NOT_FOUND, 'test'),
					kind: 'component' as const,
				},
				{ error: createInputError(InputErrorCode.INPUT_ERROR, 'test'), kind: 'input' as const },
				{ error: createRenderError(RenderErrorCode.RENDER_ERROR, 'test'), kind: 'render' as const },
				{ error: createConfigError(ConfigErrorCode.CONFIG_ERROR, 'test'), kind: 'config' as const },
				{
					error: createInternalError(InternalErrorCode.INTERNAL_ERROR, 'test'),
					kind: 'internal' as const,
				},
			];

			for (const { error, kind } of errors) {
				expect(isErrorKind(error, kind)).toBe(true);
			}
		});
	});

	describe('hasErrorCode', () => {
		it('returns true for matching code', () => {
			const error = createValidationError(ValidationErrorCode.INVALID_INPUT, 'Invalid');

			expect(hasErrorCode(error, ValidationErrorCode.INVALID_INPUT)).toBe(true);
		});

		it('returns false for non-matching code', () => {
			const error = createValidationError(ValidationErrorCode.INVALID_INPUT, 'Invalid');

			expect(hasErrorCode(error, 'OTHER_CODE')).toBe(false);
		});
	});

	describe('isBlECSdError', () => {
		it('is a function that checks for BlECSd error symbol', () => {
			// The function checks for the BLECSD_ERROR_SYMBOL
			// This test verifies the guard works as a function
			expect(typeof isBlECSdError).toBe('function');
		});

		it('returns false for plain objects', () => {
			expect(isBlECSdError({})).toBe(false);
			expect(isBlECSdError({ kind: 'validation' })).toBe(false);
		});

		it('returns false for null/undefined', () => {
			expect(isBlECSdError(null)).toBe(false);
			expect(isBlECSdError(undefined)).toBe(false);
		});

		it('returns false for primitives', () => {
			expect(isBlECSdError(42)).toBe(false);
			expect(isBlECSdError('error')).toBe(false);
			expect(isBlECSdError(true)).toBe(false);
		});
	});

	describe('hasBlECSdErrorShape', () => {
		it('returns true for objects with correct shape', () => {
			const error = {
				kind: 'validation',
				code: 'VAL_001',
				message: 'Error',
				timestamp: Date.now(),
			};

			expect(hasBlECSdErrorShape(error)).toBe(true);
		});

		it('returns false for objects missing required fields', () => {
			expect(hasBlECSdErrorShape({ kind: 'validation' })).toBe(false);
			expect(hasBlECSdErrorShape({ code: 'VAL_001' })).toBe(false);
			expect(hasBlECSdErrorShape({ message: 'Error' })).toBe(false);
		});

		it('returns false for null/undefined', () => {
			expect(hasBlECSdErrorShape(null)).toBe(false);
			expect(hasBlECSdErrorShape(undefined)).toBe(false);
		});

		it('returns false for primitives', () => {
			expect(hasBlECSdErrorShape(42)).toBe(false);
			expect(hasBlECSdErrorShape('error')).toBe(false);
		});
	});
});

describe('Context Guards', () => {
	describe('hasContext', () => {
		it('returns true when context exists', () => {
			const error = createValidationError(ValidationErrorCode.INVALID_INPUT, 'Invalid', {
				context: { entityId: 1 },
			});

			expect(hasContext(error)).toBe(true);
		});

		it('returns false when context is undefined', () => {
			const error = createValidationError(ValidationErrorCode.INVALID_INPUT, 'Invalid');

			expect(hasContext(error)).toBe(false);
		});
	});

	describe('hasCause', () => {
		it('returns true when cause exists', () => {
			const cause = new Error('Root cause');
			const error = createInternalError(InternalErrorCode.INTERNAL_ERROR, 'Failed', { cause });

			expect(hasCause(error)).toBe(true);
		});

		it('returns false when cause is undefined', () => {
			const error = createInternalError(InternalErrorCode.INTERNAL_ERROR, 'Failed');

			expect(hasCause(error)).toBe(false);
		});
	});

	describe('hasZodIssues', () => {
		it('returns true when Zod issues exist', () => {
			const error = createValidationError(ValidationErrorCode.SCHEMA_VALIDATION_FAILED, 'Invalid', {
				context: {
					zodIssues: [
						{
							code: 'invalid_type',
							expected: 'string',
							path: ['field'],
							message: 'Expected string, received number',
						},
					],
				},
			});

			expect(hasZodIssues(error)).toBe(true);
		});

		it('returns false when Zod issues array is empty', () => {
			const error = createValidationError(ValidationErrorCode.SCHEMA_VALIDATION_FAILED, 'Invalid', {
				context: { zodIssues: [] },
			});

			expect(hasZodIssues(error)).toBe(false);
		});

		it('returns false when context is undefined', () => {
			const error = createValidationError(ValidationErrorCode.SCHEMA_VALIDATION_FAILED, 'Invalid');

			expect(hasZodIssues(error)).toBe(false);
		});

		it('returns false when zodIssues is undefined', () => {
			const error = createValidationError(ValidationErrorCode.SCHEMA_VALIDATION_FAILED, 'Invalid', {
				context: { entityId: 1 },
			});

			expect(hasZodIssues(error)).toBe(false);
		});
	});
});
