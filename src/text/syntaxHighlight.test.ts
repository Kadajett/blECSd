import { describe, expect, it } from 'vitest';
import {
	DEFAULT_COLORS,
	type HighlightConfig,
	HighlightConfigSchema,
	highlightCode,
	stripHighlight,
} from './syntaxHighlight';

describe('syntaxHighlight', () => {
	describe('HighlightConfigSchema', () => {
		it('validates valid config', () => {
			const config: HighlightConfig = {
				colors: {
					keyword: '\x1b[31m',
					string: '\x1b[32m',
				},
				enabled: true,
			};
			expect(() => HighlightConfigSchema.parse(config)).not.toThrow();
		});

		it('validates empty config', () => {
			expect(() => HighlightConfigSchema.parse({})).not.toThrow();
		});

		it('validates partial colors', () => {
			const config = {
				colors: {
					keyword: '\x1b[31m',
				},
			};
			expect(() => HighlightConfigSchema.parse(config)).not.toThrow();
		});
	});

	describe('highlightCode - JavaScript', () => {
		it('highlights keywords', () => {
			const code = 'const x = 1;';
			const result = highlightCode(code, 'javascript');
			expect(result).toContain(DEFAULT_COLORS.keyword); // 'const'
			expect(result).toContain(DEFAULT_COLORS.number); // '1'
		});

		it('highlights strings', () => {
			const code = 'const str = "hello";';
			const result = highlightCode(code, 'javascript');
			expect(result).toContain(DEFAULT_COLORS.string);
		});

		it('highlights single-quoted strings', () => {
			const code = "const str = 'hello';";
			const result = highlightCode(code, 'javascript');
			expect(result).toContain(DEFAULT_COLORS.string);
		});

		it('highlights template strings', () => {
			const code = 'const str = `hello`;';
			const result = highlightCode(code, 'javascript');
			expect(result).toContain(DEFAULT_COLORS.string);
		});

		it('highlights numbers', () => {
			const code = 'const x = 123;';
			const result = highlightCode(code, 'javascript');
			expect(result).toContain(DEFAULT_COLORS.number);
		});

		it('highlights hex numbers', () => {
			const code = 'const x = 0xff;';
			const result = highlightCode(code, 'javascript');
			expect(result).toContain(DEFAULT_COLORS.number);
		});

		it('highlights floating point numbers', () => {
			const code = 'const x = 3.14;';
			const result = highlightCode(code, 'javascript');
			expect(result).toContain(DEFAULT_COLORS.number);
		});

		it('highlights single-line comments', () => {
			const code = '// This is a comment';
			const result = highlightCode(code, 'javascript');
			expect(result).toContain(DEFAULT_COLORS.comment);
		});

		it('highlights multi-line comments', () => {
			const code = '/* This is\na comment */';
			const result = highlightCode(code, 'javascript');
			expect(result).toContain(DEFAULT_COLORS.comment);
		});

		it('highlights function calls', () => {
			const code = 'console.log("test");';
			const result = highlightCode(code, 'javascript');
			expect(result).toContain(DEFAULT_COLORS.function);
		});

		it('highlights constants', () => {
			const code = 'const x = true;';
			const result = highlightCode(code, 'javascript');
			expect(result).toContain(DEFAULT_COLORS.constant); // 'true'
		});

		it('highlights null and undefined', () => {
			const code = 'const x = null; const y = undefined;';
			const result = highlightCode(code, 'javascript');
			expect(result).toContain(DEFAULT_COLORS.constant);
		});

		it('highlights operators', () => {
			const code = 'const x = 1 + 2;';
			const result = highlightCode(code, 'javascript');
			expect(result).toContain(DEFAULT_COLORS.operator);
		});

		it('highlights punctuation', () => {
			const code = 'const obj = { x: 1 };';
			const result = highlightCode(code, 'javascript');
			expect(result).toContain(DEFAULT_COLORS.punctuation);
		});

		it('handles escaped strings', () => {
			const code = 'const str = "hello\\"world";';
			const result = highlightCode(code, 'javascript');
			expect(result).toContain(DEFAULT_COLORS.string);
		});

		it('handles complete function', () => {
			const code = `function greet(name) {
  return "Hello, " + name;
}`;
			const result = highlightCode(code, 'javascript');
			expect(result).toContain(DEFAULT_COLORS.keyword); // 'function', 'return'
			expect(result).toContain(DEFAULT_COLORS.string);
			expect(result).toContain(DEFAULT_COLORS.operator);
		});
	});

	describe('highlightCode - TypeScript', () => {
		it('highlights TypeScript keywords', () => {
			const code = 'interface User { name: string; }';
			const result = highlightCode(code, 'typescript');
			expect(result).toContain(DEFAULT_COLORS.keyword); // 'interface'
		});

		it('highlights type annotations', () => {
			const code = 'const x: number = 1;';
			const result = highlightCode(code, 'typescript');
			expect(result).toContain(DEFAULT_COLORS.keyword); // 'const'
			expect(result).toContain(DEFAULT_COLORS.number);
		});

		it('highlights TypeScript-specific keywords', () => {
			const code = 'type MyType = string | number;';
			const result = highlightCode(code, 'typescript');
			expect(result).toContain(DEFAULT_COLORS.keyword); // 'type'
		});
	});

	describe('highlightCode - JSON', () => {
		it('highlights property keys', () => {
			const code = '{"name": "value"}';
			const result = highlightCode(code, 'json');
			expect(result).toContain(DEFAULT_COLORS.property); // "name"
		});

		it('highlights string values', () => {
			const code = '{"key": "value"}';
			const result = highlightCode(code, 'json');
			expect(result).toContain(DEFAULT_COLORS.string); // "value"
		});

		it('highlights numbers', () => {
			const code = '{"count": 123}';
			const result = highlightCode(code, 'json');
			expect(result).toContain(DEFAULT_COLORS.number);
		});

		it('highlights negative numbers', () => {
			const code = '{"temp": -5}';
			const result = highlightCode(code, 'json');
			expect(result).toContain(DEFAULT_COLORS.number);
		});

		it('highlights floating point numbers', () => {
			const code = '{"pi": 3.14}';
			const result = highlightCode(code, 'json');
			expect(result).toContain(DEFAULT_COLORS.number);
		});

		it('highlights booleans', () => {
			const code = '{"active": true}';
			const result = highlightCode(code, 'json');
			expect(result).toContain(DEFAULT_COLORS.constant); // 'true'
		});

		it('highlights null', () => {
			const code = '{"data": null}';
			const result = highlightCode(code, 'json');
			expect(result).toContain(DEFAULT_COLORS.constant); // 'null'
		});

		it('highlights punctuation', () => {
			const code = '{"a": [1, 2, 3]}';
			const result = highlightCode(code, 'json');
			expect(result).toContain(DEFAULT_COLORS.punctuation);
		});

		it('handles nested objects', () => {
			const code = '{"user": {"name": "Alice", "age": 30}}';
			const result = highlightCode(code, 'json');
			expect(result).toContain(DEFAULT_COLORS.property);
			expect(result).toContain(DEFAULT_COLORS.string);
			expect(result).toContain(DEFAULT_COLORS.number);
		});

		it('handles arrays', () => {
			const code = '{"items": [1, 2, 3]}';
			const result = highlightCode(code, 'json');
			expect(result).toContain(DEFAULT_COLORS.number);
			expect(result).toContain(DEFAULT_COLORS.punctuation);
		});

		it('handles escaped strings', () => {
			const code = '{"text": "hello\\"world"}';
			const result = highlightCode(code, 'json');
			expect(result).toContain(DEFAULT_COLORS.string);
		});
	});

	describe('highlightCode - Bash', () => {
		it('highlights bash keywords', () => {
			const code = 'if [ -f file ]; then echo "exists"; fi';
			const result = highlightCode(code, 'bash');
			expect(result).toContain(DEFAULT_COLORS.keyword); // 'if', 'then', 'fi'
		});

		it('highlights strings', () => {
			const code = 'echo "hello world"';
			const result = highlightCode(code, 'bash');
			expect(result).toContain(DEFAULT_COLORS.string);
		});

		it('highlights single-quoted strings', () => {
			const code = "echo 'hello world'";
			const result = highlightCode(code, 'bash');
			expect(result).toContain(DEFAULT_COLORS.string);
		});

		it('highlights variables', () => {
			const code = 'echo $USER';
			const result = highlightCode(code, 'bash');
			expect(result).toContain(DEFAULT_COLORS.variable);
		});

		it('highlights braced variables', () => {
			// biome-ignore lint/suspicious/noTemplateCurlyInString: Testing bash variable syntax
			const code = 'echo ${USER}';
			const result = highlightCode(code, 'bash');
			expect(result).toContain(DEFAULT_COLORS.variable);
		});

		it('highlights comments', () => {
			const code = '# This is a comment';
			const result = highlightCode(code, 'bash');
			expect(result).toContain(DEFAULT_COLORS.comment);
		});

		it('highlights numbers', () => {
			const code = 'count=42';
			const result = highlightCode(code, 'bash');
			expect(result).toContain(DEFAULT_COLORS.number);
		});

		it('highlights operators', () => {
			const code = 'cmd1 | cmd2';
			const result = highlightCode(code, 'bash');
			expect(result).toContain(DEFAULT_COLORS.operator);
		});

		it('highlights redirects', () => {
			const code = 'echo "test" > file.txt';
			const result = highlightCode(code, 'bash');
			expect(result).toContain(DEFAULT_COLORS.operator); // '>'
		});

		it('handles loops', () => {
			const code = 'for i in 1 2 3; do echo $i; done';
			const result = highlightCode(code, 'bash');
			expect(result).toContain(DEFAULT_COLORS.keyword); // 'for', 'in', 'do', 'done'
			expect(result).toContain(DEFAULT_COLORS.variable); // '$i'
		});

		it('handles escaped strings', () => {
			const code = 'echo "hello\\"world"';
			const result = highlightCode(code, 'bash');
			expect(result).toContain(DEFAULT_COLORS.string);
		});
	});

	describe('highlightCode - language aliases', () => {
		it('treats "shell" as bash', () => {
			const code = 'echo $USER';
			const shellResult = highlightCode(code, 'shell');
			const bashResult = highlightCode(code, 'bash');
			expect(stripHighlight(shellResult)).toBe(stripHighlight(bashResult));
		});

		it('treats "sh" as bash', () => {
			const code = 'echo $USER';
			const shResult = highlightCode(code, 'sh');
			const bashResult = highlightCode(code, 'bash');
			expect(stripHighlight(shResult)).toBe(stripHighlight(bashResult));
		});
	});

	describe('highlightCode - configuration', () => {
		it('uses custom colors', () => {
			const code = 'const x = 1;';
			const customColor = '\x1b[31m'; // Red
			const result = highlightCode(code, 'javascript', {
				colors: {
					keyword: customColor,
				},
			});
			expect(result).toContain(customColor);
		});

		it('merges custom colors with defaults', () => {
			const code = 'const str = "hello";';
			const customKeyword = '\x1b[31m';
			const result = highlightCode(code, 'javascript', {
				colors: {
					keyword: customKeyword,
				},
			});
			expect(result).toContain(customKeyword); // Custom keyword color
			expect(result).toContain(DEFAULT_COLORS.string); // Default string color
		});

		it('disables highlighting when enabled=false', () => {
			const code = 'const x = 1;';
			const result = highlightCode(code, 'javascript', {
				enabled: false,
			});
			expect(result).toBe(code);
			expect(result).not.toContain('\x1b[');
		});
	});

	describe('highlightCode - unsupported languages', () => {
		it('returns code as-is for unsupported language', () => {
			const code = 'some random code';
			const result = highlightCode(code, 'unknown' as never);
			expect(result).toBe(code);
		});
	});

	describe('stripHighlight', () => {
		it('removes ANSI color codes', () => {
			const highlighted = '\x1b[31mred text\x1b[0m normal';
			const result = stripHighlight(highlighted);
			expect(result).toBe('red text normal');
		});

		it('removes multiple color codes', () => {
			const highlighted = '\x1b[31mred\x1b[0m \x1b[32mgreen\x1b[0m \x1b[34mblue\x1b[0m';
			const result = stripHighlight(highlighted);
			expect(result).toBe('red green blue');
		});

		it('handles code without color codes', () => {
			const code = 'plain text';
			const result = stripHighlight(code);
			expect(result).toBe(code);
		});

		it('removes 256-color codes', () => {
			const highlighted = '\x1b[38;5;175mtext\x1b[0m';
			const result = stripHighlight(highlighted);
			expect(result).toBe('text');
		});
	});

	describe('edge cases', () => {
		it('handles empty code', () => {
			const result = highlightCode('', 'javascript');
			expect(result).toBe('');
		});

		it('handles code with only whitespace', () => {
			const code = '   \n\t';
			const result = highlightCode(code, 'javascript');
			expect(result).toBe(code);
		});

		it('handles unclosed strings', () => {
			const code = 'const str = "unclosed';
			const result = highlightCode(code, 'javascript');
			expect(result).toContain(DEFAULT_COLORS.string);
		});

		it('handles unclosed comments', () => {
			const code = '/* unclosed comment';
			const result = highlightCode(code, 'javascript');
			expect(result).toContain(DEFAULT_COLORS.comment);
		});

		it('handles special characters in strings', () => {
			const code = 'const str = "\\n\\t\\r";';
			const result = highlightCode(code, 'javascript');
			expect(result).toContain(DEFAULT_COLORS.string);
		});

		it('preserves whitespace', () => {
			const code = 'const  x  =  1;';
			const result = stripHighlight(highlightCode(code, 'javascript'));
			expect(result).toBe(code);
		});

		it('preserves newlines', () => {
			const code = 'const x = 1;\nconst y = 2;';
			const result = stripHighlight(highlightCode(code, 'javascript'));
			expect(result).toBe(code);
		});
	});
});
