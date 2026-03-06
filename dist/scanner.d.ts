/**
 * 扫描模块
 * 负责从 GitHub 源扫描 Skills，检测新增/更新
 */
import { ValidatorConfig } from './config';
export interface ScannedSkill {
    name: string;
    displayName: string;
    path: string;
    version: string;
    versionFrom: 'git-tag' | 'manifest' | 'package-json' | 'unknown';
    manifest: SkillManifest | null;
    sourceRepo: string;
    sourceName: string;
}
export interface SkillManifest {
    name: string;
    version: string;
    description?: string;
    install?: {
        type: 'shell' | 'script' | 'none';
        command?: string;
        workingDir?: string;
        env?: Record<string, string>;
    };
    validate?: {
        type: 'shell' | 'script' | 'none';
        command?: string;
        workingDir?: string;
        timeoutSeconds?: number;
    };
    openclawIntegration?: {
        type: 'skill' | 'plugin' | 'tool';
        configSnippetFile?: string;
        autoEnable?: boolean;
    };
    requirements?: {
        nodeVersion?: string;
        os?: string[];
    };
}
export interface SourceStatus {
    name: string;
    repo?: string;
    skillsRoot?: string;
    path?: string;
    lastSyncedAt: string;
    localPath: string;
}
/**
 * 扫描所有配置的源
 */
export declare function scanSources(config: ValidatorConfig): Promise<{
    skills: ScannedSkill[];
    sources: SourceStatus[];
}>;
/**
 * 检测变更
 */
export declare function detectChanges(scanned: ScannedSkill[], indexedSkills: IndexedSkill[]): {
    newSkills: ScannedSkill[];
    updatedSkills: ScannedSkill[];
    unchanged: ScannedSkill[];
};
export interface IndexedSkill {
    name: string;
    displayName?: string;
    sourceRepo: string;
    sourceName: string;
    path: string;
    version: string;
    versionFrom?: string;
    firstSeenAt: string;
    lastCheckedAt?: string;
    lastStatus?: string;
    lastReportFile?: string;
    consecutiveFailures?: number;
    totalChecks?: number;
}
/**
 * 克隆 GitHub 仓库（直接用 URL）
 */
export declare function cloneRepoByUrl(repoUrl: string, cacheDir: string): Promise<string>;
/**
 * 扫描单个 Skill 目录
 */
export declare function scanSingleSkill(skillPath: string, sourceRepo: string): Promise<ScannedSkill | null>;
//# sourceMappingURL=scanner.d.ts.map