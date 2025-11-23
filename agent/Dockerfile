# ============================================
# Stage 1: Builder
# ============================================
FROM python:3.12-slim AS builder

# 安装 uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /app

# 设置环境变量
ENV UV_SYSTEM_PYTHON=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# 复制依赖文件
COPY pyproject.toml ./

# 安装依赖到虚拟环境
RUN uv venv /opt/venv && \
    . /opt/venv/bin/activate && \
    uv pip install -e .

# ============================================
# Stage 2: Runner (生产环境)
# ============================================
FROM python:3.12-slim AS runner

WORKDIR /app

# 创建非 root 用户
RUN groupadd --gid 1001 appuser && \
    useradd --uid 1001 --gid appuser --shell /bin/bash --create-home appuser

# 从 builder 复制虚拟环境
COPY --from=builder /opt/venv /opt/venv

# 复制应用代码
COPY src ./src
COPY syntax_toml ./syntax_toml

# 修改所有权
RUN chown -R appuser:appuser /app

# 切换到非 root 用户
USER appuser

# 设置环境变量
ENV PATH="/opt/venv/bin:$PATH"
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# 暴露端口
EXPOSE 8000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health').read()" || exit 1

# 启动应用
CMD ["python", "src/main.py"]
