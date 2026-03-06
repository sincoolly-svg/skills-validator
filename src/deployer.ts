/**
 * 部署模块
 * 负责将 Skill 部署到本地环境
 */

import * as fs from 'fs';
import * as path from 'path';
import { execWithTimeout, pathExists } from './utils';
import { ScannedSkill, SkillManifest } from './scanner';
import { ValidatorConfig } from './config';

export interface DeployResult {
  success: boolean;
  workDir: string;
  installLog: string;
  installDuration: number;
  error?: string;
}

/**
 * 部署单个 Skill
 */
export async function deploySkill(
  skill: ScannedSkill,
  config: ValidatorConfig
): Promise<DeployResult> {
  const startTime = Date.now();
  const workDir = path.join(config.storage.baseDir, config.storage.tempDir, skill.name);
  const logDir = path.join(config.storage.baseDir, config.storage.logsDir);

  console.log(`[Deployer] 开始部署 Skill: ${skill.name}`);

  try {
    // 1. 创建工作目录
    await fs.promises.mkdir(workDir, { recursive: true });

    // 2. 复制 Skill 文件
    await copySkillFiles(skill.path, workDir);
    console.log(`[Deployer] 文件已复制到: ${workDir}`);

    // 3. 执行安装
    let installLog = '';
    if (skill.manifest?.install && skill.manifest.install.type !== 'none') {
      const installResult = await runInstall(skill.manifest, workDir, config);
      installLog = installResult.log;
      
      if (!installResult.success) {
        await saveLog(logDir, `${skill.name}_install.log`, installLog);
        return {
          success: false,
          workDir,
          installLog,
          installDuration: Date.now() - startTime,
          error: `安装失败: ${installResult.error}`
        };
      }
    } else {
      installLog = '无安装步骤（install.type = none 或未定义）';
    }

    // 4. 保存安装日志
    await saveLog(logDir, `${skill.name}_install.log`, installLog);

    console.log(`[Deployer] Skill 部署成功: ${skill.name}`);

    return {
      success: true,
      workDir,
      installLog,
      installDuration: Date.now() - startTime
    };
  } catch (error: any) {
    console.error(`[Deployer] 部署失败: ${skill.name}`, error);
    return {
      success: false,
      workDir,
      installLog: '',
      installDuration: Date.now() - startTime,
      error: error.message
    };
  }
}

/**
 * 复制 Skill 文件到工作目录
 */
async function copySkillFiles(srcDir: string, destDir: string): Promise<void> {
  await fs.promises.cp(srcDir, destDir, { recursive: true });
}

/**
 * 运行安装命令
 */
async function runInstall(
  manifest: SkillManifest,
  workDir: string,
  config: ValidatorConfig
): Promise<{ success: boolean; log: string; error?: string }> {
  const install = manifest.install!;
  const command = install.command || '';
  const workingDir = path.join(workDir, install.workingDir || '.');
  const timeout = config.execution.timeoutPerSkillMinutes * 60 * 1000;

  if (!command || install.type === 'none') {
    return { success: true, log: '无安装命令' };
  }

  console.log(`[Deployer] 执行安装: ${command} (cwd: ${workingDir})`);

  const result = await execWithTimeout(command, {
    cwd: workingDir,
    env: { ...process.env, ...install.env },
    timeout
  });

  const log = `[Command] ${command}
[Exit Code] ${result.exitCode}
[Stdout]
${result.stdout}
[Stderr]
${result.stderr}
`;

  if (result.exitCode !== 0) {
    return {
      success: false,
      log,
      error: `Exit code: ${result.exitCode}`
    };
  }

  return { success: true, log };
}

/**
 * 清理工作目录
 */
export async function cleanupWorkDir(workDir: string): Promise<void> {
  try {
    if (await pathExists(workDir)) {
      await fs.promises.rm(workDir, { recursive: true });
      console.log(`[Deployer] 已清理工作目录: ${workDir}`);
    }
  } catch (error) {
    console.error(`[Deployer] 清理工作目录失败: ${workDir}`, error);
  }
}

/**
 * 保存日志文件
 */
async function saveLog(logDir: string, filename: string, content: string): Promise<void> {
  const logPath = path.join(logDir, filename);
  await fs.promises.writeFile(logPath, content, 'utf-8');
}
