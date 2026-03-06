# Skills Validator 🔍

自动发现、部署并验证 GitHub 上的 OpenClaw Skills，生成详细的测评报告。

## 功能

- **扫描发现**：从 GitHub 源自动扫描 Skills
- **自动部署**：一键部署 Skill 到本地
- **功能测评**：实际调用 Skill 验证功能是否可用
- **报告生成**：生成详细的测评报告

## 安装

```bash
npx clawhub@latest install skills-validator
```

## 使用方法

```bash
# 测评 GitHub 上的 Skill
node dist/index.js https://github.com/owner/repo

# 测评本地 Skill
node dist/index.js /path/to/skill

# 测评 ClawHub 上的 Skill（需要先下载）
curl -L "https://wry-manatee-359.convex.site/api/v1/download?slug=<skill-name>" -o skill.zip
unzip skill.zip
node dist/index.js ./skill
```

## 测评流程

1. 解析 Skill 的 SKILL.md 获取元数据
2. 检查所需依赖是否已安装
3. 尝试执行使用示例
4. 验证输出结果
5. 生成测评报告

## 报告示例

```
# Skill 验证报告 - example-skill
验证时间：2026/3/6 12:00:00

## 基本信息
- 名称：example-skill
- 版本：1.0.0
- 描述：Skill 描述

## 验证步骤
- 验证方法：功能测试（实际调用 skill）
- 测试输入：skill --help
- 测试输出：帮助信息

## 结论
- 总体结论：✅ PASSED
```

## 技术栈

- Node.js >= 18
- TypeScript

## 开源协议

MIT
