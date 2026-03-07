import { spawn } from 'node:child_process';
import { describe, expect, test } from 'vitest';
import { stripAnsi } from '../terminal/ansi/parser';

function runCounterDemo(script: string): Promise<{ code: number | null; output: string }> {
	return new Promise((resolve, reject) => {
		const child = spawn('pnpm', ['tsx', 'examples/counter-demo.ts'], {
			cwd: process.cwd(),
			env: {
				...process.env,
				BLECSD_EXAMPLE_SCRIPT: script,
				BLECSD_EXAMPLE_EMIT_STATE: '1',
				COLUMNS: '80',
				LINES: '24',
			},
			stdio: ['ignore', 'pipe', 'pipe'],
		});

		let stdout = '';
		let stderr = '';

		child.stdout.on('data', (chunk: Buffer | string) => {
			stdout += chunk.toString();
		});

		child.stderr.on('data', (chunk: Buffer | string) => {
			stderr += chunk.toString();
		});

		child.on('error', reject);
		child.on('close', (code) => {
			if (code !== 0) {
				reject(new Error(`counter-demo exited with code ${code}: ${stderr}`));
				return;
			}
			resolve({ code, output: stripAnsi(stdout) });
		});
	});
}

describe('examples/counter-demo', () => {
	test('runs scripted interactions and renders expected state transitions', async () => {
		const { output } = await runCounterDemo('+,+,right,r,q');

		expect(output).toContain('blECSd Counter Demo');
		expect(output).toContain('Count: 2');
		expect(output).toContain('Position: 3,2');
		expect(output).toContain('Count: 0');
	});
});
