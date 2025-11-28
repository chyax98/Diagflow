/**
 * IndexedDB 存储层（带 localStorage 降级）
 * 使用 idb-keyval 管理会话持久化，私密模式下降级到 localStorage
 */
import { createStore, get, set, del } from "idb-keyval";
import type { UIMessage } from "@ai-sdk/react";
import { STORAGE_CONFIG, STORAGE_KEYS } from "./constants";
import { logger, ErrorMessages } from "./logger";
import { StorageError } from "./types";
import { handleError } from "./error-handler";

// 创建专用存储（避免与其他应用冲突）
const diagflowStore = createStore("diagflow-db", "diagflow-store");

// ============================================================================
// localStorage 降级辅助函数
// ============================================================================

const FALLBACK_PREFIX = "diagflow-fallback-";

/** localStorage 降级：保存会话列表 */
function saveSessionsToLocalStorage(sessions: Session[]): void {
  try {
    const data: SessionsMetadata = { sessions, version: 1 };
    localStorage.setItem(`${FALLBACK_PREFIX}sessions`, JSON.stringify(data));
    logger.info("已降级到 localStorage 保存会话列表");
  } catch (error) {
    logger.error("localStorage 保存失败", error);
    throw new StorageError(ErrorMessages.STORAGE_UNAVAILABLE, error);
  }
}

/** localStorage 降级：获取会话列表 */
function getSessionsFromLocalStorage(): Session[] {
  try {
    const json = localStorage.getItem(`${FALLBACK_PREFIX}sessions`);
    if (!json) return [];
    const data: SessionsMetadata = JSON.parse(json);
    return data.sessions || [];
  } catch (error) {
    logger.warn("localStorage 读取失败", { error });
    return [];
  }
}

// ============================================================================
// 类型定义
// ============================================================================

/** 图表快照（撤销/重做单元） */
export interface DiagramSnapshot {
  diagram_type: string;
  diagram_code: string;
  timestamp: number;
}

/** 完整会话（持久化单元） */
export interface Session {
  id: string;
  name: string;
  diagram: DiagramSnapshot;
  messages: UIMessage[];
  createdAt: number;
  updatedAt: number;
}

/** 存储的会话列表元数据 */
interface SessionsMetadata {
  sessions: Session[];
  version: number; // 数据版本，用于未来迁移
}

// ============================================================================
// 存储操作
// ============================================================================

/**
 * 获取所有会话（按更新时间降序）
 */
export async function getSessions(): Promise<Session[]> {
  try {
    const data = await get<SessionsMetadata>(STORAGE_KEYS.sessions, diagflowStore);
    if (!data?.sessions) return [];
    // 按更新时间降序排序
    return data.sessions.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch (error) {
    logger.warn("IndexedDB 获取失败，尝试 localStorage 降级", { error });

    // 降级到 localStorage
    try {
      const sessions = getSessionsFromLocalStorage();
      return sessions.sort((a, b) => b.updatedAt - a.updatedAt);
    } catch (fallbackError) {
      logger.error("localStorage 也失败", fallbackError);
      return [];
    }
  }
}

/**
 * 获取单个会话
 */
export async function getSession(id: string): Promise<Session | null> {
  const sessions = await getSessions();
  return sessions.find((s) => s.id === id) || null;
}

/**
 * 保存会话（新增或更新）
 * 如果超出最大数量限制，自动删除最旧的会话
 */
export async function saveSession(session: Session): Promise<void> {
  try {
    const sessions = await getSessions();
    const existingIndex = sessions.findIndex((s) => s.id === session.id);

    if (existingIndex >= 0) {
      // 更新现有会话
      sessions[existingIndex] = session;
    } else {
      // 新增会话
      sessions.unshift(session);

      // 超出限制时删除最旧的
      while (sessions.length > STORAGE_CONFIG.maxSessions) {
        sessions.pop();
      }
    }

    // 尝试保存到 IndexedDB
    try {
      await set(STORAGE_KEYS.sessions, { sessions, version: 1 }, diagflowStore);
    } catch (idbError) {
      logger.warn("IndexedDB 保存失败，降级到 localStorage", { error: idbError });

      // 降级到 localStorage
      saveSessionsToLocalStorage(sessions);
    }
  } catch (error) {
    logger.error("保存会话失败", error);
    throw error;
  }
}

/**
 * 删除会话
 */
export async function deleteSession(id: string): Promise<void> {
  try {
    const sessions = await getSessions();
    const filtered = sessions.filter((s) => s.id !== id);
    await set(STORAGE_KEYS.sessions, { sessions: filtered, version: 1 }, diagflowStore);
  } catch (error) {
    handleError(error, { level: "warning", userMessage: "删除会话失败" });
    throw error;
  }
}

/**
 * 清空所有会话
 */
export async function clearAllSessions(): Promise<void> {
  try {
    await del(STORAGE_KEYS.sessions, diagflowStore);
    await del(STORAGE_KEYS.currentSessionId, diagflowStore);
  } catch (error) {
    handleError(error, { level: "warning", userMessage: "清空会话失败" });
    throw error;
  }
}

/**
 * 获取当前会话 ID
 */
export async function getCurrentSessionId(): Promise<string | null> {
  try {
    return (await get<string>(STORAGE_KEYS.currentSessionId, diagflowStore)) || null;
  } catch (error) {
    handleError(error, { level: "silent", userMessage: "获取当前会话 ID 失败" });
    return null;
  }
}

/**
 * 设置当前会话 ID
 */
export async function setCurrentSessionId(id: string | null): Promise<void> {
  try {
    if (id) {
      await set(STORAGE_KEYS.currentSessionId, id, diagflowStore);
    } else {
      await del(STORAGE_KEYS.currentSessionId, diagflowStore);
    }
  } catch (error) {
    handleError(error, { level: "warning", userMessage: "设置当前会话 ID 失败" });
  }
}

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 生成会话名称（基于图表类型和时间）
 * 格式：类型简称 月日-时分，例如 "Mermaid 1127-1430"
 */
export function generateSessionName(diagramType: string): string {
  const typeNames: Record<string, string> = {
    mermaid: "Mermaid",
    plantuml: "PlantUML",
    d2: "D2",
    dbml: "DBML",
    graphviz: "Graphviz",
    c4plantuml: "C4",
    wavedrom: "WaveDrom",
  };

  const typeName = typeNames[diagramType] || diagramType;
  const date = new Date();
  
  // 格式：月日-时分（紧凑格式）
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  const timeStr = `${month}${day}-${hour}${minute}`;

  return `${typeName} ${timeStr}`;
}

/**
 * 创建空会话
 */
export function createEmptySession(id: string, diagramType: string, diagramCode: string): Session {
  const now = Date.now();
  return {
    id,
    name: generateSessionName(diagramType),
    diagram: {
      diagram_type: diagramType,
      diagram_code: diagramCode,
      timestamp: now,
    },
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
}
