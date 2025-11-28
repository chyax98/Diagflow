/**
 * 应用配置管理
 * 提供默认值和环境变量覆盖机制
 */

/**
 * 安全的数字解析，失败时返回默认值
 */
function parseNumber(value: string | undefined, defaultValue: number): number {
  if (!value) return defaultValue;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? defaultValue : parsed;
}

/**
 * 获取应用配置
 */
export function getAppConfig() {
  return {
    layout: {
      SIDEBAR_WIDTH: parseNumber(process.env.NEXT_PUBLIC_SIDEBAR_WIDTH, 400),
      TOOLBAR_HEIGHT: 52,
      MESSAGE_MAX_WIDTH: '88%',
    },
    input: {
      // 聊天输入框最大字符数（默认 4 万字，约对应 32K tokens）
      MAX_LENGTH: parseNumber(process.env.NEXT_PUBLIC_INPUT_MAX_LENGTH, 40000),
    },
    timing: {
      DEBOUNCE_MS: parseNumber(process.env.NEXT_PUBLIC_DEBOUNCE_MS, 500),
      REQUEST_TIMEOUT: parseNumber(process.env.NEXT_PUBLIC_REQUEST_TIMEOUT, 60000),
      AUTO_SAVE_INTERVAL: parseNumber(process.env.NEXT_PUBLIC_AUTO_SAVE_INTERVAL, 30000),
    },
    ai: {
      // 流式响应最大时长（秒）- 仅供参考，实际值在 route.ts 中硬编码（Next.js 要求）
      // Vercel Hobby: 60s, Pro: 300s
      MAX_DURATION_SEC: 120,
      // AI 最大推理步数（工具调用轮数）
      MAX_STEPS: parseNumber(process.env.DIAGFLOW_MAX_STEPS, 15),
      // 失败重试次数
      MAX_RETRIES: parseNumber(process.env.DIAGFLOW_MAX_RETRIES, 3),
    },
  } as const;
}

/**
 * 获取 AI 配置
 * 严格验证：至少需要一个 Provider 的 API Key
 */
export function getAIConfig() {
  const openaiKey = process.env.DIAGFLOW_OPENAI_API_KEY || process.env.OPENAI_API_KEY || '';
  const anthropicKey = process.env.DIAGFLOW_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY || '';

  if (!openaiKey && !anthropicKey) {
    throw new Error('必须配置至少一个 AI Provider 的 API Key');
  }

  return {
    openai: {
      apiKey: openaiKey,
      baseURL:
        process.env.DIAGFLOW_OPENAI_BASE_URL ||
        process.env.OPENAI_BASE_URL ||
        'https://api.openai.com/v1',
      model: process.env.DIAGFLOW_OPENAI_MODEL || process.env.OPENAI_MODEL || 'gpt-4',
    },
    anthropic: {
      apiKey: anthropicKey,
    },
  };
}

/**
 * 单例配置实例
 */
export const APP_CONFIG = getAppConfig();
