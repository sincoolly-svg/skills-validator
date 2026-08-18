#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
const cli_1 = require("./cli");
const processIo = {
    stdout: (message) => process.stdout.write(message),
    stderr: (message) => process.stderr.write(message)
};
async function main(args = process.argv.slice(2), io = processIo) {
    return (0, cli_1.runCli)(args, io);
}
if (require.main === module) {
    main().then((exitCode) => {
        process.exitCode = exitCode;
    }).catch((error) => {
        process.stderr.write(`Error: ${error instanceof Error ? error.message : 'Unexpected failure'}\n`);
        process.exitCode = 2;
    });
}
//# sourceMappingURL=index.js.map