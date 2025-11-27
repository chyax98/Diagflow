/**
 * 渲染控制 Hook
 * 统一管理图表渲染逻辑，防止竞态条件和内存泄漏
 */
'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { renderDiagram } from './kroki';
import { logger } from './logger';
import type { DiagramSnapshot } from './storage';

export interface UseRenderControlOptions {
  /** 是否在组件加载时立即渲染 */
  autoRender?: boolean;
}

export interface UseRenderControlReturn {
  /** SVG 内容 */
  svgContent: string;
  /** 错误消息 */
  errorMessage: string | null;
  /** 是否正在渲染 */
  isRendering: boolean;
  /** 执行渲染（统一入口） */
  performRender: (diagramType: string, code: string) => Promise<void>;
  /** 清除渲染结果 */
  clearRender: () => void;
}

/**
 * 渲染控制 Hook
 *
 * 解决的问题：
 * 1. 竞态条件：使用版本号确保只有最新的渲染结果被应用
 * 2. 内存泄漏：组件卸载时取消所有进行中的渲染
 * 3. 重复渲染：缓存上次渲染的代码，避免重复渲染
 */
export function useRenderControl(options: UseRenderControlOptions = {}): UseRenderControlReturn {
  const { autoRender = false } = options;

  const [svgContent, setSvgContent] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);

  // 版本控制：防止竞态条件
  const renderVersionRef = useRef(0);

  // 缓存上次渲染的代码：避免重复渲染
  const lastRenderedCodeRef = useRef('');

  // 组件是否已卸载
  const isMountedRef = useRef(true);

  /**
   * 统一的渲染函数
   * 所有渲染都应该通过这个函数
   */
  const performRender = useCallback(async (diagramType: string, code: string): Promise<void> => {
    // 跳过空内容
    if (!code.trim()) {
      setSvgContent('');
      setErrorMessage(null);
      return;
    }

    // 跳过相同内容（避免重复渲染）
    if (code === lastRenderedCodeRef.current && svgContent) {
      logger.debug('跳过重复渲染', { diagramType, codeLength: code.length });
      return;
    }

    // 递增版本号
    renderVersionRef.current++;
    const currentVersion = renderVersionRef.current;

    logger.debug('开始渲染', {
      diagramType,
      version: currentVersion,
      codeLength: code.length,
    });

    setIsRendering(true);
    setErrorMessage(null);

    try {
      const svg = await renderDiagram(diagramType, code);

      // 版本检查：防止过期渲染覆盖新结果
      if (!isMountedRef.current) {
        logger.debug('组件已卸载，跳过渲染结果', { version: currentVersion });
        return;
      }

      if (renderVersionRef.current !== currentVersion) {
        logger.debug('渲染版本过期，跳过', {
          currentVersion,
          latestVersion: renderVersionRef.current,
        });
        return;
      }

      setSvgContent(svg);
      setErrorMessage(null);
      lastRenderedCodeRef.current = code;

      logger.debug('渲染成功', {
        version: currentVersion,
        svgLength: svg.length,
      });
    } catch (error) {
      // 版本检查
      if (!isMountedRef.current || renderVersionRef.current !== currentVersion) {
        return;
      }

      const errorMsg = error instanceof Error ? error.message : String(error);
      setErrorMessage(errorMsg);
      setSvgContent('');

      logger.error('渲染失败', error, {
        diagramType,
        version: currentVersion,
        codeLength: code.length,
      });
    } finally {
      // 只有当前版本才能重置渲染状态
      if (isMountedRef.current && renderVersionRef.current === currentVersion) {
        setIsRendering(false);
      }
    }
  }, [svgContent]);

  /**
   * 清除渲染结果
   */
  const clearRender = useCallback(() => {
    setSvgContent('');
    setErrorMessage(null);
    lastRenderedCodeRef.current = '';
  }, []);

  /**
   * 组件卸载时清理
   */
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      // 使所有进行中的渲染失效
      renderVersionRef.current = Number.MAX_SAFE_INTEGER;
      logger.debug('渲染控制器已卸载');
    };
  }, []);

  return {
    svgContent,
    errorMessage,
    isRendering,
    performRender,
    clearRender,
  };
}
