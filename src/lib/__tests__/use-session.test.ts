/**
 * 会话管理 Hook 测试
 */
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSession } from "../use-session";
import * as storage from "../storage";

// Mock storage 模块
vi.mock("../storage", () => ({
  getSessions: vi.fn(),
  getSession: vi.fn(),
  saveSession: vi.fn(),
  deleteSession: vi.fn(),
  getCurrentSessionId: vi.fn(),
  setCurrentSessionId: vi.fn(),
  createEmptySession: vi.fn(),
  generateSessionName: vi.fn((type: string) => `${type} 1127-1430`),
}));

// Mock nanoid
vi.mock("nanoid", () => ({
  nanoid: vi.fn(() => "test-nanoid-id"),
}));

const mockGetSessions = vi.mocked(storage.getSessions);
const mockGetSession = vi.mocked(storage.getSession);
const mockSaveSession = vi.mocked(storage.saveSession);
const mockDeleteSession = vi.mocked(storage.deleteSession);
const mockGetCurrentSessionId = vi.mocked(storage.getCurrentSessionId);
const mockSetCurrentSessionId = vi.mocked(storage.setCurrentSessionId);
const mockCreateEmptySession = vi.mocked(storage.createEmptySession);

function createMockSession(id: string, name = `Session ${id}`): storage.Session {
  return {
    id,
    name,
    diagram: {
      diagram_type: "mermaid",
      diagram_code: "graph TD\n  A --> B",
      timestamp: Date.now(),
    },
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

// 等待所有 Promise 完成的辅助函数
async function flushPromises() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("useSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // 默认 mock 返回值
    mockGetSessions.mockResolvedValue([]);
    mockGetSession.mockResolvedValue(null);
    mockSaveSession.mockResolvedValue(undefined);
    mockDeleteSession.mockResolvedValue(undefined);
    mockGetCurrentSessionId.mockResolvedValue(null);
    mockSetCurrentSessionId.mockResolvedValue(undefined);
    mockCreateEmptySession.mockImplementation((id, type, code) => ({
      id,
      name: `New Session`,
      diagram: { diagram_type: type, diagram_code: code, timestamp: Date.now() },
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }));
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe("初始化", () => {
    it("没有历史会话时创建新会话", async () => {
      mockGetSessions.mockResolvedValue([]);
      mockGetCurrentSessionId.mockResolvedValue(null);

      const { result } = renderHook(() => useSession());

      // 初始状态
      expect(result.current.isLoading).toBe(true);

      // 等待初始化完成
      await act(async () => {
        await flushPromises();
      });

      expect(result.current.isLoading).toBe(false);
      expect(mockCreateEmptySession).toHaveBeenCalled();
      expect(mockSaveSession).toHaveBeenCalled();
      expect(result.current.sessionId).toBe("test-nanoid-id");
    });

    it("有历史会话时加载最近的", async () => {
      const mockSession = createMockSession("session-1", "My Session");
      mockGetSessions.mockResolvedValue([mockSession]);
      mockGetCurrentSessionId.mockResolvedValue(null);
      mockGetSession.mockResolvedValue(mockSession);

      const { result } = renderHook(() => useSession());

      await act(async () => {
        await flushPromises();
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.sessionId).toBe("session-1");
      expect(result.current.diagram.diagram_type).toBe("mermaid");
    });

    it("恢复之前的当前会话", async () => {
      const mockSession = createMockSession("session-1");
      mockGetSessions.mockResolvedValue([mockSession]);
      mockGetCurrentSessionId.mockResolvedValue("session-1");
      mockGetSession.mockResolvedValue(mockSession);

      const { result } = renderHook(() => useSession());

      await act(async () => {
        await flushPromises();
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.sessionId).toBe("session-1");
    });
  });

  describe("图表操作", () => {
    it("setDiagram 更新图表状态", async () => {
      const mockSession = createMockSession("session-1");
      mockGetSessions.mockResolvedValue([mockSession]);
      mockGetCurrentSessionId.mockResolvedValue("session-1");
      mockGetSession.mockResolvedValue(mockSession);

      const { result } = renderHook(() => useSession());

      await act(async () => {
        await flushPromises();
      });

      act(() => {
        result.current.setDiagram({ diagram_code: "new code" });
      });

      expect(result.current.diagram.diagram_code).toBe("new code");
    });

    it("undo/redo 工作正常", async () => {
      const mockSession = createMockSession("session-1");
      mockGetSessions.mockResolvedValue([mockSession]);
      mockGetCurrentSessionId.mockResolvedValue("session-1");
      mockGetSession.mockResolvedValue(mockSession);

      const { result } = renderHook(() => useSession());

      await act(async () => {
        await flushPromises();
      });

      const originalCode = result.current.diagram.diagram_code;

      // 修改
      act(() => {
        result.current.setDiagram({ diagram_code: "modified code" });
      });

      expect(result.current.diagram.diagram_code).toBe("modified code");
      expect(result.current.canUndo).toBe(true);

      // 撤销
      act(() => {
        result.current.undo();
      });

      expect(result.current.diagram.diagram_code).toBe(originalCode);
      expect(result.current.canRedo).toBe(true);

      // 重做
      act(() => {
        result.current.redo();
      });

      expect(result.current.diagram.diagram_code).toBe("modified code");
    });
  });

  describe("手动保存", () => {
    it("修改后不会自动保存", async () => {
      vi.useFakeTimers();

      const mockSession = createMockSession("session-1");
      mockGetSessions.mockResolvedValue([mockSession]);
      mockGetCurrentSessionId.mockResolvedValue("session-1");
      mockGetSession.mockResolvedValue(mockSession);

      const { result } = renderHook(() => useSession());

      // 手动推进初始化
      await act(async () => {
        await vi.runAllTimersAsync();
      });

      // 清除初始化时的调用
      mockSaveSession.mockClear();

      // 修改
      act(() => {
        result.current.setDiagram({ diagram_code: "manual save test" });
      });

      // 立即检查，不应该保存
      expect(mockSaveSession).not.toHaveBeenCalled();

      // 快进定时器，仍然不应该保存
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000);
      });

      // 确认没有自动保存
      expect(mockSaveSession).not.toHaveBeenCalled();

      // 手动保存
      await act(async () => {
        await result.current.saveNow();
      });

      // 现在应该保存了
      expect(mockSaveSession).toHaveBeenCalled();

      vi.useRealTimers();
    });

    it("hasPendingChanges 正确反映未保存状态", async () => {
      const mockSession = createMockSession("session-1");
      mockGetSessions.mockResolvedValue([mockSession]);
      mockGetCurrentSessionId.mockResolvedValue("session-1");
      mockGetSession.mockResolvedValue(mockSession);

      const { result } = renderHook(() => useSession());

      await act(async () => {
        await flushPromises();
      });

      // 初始状态应该没有未保存的更改
      expect(result.current.hasPendingChanges).toBe(false);

      // 修改后应该有未保存的更改
      act(() => {
        result.current.setDiagram({ diagram_code: "changed" });
      });

      await act(async () => {
        await flushPromises();
      });

      expect(result.current.hasPendingChanges).toBe(true);

      // 保存后应该没有未保存的更改
      await act(async () => {
        await result.current.saveNow();
      });

      expect(result.current.hasPendingChanges).toBe(false);
    });
  });

  describe("会话管理", () => {
    it("createNewSession 创建新会话", async () => {
      const mockSession = createMockSession("session-1");
      mockGetSessions.mockResolvedValue([mockSession]);
      mockGetCurrentSessionId.mockResolvedValue("session-1");
      mockGetSession.mockResolvedValue(mockSession);

      const { result } = renderHook(() => useSession());

      await act(async () => {
        await flushPromises();
      });

      mockSaveSession.mockClear();

      await act(async () => {
        await result.current.createNewSession();
      });

      expect(mockCreateEmptySession).toHaveBeenCalled();
      expect(result.current.sessionId).toBe("test-nanoid-id");
      expect(result.current.messages).toEqual([]);
    });

    it("loadSession 加载指定会话", async () => {
      const session1 = createMockSession("session-1");
      const session2 = createMockSession("session-2");
      session2.diagram.diagram_code = "session 2 code";

      mockGetSessions.mockResolvedValue([session1, session2]);
      mockGetCurrentSessionId.mockResolvedValue("session-1");
      mockGetSession.mockImplementation(async (id) => (id === "session-1" ? session1 : session2));

      const { result } = renderHook(() => useSession());

      await act(async () => {
        await flushPromises();
      });

      await act(async () => {
        await result.current.loadSession("session-2");
      });

      expect(result.current.sessionId).toBe("session-2");
      expect(result.current.diagram.diagram_code).toBe("session 2 code");
    });

    it("deleteSessionById 删除会话并切换", async () => {
      const session1 = createMockSession("session-1");
      const session2 = createMockSession("session-2");

      mockGetSessions.mockResolvedValue([session1, session2]);
      mockGetCurrentSessionId.mockResolvedValue("session-1");
      mockGetSession.mockImplementation(async (id) => (id === "session-1" ? session1 : session2));

      const { result } = renderHook(() => useSession());

      await act(async () => {
        await flushPromises();
      });

      await act(async () => {
        await result.current.deleteSessionById("session-1");
      });

      expect(mockDeleteSession).toHaveBeenCalledWith("session-1");
      // 应该切换到另一个会话
      expect(result.current.sessionId).toBe("session-2");
    });

    it("renameSession 重命名会话", async () => {
      const session = createMockSession("session-1", "Original Name");
      mockGetSessions.mockResolvedValue([session]);
      mockGetCurrentSessionId.mockResolvedValue("session-1");
      mockGetSession.mockResolvedValue(session);

      const { result } = renderHook(() => useSession());

      await act(async () => {
        await flushPromises();
      });

      await act(async () => {
        await result.current.renameSession("session-1", "New Name");
      });

      expect(mockSaveSession).toHaveBeenCalledWith(expect.objectContaining({ name: "New Name" }));
    });

    it("loadSession 切换前保存当前会话", async () => {
      const session1 = createMockSession("session-1");
      const session2 = createMockSession("session-2");

      mockGetSessions.mockResolvedValue([session1, session2]);
      mockGetCurrentSessionId.mockResolvedValue("session-1");
      mockGetSession.mockImplementation(async (id) => (id === "session-1" ? session1 : session2));

      const { result } = renderHook(() => useSession());

      await act(async () => {
        await flushPromises();
      });

      // 修改当前会话的代码
      act(() => {
        result.current.setDiagram({ diagram_code: "modified code" });
      });

      mockSaveSession.mockClear();

      // 切换到另一个会话
      await act(async () => {
        await result.current.loadSession("session-2");
      });

      // 应该先保存当前会话
      expect(mockSaveSession).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "session-1",
          diagram: expect.objectContaining({
            diagram_code: "modified code",
          }),
        })
      );
    });

    it("loadSession 正确恢复不同图表类型", async () => {
      const session1 = createMockSession("session-1");
      session1.diagram.diagram_type = "mermaid";
      session1.diagram.diagram_code = "graph TD\n  A --> B";

      const session2 = createMockSession("session-2");
      session2.diagram.diagram_type = "plantuml";
      session2.diagram.diagram_code = "@startuml\nAlice -> Bob\n@enduml";

      mockGetSessions.mockResolvedValue([session1, session2]);
      mockGetCurrentSessionId.mockResolvedValue("session-1");
      mockGetSession.mockImplementation(async (id) => (id === "session-1" ? session1 : session2));

      const { result } = renderHook(() => useSession());

      await act(async () => {
        await flushPromises();
      });

      // 验证初始状态
      expect(result.current.diagram.diagram_type).toBe("mermaid");

      // 切换到 plantuml 会话
      await act(async () => {
        await result.current.loadSession("session-2");
      });

      // 验证类型和代码都正确恢复
      expect(result.current.diagram.diagram_type).toBe("plantuml");
      expect(result.current.diagram.diagram_code).toBe("@startuml\nAlice -> Bob\n@enduml");
    });

    it("loadSession 正确恢复聊天消息", async () => {
      const session1 = createMockSession("session-1");
      session1.messages = [
        { id: "msg-1", role: "user" as const, parts: [{ type: "text" as const, text: "Hello" }] },
      ];

      const session2 = createMockSession("session-2");
      session2.messages = [
        { id: "msg-2", role: "user" as const, parts: [{ type: "text" as const, text: "Bonjour" }] },
        {
          id: "msg-3",
          role: "assistant" as const,
          parts: [{ type: "text" as const, text: "Salut!" }],
        },
      ];

      mockGetSessions.mockResolvedValue([session1, session2]);
      mockGetCurrentSessionId.mockResolvedValue("session-1");
      mockGetSession.mockImplementation(async (id) => (id === "session-1" ? session1 : session2));

      const { result } = renderHook(() => useSession());

      await act(async () => {
        await flushPromises();
      });

      // 验证初始消息
      expect(result.current.messages).toHaveLength(1);
      const msg1Part = result.current.messages[0].parts[0];
      expect(msg1Part.type).toBe("text");
      expect((msg1Part as { type: "text"; text: string }).text).toBe("Hello");

      // 切换会话
      await act(async () => {
        await result.current.loadSession("session-2");
      });

      // 验证消息正确恢复
      expect(result.current.messages).toHaveLength(2);
      const msg2Part = result.current.messages[0].parts[0];
      const msg3Part = result.current.messages[1].parts[0];
      expect((msg2Part as { type: "text"; text: string }).text).toBe("Bonjour");
      expect((msg3Part as { type: "text"; text: string }).text).toBe("Salut!");
    });

    it("loadSession 切换相同会话不触发保存", async () => {
      const session1 = createMockSession("session-1");

      mockGetSessions.mockResolvedValue([session1]);
      mockGetCurrentSessionId.mockResolvedValue("session-1");
      mockGetSession.mockResolvedValue(session1);

      const { result } = renderHook(() => useSession());

      await act(async () => {
        await flushPromises();
      });

      mockSaveSession.mockClear();

      // 尝试加载相同会话
      await act(async () => {
        await result.current.loadSession("session-1");
      });

      // 不应该触发保存
      expect(mockSaveSession).not.toHaveBeenCalled();
    });
  });

  describe("消息管理", () => {
    it("setMessages 更新消息", async () => {
      const mockSession = createMockSession("session-1");
      mockGetSessions.mockResolvedValue([mockSession]);
      mockGetCurrentSessionId.mockResolvedValue("session-1");
      mockGetSession.mockResolvedValue(mockSession);

      const { result } = renderHook(() => useSession());

      await act(async () => {
        await flushPromises();
      });

      const newMessages = [
        { id: "1", role: "user" as const, parts: [{ type: "text" as const, text: "Hello" }] },
      ];

      act(() => {
        result.current.setMessages(newMessages);
      });

      expect(result.current.messages).toEqual(newMessages);
    });

    it("快速连续切换会话不丢失数据", async () => {
      const session1 = createMockSession("session-1");
      session1.messages = [
        { id: "msg-1", role: "user" as const, parts: [{ type: "text" as const, text: "Session 1" }] },
      ];

      const session2 = createMockSession("session-2");
      session2.messages = [
        { id: "msg-2", role: "user" as const, parts: [{ type: "text" as const, text: "Session 2" }] },
      ];

      const session3 = createMockSession("session-3");
      session3.messages = [
        { id: "msg-3", role: "user" as const, parts: [{ type: "text" as const, text: "Session 3" }] },
      ];

      mockGetSessions.mockResolvedValue([session1, session2, session3]);
      mockGetCurrentSessionId.mockResolvedValue("session-1");
      mockGetSession.mockImplementation(async (id) => {
        if (id === "session-1") return session1;
        if (id === "session-2") return session2;
        if (id === "session-3") return session3;
        return null;
      });

      const { result } = renderHook(() => useSession());

      await act(async () => {
        await flushPromises();
      });

      // 快速连续切换
      await act(async () => {
        await result.current.loadSession("session-2");
        await flushPromises();
      });

      await act(async () => {
        await result.current.loadSession("session-3");
        await flushPromises();
      });

      // 验证最终状态
      expect(result.current.sessionId).toBe("session-3");
      expect(result.current.messages).toHaveLength(1);
      const msg = result.current.messages[0].parts[0];
      expect((msg as { type: "text"; text: string }).text).toBe("Session 3");
    });

    it("AI 生成消息正确保存到会话", async () => {
      const mockSession = createMockSession("session-1");
      mockGetSessions.mockResolvedValue([mockSession]);
      mockGetCurrentSessionId.mockResolvedValue("session-1");
      mockGetSession.mockResolvedValue(mockSession);

      const { result } = renderHook(() => useSession());

      await act(async () => {
        await flushPromises();
      });

      // 模拟 AI 添加新消息
      const aiMessage = [
        { id: "user-1", role: "user" as const, parts: [{ type: "text" as const, text: "User message" }] },
        { id: "ai-1", role: "assistant" as const, parts: [{ type: "text" as const, text: "AI response" }] },
      ];

      act(() => {
        result.current.setMessages(aiMessage);
      });

      await act(async () => {
        await flushPromises();
      });

      // 手动保存
      mockSaveSession.mockClear();
      await act(async () => {
        await result.current.saveNow();
      });

      // 验证保存的消息
      expect(mockSaveSession).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "session-1",
          messages: aiMessage,
        })
      );
    });
  });
});
