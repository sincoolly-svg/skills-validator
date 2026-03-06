---
name: skills-validator
description: 自动发现、部署并验证 GitHub 上的 OpenClaw Skills，生成详细的测评报告。
homepage: https://github.com/openclaw/skills-validator
metadata:
  {
    "openclaw":
      {
        "emoji": "🔍",
        "requires": { "node": ">=18" },
        "install":
          [
            {
              "id": "deps",
              "kind": "shell",
              "command": "npm install",
              "label": "安装依赖",
            },
          ],
      },
  }
---

# Skills Validator

自动发现、部署并验证 GitHub 上的 OpenClaw Skills。

## 功能

- **扫描发现**：从 GitHub 源自动扫描 Skills
- **自动部署**：将 skill 部署到本地环境
- **功能测评**：实际调用 skill，验证功能是否符合描述
- **生成报告**：输出详细的测评报告

## 使用方法

```bash
# 运行验证（使用默认配置）
node dist/index.js

# 指定配置文件
node dist/index.js ./data/config/skills-validator.config.json
```

## 配置

配置文件位于 `data/config/skills-validator.config.json`：

```json
{
  "sources": [
    {
      "type": "repo-dir",
      "name": "openclaw-community-skills",
      "repo": "https://github.com/openclaw/openclaw-skills.git",
      "skillsRoot": "skills",
      "branch": "main"
    }
  ],
  "schedule": {
    "enabled": true,
    "times": ["09:00", "15:00", "21:00"],
    "timezone": "Asia/Shanghai"
  }
}
```

## 测评流程

1. 从配置的 GitHub 源扫描 Skills
2. 部署 skill 到本地
3. 读取 skill 的 README，了解功能和用法
4. 实际调用 skill，验证功能
5. 对比实际输出与文档描述
6. 生成测评报告

## 输出

- 测评报告：`data/reports/<skill-name>_<timestamp>.md`
- JSON 报告：`data/reports/<skill-name>_<timestamp>.json`
- 索引文件：`data/skills-index.json`
