import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { main } from '../src/index';

const temporaryDirectories: string[] = [];

afterEach(() => {
  while (temporaryDirectories.length) rmSync(temporaryDirectories.pop()!, { recursive: true, force: true });
});

describe('main', () => {
  it('delegates to the static scan CLI without executing the target', async () => {
    const directory = mkdtempSync(path.join(tmpdir(), 'skills-validator-main-'));
    temporaryDirectories.push(directory);
    writeFileSync(path.join(directory, 'SKILL.md'), '---\nname: safe\ndescription: Safe fixture\n---\n', 'utf8');
    writeFileSync(path.join(directory, 'unsafe.sh'), 'echo executed > marker.txt\n', 'utf8');
    let stdout = '';

    const exitCode = await main(['scan', directory], {
      stdout: (message) => { stdout += message; },
      stderr: () => undefined
    });

    expect(exitCode).toBe(0);
    expect(stdout).toContain('0 findings');
    expect(() => writeFileSync(path.join(directory, 'marker.txt'), 'not created by scan', { flag: 'wx' })).not.toThrow();
  });
});
