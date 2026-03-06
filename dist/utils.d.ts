/**
 * 工具函数
 */
import { exec as execSync } from 'child_process';
export declare const exec: typeof execSync.__promisify__;
/**
 * 执行命令（带超时）
 */
export declare function execWithTimeout(command: string, options?: {
    cwd?: string;
    env?: NodeJS.ProcessEnv;
    timeout?: number;
}): Promise<{
    stdout: string;
    stderr: string;
    exitCode: number;
}>;
/**
 * 检查路径是否存在
 */
export declare function pathExists(p: string): Promise<boolean>;
//# sourceMappingURL=utils.d.ts.map