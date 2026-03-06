/**
 * 工具函数
 */

import { exec as execSync } from 'child_process';
import { promisify } from 'util';

export const exec = promisify(execSync);

/**
 * 执行命令（带超时）
 */
export async function execWithTimeout(
  command: string,
  options: { cwd?: string; env?: NodeJS.ProcessEnv; timeout?: number } = {}
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const { cwd = process.cwd(), env = process.env, timeout = 60000 } = options;

  try {
    const { stdout, stderr } = await exec(command, { cwd, env, timeout });
    return { stdout, stderr, exitCode: 0 };
  } catch (error: any) {
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
export async function pathExists(p: string): Promise<boolean> {
  try {
    await require('fs').promises.access(p);
    return true;
  } catch {
    return false;
  }
}
