"use strict";
/**
 * 验证Skills 主入口
 * 对指定的 GitHub Skill 进行功能测评
 *
 * 用法: node dist/index.js <github-url>
 * 例如: node dist/index.js https://github.com/openclaw/healthcheck
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
exports.main = main;
const path = __importStar(require("path"));
const config_1 = require("./config");
const scanner_1 = require("./scanner");
const deployer_1 = require("./deployer");
const validator_1 = require("./validator");
/**
 * 主函数 - 支持单个 GitHub URL 测评
 */
async function main(githubUrl) {
    // 如果没有提供 URL，打印用法
    if (!githubUrl) {
        console.log('========== 验证Skills - 用法 ==========');
        console.log('用法: node dist/index.js <github-url>');
        console.log('例如: node dist/index.js https://github.com/openclaw/healthcheck');
        console.log('或: node dist/index.js openclaw/healthcheck');
        return;
    }
    console.log('========== 验证Skills 开始运行 ==========');
    console.log(`[Target] ${githubUrl}`);
    // 1. 解析 GitHub URL 或本地路径
    console.log('[Step 1] 解析地址...');
    const { owner, repo, skillName, isLocal, localPath: localSkillPath } = parseGitHubUrl(githubUrl);
    if (isLocal) {
        console.log(`[Step 1] 本地路径: ${localSkillPath}`);
    }
    else {
        console.log(`[Step 1] Owner: ${owner}, Repo: ${repo}, Skill: ${skillName}`);
    }
    // 2. 加载配置
    console.log('[Step 2] 加载配置...');
    const config = await (0, config_1.loadConfig)();
    await (0, config_1.ensureDirectories)(config);
    // 3. 获取 Skill 路径
    let skillPath = '';
    let sourceRepo = '';
    if (isLocal) {
        // 本地路径
        skillPath = localSkillPath;
        sourceRepo = 'local';
        console.log(`[Step 3] Skill 路径: ${skillPath}`);
    }
    else {
        // GitHub 仓库
        console.log('[Step 3] 克隆仓库...');
        const repoUrl = `https://github.com/${owner}/${repo}.git`;
        const localPath = await (0, scanner_1.cloneRepoByUrl)(repoUrl, config.storage.cacheDir);
        skillPath = path.join(localPath, skillName || '.');
        sourceRepo = repoUrl;
        console.log(`[Step 3] 仓库已克隆到: ${localPath}`);
    }
    // 4. 扫描 skill
    console.log('[Step 4] 扫描 Skill...');
    const skill = await (0, scanner_1.scanSingleSkill)(skillPath, sourceRepo);
    if (!skill) {
        console.error(`[Error] 无法扫描 Skill: ${skillPath}`);
        return;
    }
    console.log(`[Step 4] Skill 名称: ${skill.name}`);
    // 5. 部署 Skill
    console.log('[Step 5] 部署 Skill...');
    const deployResult = await (0, deployer_1.deploySkill)(skill, config);
    if (!deployResult.success) {
        console.error('[Error] Skill 部署失败');
        return;
    }
    console.log('[Step 5] Skill 部署成功');
    // 6. 验证 Skill（实际调用并测评）
    console.log('[Step 6] 开始测评 Skill...');
    const workDir = path.join(config.storage.baseDir, config.storage.tempDir, skill.name);
    const validateResult = await (0, validator_1.validateSkill)(skill, workDir, config);
    console.log(`[Step 6] 测评完成, 状态: ${validateResult.status}`);
    // 7. 生成报告
    console.log('[Step 7] 生成测评报告...');
    const report = await (0, validator_1.generateReport)(skill, {
        success: deployResult.success,
        installLog: deployResult.installLog,
        installDuration: deployResult.installDuration
    }, validateResult, config);
    // 8. 清理
    await (0, deployer_1.cleanupWorkDir)(workDir);
    console.log('========== 验证Skills 运行完成 ==========');
    console.log(`Skill: ${skill.name}`);
    console.log(`状态: ${report.status}`);
    console.log(`报告: ${report.skillName}_${report.validatedAt.replace(/[:.]/g, '-')}.md`);
}
/**
 * 解析 GitHub URL 或本地路径
 */
function parseGitHubUrl(url) {
    // 如果是本地 Windows 路径 (如 D:\xxx, C:\xxx) 或 Unix 绝对路径
    const isWindowsPath = /^[a-zA-Z]:\\/.test(url);
    const isUnixPath = /^\/[^\/]/.test(url);
    const isRelativePath = !url.includes('://') && (url.startsWith('.') || !url.includes('/'));
    if (isWindowsPath || isUnixPath || (isRelativePath && !url.includes('github'))) {
        console.log('[Parse] 检测到本地路径');
        return { owner: '', repo: '', skillName: '', isLocal: true, localPath: url };
    }
    // 处理各种格式
    // https://github.com/owner/repo
    // https://github.com/owner/repo/tree/main/skills/skill-name
    // https://github.com/owner/repo/tree/main/skill-name
    // owner/repo
    // owner/repo/skills/skill-name
    let cleanUrl = url.trim();
    // 移除 .git 后缀
    if (cleanUrl.endsWith('.git')) {
        cleanUrl = cleanUrl.slice(0, -4);
    }
    // 提取 owner/repo
    let owner = '';
    let repo = '';
    let skillName = '';
    // 处理完整 URL
    const urlMatch = cleanUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (urlMatch) {
        owner = urlMatch[1];
        repo = urlMatch[2];
        // 检查是否有 tree/branch 路径
        const treeMatch = cleanUrl.match(/tree\/[^\/]+\/(.+)$/);
        if (treeMatch) {
            skillName = treeMatch[1];
        }
    }
    else {
        // 处理 owner/repo 格式
        const parts = cleanUrl.split('/');
        if (parts.length >= 2) {
            owner = parts[0];
            repo = parts[1];
            if (parts.length > 2) {
                skillName = parts.slice(2).join('/');
            }
        }
    }
    return { owner, repo, skillName, isLocal: false, localPath: '' };
}
// 允许直接运行
if (require.main === module) {
    const args = process.argv.slice(2);
    const githubUrl = args[0];
    main(githubUrl).catch(console.error);
}
//# sourceMappingURL=index.js.map