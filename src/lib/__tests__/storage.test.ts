/**
 * IndexedDB 存储层测试
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import * as idbKeyval from "idb-keyval";
import {
  getSessions,
  getSession,
  saveSession,
  deleteSession,
  clearAllSessions,
  getCurrentSessionId,
  setCurrentSessionId,
  generateSessionName,
  createEmptySession,
  type Session,
} from "../storage";

// Mock idb-keyval
vi.mock("idb-keyval", () => ({
  createStore: vi.fn(() => "mock-store"),
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
}));

const mockGet = vi.mocked(idbKeyval.get);
const mockSet = vi.mocked(idbKeyval.set);
const mockDel = vi.mocked(idbKeyval.del);

describe("storage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getSessions", () => {
    it("返回空数组当没有数据", async () => {
      mockGet.mockResolvedValue(undefined);
      const sessions = await getSessions();
      expect(sessions).toEqual([]);
    });

    it("返回按更新时间降序排列的会话", async () => {
      const mockSessions: Session[] = [
        createTestSession("1", 1000),
        createTestSession("2", 3000),
        createTestSession("3", 2000),
      ];
      mockGet.mockResolvedValue({ sessions: mockSessions, version: 1 });

      const sessions = await getSessions();

      expect(sessions[0].id).toBe("2");
      expect(sessions[1].id).toBe("3");
      expect(sessions[2].id).toBe("1");
    });

    it("处理错误时返回空数组", async () => {
      mockGet.mockRejectedValue(new Error("DB error"));
      const sessions = await getSessions();
      expect(sessions).toEqual([]);
    });
  });

  describe("getSession", () => {
    it("返回指定 ID 的会话", async () => {
      const mockSessions = [createTestSession("1"), createTestSession("2")];
      mockGet.mockResolvedValue({ sessions: mockSessions, version: 1 });

      const session = await getSession("2");

      expect(session?.id).toBe("2");
    });

    it("找不到时返回 null", async () => {
      mockGet.mockResolvedValue({ sessions: [], version: 1 });
      const session = await getSession("nonexistent");
      expect(session).toBeNull();
    });
  });

  describe("saveSession", () => {
    it("新增会话到列表开头", async () => {
      const existingSessions = [createTestSession("1")];
      mockGet.mockResolvedValue({ sessions: existingSessions, version: 1 });

      const newSession = createTestSession("2");
      await saveSession(newSession);

      expect(mockSet).toHaveBeenCalledWith(
        "diagflow_sessions",
        expect.objectContaining({
          sessions: expect.arrayContaining([
            expect.objectContaining({ id: "2" }),
            expect.objectContaining({ id: "1" }),
          ]),
        }),
        "mock-store"
      );
    });

    it("更新已存在的会话", async () => {
      const existingSession = createTestSession("1");
      mockGet.mockResolvedValue({ sessions: [existingSession], version: 1 });

      const updatedSession = { ...existingSession, name: "Updated Name" };
      await saveSession(updatedSession);

      expect(mockSet).toHaveBeenCalledWith(
        "diagflow_sessions",
        expect.objectContaining({
          sessions: [expect.objectContaining({ id: "1", name: "Updated Name" })],
        }),
        "mock-store"
      );
    });

    it("超出限制时删除最旧的会话", async () => {
      // 创建 50 个会话（假设限制是 50）
      const existingSessions = Array.from({ length: 50 }, (_, i) =>
        createTestSession(`${i}`, i * 1000)
      );
      mockGet.mockResolvedValue({ sessions: existingSessions, version: 1 });

      const newSession = createTestSession("new", 999999);
      await saveSession(newSession);

      // 验证 set 被调用，且会话数不超过 50
      expect(mockSet).toHaveBeenCalled();
      const savedData = mockSet.mock.calls[0][1] as { sessions: Session[] };
      expect(savedData.sessions.length).toBeLessThanOrEqual(50);
    });
  });

  describe("deleteSession", () => {
    it("删除指定会话", async () => {
      const mockSessions = [createTestSession("1"), createTestSession("2")];
      mockGet.mockResolvedValue({ sessions: mockSessions, version: 1 });

      await deleteSession("1");

      expect(mockSet).toHaveBeenCalledWith(
        "diagflow_sessions",
        expect.objectContaining({
          sessions: [expect.objectContaining({ id: "2" })],
        }),
        "mock-store"
      );
    });
  });

  describe("clearAllSessions", () => {
    it("清空所有存储", async () => {
      await clearAllSessions();

      expect(mockDel).toHaveBeenCalledTimes(2);
      expect(mockDel).toHaveBeenCalledWith("diagflow_sessions", "mock-store");
      expect(mockDel).toHaveBeenCalledWith("diagflow_current_session_id", "mock-store");
    });
  });

  describe("getCurrentSessionId / setCurrentSessionId", () => {
    it("获取当前会话 ID", async () => {
      mockGet.mockResolvedValue("session-123");
      const id = await getCurrentSessionId();
      expect(id).toBe("session-123");
    });

    it("没有当前会话时返回 null", async () => {
      mockGet.mockResolvedValue(undefined);
      const id = await getCurrentSessionId();
      expect(id).toBeNull();
    });

    it("设置当前会话 ID", async () => {
      await setCurrentSessionId("session-456");
      expect(mockSet).toHaveBeenCalledWith(
        "diagflow_current_session_id",
        "session-456",
        "mock-store"
      );
    });

    it("清除当前会话 ID", async () => {
      await setCurrentSessionId(null);
      expect(mockDel).toHaveBeenCalledWith("diagflow_current_session_id", "mock-store");
    });
  });

  describe("generateSessionName", () => {
    it("生成包含类型名称的会话名", () => {
      const name = generateSessionName("mermaid");
      expect(name).toContain("Mermaid");
    });

    it("处理未知类型", () => {
      const name = generateSessionName("unknown");
      expect(name).toContain("unknown");
    });
  });

  describe("createEmptySession", () => {
    it("创建包含正确结构的空会话", () => {
      const session = createEmptySession("test-id", "mermaid", "graph TD\n  A --> B");

      expect(session.id).toBe("test-id");
      expect(session.diagram.diagram_type).toBe("mermaid");
      expect(session.diagram.diagram_code).toBe("graph TD\n  A --> B");
      expect(session.messages).toEqual([]);
      expect(session.createdAt).toBeDefined();
      expect(session.updatedAt).toBeDefined();
    });
  });
});

// 测试辅助函数
function createTestSession(id: string, updatedAt = Date.now()): Session {
  return {
    id,
    name: `Test Session ${id}`,
    diagram: {
      diagram_type: "mermaid",
      diagram_code: "graph TD\n  A --> B",
      timestamp: updatedAt,
    },
    messages: [],
    createdAt: updatedAt,
    updatedAt,
  };
}
