import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock 必须在 import 之前定义
vi.mock('../logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), {
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  }),
}));

import { handleError, type ErrorLevel } from '../error-handler';
import { logger } from '../logger';
import { toast } from 'sonner';

// 获取 mock 函数
const mockLogger = logger as unknown as {
  error: ReturnType<typeof vi.fn>;
  warn: ReturnType<typeof vi.fn>;
  info: ReturnType<typeof vi.fn>;
  debug: ReturnType<typeof vi.fn>;
};

const mockToast = toast as unknown as {
  error: ReturnType<typeof vi.fn>;
  warning: ReturnType<typeof vi.fn>;
  info: ReturnType<typeof vi.fn>;
};

describe('handleError', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('错误级别处理', () => {
    it('critical 错误：logger.error + toast.error', () => {
      const error = new Error('API 失败');
      handleError(error, { level: 'critical' });

      expect(mockLogger.error).toHaveBeenCalledWith('API 失败', error, undefined);
      expect(mockToast.error).toHaveBeenCalledWith('API 失败');
    });

    it('warning 错误：logger.warn + toast.warning', () => {
      const error = new Error('保存失败');
      handleError(error, { level: 'warning' });

      expect(mockLogger.warn).toHaveBeenCalledWith('保存失败', undefined);
      expect(mockToast.warning).toHaveBeenCalledWith('保存失败');
    });

    it('info 错误：logger.info + toast.info', () => {
      const error = new Error('操作成功');
      handleError(error, { level: 'info' });

      expect(mockLogger.info).toHaveBeenCalledWith('操作成功', undefined);
      expect(mockToast.info).toHaveBeenCalledWith('操作成功');
    });

    it('silent 错误：只记录日志，不显示 toast', () => {
      const error = new Error('调试信息');
      handleError(error, { level: 'silent' });

      expect(mockLogger.debug).toHaveBeenCalledWith('调试信息', undefined);
      expect(mockToast.error).not.toHaveBeenCalled();
      expect(mockToast.warning).not.toHaveBeenCalled();
      expect(mockToast.info).not.toHaveBeenCalled();
    });
  });

  describe('自定义消息', () => {
    it('使用自定义用户消息', () => {
      const error = new Error('技术错误详情');
      handleError(error, {
        level: 'critical',
        userMessage: '操作失败，请重试',
      });

      expect(mockLogger.error).toHaveBeenCalledWith('技术错误详情', error, undefined);
      expect(mockToast.error).toHaveBeenCalledWith('操作失败，请重试');
    });

    it('没有自定义消息时使用原始错误消息', () => {
      const error = new Error('原始错误');
      handleError(error, { level: 'critical' });

      expect(mockToast.error).toHaveBeenCalledWith('原始错误');
    });
  });

  describe('元数据记录', () => {
    it('记录额外的元数据信息', () => {
      const error = new Error('请求失败');
      const metadata = {
        url: '/api/test',
        status: 500,
        timestamp: Date.now(),
      };

      handleError(error, {
        level: 'critical',
        metadata,
      });

      expect(mockLogger.error).toHaveBeenCalledWith('请求失败', error, metadata);
    });
  });

  describe('非 Error 对象处理', () => {
    it('处理字符串错误', () => {
      handleError('字符串错误', { level: 'warning' });

      expect(mockLogger.warn).toHaveBeenCalledWith('字符串错误', undefined);
      expect(mockToast.warning).toHaveBeenCalledWith('字符串错误');
    });

    it('处理未知类型错误', () => {
      handleError(42, { level: 'info' });

      expect(mockLogger.info).toHaveBeenCalledWith('42', undefined);
      expect(mockToast.info).toHaveBeenCalledWith('42');
    });

    it('处理 null/undefined', () => {
      handleError(null, { level: 'silent' });
      expect(mockLogger.debug).toHaveBeenCalledWith('null', undefined);

      handleError(undefined, { level: 'silent' });
      expect(mockLogger.debug).toHaveBeenCalledWith('undefined', undefined);
    });
  });
});
