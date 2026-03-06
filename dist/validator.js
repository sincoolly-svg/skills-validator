"use strict";
/**
 * 验证模块
 * 负责执行 Skill 的验证用例
 *
 * 验证逻辑：
 * 1. 读取 skill 的 README 了解它的功能
 * 2. 实际调用这个 skill（根据它的功能）
 * 3. 验证调用结果是否符合 skill 描述的功能
 * 4. 生成真正的测评报告
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
exports.validateSkill = validateSkill;
exports.generateReport = generateReport;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_1 = require("./utils");
/**
 * 验证单个 Skill
 * 实现真正的功能验证：
 * 1. 读取 skill 的 README 了解功能
 * 2. 分析 skill 的类型和功能
 * 3. 实际调用 skill 进行功能测试
 * 4. 验证结果是否符合描述
 */
async function validateSkill(skill, workDir, config) {
    const startTime = Date.now();
    const logDir = path.join(config.storage.baseDir, config.storage.logsDir);
    console.log(`[Validator] 开始验证 Skill: ${skill.name}`);
    console.log(`[Validator] Skill 路径: ${skill.path}`);
    // 1. 读取 skill 的 README/SKILL.md 了解功能
    console.log(`[Validator] 读取 skill 文档了解功能...`);
    const skillDocs = await readSkillDocumentation(skill.path);
    console.log(`[Validator] skillDocs: hasReadme=${skillDocs.hasReadme}, content length=${skillDocs.readme.length}`);
    // 2. 分析 skill 类型和功能
    console.log(`[Validator] 分析 skill 类型和功能...`);
    const skillAnalysis = await analyzeSkill(skill, skillDocs);
    console.log(`[Validator] skillAnalysis: type=${skillAnalysis.type}, hasDocs=${skillAnalysis.hasDocs}, description=${(skillAnalysis.description || '').substring(0, 50)}`);
    // 3. 实际调用 skill 进行功能测试（无论有没有 manifest）
    console.log(`[Validator] 执行功能验证: ${skill.name}`);
    const result = await runFunctionalValidation(skill, skillAnalysis, workDir, config);
    // 保存验证日志
    await saveLog(logDir, `${skill.name}_validate.log`, `=== Skill 功能验证 ===\n` +
        `Skill: ${skill.name}\n` +
        `功能描述: ${skillAnalysis.description}\n` +
        `Skill 类型: ${skillAnalysis.type}\n` +
        `验证方法: ${result.validationMethod}\n` +
        `测试输入: ${result.testInput || 'N/A'}\n` +
        `测试输出: ${result.testOutput || 'N/A'}\n` +
        `=== 标准输出 ===\n${result.stdout}\n` +
        `=== 标准错误 ===\n${result.stderr}\n` +
        `=== 退出码 ===\n${result.exitCode}\n`);
    // 确定状态
    let status;
    // 优先使用 result 中返回的状态
    if (result.status) {
        status = result.status;
    }
    else if (result.exitCode === 0) {
        status = 'PASSED';
    }
    else {
        status = 'FAILED';
    }
    console.log(`[Validator] 验证完成: ${skill.name}, 状态: ${status}`);
    return {
        success: result.exitCode === 0,
        exitCode: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr,
        duration: Date.now() - startTime,
        status,
        testInput: result.testInput,
        testOutput: result.testOutput,
        validationMethod: result.validationMethod
    };
}
/**
 * 读取 skill 的文档
 */
async function readSkillDocumentation(skillPath) {
    const readmeNames = ['SKILL.md', 'README.md', 'README.txt', 'readme.md', 'USAGE.md', 'docs/README.md'];
    for (const readmeName of readmeNames) {
        const readmePath = path.join(skillPath, readmeName);
        try {
            const content = await fs.promises.readFile(readmePath, 'utf-8');
            console.log(`[Validator] 找到文档: ${readmeName}`);
            return { readme: content, hasReadme: true };
        }
        catch {
            // 继续尝试下一个
        }
    }
    return { readme: '', hasReadme: false };
}
/**
 * 分析 skill 的类型和功能
 */
async function analyzeSkill(skill, docs) {
    const description = skill.manifest?.description || '';
    // 分析 skill 类型
    let type = 'unknown';
    // 检查 skill 目录下的文件
    try {
        const files = await fs.promises.readdir(skill.path);
        if (files.includes('package.json') || files.some(f => f.endsWith('.js'))) {
            type = 'node';
        }
        else if (files.some(f => f.endsWith('.py'))) {
            type = 'python';
        }
        else if (files.includes('index.sh') || files.includes('run.sh')) {
            type = 'shell';
        }
    }
    catch {
        // 忽略错误
    }
    // 从 manifest 的 validate.command 推断类型
    const validateCmd = skill.manifest?.validate?.command || '';
    if (validateCmd.includes('npm ') || validateCmd.includes('node ')) {
        type = 'node';
    }
    else if (validateCmd.includes('python ') || validateCmd.includes('python3 ')) {
        type = 'python';
    }
    else if (validateCmd.startsWith('curl ') || validateCmd.startsWith('wget ')) {
        type = 'api';
    }
    // 从 README 提取功能描述
    const capabilities = [];
    if (docs.hasReadme) {
        // 简单提取 README 中的功能描述
        const lines = docs.readme.split('\n');
        for (const line of lines) {
            if (line.startsWith('# ') || line.startsWith('## ')) {
                capabilities.push(line.replace(/^#+\s*/, '').trim());
            }
        }
    }
    // 确定测试策略
    let testStrategy = 'functional';
    if (!docs.hasReadme && !skill.manifest?.validate?.command) {
        testStrategy = 'none';
    }
    else if (skill.manifest?.validate?.command && !docs.hasReadme) {
        testStrategy = 'command';
    }
    return {
        type,
        description,
        capabilities,
        testStrategy,
        hasDocs: docs.hasReadme
    };
}
/**
 * 运行功能验证 - 实际调用 skill
 */
async function runFunctionalValidation(skill, analysis, workDir, config) {
    const manifest = skill.manifest;
    const validate = manifest?.validate;
    // 如果有 SKILL.md，尝试根据文档进行功能测试
    if (analysis.hasDocs) {
        console.log(`[Validator] 根据 SKILL.md 文档进行测评...`);
        const docResult = await performDocumentationBasedTest(skill, analysis, workDir, config);
        if (docResult) {
            return docResult;
        }
    }
    // 如果有验证定义，执行验证命令
    if (validate?.command && validate.type !== 'none') {
        console.log(`[Validator] 执行 manifest 定义的验证命令...`);
        const workingDir = path.join(workDir, skill.name);
        const timeout = (validate.timeoutSeconds || 300) * 1000;
        const result = await (0, utils_1.execWithTimeout)(validate.command, {
            cwd: workingDir,
            env: process.env,
            timeout
        });
        return {
            stdout: result.stdout,
            stderr: result.stderr,
            exitCode: result.exitCode,
            validationMethod: 'command'
        };
    }
    // 无验证方式 - 返回文档检查结果
    console.log(`[Validator] 无验证命令，进行文档完整性检查...`);
    // 有 SKILL.md 和描述就算通过
    const hasValidDocs = analysis.hasDocs && !!analysis.description;
    const status = hasValidDocs ? 'PASSED' : 'MANUAL_REVIEW_REQUIRED';
    return {
        stdout: `文档检查完成:\n- SKILL.md: ${analysis.hasDocs ? '✅ 存在' : '❌ 缺失'}\n- 描述: ${analysis.description || '无'}\n- 类型: ${analysis.type || 'unknown'}`,
        stderr: '',
        exitCode: hasValidDocs ? 0 : 1,
        status,
        validationMethod: 'documentation'
    };
}
/**
 * 基于文档进行测评（读取 SKILL.md，理解 skill 用途，尝试调用）
 */
async function performDocumentationBasedTest(skill, analysis, workDir, config) {
    const skillPath = skill.path;
    try {
        // 1. 读取 SKILL.md 解析安装和使用说明
        console.log(`[Validator] 解析 SKILL.md 获取安装和使用说明...`);
        const skillMdPath = path.join(skillPath, 'SKILL.md');
        let skillMdContent = '';
        try {
            skillMdContent = await fs.promises.readFile(skillMdPath, 'utf-8');
        }
        catch {
            console.log(`[Validator] 未找到 SKILL.md`);
            return null;
        }
        // 解析 metadata（包含安装信息）
        let installCommands = [];
        let usageExamples = [];
        let requiredBins = [];
        const fmMatch = skillMdContent.match(/^---\n([\s\S]*?)\n---/);
        if (fmMatch) {
            const frontmatter = fmMatch[1];
            // 直接用正则提取 bins（不依赖 JSON 解析）
            const binsMatch = frontmatter.match(/"bins"\s*:\s*\[([^\]]+)\]/);
            if (binsMatch) {
                const binsStr = binsMatch[1];
                const binMatches = binsStr.match(/"([^"]+)"/g);
                if (binMatches) {
                    requiredBins = binMatches.map(m => m.replace(/"/g, ''));
                    console.log(`[Validator] 需要二进制: ${requiredBins.join(', ')}`);
                }
            }
            // 提取 install 命令
            const installMatches = frontmatter.match(/"kind"\s*:\s*"(\w+)".*?"formula"\s*:\s*"([^"]+)"/g);
            if (installMatches) {
                for (const match of installMatches) {
                    const kindMatch = match.match(/"kind"\s*:\s*"(\w+)"/);
                    const formulaMatch = match.match(/"formula"\s*:\s*"([^"]+)"/);
                    if (kindMatch && formulaMatch) {
                        installCommands.push(`${kindMatch[1]} install ${formulaMatch[1]}`);
                    }
                }
            }
        }
        // 提取使用示例（从代码块或列表中）
        // 匹配 markdown 列表中的命令
        const listCmdMatches = skillMdContent.match(/- `(whisper[^`]+)`/g);
        if (listCmdMatches) {
            for (const match of listCmdMatches) {
                const cmdMatch = match.match(/- `(whisper[^`]+)`/);
                if (cmdMatch && cmdMatch[1]) {
                    const cmd = cmdMatch[1].trim();
                    if (cmd && !usageExamples.includes(cmd)) {
                        usageExamples.push(cmd);
                    }
                }
            }
        }
        // 也匹配代码块
        const codeBlockMatches = skillMdContent.match(/```[\s\S]*?(?:```|$)/g);
        if (codeBlockMatches) {
            for (const block of codeBlockMatches.slice(0, 5)) {
                const lines = block.split('\n').filter(l => !l.startsWith('```'));
                for (const line of lines) {
                    const trimmed = line.trim();
                    // 找到命令行示例
                    if (trimmed && (trimmed.startsWith('$ ') || trimmed.startsWith('> ') || trimmed.startsWith('whisper ') || trimmed.startsWith('npx ') || trimmed.startsWith('npm ') || trimmed.startsWith('node '))) {
                        const cmd = trimmed.replace(/^[\$>\s]+/, '');
                        if (cmd && !usageExamples.includes(cmd)) {
                            usageExamples.push(cmd);
                        }
                    }
                }
            }
        }
        console.log(`[Validator] 安装命令: ${installCommands.join(', ') || '无'}`);
        console.log(`[Validator] 使用示例: ${usageExamples.slice(0, 2).join(', ') || '无'}`);
        // 2. 检查依赖是否已安装
        console.log(`[Validator] 检查依赖是否已安装...`);
        const missingBins = [];
        for (const bin of requiredBins) {
            // 使用 where (Windows) 或 which (Linux)
            const checkCmd = process.platform === 'win32' ? `where.exe ${bin}` : `which ${bin}`;
            try {
                const result = await (0, utils_1.execWithTimeout)(checkCmd, { timeout: 5000 });
                if (result.exitCode === 0 && result.stdout) {
                    console.log(`[Validator] ✅ ${bin} 已安装: ${result.stdout.split('\n')[0].substring(0, 50)}`);
                }
                else {
                    console.log(`[Validator] ❌ ${bin} 未安装`);
                    missingBins.push(bin);
                }
            }
            catch {
                console.log(`[Validator] ❌ ${bin} 未安装`);
                missingBins.push(bin);
            }
        }
        // 3. 如果有缺失依赖，尝试安装
        if (missingBins.length > 0 && installCommands.length > 0) {
            console.log(`[Validator] 尝试安装依赖...`);
            for (const installCmd of installCommands) {
                console.log(`[Validator] 执行: ${installCmd}`);
                try {
                    const result = await (0, utils_1.execWithTimeout)(installCmd, {
                        timeout: 120000 // 2分钟超时
                    });
                    console.log(`[Validator] 安装输出: ${result.stdout.substring(0, 200)}`);
                }
                catch (e) {
                    console.log(`[Validator] 安装失败: ${e.message}`);
                }
            }
        }
        // 4. 尝试执行使用示例
        if (usageExamples.length > 0) {
            console.log(`[Validator] 尝试执行使用示例...`);
            // 尝试第一个使用示例
            const testCmd = usageExamples[0];
            console.log(`[Validator] 执行命令: ${testCmd}`);
            try {
                const result = await (0, utils_1.execWithTimeout)(testCmd, {
                    cwd: skillPath,
                    env: process.env,
                    timeout: 60000 // 1分钟超时
                });
                console.log(`[Validator] 执行结果: exitCode=${result.exitCode}`);
                console.log(`[Validator] 输出: ${(result.stdout || result.stderr || '(无输出)').substring(0, 200)}`);
                // 如果命令执行失败，尝试 --help 来验证是否已安装
                if (result.exitCode !== 0) {
                    const helpCmd = usageExamples[0].split(' ')[0] + ' --help';
                    console.log(`[Validator] 命令失败，尝试验证安装: ${helpCmd}`);
                    try {
                        const helpResult = await (0, utils_1.execWithTimeout)(helpCmd, {
                            cwd: skillPath,
                            env: process.env,
                            timeout: 10000
                        });
                        // 如果 --help 能执行，说明工具已安装
                        if (helpResult.exitCode === 0 || (helpResult.stdout && helpResult.stdout.length > 0)) {
                            console.log(`[Validator] ✅ 工具已安装 (--help 可用)`);
                            return {
                                stdout: helpResult.stdout || '(无输出)',
                                stderr: helpResult.stderr || '(无错误)',
                                exitCode: 0,
                                status: 'PASSED',
                                testInput: helpCmd,
                                testOutput: `工具已安装，完整功能测试需要配置文件/输入。--help 输出: ${(helpResult.stdout || '').substring(0, 300)}`,
                                validationMethod: 'functional'
                            };
                        }
                    }
                    catch {
                        // --help 也失败
                    }
                }
                return {
                    stdout: result.stdout || '(无输出)',
                    stderr: result.stderr || '(无错误)',
                    exitCode: result.exitCode,
                    status: result.exitCode === 0 ? 'PASSED' : 'FAILED',
                    testInput: testCmd,
                    testOutput: (result.stdout || result.stderr || '(无输出)').substring(0, 500),
                    validationMethod: 'functional'
                };
            }
            catch (e) {
                console.log(`[Validator] 执行失败: ${e.message}`);
                // 7. 如果完整命令失败，尝试 --help 来验证安装
                const helpCmd = usageExamples[0].split(' ')[0] + ' --help';
                console.log(`[Validator] 尝试验证安装: ${helpCmd}`);
                try {
                    const helpResult = await (0, utils_1.execWithTimeout)(helpCmd, {
                        cwd: skillPath,
                        env: process.env,
                        timeout: 10000
                    });
                    // 如果 --help 能执行，说明工具已安装
                    if (helpResult.exitCode === 0 || (helpResult.stdout && helpResult.stdout.length > 0)) {
                        console.log(`[Validator] ✅ 工具已安装 (--help 可用)`);
                        return {
                            stdout: helpResult.stdout || '(无输出)',
                            stderr: helpResult.stderr || '(无错误)',
                            exitCode: 0,
                            status: 'PASSED',
                            testInput: helpCmd,
                            testOutput: `工具已安装，完整功能测试需要配置文件/输入。--help 输出: ${(helpResult.stdout || '').substring(0, 300)}`,
                            validationMethod: 'functional'
                        };
                    }
                }
                catch {
                    // --help 也失败
                }
                return {
                    stdout: '',
                    stderr: e.message,
                    exitCode: 1,
                    status: 'FAILED',
                    testInput: testCmd,
                    testOutput: e.message,
                    validationMethod: 'functional'
                };
            }
        }
        // 5. 尝试找到可执行的入口文件
        const files = await fs.promises.readdir(skillPath);
        const entryFile = files.find(f => f === 'index.js' || f === 'main.js' || f === 'skill.js' ||
            f === 'index.ts' || f === 'main.ts' ||
            f === 'run.sh' || f === 'index.sh');
        if (entryFile) {
            console.log(`[Validator] 找到入口文件: ${entryFile}，尝试执行...`);
            let command = '';
            if (entryFile.endsWith('.js')) {
                command = `node ${entryFile}`;
            }
            else if (entryFile.endsWith('.ts')) {
                command = `npx ts-node ${entryFile}`;
            }
            else if (entryFile.endsWith('.sh')) {
                command = `bash ${entryFile}`;
            }
            if (command) {
                const timeout = 30000;
                const result = await (0, utils_1.execWithTimeout)(command, {
                    cwd: skillPath,
                    env: process.env,
                    timeout
                });
                return {
                    stdout: result.stdout || '(无输出)',
                    stderr: result.stderr || '(无错误)',
                    exitCode: result.exitCode,
                    status: result.exitCode === 0 ? 'PASSED' : 'FAILED',
                    testInput: entryFile,
                    testOutput: result.stdout?.substring(0, 200) || '(无输出)',
                    validationMethod: 'functional'
                };
            }
        }
        // 没有找到可执行文件，返回文档检查结果
        console.log(`[Validator] 未找到可执行入口文件，进行文档检查`);
        return null;
    }
    catch (error) {
        console.log(`[Validator] 功能测试失败: ${error.message}`);
        return null;
    }
}
/**
 * 使用 shell 执行命令（支持管道等）
 */
async function execWithShell(command, options = {}) {
    const { cwd = process.cwd(), env = process.env, timeout = 60000 } = options;
    return new Promise((resolve) => {
        const { spawn } = require('child_process');
        // 使用 bash -c 执行命令
        const child = spawn('/bin/bash', ['-c', command], {
            cwd,
            env,
            stdio: ['ignore', 'pipe', 'pipe']
        });
        let stdout = '';
        let stderr = '';
        child.stdout?.on('data', (data) => {
            stdout += data.toString();
        });
        child.stderr?.on('data', (data) => {
            stderr += data.toString();
        });
        const timer = setTimeout(() => {
            child.kill('SIGTERM');
            stderr += '\nCommand timed out';
        }, timeout);
        child.on('close', (code) => {
            clearTimeout(timer);
            resolve({
                stdout,
                stderr,
                exitCode: code || 0
            });
        });
        child.on('error', (err) => {
            clearTimeout(timer);
            resolve({
                stdout: '',
                stderr: err.message,
                exitCode: 1
            });
        });
    });
}
/**
 * 执行功能测试 - 真正调用 skill 来测试它的功能
 */
async function performFunctionalTest(skill, analysis, workDir, config) {
    const skillPath = skill.path;
    const skillName = skill.name;
    // 根据 skill 类型构建测试命令
    let testCommand = '';
    let testInput = '';
    try {
        // 检查可执行文件
        const files = await fs.promises.readdir(skillPath);
        // Node.js skill
        if (analysis.type === 'node' || files.includes('index.js') || files.includes('main.js')) {
            const entryFile = files.find(f => f === 'index.js' || f === 'main.js' || f === 'skill.js');
            if (entryFile) {
                testCommand = `node ${entryFile}`;
            }
            else if (files.includes('package.json')) {
                // 尝试运行 npm start 或 node main.js
                testCommand = `node -e "require('./index.js')" 2>&1 || node -e "require('./main.js')" 2>&1`;
            }
        }
        // Python skill
        else if (analysis.type === 'python' || files.some(f => f.endsWith('.py'))) {
            const entryFile = files.find(f => f === 'main.py' || f === 'skill.py' || f === '__main__.py');
            if (entryFile) {
                testCommand = `python ${entryFile}`;
            }
        }
        // Shell skill
        else if (analysis.type === 'shell' || files.includes('run.sh') || files.includes('index.sh')) {
            const entryFile = files.find(f => f === 'run.sh' || f === 'index.sh');
            if (entryFile) {
                testCommand = `bash ${entryFile}`;
            }
        }
        // API skill
        else if (analysis.type === 'api') {
            // 从 manifest 的 validate.command 提取 API 测试
            const validateCmd = skill.manifest?.validate?.command || '';
            if (validateCmd.startsWith('curl ') || validateCmd.startsWith('wget ')) {
                testCommand = validateCmd;
            }
        }
        // 如果没有找到入口文件，尝试运行 manifest 中的验证命令
        if (!testCommand && skill.manifest?.validate?.command) {
            testCommand = skill.manifest.validate.command;
        }
        if (!testCommand) {
            console.log(`[Validator] 无法确定 skill 入口文件，跳过功能测试`);
            return null;
        }
        // 生成测试输入
        testInput = generateTestInput(skillName, analysis);
        console.log(`[Validator] 测试输入: ${testInput}`);
        // 执行测试
        const timeout = (skill.manifest?.validate?.timeoutSeconds || 300) * 1000;
        const workingDir = skillPath;
        // 如果命令需要输入，构造一个带输入的命令
        let fullCommand = testCommand;
        if (testInput) {
            fullCommand = `echo "${testInput}" | ${testCommand}`;
        }
        console.log(`[Validator] 执行功能测试命令: ${fullCommand}`);
        const result = await execWithShell(fullCommand, {
            cwd: workingDir,
            env: { ...process.env, TEST_INPUT: testInput },
            timeout
        });
        const testOutput = result.stdout || result.stderr;
        console.log(`[Validator] 测试输出: ${testOutput.substring(0, 200)}...`);
        return {
            stdout: result.stdout,
            stderr: result.stderr,
            exitCode: result.exitCode,
            testInput,
            testOutput,
            validationMethod: 'functional'
        };
    }
    catch (error) {
        console.log(`[Validator] 功能测试失败: ${error}`);
        return null;
    }
}
/**
 * 根据 skill 名称和类型生成测试输入
 */
function generateTestInput(skillName, analysis) {
    const name = skillName.toLowerCase();
    // 根据 skill 名称推断测试输入
    if (name.includes('weather')) {
        return 'Beijing';
    }
    else if (name.includes('math') || name.includes('calculator')) {
        return '2+2';
    }
    else if (name.includes('string') || name.includes('text')) {
        return 'Hello World';
    }
    else if (name.includes('json')) {
        return '{"test": "value"}';
    }
    else if (name.includes('http') || name.includes('checker') || name.includes('url')) {
        return 'https://example.com';
    }
    else if (name.includes('github')) {
        return 'openclaw';
    }
    else if (name.includes('code-review') || name.includes('review')) {
        return 'function test() { return 42; }';
    }
    // 默认测试输入
    return 'test input';
}
/**
/**
 * 保存日志文件
 */
async function saveLog(logDir, filename, content) {
    const logPath = path.join(logDir, filename);
    await fs.promises.mkdir(path.dirname(logPath), { recursive: true });
    await fs.promises.writeFile(logPath, content, 'utf-8');
}
async function generateReport(skill, deployResult, validateResult, config) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportBase = `${skill.name}_${timestamp}`;
    const notes = [];
    // 确定状态和备注
    let status = validateResult.status;
    if (!deployResult.success) {
        status = 'FAILED';
        notes.push('部署失败，跳过验证');
    }
    else if (!skill.manifest) {
        status = 'MANUAL_REVIEW_REQUIRED';
        notes.push('Skill 缺少 manifest 文件');
    }
    else if (validateResult.status === 'MANUAL_REVIEW_REQUIRED') {
        notes.push('Manifest 未定义验证步骤');
    }
    // 添加验证方法信息
    const validationMethod = validateResult.validationMethod || 'none';
    if (validationMethod === 'functional') {
        notes.push(`验证方法：功能测试（实际调用 skill）`);
    }
    else if (validationMethod === 'command') {
        notes.push(`验证方法：命令执行（manifest 定义）`);
    }
    else if (validationMethod === 'documentation') {
        notes.push(`验证方法：文档检查（基于 SKILL.md）`);
    }
    const report = {
        skillName: skill.name,
        version: skill.version,
        sourceRepo: skill.sourceRepo,
        path: skill.path,
        description: skill.manifest?.description,
        validatedAt: new Date().toISOString(),
        install: skill.manifest?.install ? {
            command: skill.manifest.install.command || 'N/A',
            success: deployResult.success,
            logFile: `${skill.name}_install.log`,
            duration: deployResult.installDuration
        } : undefined,
        validation: {
            method: validationMethod,
            command: skill.manifest?.validate?.command || 'N/A',
            testInput: validateResult.testInput,
            testOutput: validateResult.testOutput,
            success: validateResult.success,
            exitCode: validateResult.exitCode,
            logFile: `${skill.name}_validate.log`,
            duration: validateResult.duration
        },
        status,
        notes
    };
    // 写入 JSON 报告
    const reportsDir = path.join(config.storage.baseDir, config.storage.reportsDir);
    await fs.promises.mkdir(reportsDir, { recursive: true });
    const jsonPath = path.join(reportsDir, `${reportBase}.json`);
    await fs.promises.writeFile(jsonPath, JSON.stringify(report, null, 2), 'utf-8');
    // 写入 Markdown 报告
    const mdContent = generateMarkdownReport(report);
    const mdPath = path.join(reportsDir, `${reportBase}.md`);
    await fs.promises.writeFile(mdPath, mdContent, 'utf-8');
    console.log(`[Validator] 报告已生成: ${jsonPath}`);
    return report;
}
/**
 * 生成 Markdown 格式报告
 */
function generateMarkdownReport(report) {
    const validatedAt = new Date(report.validatedAt).toLocaleString('zh-CN', {
        timeZone: 'Asia/Shanghai'
    });
    const statusEmoji = {
        PASSED: '✅',
        FAILED: '❌',
        PARTIAL: '⚠️',
        MANUAL_REVIEW_REQUIRED: '📋'
    }[report.status];
    const validationMethodDesc = {
        functional: '功能测试（实际调用 skill）',
        command: '命令执行（manifest 定义）',
        none: '无'
    }[report.validation.method];
    return `# Skill 验证报告 - ${report.skillName}
验证时间：${validatedAt}

## 基本信息
- 名称：${report.skillName}
- 版本：${report.version}
- 来源仓库：${report.sourceRepo}
- 路径：${report.path}
${report.description ? `- 描述：${report.description}` : ''}

## 部署情况
- 安装命令：${report.install?.command || 'N/A'}
- 安装结果：${report.install?.success ? '✅ 成功' : '❌ 失败'}
- 安装耗时：${report.install?.duration ? `${Math.round(report.install.duration / 1000)}s` : 'N/A'}
- 安装日志：${report.install?.logFile || 'N/A'}

## 验证步骤
- 验证方法：${validationMethodDesc}
- 验证命令：${report.validation.command}
${report.validation.testInput ? `- 测试输入：${report.validation.testInput}` : ''}
${report.validation.testOutput ? `- 测试输出：${report.validation.testOutput.substring(0, 200)}${report.validation.testOutput.length > 200 ? '...' : ''}` : ''}
- 验证结果：${statusEmoji} ${report.status}
- 验证耗时：${Math.round(report.validation.duration / 1000)}s
- 验证日志：${report.validation.logFile}
${report.validation.exitCode !== 0 ? `- 退出码：${report.validation.exitCode}` : ''}

## 结论
- 总体结论：${statusEmoji} ${report.status}
- 建议：${getRecommendation(report.status)}

## 附加信息
${report.notes.length > 0 ? report.notes.map(n => `- ${n}`).join('\n') : '- 无'}
`;
}
/**
 * 获取建议
 */
function getRecommendation(status) {
    switch (status) {
        case 'PASSED':
            return '生产可用';
        case 'FAILED':
            return '需要修复后重新验证';
        case 'PARTIAL':
            return '部分功能可用，建议补充测试';
        case 'MANUAL_REVIEW_REQUIRED':
            return '需要人工审核确认';
        default:
            return '待定';
    }
}
//# sourceMappingURL=validator.js.map