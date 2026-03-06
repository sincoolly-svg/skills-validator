/**
 * 部署模块
 * 负责将 Skill 部署到本地环境
 */
import { ScannedSkill } from './scanner';
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
export declare function deploySkill(skill: ScannedSkill, config: ValidatorConfig): Promise<DeployResult>;
/**
 * 清理工作目录
 */
export declare function cleanupWorkDir(workDir: string): Promise<void>;
//# sourceMappingURL=deployer.d.ts.map