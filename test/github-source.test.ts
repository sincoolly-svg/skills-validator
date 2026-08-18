import { existsSync, promises as fs } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { clonePublicGitHubRepository, parseGitHubRepository } from '../src/github-source';

describe('parseGitHubRepository', () => {
  it('accepts a canonical public GitHub repository URL', () => {
    expect(parseGitHubRepository('https://github.com/acme/example-skill')).toEqual({
      owner: 'acme',
      repository: 'example-skill',
      cloneUrl: 'https://github.com/acme/example-skill.git'
    });
  });

  it('rejects a branch path instead of guessing what to clone', () => {
    expect(() => parseGitHubRepository('https://github.com/acme/example-skill/tree/main/skills/demo'))
      .toThrow('GitHub target must be a repository URL');
  });

  it('rejects SSH repository URLs', () => {
    expect(() => parseGitHubRepository('git@github.com:acme/example-skill.git'))
      .toThrow('GitHub target must be a repository URL');
  });

  it('clones with hooks and interactive prompts disabled, then cleans up', async () => {
    let command = '';
    let argumentsReceived: string[] = [];
    const source = await clonePublicGitHubRepository('https://github.com/acme/example-skill', async (file, args) => {
      command = file;
      argumentsReceived = args;
      await fs.mkdir(args.at(-1)!, { recursive: true });
      await fs.writeFile(`${args.at(-1)}/SKILL.md`, '---\nname: demo\ndescription: demo\n---\n', 'utf8');
    });

    expect(command).toBe('git');
    expect(argumentsReceived).toEqual(expect.arrayContaining(['-c', 'core.hooksPath=NUL', 'clone', '--depth', '1', '--no-tags']));
    expect(source.directory).toContain('skills-validator-github-');
    expect(existsSync(source.directory)).toBe(true);

    await source.cleanup();
    expect(existsSync(source.directory)).toBe(false);
  });
});
