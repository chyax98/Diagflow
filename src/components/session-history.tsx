'use client';

import { useState, useRef, useEffect } from 'react';
import type { Session } from '@/lib/storage';

interface SessionHistoryProps {
  sessions: Session[];
  currentSessionId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
}

/**
 * 会话历史面板组件
 * 提取自 ChatPanel，负责显示和管理历史会话列表
 */
export function SessionHistory({
  sessions,
  currentSessionId,
  isOpen,
  onClose,
  onSelect,
  onNew,
  onDelete,
  onRename,
}: SessionHistoryProps) {
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  // 格式化时间
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 30) return `${days}天前`;

    const isToday = date.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isToday) {
      return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    } else if (isYesterday) {
      return '昨天';
    } else {
      return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
    }
  };

  // 开始编辑会话名称
  const startEditing = (session: Session) => {
    setEditingSessionId(session.id);
    setEditingName(session.name);
  };

  // 确认重命名
  const confirmRename = async () => {
    if (editingSessionId && editingName.trim()) {
      await onRename(editingSessionId, editingName.trim());
    }
    setEditingSessionId(null);
    setEditingName('');
  };

  // 取消编辑
  const cancelEditing = () => {
    setEditingSessionId(null);
    setEditingName('');
  };

  // 自动聚焦编辑输入框
  useEffect(() => {
    if (editingSessionId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingSessionId]);

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 top-[52px] z-50 bg-background/95 backdrop-blur-sm flex flex-col rounded-b-xl overflow-hidden">
      {/* 面板头部 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <span className="text-sm font-medium">历史对话</span>
        <button
          onClick={onClose}
          className="w-6 h-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          aria-label="关闭历史面板"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* 新建对话按钮 */}
      <div className="px-3 py-2 border-b border-border">
        <button
          onClick={onNew}
          className="w-full px-3 py-2.5 text-sm text-left bg-primary/10 text-primary hover:bg-primary/20 rounded-lg transition-colors flex items-center gap-2 font-medium"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          开始新对话
        </button>
      </div>

      {/* 会话列表 */}
      <div className="flex-1 overflow-y-auto">
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-8">
            <svg
              className="w-12 h-12 mb-3 opacity-50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <p className="text-sm">暂无历史对话</p>
            <p className="text-xs mt-1">开始新对话后会在这里显示</p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {sessions.map((session) => {
              const isEditing = editingSessionId === session.id;
              return (
                <div
                  key={session.id}
                  role={isEditing ? undefined : 'button'}
                  tabIndex={isEditing ? undefined : 0}
                  className={`group flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${
                    session.id === currentSessionId
                      ? 'bg-primary/10 border border-primary/20'
                      : 'hover:bg-accent border border-transparent'
                  } ${isEditing ? '' : 'cursor-pointer'}`}
                  onClick={() => !isEditing && onSelect(session.id)}
                  onKeyDown={(e) => {
                    if (!isEditing && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      onSelect(session.id);
                    }
                  }}
                >
                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <input
                        ref={editInputRef}
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            confirmRename();
                          } else if (e.key === 'Escape') {
                            cancelEditing();
                          }
                        }}
                        onBlur={confirmRename}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full px-2 py-1 text-sm bg-background border border-primary rounded outline-none"
                      />
                    ) : (
                      <>
                        <div
                          className={`text-sm truncate ${session.id === currentSessionId ? 'font-medium' : ''}`}
                        >
                          {session.name}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {formatTime(session.updatedAt)}
                        </div>
                      </>
                    )}
                  </div>
                  {!isEditing && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditing(session);
                        }}
                        className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                        title="重命名"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(session.id);
                        }}
                        className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        title="删除"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
