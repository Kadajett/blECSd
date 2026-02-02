/**
 * Terminfo parameterized string compiler.
 *
 * Compiles terminfo capability strings with parameter placeholders into
 * executable functions for efficient repeated use. Implements the tparm
 * parameter substitution language.
 *
 * @module terminal/terminfo/compiler
 *
 * @example
 * ```typescript
 * import { compileCapability, tparm } from 'blecsd';
 *
 * // One-off parameter substitution
 * const seq = tparm('\x1b[%i%p1%d;%p2%dH', 10, 5);
 * // Returns: '\x1b[11;6H' (cursor to row 11, col 6)
 *
 * // Compile for repeated use
 * const cup = compileCapability('\x1b[%i%p1%d;%p2%dH');
 * cup.execute(0, 0);   // '\x1b[1;1H'
 * cup.execute(10, 20); // '\x1b[11;21H'
 * ```
 */

// =============================================================================
// TYPES
// =============================================================================

/**
 * Instruction types for compiled capabilities.
 */
type InstructionType =
	| 'literal'
	| 'push_param'
	| 'push_char'
	| 'push_int'
	| 'output_char'
	| 'output_string'
	| 'output_decimal'
	| 'output_hex'
	| 'output_octal'
	| 'increment'
	| 'add'
	| 'subtract'
	| 'multiply'
	| 'divide'
	| 'modulo'
	| 'bit_and'
	| 'bit_or'
	| 'bit_xor'
	| 'logical_and'
	| 'logical_or'
	| 'logical_not'
	| 'bit_not'
	| 'equals'
	| 'less_than'
	| 'greater_than'
	| 'cond_start'
	| 'cond_then'
	| 'cond_else'
	| 'cond_end'
	| 'strlen'
	| 'set_var'
	| 'get_var';

/**
 * A single compiled instruction.
 */
interface Instruction {
	readonly type: InstructionType;
	readonly value?: string | number;
}

/**
 * A compiled capability ready for execution.
 */
export interface CompiledCapability {
	/** Original capability string */
	readonly source: string;
	/** Compiled instructions */
	readonly instructions: readonly Instruction[];
	/**
	 * Execute with parameters.
	 *
	 * @param params - Parameters to substitute
	 * @returns Rendered capability string
	 */
	execute(...params: number[]): string;
}

/**
 * Execution state during capability evaluation.
 */
interface ExecutionState {
	stack: number[];
	params: number[];
	staticVars: Map<string, number>;
	dynamicVars: Map<string, number>;
	output: string;
	instructionIndex: number;
}

// =============================================================================
// COMPILATION
// =============================================================================

/**
 * Parses a character constant like %'x'.
 */
function parseCharConstant(
	format: string,
	startIndex: number,
): { value: number; endIndex: number } {
	// Skip the opening quote
	let idx = startIndex + 1;
	if (idx >= format.length) {
		return { value: 0, endIndex: idx };
	}

	let char = format[idx];
	let value: number;

	// Handle escape sequences
	if (char === '\\' && idx + 1 < format.length) {
		idx++;
		char = format[idx];
		switch (char) {
			case 'n':
				value = 10;
				break;
			case 'r':
				value = 13;
				break;
			case 't':
				value = 9;
				break;
			case 'b':
				value = 8;
				break;
			case 'f':
				value = 12;
				break;
			case '\\':
				value = 92;
				break;
			case "'":
				value = 39;
				break;
			default:
				value = (char ?? ' ').charCodeAt(0);
		}
	} else {
		value = (char ?? ' ').charCodeAt(0);
	}

	idx++;

	// Skip closing quote if present
	if (idx < format.length && format[idx] === "'") {
		idx++;
	}

	return { value, endIndex: idx };
}

/**
 * Parses an integer constant like %{123}.
 */
function parseIntConstant(format: string, startIndex: number): { value: number; endIndex: number } {
	let numStr = '';
	let idx = startIndex;
	while (idx < format.length && format[idx] !== '}') {
		numStr += format[idx];
		idx++;
	}
	// Skip closing brace
	if (idx < format.length && format[idx] === '}') {
		idx++;
	}
	return { value: Number.parseInt(numStr, 10) || 0, endIndex: idx };
}

/**
 * Finds the matching else or endif for a conditional.
 */
function findConditionalEnd(
	instructions: Instruction[],
	startIndex: number,
	findElse: boolean,
): number {
	let depth = 1;
	let i = startIndex;

	while (i < instructions.length && depth > 0) {
		const instr = instructions[i];
		if (instr?.type === 'cond_start') {
			// Nested %? increases depth
			depth++;
		} else if (instr?.type === 'cond_end') {
			depth--;
			if (depth === 0) return i;
		} else if (instr?.type === 'cond_else' && depth === 1 && findElse) {
			return i;
		}
		i++;
	}

	return instructions.length;
}

/**
 * Compiles a capability string into instructions.
 */
function compileToInstructions(format: string): Instruction[] {
	const instructions: Instruction[] = [];
	let i = 0;
	let literalStart = 0;

	while (i < format.length) {
		if (format[i] !== '%') {
			i++;
			continue;
		}

		// Emit any accumulated literal
		if (i > literalStart) {
			instructions.push({ type: 'literal', value: format.slice(literalStart, i) });
		}

		i++; // Skip %

		// Handle trailing % - emit as literal
		if (i >= format.length) {
			instructions.push({ type: 'literal', value: '%' });
			literalStart = i;
			break;
		}

		const code = format[i];

		switch (code) {
			case '%':
				instructions.push({ type: 'literal', value: '%' });
				i++;
				break;

			case 'i':
				instructions.push({ type: 'increment' });
				i++;
				break;

			case 'p':
				i++;
				if (i < format.length) {
					const paramNum = Number.parseInt(format[i] ?? '0', 10);
					instructions.push({ type: 'push_param', value: paramNum });
					i++;
				}
				break;

			case 'P':
				i++;
				if (i < format.length) {
					const varName = format[i];
					const isStatic = varName !== undefined && varName >= 'a' && varName <= 'z';
					instructions.push({ type: 'set_var', value: (isStatic ? 's' : 'd') + (varName ?? '') });
					i++;
				}
				break;

			case 'g':
				i++;
				if (i < format.length) {
					const varName = format[i];
					const isStatic = varName !== undefined && varName >= 'a' && varName <= 'z';
					instructions.push({ type: 'get_var', value: (isStatic ? 's' : 'd') + (varName ?? '') });
					i++;
				}
				break;

			case "'": {
				i++;
				const charResult = parseCharConstant(format, i - 1);
				instructions.push({ type: 'push_char', value: charResult.value });
				i = charResult.endIndex;
				break;
			}

			case '{': {
				i++;
				const intResult = parseIntConstant(format, i);
				instructions.push({ type: 'push_int', value: intResult.value });
				i = intResult.endIndex;
				break;
			}

			case 'l':
				instructions.push({ type: 'strlen' });
				i++;
				break;

			case '+':
				instructions.push({ type: 'add' });
				i++;
				break;

			case '-':
				instructions.push({ type: 'subtract' });
				i++;
				break;

			case '*':
				instructions.push({ type: 'multiply' });
				i++;
				break;

			case '/':
				instructions.push({ type: 'divide' });
				i++;
				break;

			case 'm':
				instructions.push({ type: 'modulo' });
				i++;
				break;

			case '&':
				instructions.push({ type: 'bit_and' });
				i++;
				break;

			case '|':
				instructions.push({ type: 'bit_or' });
				i++;
				break;

			case '^':
				instructions.push({ type: 'bit_xor' });
				i++;
				break;

			case 'A':
				instructions.push({ type: 'logical_and' });
				i++;
				break;

			case 'O':
				instructions.push({ type: 'logical_or' });
				i++;
				break;

			case '!':
				instructions.push({ type: 'logical_not' });
				i++;
				break;

			case '~':
				instructions.push({ type: 'bit_not' });
				i++;
				break;

			case '=':
				instructions.push({ type: 'equals' });
				i++;
				break;

			case '<':
				instructions.push({ type: 'less_than' });
				i++;
				break;

			case '>':
				instructions.push({ type: 'greater_than' });
				i++;
				break;

			case '?':
				// Start of conditional - emit marker for nesting tracking
				instructions.push({ type: 'cond_start' });
				i++;
				break;

			case 't':
				instructions.push({ type: 'cond_then' });
				i++;
				break;

			case 'e':
				instructions.push({ type: 'cond_else' });
				i++;
				break;

			case ';':
				instructions.push({ type: 'cond_end' });
				i++;
				break;

			case 'd':
				instructions.push({ type: 'output_decimal' });
				i++;
				break;

			case 'o':
				instructions.push({ type: 'output_octal' });
				i++;
				break;

			case 'x':
			case 'X':
				instructions.push({ type: 'output_hex' });
				i++;
				break;

			case 'c':
				instructions.push({ type: 'output_char' });
				i++;
				break;

			case 's':
				instructions.push({ type: 'output_string' });
				i++;
				break;

			default:
				// Handle printf-style format specifiers like %2d, %-3d, %02d
				if (
					(code >= '0' && code <= '9') ||
					code === ':' ||
					code === ' ' ||
					code === '#' ||
					code === '-'
				) {
					// Skip format flags and width
					while (i < format.length) {
						const ch = format[i];
						if (ch === 'd' || ch === 'o' || ch === 'x' || ch === 'X' || ch === 's' || ch === 'c') {
							break;
						}
						i++;
					}
					if (i < format.length) {
						const outputCode = format[i];
						switch (outputCode) {
							case 'd':
								instructions.push({ type: 'output_decimal' });
								break;
							case 'o':
								instructions.push({ type: 'output_octal' });
								break;
							case 'x':
							case 'X':
								instructions.push({ type: 'output_hex' });
								break;
							case 's':
								instructions.push({ type: 'output_string' });
								break;
							case 'c':
								instructions.push({ type: 'output_char' });
								break;
						}
						i++;
					}
				} else {
					// Unknown, treat as literal
					instructions.push({ type: 'literal', value: `%${code}` });
					i++;
				}
		}

		literalStart = i;
	}

	// Emit any remaining literal
	if (i > literalStart) {
		instructions.push({ type: 'literal', value: format.slice(literalStart) });
	}

	return instructions;
}

/**
 * Executes compiled instructions with given parameters.
 */
function executeInstructions(instructions: readonly Instruction[], params: number[]): string {
	const state: ExecutionState = {
		stack: [],
		params: [...params],
		staticVars: new Map(),
		dynamicVars: new Map(),
		output: '',
		instructionIndex: 0,
	};

	while (state.instructionIndex < instructions.length) {
		const instr = instructions[state.instructionIndex];
		if (!instr) {
			state.instructionIndex++;
			continue;
		}

		switch (instr.type) {
			case 'literal':
				state.output += instr.value as string;
				break;

			case 'push_param': {
				const paramIndex = (instr.value as number) - 1;
				state.stack.push(state.params[paramIndex] ?? 0);
				break;
			}

			case 'push_char':
			case 'push_int':
				state.stack.push(instr.value as number);
				break;

			case 'increment':
				if (state.params.length > 0 && state.params[0] !== undefined) state.params[0]++;
				if (state.params.length > 1 && state.params[1] !== undefined) state.params[1]++;
				break;

			case 'output_decimal':
				state.output += String(state.stack.pop() ?? 0);
				break;

			case 'output_octal':
				state.output += (state.stack.pop() ?? 0).toString(8);
				break;

			case 'output_hex':
				state.output += (state.stack.pop() ?? 0).toString(16);
				break;

			case 'output_char':
				state.output += String.fromCharCode(state.stack.pop() ?? 0);
				break;

			case 'output_string':
				state.output += String(state.stack.pop() ?? '');
				break;

			case 'strlen': {
				const val = state.stack.pop() ?? 0;
				state.stack.push(String(val).length);
				break;
			}

			case 'add': {
				const b = state.stack.pop() ?? 0;
				const a = state.stack.pop() ?? 0;
				state.stack.push(a + b);
				break;
			}

			case 'subtract': {
				const b = state.stack.pop() ?? 0;
				const a = state.stack.pop() ?? 0;
				state.stack.push(a - b);
				break;
			}

			case 'multiply': {
				const b = state.stack.pop() ?? 0;
				const a = state.stack.pop() ?? 0;
				state.stack.push(a * b);
				break;
			}

			case 'divide': {
				const b = state.stack.pop() ?? 0;
				const a = state.stack.pop() ?? 0;
				state.stack.push(b !== 0 ? Math.floor(a / b) : 0);
				break;
			}

			case 'modulo': {
				const b = state.stack.pop() ?? 0;
				const a = state.stack.pop() ?? 0;
				state.stack.push(b !== 0 ? a % b : 0);
				break;
			}

			case 'bit_and': {
				const b = state.stack.pop() ?? 0;
				const a = state.stack.pop() ?? 0;
				state.stack.push(a & b);
				break;
			}

			case 'bit_or': {
				const b = state.stack.pop() ?? 0;
				const a = state.stack.pop() ?? 0;
				state.stack.push(a | b);
				break;
			}

			case 'bit_xor': {
				const b = state.stack.pop() ?? 0;
				const a = state.stack.pop() ?? 0;
				state.stack.push(a ^ b);
				break;
			}

			case 'logical_and': {
				const b = state.stack.pop() ?? 0;
				const a = state.stack.pop() ?? 0;
				state.stack.push(a && b ? 1 : 0);
				break;
			}

			case 'logical_or': {
				const b = state.stack.pop() ?? 0;
				const a = state.stack.pop() ?? 0;
				state.stack.push(a || b ? 1 : 0);
				break;
			}

			case 'logical_not': {
				const a = state.stack.pop() ?? 0;
				state.stack.push(a ? 0 : 1);
				break;
			}

			case 'bit_not': {
				const a = state.stack.pop() ?? 0;
				state.stack.push(~a);
				break;
			}

			case 'equals': {
				const b = state.stack.pop() ?? 0;
				const a = state.stack.pop() ?? 0;
				state.stack.push(a === b ? 1 : 0);
				break;
			}

			case 'less_than': {
				const b = state.stack.pop() ?? 0;
				const a = state.stack.pop() ?? 0;
				state.stack.push(a < b ? 1 : 0);
				break;
			}

			case 'greater_than': {
				const b = state.stack.pop() ?? 0;
				const a = state.stack.pop() ?? 0;
				state.stack.push(a > b ? 1 : 0);
				break;
			}

			case 'cond_start':
				// Marker for conditional start - used for depth tracking, no execution action
				break;

			case 'cond_then': {
				const condition = state.stack.pop() ?? 0;
				if (!condition) {
					// Skip to else or endif, then continue from instruction AFTER it
					const mutableInstructions = instructions as Instruction[];
					const elseOrEnd = findConditionalEnd(
						mutableInstructions,
						state.instructionIndex + 1,
						true,
					);
					// If we found cond_else, continue from instruction after it (the else content)
					// If we found cond_end, continue from it (will be incremented past)
					state.instructionIndex = elseOrEnd;
					// Don't continue - let it increment past the cond_else/cond_end marker
				}
				break;
			}

			case 'cond_else': {
				// We got here from a true condition (executed then branch), skip to endif
				const mutableInstructions = instructions as Instruction[];
				const endIndex = findConditionalEnd(mutableInstructions, state.instructionIndex + 1, false);
				// Skip past the cond_end
				state.instructionIndex = endIndex;
				break;
			}

			case 'cond_end':
				// End of conditional, continue
				break;

			case 'set_var': {
				const varSpec = instr.value as string;
				const varType = varSpec[0];
				const varName = varSpec.slice(1);
				const value = state.stack.pop() ?? 0;
				if (varType === 's') {
					state.staticVars.set(varName, value);
				} else {
					state.dynamicVars.set(varName, value);
				}
				break;
			}

			case 'get_var': {
				const varSpec = instr.value as string;
				const varType = varSpec[0];
				const varName = varSpec.slice(1);
				if (varType === 's') {
					state.stack.push(state.staticVars.get(varName) ?? 0);
				} else {
					state.stack.push(state.dynamicVars.get(varName) ?? 0);
				}
				break;
			}
		}

		state.instructionIndex++;
	}

	return state.output;
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Capability compilation cache.
 */
const capabilityCache = new Map<string, CompiledCapability>();

/**
 * Compiles a terminfo capability string for efficient repeated execution.
 *
 * @param source - Capability string with parameter placeholders
 * @returns Compiled capability object
 *
 * @example
 * ```typescript
 * import { compileCapability } from 'blecsd';
 *
 * // Compile cursor movement capability
 * const cup = compileCapability('\x1b[%i%p1%d;%p2%dH');
 *
 * // Execute with different parameters
 * cup.execute(0, 0);   // '\x1b[1;1H' (top-left)
 * cup.execute(10, 20); // '\x1b[11;21H' (row 11, col 21)
 * cup.execute(24, 79); // '\x1b[25;80H' (bottom-right on 80x25)
 * ```
 */
export function compileCapability(source: string): CompiledCapability {
	// Check cache
	const cached = capabilityCache.get(source);
	if (cached) {
		return cached;
	}

	const instructions = compileToInstructions(source);

	const compiled: CompiledCapability = {
		source,
		instructions,
		execute(...params: number[]): string {
			return executeInstructions(instructions, params);
		},
	};

	// Cache the compiled capability
	capabilityCache.set(source, compiled);

	return compiled;
}

/**
 * Executes a terminfo capability string with parameters (one-off).
 *
 * For repeated use with the same capability, use compileCapability() instead.
 *
 * @param source - Capability string with parameter placeholders
 * @param params - Parameters to substitute
 * @returns Rendered capability string
 *
 * @example
 * ```typescript
 * import { tparm } from 'blecsd';
 *
 * // Cursor movement
 * tparm('\x1b[%i%p1%d;%p2%dH', 10, 5);  // '\x1b[11;6H'
 *
 * // Set foreground color (256 colors)
 * tparm('\x1b[38;5;%p1%dm', 196);  // '\x1b[38;5;196m'
 *
 * // Parameterized line insert
 * tparm('\x1b[%p1%dL', 5);  // '\x1b[5L'
 * ```
 */
export function tparm(source: string, ...params: number[]): string {
	const compiled = compileCapability(source);
	return compiled.execute(...params);
}

/**
 * Clears the capability compilation cache.
 * Useful for testing or when memory is constrained.
 */
export function clearCapabilityCache(): void {
	capabilityCache.clear();
}

/**
 * Gets the current size of the capability cache.
 */
export function getCapabilityCacheSize(): number {
	return capabilityCache.size;
}

/**
 * Pre-compiles common capabilities for performance.
 *
 * @param capabilities - Map of capability names to strings
 * @returns Map of capability names to compiled capabilities
 *
 * @example
 * ```typescript
 * import { precompileCapabilities } from 'blecsd';
 *
 * const compiled = precompileCapabilities({
 *   cup: '\x1b[%i%p1%d;%p2%dH',
 *   setaf: '\x1b[38;5;%p1%dm',
 *   setab: '\x1b[48;5;%p1%dm',
 * });
 *
 * // Use compiled capabilities
 * compiled.get('cup')?.execute(10, 5);  // '\x1b[11;6H'
 * ```
 */
export function precompileCapabilities(
	capabilities: Record<string, string>,
): Map<string, CompiledCapability> {
	const result = new Map<string, CompiledCapability>();

	for (const [name, source] of Object.entries(capabilities)) {
		result.set(name, compileCapability(source));
	}

	return result;
}

/**
 * Checks if a capability string contains parameters.
 *
 * @param source - Capability string
 * @returns true if the string contains parameter placeholders
 *
 * @example
 * ```typescript
 * import { hasParameters } from 'blecsd';
 *
 * hasParameters('\x1b[H');              // false (no params)
 * hasParameters('\x1b[%i%p1%d;%p2%dH'); // true (has params)
 * ```
 */
export function hasParameters(source: string): boolean {
	return /%[pip{']/.test(source);
}
