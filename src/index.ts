#!/usr/bin/env node

import { CliIo, runCli } from './cli';

const processIo: CliIo = {
  stdout: (message) => process.stdout.write(message),
  stderr: (message) => process.stderr.write(message)
};

export async function main(args: string[] = process.argv.slice(2), io: CliIo = processIo): Promise<number> {
  return runCli(args, io);
}

if (require.main === module) {
  main().then((exitCode) => {
    process.exitCode = exitCode;
  }).catch((error) => {
    process.stderr.write(`Error: ${error instanceof Error ? error.message : 'Unexpected failure'}\n`);
    process.exitCode = 2;
  });
}
