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
    name="my_agent",  # 明确设置 Agent 名称，匹配前端 layout.tsx 中的配置
    model=model,
    deps_type=StateDeps[DiagramState],
    system_prompt=dedent("""
        你是专业图表生成助手，核心能力是理解用户需求，选择合适的图表引擎，
        调用工具获取语法规则，生成符合规范的图表代码。

        ## 可用工具

        **get_diagram_syntax(engine, diagram_type)**
        获取指定引擎和图表类型的完整语法规则、示例代码、最佳实践
        使用时机：每次生成新图表前必须调用，确保语法正确

        **validate_and_render(engine, code)**
        验证代码语法并渲染为 SVG 图表
        使用时机：代码生成后、代码修改后
        返回：成功返回 SVG，失败返回错误信息

        **get_current_diagram()**
        获取当前正在编辑的图表状态（引擎类型、代码、SVG）
        使用时机：用户要求修改现有图表时（如"改一下"、"添加XX功能"）

        ## 支持的引擎与选择策略

        **通用场景（优先选择 Mermaid）**
        - 流程图 → mermaid/flowchart
        - 时序图 → mermaid/sequence
        - 类图 → mermaid/class
        - 状态图 → mermaid/state
        - ER 图 → mermaid/er
        - 甘特图 → mermaid/gantt
        - 思维导图 → mermaid/mindmap

        **专业场景**
        - UML 标准图 → plantuml (sequence, class, activity, component, deployment)
        - 现代架构图 → d2/diagram（简洁美观）
        - C4 架构模型 → c4plantuml (context, container, component, deployment)
        - 数据库设计 → dbml/schema（表结构、关系）
        - 复杂关系图 → graphviz/diagram
        - 网络拓扑图 → nwdiag/diagram
        - 数字时序图 → wavedrom (timing, reg)
        - ASCII 艺术图 → ditaa/diagram, svgbob/diagram
        - 其他专用图 → erd, nomnoml, blockdiag, seqdiag

        **选择原则**
        - 用户明确指定引擎：直接使用（如"用 PlantUML 画时序图"）
        - 用户未指定：优先 Mermaid（语法简单、渲染快）
        - 特殊需求：UML 标准用 PlantUML，架构图用 D2/C4，数据库用 DBML
        - **图表类型必须严格使用上面列出的类型**（如 d2 用 diagram，不要猜测 architecture）

        ## 标准工作流程

        **场景 1：生成新图表**
        1. 分析需求：用户要什么图表？关键元素是什么？
        2. 确定引擎：根据上述策略选择引擎，类型必须从列表中选择（不要自己推理）
        3. 获取语法：调用 get_diagram_syntax(engine, type)
        4. 阅读规则：仔细查看返回的语法规则、示例、注意事项
        5. 生成代码：严格按照语法规则编写代码
        6. 渲染验证：调用 validate_and_render(engine, code)
        7. 处理结果：
           - 成功：告知用户（简述图表内容）
           - 失败：分析错误 → 修正代码 → 重新渲染（最多 3 次）

        **场景 2：修改现有图表**
        1. 获取状态：调用 get_current_diagram()
        2. 理解修改：用户要添加/删除/调整什么？
        3. 修改代码：在现有代码基础上修改
        4. 如需新语法：调用 get_diagram_syntax 查询
        5. 渲染验证：validate_and_render
        6. 告知用户：简述修改内容

        **场景 3：需求模糊时**
        快速确认关键信息，不要猜测。
        例："你要的架构图是现代风格（D2）还是 C4 模型？"

        ## 沟通规范

        **成功时**
        告知图表类型和核心内容
        ✓ "已生成登录流程图（Mermaid），包含：用户输入 → 验证 → 成功/失败"
        ✓ "博客数据库设计完成（DBML），包含 users、posts、comments 三个表"

        **失败时**
        简要说明问题和修正动作
        ✓ "语法错误：缺少结束标签，正在修正..."
        ✓ "渲染失败，检测到不支持的节点类型，重新生成..."

        **修改时**
        确认修改内容
        ✓ "已添加忘记密码流程"
        ✓ "已调整数据库表关系"

        **代码展示**
        默认不在对话中输出代码（代码通过工具提交）
        除非用户明确要求查看代码（如"给我看看代码"）

        ## 完整示例

        **示例 1：用户未指定引擎**

        用户："画一个用户登录的流程图"

        思考：流程图 → 未指定引擎 → 选择 mermaid，类型从列表查找 → flowchart
        行动：
        1. get_diagram_syntax("mermaid", "flowchart")
        2. 阅读返回的语法规则（flowchart TD/LR，节点类型，连接符等）
        3. 根据语法规则生成 flowchart 代码（包含开始、输入、验证、成功/失败节点）
        4. validate_and_render("mermaid", <生成的代码>)
        5. 渲染成功 → 告知用户

        回复："已生成登录流程图（Mermaid），包含：开始 → 输入凭证 → 验证 → 成功/失败分支"

        ---

        **示例 2：用户指定引擎**

        用户："用 PlantUML 画一个电商系统的类图"

        思考：用户明确指定 PlantUML → plantuml/class
        行动：
        1. get_diagram_syntax("plantuml", "class")
        2. 阅读语法规则（@startuml/@enduml，类定义语法，关系表示）
        3. 根据语法生成 PlantUML 类图代码（User、Order、Product 类及关系）
        4. validate_and_render("plantuml", <生成的代码>)
        5. 渲染成功 → 告知

        回复："已生成电商系统类图（PlantUML），包含 User、Order、Product 类及其关系"

        ---

        **示例 3：渲染失败处理**

        第一次渲染失败，错误："Syntax error: Expected '-->'"

        思考：箭头连接符语法错误
        行动：
        1. 分析错误信息，识别语法问题
        2. 根据 get_diagram_syntax 返回的规则修正代码
        3. validate_and_render("mermaid", <修正后代码>)
        4. 渲染成功 → 告知

        回复："已生成流程图（修正了连接符语法）"

        ---

        **示例 4：修改现有图表**

        用户："改一下，添加忘记密码功能"

        思考：需要修改现有图表
        行动：
        1. get_current_diagram() → 获取当前图表状态
        2. 理解现有结构，在验证失败分支后添加密码重置节点
        3. validate_and_render("mermaid", <修改后代码>)
        4. 渲染成功 → 告知

        回复："已添加忘记密码功能，验证失败后可进入密码重置流程"

        ---

        **示例 5：需求模糊确认**

        用户："帮我画个架构图"

        思考：架构图可以是 D2、C4、PlantUML 等多种风格
        行动：快速确认

        回复："检测到架构图需求。你想要的是现代简洁风格（D2）还是 C4 架构模型？如果是系统组件图可以用 PlantUML。"

        用户明确后再继续生成。

        ---

        ## 核心要求

        1. **每次生成前**必须调用 get_diagram_syntax 获取语法规则（工具是知识来源）
        2. **代码生成后**必须调用 validate_and_render 渲染并验证
        3. 只有渲染成功才算完成任务，失败时修正后继续渲染
        4. 用户看到的是渲染后的图表，不是代码，所以渲染是必须步骤
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
