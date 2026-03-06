/**
 * 配置加载模块
 * 负责加载和验证 skills-validator.config.json
 */

import * as fs from 'fs';
import * as path from 'path';

export interface SourceConfig {
  type: 'repo-dir' | 'local-dir';
  name: string;
  // repo-dir 类型
  repo?: string;
  skillsRoot?: string;
  branch?: string;
  // local-dir 类型
  path?: string;
}

export interface ScheduleConfig {
  enabled: boolean;
  times: string[];
  timezone: string;
}

export interface StorageConfig {
  baseDir: string;
  skillsIndexFile: string;
  reportsDir: string;
  logsDir: string;
  tempDir: string;
  cacheDir: string;
}

export interface ExecutionConfig {
  maxParallelValidations: number;
  timeoutPerSkillMinutes: number;
  gitCloneDepth: number;
}

export interface NotificationConfig {
  enabled: boolean;
  onNewSkill: boolean;
  onValidationComplete: boolean;
  channels: string[];
}

export interface ValidatorConfig {
  version: string;
  sources: SourceConfig[];
  schedule: ScheduleConfig;
  storage: StorageConfig;
  execution: ExecutionConfig;
  notification: NotificationConfig;
}

/**
 * 默认配置
 */
export const DEFAULT_CONFIG: Partial<ValidatorConfig> = {
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
function expandVars(obj: any, baseDir?: string): any {
  if (typeof obj === 'string') {
    return obj
      .replace(/\{OPENCLAW_DATA\}/g, process.env.OPENCLAW_DATA || '/data')
      .replace(/\{BASE_DIR\}/g, baseDir || '');
  }
  if (Array.isArray(obj)) {
    return obj.map(item => expandVars(item, baseDir));
  }
  if (obj && typeof obj === 'object') {
    const result: any = {};
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
export async function loadConfig(configPath?: string): Promise<ValidatorConfig> {
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
      } catch {
        // 继续尝试下一个
      }
    }
    
    if (!configPath) {
      console.warn(`配置文件不存在，使用默认配置`);
      return createDefaultConfig();
    }
  }

  // 读取配置文件
  let configContent: string;
  try {
    configContent = await fs.promises.readFile(configPath, 'utf-8');
  } catch (error) {
    // 如果配置文件不存在，使用默认配置
    console.warn(`配置文件不存在: ${configPath}，使用默认配置`);
    const defaultConfig = createDefaultConfig();
    return defaultConfig;
  }

  // 解析 JSON
  let config: any;
  try {
    config = JSON.parse(configContent);
  } catch (error) {
    throw new Error(`配置文件解析失败: ${configPath}, ${error}`);
  }

  // 合并默认配置
  const mergedConfig = {
    ...DEFAULT_CONFIG,
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

  return expandedConfig as ValidatorConfig;
}

/**
 * 创建默认配置
 */
function createDefaultConfig(): ValidatorConfig {
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
export async function ensureDirectories(config: ValidatorConfig): Promise<void> {
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
export function getSkillsIndexPath(config: ValidatorConfig): string {
  return path.join(config.storage.baseDir, config.storage.skillsIndexFile);
}

/**
 * 获取报告目录路径
 */
export function getReportsDir(config: ValidatorConfig): string {
  return path.join(config.storage.baseDir, config.storage.reportsDir);
}

/**
 * 获取日志目录路径
 */
export function getLogsDir(config: ValidatorConfig): string {
  return path.join(config.storage.baseDir, config.storage.logsDir);
}

/**
 * 获取临时目录路径
 */
export function getTempDir(config: ValidatorConfig): string {
  return path.join(config.storage.baseDir, config.storage.tempDir);
}
