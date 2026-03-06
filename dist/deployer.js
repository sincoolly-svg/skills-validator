"use strict";
/**
 * 部署模块
 * 负责将 Skill 部署到本地环境
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.deploySkill = deploySkill;
exports.cleanupWorkDir = cleanupWorkDir;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_1 = require("./utils");
/**
 * 部署单个 Skill
 */
async function deploySkill(skill, config) {
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
        }
        else {
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
    }
    catch (error) {
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
async function copySkillFiles(srcDir, destDir) {
    await fs.promises.cp(srcDir, destDir, { recursive: true });
}
/**
 * 运行安装命令
 */
async function runInstall(manifest, workDir, config) {
    const install = manifest.install;
    const command = install.command || '';
    const workingDir = path.join(workDir, install.workingDir || '.');
    const timeout = config.execution.timeoutPerSkillMinutes * 60 * 1000;
    if (!command || install.type === 'none') {
        return { success: true, log: '无安装命令' };
    }
    console.log(`[Deployer] 执行安装: ${command} (cwd: ${workingDir})`);
    const result = await (0, utils_1.execWithTimeout)(command, {
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
async function cleanupWorkDir(workDir) {
    try {
        if (await (0, utils_1.pathExists)(workDir)) {
            await fs.promises.rm(workDir, { recursive: true });
            console.log(`[Deployer] 已清理工作目录: ${workDir}`);
        }
    }
    catch (error) {
        console.error(`[Deployer] 清理工作目录失败: ${workDir}`, error);
    }
}
/**
 * 保存日志文件
 */
async function saveLog(logDir, filename, content) {
    const logPath = path.join(logDir, filename);
    await fs.promises.writeFile(logPath, content, 'utf-8');
}
//# sourceMappingURL=deployer.js.map