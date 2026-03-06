"use strict";
/**
 * 配置加载模块
 * 负责加载和验证 skills-validator.config.json
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
exports.DEFAULT_CONFIG = void 0;
exports.loadConfig = loadConfig;
exports.ensureDirectories = ensureDirectories;
exports.getSkillsIndexPath = getSkillsIndexPath;
exports.getReportsDir = getReportsDir;
exports.getLogsDir = getLogsDir;
exports.getTempDir = getTempDir;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * 默认配置
 */
exports.DEFAULT_CONFIG = {
    version: '1.0.0',
    schedule: {
        enabled: true,
        times: ['09:00', '15:00', '21:00'],
        timezone: 'Asia/Shanghai'
    },
    execution: {
        maxParallelValidations: 2,
        timeoutPerSkillMinutes: 30,
        gitCloneDepth: 1
    },
    notification: {
        enabled: false,
        onNewSkill: false,
        onValidationComplete: true,
        channels: []
    }
};
/**
 * 展开配置中的变量占位符
 */
function expandVars(obj, baseDir) {
    if (typeof obj === 'string') {
        return obj
            .replace(/\{OPENCLAW_DATA\}/g, process.env.OPENCLAW_DATA || '/data')
            .replace(/\{BASE_DIR\}/g, baseDir || '');
    }
    if (Array.isArray(obj)) {
        return obj.map(item => expandVars(item, baseDir));
    }
    if (obj && typeof obj === 'object') {
        const result = {};
        for (const [key, value] of Object.entries(obj)) {
            result[key] = expandVars(value, baseDir);
        }
        return result;
    }
    return obj;
}
/**
 * 加载配置文件
 */
async function loadConfig(configPath) {
    // 默认配置路径 - 使用 process.cwd() 作为基础
    if (!configPath) {
        // 尝试多个可能的默认路径
        const possiblePaths = [
            path.join(process.cwd(), 'data', 'config', 'skills-validator.config.json'),
            path.join(process.cwd(), '..', 'data', 'config', 'skills-validator.config.json'),
            path.join(process.cwd(), 'data', 'config', 'container-config.json'),
            '/data/skills-validator/config/skills-validator.config.json'
        ];
        for (const p of possiblePaths) {
            try {
                await fs.promises.access(p);
                configPath = p;
                break;
            }
            catch {
                // 继续尝试下一个
            }
        }
        if (!configPath) {
            console.warn(`配置文件不存在，使用默认配置`);
            return createDefaultConfig();
        }
    }
    // 读取配置文件
    let configContent;
    try {
        configContent = await fs.promises.readFile(configPath, 'utf-8');
    }
    catch (error) {
        // 如果配置文件不存在，使用默认配置
        console.warn(`配置文件不存在: ${configPath}，使用默认配置`);
        const defaultConfig = createDefaultConfig();
        return defaultConfig;
    }
    // 解析 JSON
    let config;
    try {
        config = JSON.parse(configContent);
    }
    catch (error) {
        throw new Error(`配置文件解析失败: ${configPath}, ${error}`);
    }
    // 合并默认配置
    const mergedConfig = {
        ...exports.DEFAULT_CONFIG,
        ...config
    };
    // 展开变量占位符
    const expandedConfig = expandVars(mergedConfig);
    // 验证必填字段
    if (!expandedConfig.sources || expandedConfig.sources.length === 0) {
        throw new Error('配置错误: sources 不能为空');
    }
    if (!expandedConfig.storage || !expandedConfig.storage.baseDir) {
        throw new Error('配置错误: storage.baseDir 不能为空');
    }
    return expandedConfig;
}
/**
 * 创建默认配置
 */
function createDefaultConfig() {
    const baseDir = process.env.OPENCLAW_DATA || '/data';
    const storageBaseDir = path.join(baseDir, 'skills-validator');
    return {
        version: '1.0.0',
        sources: [],
        schedule: {
            enabled: true,
            times: ['09:00', '15:00', '21:00'],
            timezone: 'Asia/Shanghai'
        },
        storage: {
            baseDir: storageBaseDir,
            skillsIndexFile: 'skills-index.json',
            reportsDir: 'reports',
            logsDir: 'logs',
            tempDir: 'temp',
            cacheDir: 'cache'
        },
        execution: {
            maxParallelValidations: 2,
            timeoutPerSkillMinutes: 30,
            gitCloneDepth: 1
        },
        notification: {
            enabled: false,
            onNewSkill: false,
            onValidationComplete: true,
            channels: []
        }
    };
}
/**
 * 确保必要目录存在
 */
async function ensureDirectories(config) {
    const dirs = [
        config.storage.baseDir,
        path.join(config.storage.baseDir, config.storage.reportsDir),
        path.join(config.storage.baseDir, config.storage.logsDir),
        path.join(config.storage.baseDir, config.storage.tempDir),
        path.join(config.storage.baseDir, 'config'),
        path.join(config.storage.baseDir, 'schemas'),
        path.join(config.storage.baseDir, 'cache')
    ];
    for (const dir of dirs) {
        await fs.promises.mkdir(dir, { recursive: true });
    }
}
/**
 * 获取 Skills 索引文件路径
 */
function getSkillsIndexPath(config) {
    return path.join(config.storage.baseDir, config.storage.skillsIndexFile);
}
/**
 * 获取报告目录路径
 */
function getReportsDir(config) {
    return path.join(config.storage.baseDir, config.storage.reportsDir);
}
/**
 * 获取日志目录路径
 */
function getLogsDir(config) {
    return path.join(config.storage.baseDir, config.storage.logsDir);
}
/**
 * 获取临时目录路径
 */
function getTempDir(config) {
    return path.join(config.storage.baseDir, config.storage.tempDir);
}
//# sourceMappingURL=config.js.map