from textwrap import dedent
from typing import Optional
import time
import os
import logfire
from pydantic import BaseModel, Field
from pydantic_ai import Agent, RunContext
from pydantic_ai.ag_ui import StateDeps
from ag_ui.core import EventType, StateSnapshotEvent
from pydantic_ai.models.openai import OpenAIChatModel
from pydantic_ai.providers.openai import OpenAIProvider

# load environment variables
from dotenv import load_dotenv
load_dotenv()

# Import syntax knowledge base
from syntax import DIAGRAM_SYNTAX

# Import unified Kroki client
from kroki_client import render_diagram

# =====
# State
# =====
class DiagramState(BaseModel):
    """State for the Diagram Agent."""
    diagram_type: str = Field(default="", description="Type of the diagram engine (e.g., 'mermaid', 'plantuml', 'ditaa', 'wavedrom')")
    diagram_name: str = Field(default="", description="Specific name of the diagram (e.g., 'flowchart', 'sequence', 'diagram', 'timing')")
    diagram_code: str = Field(default="", description="The source code of the diagram")
    svg_content: str = Field(default="", description="The rendered SVG content")
    error_message: Optional[str] = Field(default=None, description="Error message if rendering failed")
    is_loading: bool = Field(default=False, description="Whether the agent is currently generating or rendering")
    retry_count: int = Field(default=0, description="Number of retries attempted for the current request")
    last_modified: float = Field(default_factory=time.time, description="Timestamp of the last modification")

# =====
# Agent
# =====

# OpenAI-Compatible API Config
OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL", "https://api.moonshot.cn/v1")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "kimi-k2-thinking")

if not OPENAI_API_KEY:
    # Fallback to checking standard env var if not set specifically
    pass

provider = OpenAIProvider(
    base_url=OPENAI_BASE_URL,
    api_key=OPENAI_API_KEY,
)

model = OpenAIChatModel(
    model_name=OPENAI_MODEL,
    provider=provider
)

agent = Agent[StateDeps[DiagramState], str](
    model=model,
    deps_type=StateDeps[DiagramState],
    system_prompt=dedent("""
        <role>
        图表生成 Agent，通过工具调用将用户需求转化为可视化图表。
        </role>

        <tools>
        get_diagram_syntax(engine, diagram_type)
          - 功能：获取指定引擎和图表类型的语法规则
          - 何时用：生成代码前必须调用，确保语法正确

        validate_and_render(engine, code)
          - 功能：验证代码并渲染为 SVG
          - 何时用：代码生成后调用，失败后修正代码再次调用

        get_current_diagram()
          - 功能：获取当前图表状态
          - 何时用：用户要求修改现有图表时
        </tools>

        <capabilities>
        | 引擎        | 类型                                                      | 适用场景              |
        |-------------|-----------------------------------------------------------|-----------------------|
        | mermaid     | flowchart, sequence, class, state, er, gantt, pie, mindmap | 通用首选              |
        | plantuml    | sequence, class, activity, component, deployment           | UML 专业图            |
        | d2          | diagram                                                    | 现代风格架构图        |
        | c4plantuml  | context, container, component                              | C4 架构模型           |
        | graphviz    | diagram                                                    | 复杂网络依赖图        |
        | dbml        | schema                                                     | 数据库 ER 图          |
        | erd         | er                                                         | 简单 ER 图            |
        | nomnoml     | diagram                                                    | 手绘风格类图          |
        | ditaa       | diagram                                                    | ASCII 艺术图/手绘风格 |
        | svgbob      | diagram                                                    | ASCII 转 SVG 图表     |
        | wavedrom    | timing, reg                                                | 数字时序图/寄存器图   |
        | blockdiag   | diagram                                                    | 块状图/系统结构图     |
        | seqdiag     | diagram                                                    | 时序图(简洁风格)      |
        | nwdiag      | diagram                                                    | 网络拓扑图            |

        需求映射：
        流程图→mermaid/flowchart | 时序图→mermaid/sequence | 类图→mermaid/class
        架构图→d2/diagram | 数据库→dbml/schema | 甘特图→mermaid/gantt | 思维导图→mermaid/mindmap
        ASCII图表→ditaa/diagram | 数字时序→wavedrom/timing | 网络拓扑→nwdiag/diagram
        </capabilities>

        <workflow>
        1. 分析需求 → 选择引擎和类型
        2. get_diagram_syntax → 获取语法规则
        3. 生成代码 → validate_and_render
        4. 检查结果：
           - 成功 → 简短告知（如"流程图已渲染"）
           - 失败 → 分析错误，修正代码，再次 validate_and_render
        </workflow>

        <rules>
        必须：
        - 成功渲染出图表才算完成
        - 失败时自动修复重试，不询问用户
        - 所有代码只通过工具提交

        禁止：
        - 在聊天中输出代码块
        - 让用户复制代码
        - 未查语法就生成代码
        </rules>

        <output_format>
        成功："[图表类型]已渲染"
        失败后重试：静默修复，不解释
        </output_format>

        <examples>
        用户: 画个用户登录流程图
        思考: 流程图 → mermaid/flowchart
        行动: get_diagram_syntax("mermaid", "flowchart") → validate_and_render("mermaid", "flowchart TD...")
        输出: 登录流程图已渲染

        用户: 帮我画一个电商系统的类图
        思考: 类图 → mermaid/class
        行动: get_diagram_syntax("mermaid", "class") → validate_and_render("mermaid", "classDiagram...")
        输出: 电商系统类图已渲染
        </examples>
    """).strip()
)

# =====
# Tools
# =====
@agent.tool
async def get_diagram_syntax(ctx: RunContext[StateDeps[DiagramState]], engine: str, diagram_type: str) -> dict:
    """
    获取特定图表类型的语法指南和示例。

    Args:
        engine: 图表引擎（如 'mermaid', 'plantuml', 'd2', 'dbml' 等）
        diagram_type: 具体类型（如 'flowchart', 'sequence', 'class' 等）

    Returns:
        包含语法规则、使用场景和示例的字典
    """
    engine_lower = engine.lower()
    engine_data = DIAGRAM_SYNTAX.get(engine_lower)

    if not engine_data:
        supported = list(DIAGRAM_SYNTAX.keys())
        return {
            "error": f"不支持的引擎: {engine}",
            "supported_engines": supported
        }

    # 访问types字段
    types = engine_data.get("types", {})
    type_data = types.get(diagram_type.lower())

    if not type_data:
        supported_types = list(types.keys())
        return {
            "error": f"引擎 {engine} 不支持图表类型: {diagram_type}",
            "supported_types": supported_types
        }

    return {
        "success": True,
        "engine": engine_lower,
        "diagram_type": diagram_type.lower(),
        "description": type_data["description"],
        "use_cases": type_data.get("use_cases", []),
        "syntax_rules": type_data["syntax_rules"],
        "examples": type_data["examples"]
    }

@agent.tool
async def get_current_diagram(ctx: RunContext[StateDeps[DiagramState]]) -> dict:
    """Get the current diagram state."""
    state = ctx.deps.state
    return {
        "diagram_type": state.diagram_type,
        "diagram_name": state.diagram_name,
        "diagram_code": state.diagram_code,
        "has_error": state.error_message is not None
    }

@agent.tool
async def validate_and_render(ctx: RunContext[StateDeps[DiagramState]], engine: str, code: str) -> StateSnapshotEvent:
    """
    验证并渲染图表代码（使用统一的 Kroki 客户端）

    Args:
        engine: 图表引擎 (如 'mermaid', 'plantuml')
        code: 图表源代码
    """
    # 更新状态
    state = ctx.deps.state
    state.diagram_type = engine
    state.diagram_code = code
    state.is_loading = True
    state.last_modified = time.time()

    # 调用统一的 Kroki 客户端
    status_code, content, error_msg = await render_diagram(engine, "svg", code, timeout=15.0)

    if status_code == 200:
        # 渲染成功
        state.svg_content = content
        state.error_message = None
        state.retry_count = 0
    else:
        # 渲染失败
        state.error_message = error_msg
        state.retry_count += 1
        # 保留上一次成功渲染的 SVG（不清空 svg_content）

    state.is_loading = False

    return StateSnapshotEvent(
        type=EventType.STATE_SNAPSHOT,
        snapshot=state,
    )
