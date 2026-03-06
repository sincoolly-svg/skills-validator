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
import { ScannedSkill } from './scanner';
import { ValidatorConfig } from './config';
export interface ValidateResult {
    success: boolean;
    exitCode: number;
    stdout: string;
    stderr: string;
    duration: number;
    status: 'PASSED' | 'FAILED' | 'PARTIAL' | 'MANUAL_REVIEW_REQUIRED';
    testInput?: string;
    testOutput?: string;
    validationMethod?: 'functional' | 'command' | 'documentation' | 'none';
}
/**
 * 验证单个 Skill
 * 实现真正的功能验证：
 * 1. 读取 skill 的 README 了解功能
 * 2. 分析 skill 的类型和功能
 * 3. 实际调用 skill 进行功能测试
 * 4. 验证结果是否符合描述
 */
export declare function validateSkill(skill: ScannedSkill, workDir: string, config: ValidatorConfig): Promise<ValidateResult>;
/**
 * 生成验证报告
 */
export interface ValidationReport {
    skillName: string;
    version: string;
    sourceRepo: string;
    path: string;
    validatedAt: string;
    description?: string;
    install?: {
        command: string;
        success: boolean;
        logFile: string;
        duration: number;
    };
    validation: {
        method: 'functional' | 'command' | 'documentation' | 'none';
        command: string;
        testInput?: string;
        testOutput?: string;
        success: boolean;
        exitCode: number;
        logFile: string;
        duration: number;
    };
    status: 'PASSED' | 'FAILED' | 'PARTIAL' | 'MANUAL_REVIEW_REQUIRED';
    notes: string[];
}
export declare function generateReport(skill: ScannedSkill, deployResult: {
    success: boolean;
    installLog: string;
    installDuration: number;
}, validateResult: ValidateResult, config: ValidatorConfig): Promise<ValidationReport>;
//# sourceMappingURL=validator.d.ts.map