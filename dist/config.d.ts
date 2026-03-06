/**
 * 配置加载模块
 * 负责加载和验证 skills-validator.config.json
 */
export interface SourceConfig {
    type: 'repo-dir' | 'local-dir';
    name: string;
    repo?: string;
    skillsRoot?: string;
    branch?: string;
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
export declare const DEFAULT_CONFIG: Partial<ValidatorConfig>;
/**
 * 加载配置文件
 */
export declare function loadConfig(configPath?: string): Promise<ValidatorConfig>;
/**
 * 确保必要目录存在
 */
export declare function ensureDirectories(config: ValidatorConfig): Promise<void>;
/**
 * 获取 Skills 索引文件路径
 */
export declare function getSkillsIndexPath(config: ValidatorConfig): string;
/**
 * 获取报告目录路径
 */
export declare function getReportsDir(config: ValidatorConfig): string;
/**
 * 获取日志目录路径
 */
export declare function getLogsDir(config: ValidatorConfig): string;
/**
 * 获取临时目录路径
 */
export declare function getTempDir(config: ValidatorConfig): string;
//# sourceMappingURL=config.d.ts.map