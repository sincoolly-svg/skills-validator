import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

export interface GitHubRepository {
  owner: string;
  repository: string;
  cloneUrl: string;
}

export interface ClonedGitHubRepository {
  directory: string;
  source: string;
  cleanup(): Promise<void>;
}

export type GitCommandRunner = (file: string, args: string[], environment: NodeJS.ProcessEnv) => Promise<void>;

const repositoryPart = /^[A-Za-z0-9_.-]+$/;

export function parseGitHubRepository(input: string): GitHubRepository {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new Error('GitHub target must be a repository URL');
  }

  const parts = url.pathname.split('/').filter(Boolean);
  const owner = parts[0] ?? '';
  const repository = (parts[1] ?? '').replace(/\.git$/i, '');
  if (
    url.protocol !== 'https:' ||
    url.hostname !== 'github.com' ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    parts.length !== 2 ||
    !repositoryPart.test(owner) ||
    !repositoryPart.test(repository)
  ) {
    throw new Error('GitHub target must be a repository URL');
  }

  return { owner, repository, cloneUrl: `https://github.com/${owner}/${repository}.git` };
}

function restrictedGitEnvironment(temporaryDirectory: string): NodeJS.ProcessEnv {
  const environment: NodeJS.ProcessEnv = {
    HOME: temporaryDirectory,
    USERPROFILE: temporaryDirectory,
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_CONFIG_GLOBAL: path.join(temporaryDirectory, 'empty-gitconfig'),
    GIT_TERMINAL_PROMPT: '0'
  };
  for (const name of ['PATH', 'SystemRoot', 'SystemDrive', 'ComSpec', 'PATHEXT', 'WINDIR', 'TEMP', 'TMP']) {
    if (process.env[name]) environment[name] = process.env[name];
  }
  return environment;
}

const runGit: GitCommandRunner = (file, args, environment) => new Promise((resolve, reject) => {
  const child = spawn(file, args, { env: environment, shell: false, windowsHide: true, stdio: 'ignore' });
  child.once('error', () => reject(new Error('Git clone failed.')));
  child.once('exit', (code) => code === 0 ? resolve() : reject(new Error('Git clone failed.')));
});

export async function clonePublicGitHubRepository(input: string, commandRunner: GitCommandRunner = runGit): Promise<ClonedGitHubRepository> {
  const repository = parseGitHubRepository(input);
  const temporaryDirectory = await fs.mkdtemp(path.join(tmpdir(), 'skills-validator-github-'));
  const directory = path.join(temporaryDirectory, 'repository');
  try {
    await commandRunner('git', [
      '-c', 'core.hooksPath=NUL',
      '-c', 'filter.lfs.smudge=',
      '-c', 'filter.lfs.required=false',
      'clone', '--depth', '1', '--no-tags', repository.cloneUrl, directory
    ], restrictedGitEnvironment(temporaryDirectory));
  } catch (error) {
    await fs.rm(temporaryDirectory, { recursive: true, force: true });
    throw error;
  }

  return {
    directory,
    source: `${repository.owner}/${repository.repository}`,
    cleanup: () => fs.rm(temporaryDirectory, { recursive: true, force: true })
  };
}
