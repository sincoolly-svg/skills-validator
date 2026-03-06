"use strict";
/**
 * 扫描模块
 * 负责从 GitHub 源扫描 Skills，检测新增/更新
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
exports.scanSources = scanSources;
exports.detectChanges = detectChanges;
exports.cloneRepoByUrl = cloneRepoByUrl;
exports.scanSingleSkill = scanSingleSkill;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_1 = require("./utils");
/**
 * 扫描所有配置的源
 */
async function scanSources(config) {
    const allSkills = [];
    const sourcesStatus = [];
    for (const source of config.sources) {
        const sourceInfo = source.type === 'local-dir' ? source.path : source.repo;
        console.log(`[Scanner] 扫描源: ${source.name} (${sourceInfo})`);
        try {
            const { skills, localPath } = await scanSource(source, config);
            allSkills.push(...skills);
            sourcesStatus.push({
                name: source.name,
                repo: source.repo,
                skillsRoot: source.skillsRoot,
                path: source.path,
                lastSyncedAt: new Date().toISOString(),
                localPath
            });
        }
        catch (error) {
            console.error(`[Scanner] 扫描源失败: ${source.name}`, error);
        }
    }
    return { skills: allSkills, sources: sourcesStatus };
}
/**
 * 扫描单个源
 */
async function scanSource(source, config) {
    let localPath;
    let entries;
    if (source.type === 'local-dir') {
        // 本地目录模式
        localPath = source.path || '';
        console.log(`[Scanner] 扫描本地目录: ${localPath}`);
        try {
            entries = await fs.promises.readdir(localPath, { withFileTypes: true });
        }
        catch (error) {
            console.error(`[Scanner] 无法读取本地目录: ${localPath}`, error);
            return { skills: [], localPath };
        }
    }
    else {
        // Git 仓库模式
        if (!source.skillsRoot) {
            console.error(`[Scanner] repo-dir 类型需要指定 skillsRoot`);
            return { skills: [], localPath: '' };
        }
        const cacheDir = path.join(config.storage.baseDir, 'cache', source.name);
        await fs.promises.mkdir(cacheDir, { recursive: true });
        localPath = await ensureRepoCloned(source, cacheDir, config);
        const skillsRoot = path.join(localPath, source.skillsRoot);
        try {
            entries = await fs.promises.readdir(skillsRoot, { withFileTypes: true });
        }
        catch (error) {
            console.error(`[Scanner] 无法读取 skills 目录: ${skillsRoot}`, error);
            return { skills: [], localPath };
        }
    }
    const skills = [];
    for (const entry of entries) {
        if (!entry.isDirectory())
            continue;
        const skillPath = path.join(localPath, entry.name);
        const skill = await extractSkillInfo(skillPath, source);
        skills.push(skill);
    }
    console.log(`[Scanner] 源 ${source.name} 发现 ${skills.length} 个 Skills`);
    return { skills, localPath };
}
/**
 * 确保仓库已克隆到本地
 */
async function ensureRepoCloned(source, cacheDir, config) {
    if (!source.repo || !source.branch) {
        throw new Error('repo-dir 类型需要指定 repo 和 branch');
    }
    const repoName = getRepoName(source.repo);
    const repoDir = path.join(cacheDir, repoName);
    const exists = fs.existsSync(repoDir);
    if (exists) {
        // Pull 最新代码
        console.log(`[Scanner] 更新仓库: ${source.repo}`);
        try {
            await (0, utils_1.exec)('git fetch origin', { cwd: repoDir });
            await (0, utils_1.exec)(`git checkout ${source.branch}`, { cwd: repoDir });
            await (0, utils_1.exec)(`git pull origin ${source.branch}`, { cwd: repoDir });
        }
        catch (error) {
            console.warn(`[Scanner] 更新仓库失败，重新克隆: ${error}`);
            await fs.promises.rm(repoDir, { recursive: true });
            return await cloneRepo(source, cacheDir);
        }
    }
    else {
        // 克隆仓库
        console.log(`[Scanner] 克隆仓库: ${source.repo}`);
        return await cloneRepo(source, cacheDir);
    }
    return repoDir;
}
/**
 * 克隆仓库
 */
async function cloneRepo(source, targetDir) {
    if (!source.repo || !source.branch) {
        throw new Error('repo-dir 类型需要指定 repo 和 branch');
    }
    const repoName = getRepoName(source.repo);
    const repoDir = path.join(targetDir, repoName);
    const depthFlag = source.type === 'repo-dir' ? '--depth 1' : '';
    await (0, utils_1.exec)(`git clone ${depthFlag} -b ${source.branch} ${source.repo} ${repoDir}`);
    return repoDir;
}
/**
 * 从仓库 URL 提取名称
 */
function getRepoName(repoUrl) {
    // https://github.com/org/repo.git -> repo
    const match = repoUrl.match(/\/([^\/]+?)(?:\.git)?$/);
    return match ? match[1] : 'unknown';
}
/**
 * 提取 Skill 信息
 */
async function extractSkillInfo(skillPath, source) {
    const name = path.basename(skillPath);
    // 尝试加载 manifest
    const manifest = await loadSkillManifest(skillPath);
    // 提取版本
    const { version, versionFrom } = await extractVersion(skillPath, manifest);
    return {
        name,
        displayName: manifest?.name || name,
        path: skillPath,
        version,
        versionFrom,
        manifest,
        sourceRepo: source.repo || source.path || '',
        sourceName: source.name
    };
}
/**
 * 加载 Skill manifest
 */
async function loadSkillManifest(skillPath) {
    const manifestNames = [
        'manifest.json',
        'skill-manifest.json',
        'openclaw.skill.json',
        'skill.json'
    ];
    for (const manifestName of manifestNames) {
        const manifestPath = path.join(skillPath, manifestName);
        try {
            const content = await fs.promises.readFile(manifestPath, 'utf-8');
            return JSON.parse(content);
        }
        catch {
            // Manifest 不存在，继续尝试下一个
        }
    }
    return null;
}
/**
 * 提取版本信息
 */
async function extractVersion(skillPath, manifest) {
    // 1. 从 manifest 获取版本
    if (manifest?.version) {
        return { version: manifest.version, versionFrom: 'manifest' };
    }
    // 2. 从 package.json 获取版本
    try {
        const packagePath = path.join(skillPath, 'package.json');
        const content = await fs.promises.readFile(packagePath, 'utf-8');
        const pkg = JSON.parse(content);
        if (pkg.version) {
            return { version: pkg.version, versionFrom: 'package-json' };
        }
    }
    catch {
        // package.json 不存在
    }
    // 3. 从 git tag 获取版本
    try {
        const gitResult = await (0, utils_1.exec)('git describe --tags --always', { cwd: skillPath });
        if (gitResult.stdout.trim()) {
            return { version: gitResult.stdout.trim(), versionFrom: 'git-tag' };
        }
    }
    catch {
        // 不是 git 仓库或没有 tags
    }
    // 4. 未知版本
    return { version: 'unknown', versionFrom: 'unknown' };
}
/**
 * 检测变更
 */
function detectChanges(scanned, indexedSkills) {
    const indexedMap = new Map(indexedSkills.map(s => [s.name, s]));
    const newSkills = [];
    const updatedSkills = [];
    const unchanged = [];
    for (const skill of scanned) {
        const existing = indexedMap.get(skill.name);
        if (!existing) {
            // 新 Skill
            newSkills.push(skill);
        }
        else if (existing.version !== skill.version) {
            // 版本更新
            updatedSkills.push(skill);
        }
        else {
            // 无变化
            unchanged.push(skill);
        }
    }
    return { newSkills, updatedSkills, unchanged };
}
/**
 * 克隆 GitHub 仓库（直接用 URL）
 */
async function cloneRepoByUrl(repoUrl, cacheDir) {
    const repoName = repoUrl.split('/').pop()?.replace('.git', '') || 'repo';
    const targetPath = path.join(cacheDir, repoName);
    // 检查是否已存在
    try {
        await fs.promises.access(targetPath);
        console.log(`[Clone] 仓库已存在，更新...`);
        // 更新仓库
        await (0, utils_1.exec)('git pull', { cwd: targetPath });
    }
    catch {
        // 不存在，克隆
        console.log(`[Clone] 克隆仓库: ${repoUrl}`);
        await (0, utils_1.exec)(`git clone ${repoUrl} "${targetPath}"`, {});
    }
    return targetPath;
}
/**
 * 扫描单个 Skill 目录
 */
async function scanSingleSkill(skillPath, sourceRepo) {
    try {
        await fs.promises.access(skillPath);
    }
    catch {
        console.error(`[Scan] Skill 路径不存在: ${skillPath}`);
        return null;
    }
    const skillName = path.basename(skillPath);
    console.log(`[Scan] 扫描 Skill: ${skillName}`);
    // 读取 manifest.json 或 SKILL.md
    let manifest = null;
    // 尝试 manifest.json
    const manifestPath = path.join(skillPath, 'manifest.json');
    try {
        const manifestContent = await fs.promises.readFile(manifestPath, 'utf-8');
        manifest = JSON.parse(manifestContent);
        console.log(`[Scan] 找到 manifest.json`);
    }
    catch {
        // 尝试 SKILL.md（OpenClaw Skill 格式）
        const skillMdPath = path.join(skillPath, 'SKILL.md');
        try {
            const skillMdContent = await fs.promises.readFile(skillMdPath, 'utf-8');
            // 解析 SKILL.md 的 metadata
            manifest = parseSkillMd(skillMdContent, skillName);
            console.log(`[Scan] 找到 SKILL.md`);
        }
        catch {
            console.log(`[Scan] 未找到 manifest 或 SKILL.md`);
        }
    }
    // 尝试读取 version
    let version = 'unknown';
    let versionFrom = 'unknown';
    // 从 package.json 读取 version
    const packageJsonPath = path.join(skillPath, 'package.json');
    try {
        const packageJsonContent = await fs.promises.readFile(packageJsonPath, 'utf-8');
        const packageJson = JSON.parse(packageJsonContent);
        version = packageJson.version || 'unknown';
        versionFrom = 'package-json';
    }
    catch {
        // 忽略
    }
    return {
        name: skillName,
        displayName: skillName,
        path: skillPath,
        version,
        versionFrom,
        manifest,
        sourceRepo,
        sourceName: skillName
    };
}
/**
 * 解析 SKILL.md 的 metadata
 */
function parseSkillMd(content, fallbackName) {
    const manifest = {
        name: fallbackName,
        version: '1.0.0',
        description: ''
    };
    // 简单的 frontmatter 解析
    const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (fmMatch) {
        const frontmatter = fmMatch[1];
        // 提取 name
        const nameMatch = frontmatter.match(/name:\s*(.+)/);
        if (nameMatch)
            manifest.name = nameMatch[1].trim();
        // 提取 description
        const descMatch = frontmatter.match(/description:\s*(.+)/);
        if (descMatch)
            manifest.description = descMatch[1].trim();
    }
    return manifest;
}
//# sourceMappingURL=scanner.js.map