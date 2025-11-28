# 语法文档规范

供 AI Agent 生成图表代码时参考的语法提示词。

## 目录结构

```
syntax-md/{engine}/{type}.md
```

## 文档结构

```yaml
---
type: flowchart
description: 流程图
use_cases: [业务流程, 算法流程]
---
```

必须包含章节：核心语法、Kroki 限制、常见错误、示例

## 注释语法

| 引擎 | 语法 |
|------|------|
| Mermaid | `%% 注释` |
| PlantUML | `' 注释` |
| D2 | `# 注释` |
| Graphviz | `// 注释` |

## 新增引擎

1. 创建 `src/lib/syntax-md/{engine}/`
2. 添加 `_meta.yaml` 和 `{type}.md`
3. 在 `src/lib/constants.ts` 添加默认模板
