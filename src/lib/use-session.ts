/**
 * 会话管理 Hook
 * 整合撤销/重做、持久化、手动保存、自动草稿保存
 */
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { nanoid } from "nanoid";
import type { UIMessage } from "@ai-sdk/react";
import { toast } from "sonner";
import { useUndo } from "./use-undo";
import {
  getSessions,
  getSession,
  saveSession,
  deleteSession,
  getCurrentSessionId,
  setCurrentSessionId,
  createEmptySession,
  generateSessionName,
  type Session,
  type DiagramSnapshot,
} from "./storage";
import { DEFAULT_TEMPLATES } from "./constants";
import { logger } from "./logger";
import { APP_CONFIG } from "@/config/app";
import { handleError } from "./error-handler";

// ============================================================================
// 类型定义
// ============================================================================

/** 自动保存的草稿数据 */
interface AutoSaveDraft {
  sessionId: string;
  diagram: DiagramSnapshot;
  messages: UIMessage[];
  timestamp: number;
}

/** localStorage 草稿 key */
const DRAFT_STORAGE_KEY = "diagflow-draft";

/** 自动保存间隔（毫秒） */
const AUTO_SAVE_INTERVAL = APP_CONFIG.timing.AUTO_SAVE_INTERVAL;

export interface UseSessionReturn {
  // 当前会话
  currentSession: Session | null;
  sessionId: string | null;
  isLoading: boolean;

  // 图表状态（来自 useUndo）
  diagram: DiagramSnapshot;
  canUndo: boolean;
  canRedo: boolean;

  // 聊天消息
  messages: UIMessage[];
  setMessages: (messages: UIMessage[]) => void;

  // 图表操作
  setDiagram: (payload: Partial<DiagramSnapshot>) => void;
  undo: () => void;
  redo: () => void;

  // 会话操作
  createNewSession: () => Promise<void>;
  loadSession: (id: string) => Promise<void>;
  deleteSessionById: (id: string) => Promise<void>;
  renameSession: (id: string, name: string) => Promise<void>;

  // 历史列表
  sessions: Session[];
  refreshSessions: () => Promise<void>;

  // 手动保存
  saveNow: () => Promise<void>;
  hasPendingChanges: boolean;

  // 重置未保存标记
  resetPendingChanges: () => void;
}

// ============================================================================
// Hook
// ============================================================================

export function useSession(): UseSessionReturn {
  // 会话列表
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 当前会话 ID
  const [sessionId, setSessionId] = useState<string | null>(null);

  // 聊天消息（独立管理，不在 useUndo 中）
  const [messages, setMessages] = useState<UIMessage[]>([]);

  // 初始化 useUndo（用默认状态，加载会话后会 reset）
  const undoReturn = useUndo({
    initialState: {
      diagram_type: "mermaid",
      diagram_code: DEFAULT_TEMPLATES.mermaid,
      timestamp: Date.now(),
    },
  });

  // 未保存更改标记
  const pendingSaveRef = useRef(false);
  const suppressPendingCountRef = useRef(0);
  const [hasPendingChanges, setHasPendingChanges] = useState(false);

  // ============================================================================
  // 初始化：加载会话列表和恢复当前会话
  // ============================================================================

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        // 加载会话列表
        const loadedSessions = await getSessions();
        if (!mounted) return;
        setSessions(loadedSessions);

        // 尝试恢复当前会话
        const savedSessionId = await getCurrentSessionId();
        let sessionToLoad: Session | null = null;

        if (savedSessionId && loadedSessions.some((s) => s.id === savedSessionId)) {
          sessionToLoad = await getSession(savedSessionId);
        } else if (loadedSessions.length > 0) {
          // 加载最近的会话
          sessionToLoad = loadedSessions[0];
          if (sessionToLoad) {
            await setCurrentSessionId(sessionToLoad.id);
          }
        } else {
          // 没有历史会话，创建新的
          if (mounted) {
            const newId = nanoid();
            const newSession = createEmptySession(newId, "mermaid", DEFAULT_TEMPLATES.mermaid);
            await saveSession(newSession);
            await setCurrentSessionId(newId);
            setSessionId(newId);
            setSessions([newSession]);
            suppressPendingCountRef.current = 1;
            undoReturn.reset(newSession.diagram);
            setMessages([]);
            pendingSaveRef.current = false;
            setHasPendingChanges(false);
            setIsLoading(false);
            return;
          }
        }

        // 检查是否有草稿需要恢复
        if (sessionToLoad && mounted) {
          try {
            const draftJson = localStorage.getItem(DRAFT_STORAGE_KEY);
            if (draftJson) {
              const draft: AutoSaveDraft = JSON.parse(draftJson);

              // 检查草稿是否新于当前会话，且是同一会话
              if (
                draft.sessionId === sessionToLoad.id &&
                draft.timestamp > sessionToLoad.updatedAt
              ) {
                // 提示用户恢复草稿
                toast.info("发现未保存的更改，是否恢复？", {
                  duration: 10000,
                  action: {
                    label: "恢复",
                    onClick: () => {
                      suppressPendingCountRef.current = 1;
                      undoReturn.reset(draft.diagram);
                      setMessages(draft.messages);
                      setSessionId(draft.sessionId);
                      pendingSaveRef.current = true;
                      setHasPendingChanges(true);
                      logger.info("已恢复草稿", { sessionId: draft.sessionId });
                    },
                  },
                  cancel: {
                    label: "忽略",
                    onClick: () => {
                      // 加载保存的会话
                      suppressPendingCountRef.current = 1;
                      undoReturn.reset(sessionToLoad.diagram);
                      setMessages(sessionToLoad.messages);
                      setSessionId(sessionToLoad.id);
                      pendingSaveRef.current = false;
                      setHasPendingChanges(false);
                      // 清除草稿
                      localStorage.removeItem(DRAFT_STORAGE_KEY);
                    },
                  },
                });
                // 默认加载保存的会话（等待用户决定）
                setSessionId(sessionToLoad.id);
                suppressPendingCountRef.current = 1;
                undoReturn.reset(sessionToLoad.diagram);
                setMessages(sessionToLoad.messages);
                pendingSaveRef.current = false;
                setHasPendingChanges(false);
              } else {
                // 草稿过期或不是当前会话，正常加载
                setSessionId(sessionToLoad.id);
                suppressPendingCountRef.current = 1;
                undoReturn.reset(sessionToLoad.diagram);
                setMessages(sessionToLoad.messages);
                pendingSaveRef.current = false;
                setHasPendingChanges(false);
                // 清除过期草稿
                localStorage.removeItem(DRAFT_STORAGE_KEY);
              }
            } else {
              // 没有草稿，正常加载
              setSessionId(sessionToLoad.id);
              suppressPendingCountRef.current = 1;
              undoReturn.reset(sessionToLoad.diagram);
              setMessages(sessionToLoad.messages);
              pendingSaveRef.current = false;
              setHasPendingChanges(false);
            }
          } catch (error) {
            logger.warn("恢复草稿失败", { error });
            // 出错时正常加载会话
            setSessionId(sessionToLoad.id);
            suppressPendingCountRef.current = 1;
            undoReturn.reset(sessionToLoad.diagram);
            setMessages(sessionToLoad.messages);
            pendingSaveRef.current = false;
            setHasPendingChanges(false);
          }
        }
      } catch (error) {
        logger.error("初始化会话失败", error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    init();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============================================================================
  // 手动保存
  // ============================================================================

  const saveNow = useCallback(async () => {
    if (!sessionId) return;

    try {
      const existingSession = await getSession(sessionId);
      const now = Date.now();
      const currentDiagramType = undoReturn.state.diagram_type;

      // 根据当前图表类型生成名称（确保名称反映实际内容）
      const sessionName = generateSessionName(currentDiagramType);

      const updatedSession: Session = {
        id: sessionId,
        name: sessionName,
        diagram: undoReturn.state,
        messages,
        createdAt: existingSession?.createdAt || now,
        updatedAt: now,
      };

      await saveSession(updatedSession);

      // 更新本地列表
      setSessions((prev) => {
        const index = prev.findIndex((s) => s.id === sessionId);
        if (index >= 0) {
          const newSessions = [...prev];
          newSessions[index] = updatedSession;
          return newSessions.sort((a, b) => b.updatedAt - a.updatedAt);
        }
        return [updatedSession, ...prev];
      });

      pendingSaveRef.current = false;
      setHasPendingChanges(false);
    } catch (error) {
      handleError(error, { level: "warning", userMessage: "保存会话失败" });
    }
  }, [sessionId, undoReturn.state, messages]);

  useEffect(() => {
    if (!sessionId || isLoading) return;
    if (suppressPendingCountRef.current > 0) {
      suppressPendingCountRef.current -= 1;
      return;
    }
    pendingSaveRef.current = true;
    setHasPendingChanges(true);
  }, [sessionId, undoReturn.state, messages, isLoading]);

  // ============================================================================
  // 自动保存草稿
  // ============================================================================

  // 定期自动保存到 localStorage（草稿）
  useEffect(() => {
    if (!sessionId || isLoading) return;

    const interval = setInterval(() => {
      if (pendingSaveRef.current) {
        try {
          const draft: AutoSaveDraft = {
            sessionId,
            diagram: undoReturn.state,
            messages,
            timestamp: Date.now(),
          };
          localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
          logger.debug("自动保存草稿", { sessionId });
        } catch (error) {
          logger.warn("自动保存草稿失败", { error });
        }
      }
    }, AUTO_SAVE_INTERVAL);

    return () => clearInterval(interval);
  }, [sessionId, isLoading, undoReturn.state, messages]);

  // 页面卸载前保存草稿并提示
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (pendingSaveRef.current && sessionId) {
        // 尝试同步保存草稿到 localStorage
        try {
          const draft: AutoSaveDraft = {
            sessionId,
            diagram: undoReturn.state,
            messages,
            timestamp: Date.now(),
          };
          localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
          logger.debug("Before unload 保存草稿", { sessionId });
        } catch (error) {
          logger.error("Before unload 保存草稿失败", error);
        }

        // 提示用户有未保存的更改
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [sessionId, undoReturn.state, messages]);

  // ============================================================================
  // 会话操作
  // ============================================================================

  const createNewSession = useCallback(async () => {
    const newId = nanoid();
    // 保留当前图表类型，使用对应的默认模板
    const currentType = undoReturn.state.diagram_type;
    const template = DEFAULT_TEMPLATES[currentType] || DEFAULT_TEMPLATES.mermaid;
    const newSession = createEmptySession(newId, currentType, template);

    await saveSession(newSession);
    await setCurrentSessionId(newId);

    setSessionId(newId);
    suppressPendingCountRef.current = 1;
    undoReturn.reset(newSession.diagram);
    setMessages([]);
    pendingSaveRef.current = false;
    setHasPendingChanges(false);

    setSessions((prev) => [newSession, ...prev]);
  }, [undoReturn]);

  const loadSession = useCallback(
    async (id: string) => {
      if (id === sessionId) return;

      // 切换前保存当前会话（如果有未保存的更改）
      if (sessionId && pendingSaveRef.current) {
        const currentSessionData = sessions.find((s) => s.id === sessionId);
        if (currentSessionData) {
          const updatedSession: Session = {
            ...currentSessionData,
            diagram: undoReturn.state,
            messages,
            updatedAt: Date.now(),
          };
          await saveSession(updatedSession);
        }
      }

      const session = await getSession(id);
      if (!session) {
        handleError(`会话不存在: ${id}`, { level: "warning", userMessage: "会话不存在" });
        return;
      }

      await setCurrentSessionId(id);
      setSessionId(id);
      suppressPendingCountRef.current = 1;
      undoReturn.reset(session.diagram);
      setMessages(session.messages);
      pendingSaveRef.current = false;
      setHasPendingChanges(false);
    },
    [sessionId, undoReturn, messages, sessions]
  );

  const deleteSessionById = useCallback(
    async (id: string) => {
      await deleteSession(id);

      setSessions((prev) => prev.filter((s) => s.id !== id));

      // 如果删除的是当前会话，切换到最新的或创建新的
      if (id === sessionId) {
        const remainingSessions = sessions.filter((s) => s.id !== id);
        if (remainingSessions.length > 0) {
          await loadSession(remainingSessions[0].id);
        } else {
          await createNewSession();
        }
      }
    },
    [sessionId, sessions, loadSession, createNewSession]
  );

  const renameSession = useCallback(async (id: string, name: string) => {
    const session = await getSession(id);
    if (!session) return;

    const updatedSession = { ...session, name, updatedAt: Date.now() };
    await saveSession(updatedSession);

    setSessions((prev) => prev.map((s) => (s.id === id ? updatedSession : s)));
  }, []);

  const refreshSessions = useCallback(async () => {
    const loadedSessions = await getSessions();
    setSessions(loadedSessions);
  }, []);

  const resetPendingChanges = useCallback(() => {
    pendingSaveRef.current = false;
    setHasPendingChanges(false);
  }, []);

  // ============================================================================
  // 返回值
  // ============================================================================

  const currentSession = sessions.find((s) => s.id === sessionId) || null;

  return {
    currentSession,
    sessionId,
    isLoading,

    diagram: undoReturn.state,
    canUndo: undoReturn.canUndo,
    canRedo: undoReturn.canRedo,

    messages,
    setMessages,

    setDiagram: undoReturn.set,
    undo: undoReturn.undo,
    redo: undoReturn.redo,

    createNewSession,
    loadSession,
    deleteSessionById,
    renameSession,

    sessions,
    refreshSessions,

    saveNow,
    hasPendingChanges,
    resetPendingChanges,
  };
}
