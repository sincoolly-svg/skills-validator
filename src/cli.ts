import { promises as fs } from 'node:fs';
import path from 'node:path';
import { clonePublicGitHubRepository, ClonedGitHubRepository } from './github-source';
import { renderReport, ReportFormat } from './report';
import { ScanResult, scanDirectory } from './static-scanner';

export interface CliIo {
  stdout(message: string): void;
  stderr(message: string): void;
  cwd?: string;
}

interface CliOptions {
  target: string;
  format: ReportFormat;
  output?: string;
}

export type PublicRepositoryCloner = (input: string) => Promise<ClonedGitHubRepository>;

const usage = 'Usage: skills-validator scan <directory-or-github-url> [--format text|markdown|json] [--output <file>]\n';

function parseCliOptions(args: string[]): CliOptions {
  const tokens = args[0] === 'scan' ? args.slice(1) : [...args];
  let target = '';
  let format: ReportFormat = 'text';
  let output: string | undefined;

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token === '--format') {
      const requestedFormat = tokens[index + 1];
      if (requestedFormat !== 'text' && requestedFormat !== 'markdown' && requestedFormat !== 'json') throw new Error(usage);
      format = requestedFormat;
      index += 1;
      continue;
    }
    if (token === '--output') {
      output = tokens[index + 1];
      if (!output) throw new Error(usage);
      index += 1;
      continue;
    }
    if (token.startsWith('-') || target) throw new Error(usage);
    target = token;
  }

  if (!target) throw new Error(usage);
  return { target, format, output };
}

export async function scanTarget(target: string, publicRepositoryCloner: PublicRepositoryCloner = clonePublicGitHubRepository): Promise<ScanResult> {
  if (!target.startsWith('https://')) return scanDirectory(target);

  const clonedRepository = await publicRepositoryCloner(target);
  try {
    const result = await scanDirectory(clonedRepository.directory);
    return { ...result, source: clonedRepository.source };
  } finally {
    await clonedRepository.cleanup();
  }
}

export async function runCli(args: string[], io: CliIo): Promise<number> {
  let options: CliOptions;
  try {
    options = parseCliOptions(args);
  } catch (error) {
    io.stderr(error instanceof Error ? error.message : usage);
    return 2;
  }

  try {
    const result = await scanTarget(options.target);
    const output = renderReport(result, options.format);
    if (options.output) await fs.writeFile(path.resolve(io.cwd ?? process.cwd(), options.output), output, 'utf8');
    io.stdout(output);
    return result.findings.length === 0 ? 0 : 1;
  } catch (error) {
    io.stderr(`Error: ${error instanceof Error ? error.message : 'Scan failed'}\n`);
    return 2;
  }
}

export { usage };
