/**
 * 统一日志工具
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  [key: string]: unknown;
}

interface ErrorWithStack extends Error {
  cause?: unknown;
}

function formatError(error: unknown): {
  message: string;
  stack?: string;
  cause?: unknown;
  name?: string;
} {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: (error as ErrorWithStack).cause,
    };
  }

  if (typeof error === "string") {
    return { message: error };
  }

  return {
    message: String(error),
  };
}

function logToConsole(
  level: LogLevel,
  message: string,
  context?: LogContext,
  error?: unknown
): void {
  // 生产环境只输出错误
  if (process.env.NODE_ENV === "production" && level !== "error") {
    return;
  }

  const timestamp = new Date().toISOString();
  const prefix = `[DiagFlow ${timestamp}]`;

  const logData: Record<string, unknown> = {
    message,
    ...(context ? context : {}),
    ...(error ? { error: formatError(error) } : {}),
  };

  switch (level) {
    case "debug":
      // eslint-disable-next-line no-console
      console.debug(prefix, logData);
      break;
    case "info":
      // eslint-disable-next-line no-console
      console.log(prefix, logData);
      break;
    case "warn":
      console.warn(prefix, message);
      break;
    case "error":
      console.error(prefix, message, error instanceof Error ? error.message : error);
      break;
  }
}

function reportError(_message: string, _error: unknown, _context?: LogContext): void {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  // TODO: 集成 Sentry 等错误追踪服务
}

export const logger = {
  debug(message: string, context?: LogContext): void {
    if (process.env.NODE_ENV === "development") {
      logToConsole("debug", message, context);
    }
  },

  info(message: string, context?: LogContext): void {
    if (process.env.NODE_ENV === "development") {
      logToConsole("info", message, context);
    }
  },

  warn(message: string, context?: LogContext): void {
    logToConsole("warn", message, context);
  },

  error(message: string, error: unknown, context?: LogContext): void {
    logToConsole("error", message, context, error);
    reportError(message, error, context);
  },

  formatError,
};

export const ErrorMessages = {
  NETWORK_ERROR: "网络连接失败，请检查网络后重试",
  TIMEOUT_ERROR: "请求超时，请稍后重试",
  API_KEY_MISSING: "API 密钥未配置，请联系管理员",
  API_RATE_LIMIT: "请求过于频繁，请稍后再试",
  STORAGE_QUOTA: "存储空间不足，请清理浏览器数据",
  STORAGE_UNAVAILABLE: "无法保存数据，请检查浏览器设置",
  RENDER_FAILED: "图表渲染失败，请检查代码语法",
  RENDER_TIMEOUT: "渲染超时，请简化图表或稍后重试",
  SESSION_NOT_FOUND: "会话不存在",
  SESSION_LOAD_FAILED: "加载会话失败",
  UNKNOWN_ERROR: "发生未知错误，请刷新页面重试",
} as const;

export function getUserFriendlyError(error: unknown): string {
  const formatted = formatError(error);

  if (formatted.message.includes("fetch") || formatted.message.includes("network")) {
    return ErrorMessages.NETWORK_ERROR;
  }

  if (formatted.message.includes("timeout") || formatted.message.includes("超时")) {
    return ErrorMessages.TIMEOUT_ERROR;
  }

  if (formatted.message.includes("render") || formatted.message.includes("渲染")) {
    return ErrorMessages.RENDER_FAILED;
  }

  if (formatted.message.includes("quota") || formatted.message.includes("storage")) {
    return ErrorMessages.STORAGE_QUOTA;
  }

  if (formatted.message.length < 100 && !formatted.message.includes("Error:")) {
    return formatted.message;
  }

  return ErrorMessages.UNKNOWN_ERROR;
}
