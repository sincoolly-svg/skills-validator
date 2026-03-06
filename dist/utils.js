"use strict";
/**
 * 工具函数
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.exec = void 0;
exports.execWithTimeout = execWithTimeout;
exports.pathExists = pathExists;
const child_process_1 = require("child_process");
const util_1 = require("util");
exports.exec = (0, util_1.promisify)(child_process_1.exec);
/**
 * 执行命令（带超时）
 */
async function execWithTimeout(command, options = {}) {
    const { cwd = process.cwd(), env = process.env, timeout = 60000 } = options;
    try {
        const { stdout, stderr } = await (0, exports.exec)(command, { cwd, env, timeout });
        return { stdout, stderr, exitCode: 0 };
    }
    catch (error) {
        return {
            stdout: error.stdout || '',
            stderr: error.stderr || error.message,
            exitCode: error.code || 1
        };
    }
}
/**
 * 检查路径是否存在
 */
async function pathExists(p) {
    try {
        await require('fs').promises.access(p);
        return true;
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=utils.js.map