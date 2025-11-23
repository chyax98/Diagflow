"""图表语法知识库 - 主入口

整合所有图表语言的语法规则，提供统一的访问接口。

支持的语言：
- Mermaid: 8种图表类型（flowchart, sequence, class, state, er, gantt, pie, mindmap）
- PlantUML: 5种图表类型（sequence, class, activity, component, deployment）
- D2: 通用图表
- DBML: 数据库架构图
- GraphViz: 通用图表
- C4-PlantUML: 3种图表类型（context, container, component）
- Nomnoml: 通用图表
- Erd: 实体关系图
- Ditaa: ASCII艺术图表
- Svgbob: ASCII转SVG图表
- SeqDiag: 时序图
- NwDiag: 网络拓扑图
- BlockDiag: 块图
- WaveDrom: 数字时序图

使用方式：
    from syntax import DIAGRAM_SYNTAX

    # 获取Mermaid流程图语法
    flowchart_syntax = DIAGRAM_SYNTAX["mermaid"]["types"]["flowchart"]
    print(flowchart_syntax["syntax_rules"])

    # 获取所有支持的语言
    languages = list(DIAGRAM_SYNTAX.keys())
"""

import tomllib
from pathlib import Path
from typing import Any


def _load_syntax_from_toml(language: str) -> dict:
    """从 TOML 文件加载语法库

    Args:
        language: 语言名称（如 'mermaid', 'plantuml'）

    Returns:
        语法库字典

    Raises:
        FileNotFoundError: TOML 文件不存在时抛出
    """
    # TOML 文件路径
    toml_dir = Path(__file__).parent.parent / "syntax_toml"
    toml_path = toml_dir / f"{language}.toml"

    if not toml_path.exists():
        raise FileNotFoundError(f"语法库文件不存在: {toml_path}")

    # 读取 TOML 文件
    with open(toml_path, "rb") as f:
        data = tomllib.load(f)

    # 转换为原有格式
    return {
        "language": data["meta"]["language"],
        "description": data["meta"]["description"],
        "docs_url": data["meta"].get("docs_url", ""),
        "types": data["types"]
    }


# 加载所有语法库
DIAGRAM_SYNTAX = {
    "mermaid": _load_syntax_from_toml("mermaid"),
    "plantuml": _load_syntax_from_toml("plantuml"),
    "d2": _load_syntax_from_toml("d2"),
    "dbml": _load_syntax_from_toml("dbml"),
    "graphviz": _load_syntax_from_toml("graphviz"),
    "c4plantuml": _load_syntax_from_toml("c4plantuml"),
    "nomnoml": _load_syntax_from_toml("nomnoml"),
    "erd": _load_syntax_from_toml("erd"),
    "ditaa": _load_syntax_from_toml("ditaa"),
    "svgbob": _load_syntax_from_toml("svgbob"),
    "seqdiag": _load_syntax_from_toml("seqdiag"),
    "nwdiag": _load_syntax_from_toml("nwdiag"),
    "blockdiag": _load_syntax_from_toml("blockdiag"),
    "wavedrom": _load_syntax_from_toml("wavedrom"),
}

__all__ = ["DIAGRAM_SYNTAX"]


def get_language_info(language: str) -> dict:
    """获取指定语言的完整信息

    Args:
        language: 语言名称（如 'mermaid', 'plantuml'）

    Returns:
        语言的完整语法信息字典

    Raises:
        KeyError: 语言不存在时抛出
    """
    return DIAGRAM_SYNTAX[language]


def get_diagram_type_info(language: str, diagram_type: str) -> dict:
    """获取指定图表类型的语法信息

    Args:
        language: 语言名称
        diagram_type: 图表类型（如 'flowchart', 'sequence'）

    Returns:
        图表类型的语法信息字典

    Raises:
        KeyError: 语言或图表类型不存在时抛出
    """
    return DIAGRAM_SYNTAX[language]["types"][diagram_type]


def list_supported_languages() -> list:
    """列出所有支持的图表语言

    Returns:
        语言名称列表
    """
    return list[str](DIAGRAM_SYNTAX.keys())  # type: ignore


def list_diagram_types(language: str) -> list:
    """列出指定语言支持的所有图表类型

    Args:
        language: 语言名称

    Returns:
        图表类型名称列表

    Raises:
        KeyError: 语言不存在时抛出
    """
    return list[Any](DIAGRAM_SYNTAX[language]["types"].keys())


def get_total_diagram_types() -> int:
    """获取总计支持的图表类型数量

    Returns:
        图表类型总数
    """
    total = 0
    for lang_info in DIAGRAM_SYNTAX.values():
        total += len(lang_info["types"])
    return total
