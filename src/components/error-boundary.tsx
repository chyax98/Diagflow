/**
 * React Error Boundary
 * 捕获组件渲染错误，防止白屏
 */
'use client';

import { Component, ReactNode } from 'react';
import { logger } from '@/lib/logger';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

/**
 * Error Boundary 组件
 *
 * 用法：
 * ```tsx
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // 记录错误
    logger.error('React 组件错误', error, {
      componentStack: errorInfo.componentStack,
    });

    // 调用用户提供的错误处理函数
    this.props.onError?.(error, errorInfo);

    // 更新状态
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReload = (): void => {
    window.location.reload();
  };

  handleReset = (): void => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // 使用自定义 fallback 或默认错误 UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex h-screen items-center justify-center bg-background">
          <div className="max-w-md p-8 bg-card border border-border rounded-xl shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-destructive"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-foreground">出错了</h2>
            </div>

            <p className="text-muted-foreground mb-6">
              应用遇到了一个错误。您可以尝试刷新页面或重置应用状态。
            </p>

            {/* 开发环境显示错误详情 */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mb-6 p-4 bg-muted rounded-lg">
                <summary className="cursor-pointer text-sm font-medium mb-2">
                  错误详情
                </summary>
                <div className="text-xs font-mono space-y-2">
                  <div>
                    <strong>错误：</strong> {this.state.error.message}
                  </div>
                  {this.state.error.stack && (
                    <pre className="overflow-auto max-h-48 text-[10px] bg-background p-2 rounded">
                      {this.state.error.stack}
                    </pre>
                  )}
                  {this.state.errorInfo?.componentStack && (
                    <details>
                      <summary className="cursor-pointer text-xs mt-2">
                        组件栈
                      </summary>
                      <pre className="overflow-auto max-h-32 text-[10px] bg-background p-2 rounded mt-1">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                </div>
              </details>
            )}

            <div className="flex gap-3">
              <button
                onClick={this.handleReload}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                刷新页面
              </button>
              <button
                onClick={this.handleReset}
                className="flex-1 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
              >
                重置状态
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
