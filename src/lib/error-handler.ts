/**
 * 统一错误处理模块
 * 提供分级错误处理和用户友好的错误提示
 */

import { logger } from './logger';
import { toast } from 'sonner';

export type ErrorLevel = 'critical' | 'warning' | 'info' | 'silent';

export interface ErrorContext {
  level: ErrorLevel;
  userMessage?: string;
  metadata?: Record<string, unknown>;
}

/**
 * 统一错误处理函数
 *
 * @param error 错误对象或消息
 * @param context 错误上下文（级别、用户消息、元数据）
 */
export function handleError(error: unknown, context: ErrorContext): void {
  const message = error instanceof Error ? error.message : String(error);
  const userMessage = context.userMessage || message;

  switch (context.level) {
    case 'critical':
      logger.error(message, error, context.metadata);
      toast.error(userMessage);
      break;

    case 'warning':
      logger.warn(message, context.metadata);
      toast.warning(userMessage);
      break;

    case 'info':
      logger.info(message, context.metadata);
      toast.info(userMessage);
      break;

    case 'silent':
      logger.debug(message, context.metadata);
      break;
  }
}

/**
 * 包装异步函数，自动处理错误
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  context: ErrorContext
): Promise<T | undefined> {
  try {
    return await fn();
  } catch (error) {
    handleError(error, context);
    return undefined;
  }
}
