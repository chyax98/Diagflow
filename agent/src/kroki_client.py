"""
统一的 Kroki 渲染客户端

设计原则：
- Agent 工具和后端 API 都调用此模块
- 避免重复代码，统一错误处理
- 只在一个地方配置 KROKI_BASE_URL
"""

import os
import httpx
import logfire
from typing import Tuple


KROKI_BASE_URL = os.getenv("KROKI_BASE_URL", "https://kroki.io").rstrip("/")


async def render_diagram(
    engine: str,
    output_format: str,
    code: str,
    timeout: float = 30.0
) -> Tuple[int, str, str]:
    """
    调用 Kroki 渲染图表

    Args:
        engine: 图表引擎 (如 'mermaid', 'plantuml')
        output_format: 输出格式 (如 'svg', 'png')
        code: 图表代码
        timeout: 超时时间（秒）

    Returns:
        (status_code, content, error_message)
        - 成功: (200, svg/png内容, "")
        - 失败: (状态码, "", 错误信息)
    """
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(
                f"{KROKI_BASE_URL}/{engine}/{output_format}",
                content=code,
                headers={"Content-Type": "text/plain"}
            )

            if response.status_code == 200:
                logfire.info(
                    "Kroki 渲染成功",
                    engine=engine,
                    format=output_format,
                    code_length=len(code),
                    content_length=len(response.content)
                )
                return response.status_code, response.text, ""
            else:
                error_msg = f"渲染失败 (HTTP {response.status_code}): {response.text}"
                logfire.error(
                    "Kroki 渲染失败",
                    engine=engine,
                    format=output_format,
                    status_code=response.status_code,
                    error=response.text[:200]
                )
                return response.status_code, "", error_msg

    except httpx.TimeoutException:
        error_msg = "渲染超时，请简化图表或稍后重试"
        logfire.error(
            "Kroki 渲染超时",
            engine=engine,
            format=output_format,
            timeout=timeout
        )
        return 504, "", error_msg

    except httpx.RequestError as e:
        error_msg = f"网络错误: {str(e)}"
        logfire.error(
            "Kroki 网络错误",
            engine=engine,
            format=output_format,
            error=str(e)
        )
        return 500, "", error_msg

    except Exception as e:
        error_msg = f"未知错误: {str(e)}"
        logfire.error(
            "Kroki 未知错误",
            engine=engine,
            format=output_format,
            error=str(e)
        )
        return 500, "", error_msg
