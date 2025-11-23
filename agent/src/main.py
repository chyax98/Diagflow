
import os
import logfire
from starlette.responses import JSONResponse, Response
from starlette.routing import Route
from starlette.requests import Request
from agent import agent, StateDeps, DiagramState
from pydantic_ai.ag_ui import AGUIApp
from kroki_client import render_diagram

# 配置 Logfire：完全禁用，避免网络连接干扰
logfire.configure(
    send_to_logfire=False,  # 完全禁用云端发送
    console=False,  # 不输出到控制台
)

# 健康检查端点
async def health_check(_request):
    return JSONResponse({"status": "healthy"})

# Kroki 代理端点（使用统一的 Kroki 客户端）
async def kroki_proxy(request: Request):
    """
    代理 Kroki 请求，路径格式: /api/render/{engine}/{format}
    例如: POST /api/render/mermaid/svg

    统一后端处理所有 Kroki 渲染请求：
    - Agent 工具调用 (validate_and_render)
    - 前端 API Route 转发
    - 都通过共享的 kroki_client.py 模块
    """
    path_parts = request.url.path.split("/")
    if len(path_parts) < 5:
        return JSONResponse(
            {"error": "Invalid path, expected: /api/render/{engine}/{format}"},
            status_code=400
        )

    engine = path_parts[3]
    output_format = path_parts[4]
    code = (await request.body()).decode("utf-8")

    if not code:
        return JSONResponse(
            {"error": "图表代码不能为空"},
            status_code=400
        )

    # 调用统一的 Kroki 客户端
    status_code, content, error_msg = await render_diagram(
        engine, output_format, code, timeout=30.0
    )

    if status_code == 200:
        # 根据格式决定 Content-Type
        content_type = "image/svg+xml" if output_format == "svg" else f"image/{output_format}"
        return Response(
            content=content.encode("utf-8"),
            status_code=200,
            media_type=content_type
        )
    else:
        return JSONResponse(
            {"error": error_msg},
            status_code=status_code
        )

# 创建 AGUIApp
app = AGUIApp(
    agent,
    deps=StateDeps(DiagramState()),
    routes=[
        Route("/health", health_check, methods=["GET"]),
        Route("/api/render/{engine}/{format}", kroki_proxy, methods=["POST"])
    ]
)

# 禁用 Logfire 追踪，避免网络连接问题
# logfire.instrument_fastapi(app, capture_headers=False)

if __name__ == "__main__":
    # run the app
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    # 开发环境启用热重载，生产环境禁用
    reload = os.getenv("ENV", "development") == "development"
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=reload)
