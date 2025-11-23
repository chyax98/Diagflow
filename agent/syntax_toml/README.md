# 图表语法库 TOML 格式规范

## 目录结构

```
syntax_toml/
├── README.md           # 本文档
├── mermaid.toml
├── plantuml.toml
├── d2.toml
├── dbml.toml
├── graphviz.toml
├── c4plantuml.toml
├── nomnoml.toml
├── erd.toml
├── ditaa.toml
├── svgbob.toml
├── seqdiag.toml
├── nwdiag.toml
├── blockdiag.toml
└── wavedrom.toml
```

## TOML 格式规范

### 1. 元数据部分

```toml
[meta]
language = "mermaid"              # 引擎名称
description = "..."               # 简短描述
docs_url = "https://..."          # 官方文档链接
version = "1.0.0"                 # 语法库版本
```

### 2. 图表类型定义

每个图表类型使用 `[types.图表类型名]` 定义：

```toml
[types.flowchart]
description = "流程图"
use_cases = ["业务流程", "决策树", "算法流程"]

# 语法规则（多行字符串，使用 """ """）
syntax_rules = """
基础语法：
- 节点定义: id[文本]
- 连接: A --> B
- 箭头类型: --> | --- | -.->

形状：
- 矩形: [文本]
- 圆角: (文本)
- 菱形: {文本}
"""

# 示例列表（每个示例是一个多行字符串）
examples = [
  """
  flowchart TD
      A[开始] --> B{判断}
      B -->|是| C[处理]
      B -->|否| D[结束]
  """,
  """
  flowchart LR
      start[启动] --> process[处理]
      process --> finish[完成]
  """
]
```

### 3. Python 字典到 TOML 映射规则

**Python 格式**：
```python
MERMAID_SYNTAX = {
    "language": "mermaid",
    "description": "...",
    "docs_url": "...",
    "types": {
        "flowchart": {
            "description": "...",
            "use_cases": ["...", "..."],
            "syntax_rules": """...""",
            "examples": ["...", "..."]
        }
    }
}
```

**TOML 格式**：
```toml
[meta]
language = "mermaid"
description = "..."
docs_url = "..."

[types.flowchart]
description = "..."
use_cases = ["...", "..."]
syntax_rules = """..."""
examples = ["...", "..."]
```

### 4. 多行字符串处理

TOML 使用 `"""` 包裹多行字符串，**不需要转义**：

**Python（需要转义）**：
```python
syntax_rules = """
节点: A[文本]
箭头: A --> B
引号: 使用 \"引号\" 需要转义
"""
```

**TOML（无需转义）**：
```toml
syntax_rules = """
节点: A[文本]
箭头: A --> B
引号: 使用 "引号" 无需转义
"""
```

### 5. 数组处理

**Python**：
```python
use_cases = ["用例1", "用例2"]
examples = ["示例1", "示例2"]
```

**TOML**：
```toml
use_cases = ["用例1", "用例2"]
examples = ["示例1", "示例2"]
```

## Task Agent 工作流程

每个 agent 处理 2-3 个引擎时，遵循以下步骤：

### 步骤 1：搜索官方语法

使用搜索工具查找官方文档：
- `{引擎名} official documentation syntax reference`
- `{引擎名} {图表类型} syntax examples`

### 步骤 2：读取现有 Python 文件

读取 `agent/src/syntax/{引擎名}.py`，提取现有内容。

### 步骤 3：混合生成详细内容

将官方语法和现有内容混合：
- 保留现有的结构和示例
- 补充官方语法规则
- 添加更多实际用例
- 扩展示例代码

### 步骤 4：生成 TOML 文件

创建 `agent/syntax_toml/{引擎名}.toml`。

### 步骤 5：验证格式

确保 TOML 格式正确：
- 使用 `"""` 包裹多行字符串
- 数组使用 `[]`
- 表使用 `[meta]` 和 `[types.xxx]`

## 加载逻辑（Python）

```python
import tomllib
from pathlib import Path

def load_syntax(language: str) -> dict:
    """加载 TOML 语法库"""
    toml_path = Path(__file__).parent / f"{language}.toml"
    with open(toml_path, "rb") as f:
        data = tomllib.load(f)

    # 转换为原有格式
    return {
        "language": data["meta"]["language"],
        "description": data["meta"]["description"],
        "docs_url": data["meta"].get("docs_url", ""),
        "types": data["types"]
    }
```

## 注意事项

1. **字符串转义**：TOML 多行字符串无需转义 `"`、`\n` 等
2. **编码**：所有文件使用 UTF-8 编码
3. **缩进**：TOML 不关心缩进，但建议保持一致（2 空格）
4. **注释**：使用 `#` 添加注释
5. **版本**：每次更新增加 `meta.version`

## 引擎分组（并行处理）

- **Agent 1**: mermaid, plantuml
- **Agent 2**: d2, dbml, graphviz
- **Agent 3**: c4plantuml, nomnoml, erd
- **Agent 4**: ditaa, svgbob, wavedrom
- **Agent 5**: blockdiag, seqdiag, nwdiag
