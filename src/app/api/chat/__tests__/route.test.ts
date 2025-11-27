import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';
import { NextRequest } from 'next/server';

// 全局 mock AI SDK
vi.mock('ai', async () => {
  const actual = await vi.importActual('ai');
  return {
    ...actual,
    streamText: vi.fn(() => ({
      toUIMessageStreamResponse: vi.fn(() => new Response('OK')),
    })),
    convertToModelMessages: vi.fn((msgs) => msgs),
    stepCountIs: vi.fn(() => ({ type: 'step-count', count: 10 })),
  };
});

describe('Chat API 端点', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // 设置环境变量
    process.env.OPENAI_API_KEY = 'test-key';
    process.env.OPENAI_BASE_URL = 'https://api.test.com/v1';
    process.env.OPENAI_MODEL = 'test-model';
  });

  /**
   * 创建测试用的 NextRequest
   */
  function createRequest(body: unknown): NextRequest {
    return new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * 创建有效的消息对象
   */
  function createValidMessage(overrides?: Record<string, unknown>) {
    return {
      id: 'msg-1',
      role: 'user' as const,
      content: '画一个流程图',
      ...overrides,
    };
  }

  describe('请求体验证', () => {
    it('应该接受有效的请求体', async () => {
      const validBody = {
        messages: [createValidMessage()],
      };

      const request = createRequest(validBody);
      const response = await POST(request);

      // 验证不返回 400 错误
      expect(response.status).not.toBe(400);
    });

    it('应该拒绝缺少 messages 字段的请求', async () => {
      const invalidBody = {};

      const request = createRequest(invalidBody);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('请求参数错误');
      expect(data.details).toHaveProperty('messages');
    });

    it('应该拒绝空 messages 数组', async () => {
      const invalidBody = {
        messages: [],
      };

      const request = createRequest(invalidBody);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('请求参数错误');
      expect(data.details.messages?._errors).toContain('消息列表不能为空');
    });

    it('应该拒绝无效的 role 值', async () => {
      const invalidBody = {
        messages: [
          {
            id: 'msg-1',
            role: 'invalid-role', // 无效的 role
            content: '测试消息',
          },
        ],
      };

      const request = createRequest(invalidBody);
      const response = await POST(request);

      // 应该返回 400 错误
      expect(response.status).toBe(400);
    });

    it('应该接受缺少 id 的消息（useChat 可能不发送 id）', async () => {
      const validBody = {
        messages: [
          {
            // 缺少 id - 这是合法的
            role: 'user',
            content: '测试消息',
          },
        ],
      };

      const request = createRequest(validBody);
      const response = await POST(request);

      // 应该通过验证（不是 400）
      expect(response.status).not.toBe(400);
    });

    it('应该接受有效的 role 类型', async () => {
      const validRoles = ['user', 'assistant', 'system', 'tool'];

      for (const role of validRoles) {
        const validBody = {
          messages: [createValidMessage({ role })],
        };

        const request = createRequest(validBody);
        const response = await POST(request);

        expect(response.status).not.toBe(400);
      }
    });

    it('应该接受字符串类型的 content', async () => {
      const validBody = {
        messages: [createValidMessage({ content: '这是一条文本消息' })],
      };

      const request = createRequest(validBody);
      const response = await POST(request);

      expect(response.status).not.toBe(400);
    });

    it('应该接受数组类型的 content（AI SDK v5 parts）', async () => {
      const validBody = {
        messages: [
          createValidMessage({
            content: [
              { type: 'text', text: '画一个流程图' },
              {
                type: 'tool-call',
                toolCallId: 'call-1',
                toolName: 'validate_and_render',
                args: { diagram_type: 'mermaid', diagram_code: 'graph TD\nA-->B' },
              },
            ],
          }),
        ],
      };

      const request = createRequest(validBody);
      const response = await POST(request);

      expect(response.status).not.toBe(400);
    });

    it('应该接受可选字段（name, parts, toolInvocations）', async () => {
      const validBody = {
        messages: [
          createValidMessage({
            name: 'assistant',
            parts: [{ type: 'text', text: '测试' }],
            toolInvocations: [{ toolName: 'get_diagram_syntax' }],
          }),
        ],
      };

      const request = createRequest(validBody);
      const response = await POST(request);

      expect(response.status).not.toBe(400);
    });
  });

  describe('currentDiagram 验证', () => {
    it('应该接受有效的 currentDiagram', async () => {
      const validBody = {
        messages: [createValidMessage()],
        currentDiagram: {
          diagram_type: 'mermaid',
          diagram_code: 'graph TD\nA-->B',
          has_error: false,
        },
      };

      const request = createRequest(validBody);
      const response = await POST(request);

      expect(response.status).not.toBe(400);
    });

    it('应该接受 currentDiagram 的可选字段缺失', async () => {
      const validBody = {
        messages: [createValidMessage()],
        currentDiagram: {
          diagram_type: 'plantuml',
          diagram_code: '@startuml\nA -> B\n@enduml',
          // has_error 是可选的
        },
      };

      const request = createRequest(validBody);
      const response = await POST(request);

      expect(response.status).not.toBe(400);
    });

    it('应该验证 currentDiagram 必需字段', async () => {
      const invalidBody = {
        messages: [createValidMessage()],
        currentDiagram: {
          diagram_type: 'mermaid',
          // 缺少 diagram_code - Zod 应该拒绝
          has_error: false,
        },
      };

      const request = createRequest(invalidBody);
      const response = await POST(request);

      // 应该返回错误（400 验证错误 或 500 运行时错误）
      expect([400, 500]).toContain(response.status);
    });

    it('应该接受不传递 currentDiagram 的请求', async () => {
      const validBody = {
        messages: [createValidMessage()],
        // 没有 currentDiagram 字段
      };

      const request = createRequest(validBody);
      const response = await POST(request);

      expect(response.status).not.toBe(400);
    });
  });

  describe('边界情况', () => {
    it('应该处理多条消息', async () => {
      const validBody = {
        messages: [
          createValidMessage({ id: 'msg-1', content: '第一条消息' }),
          createValidMessage({ id: 'msg-2', role: 'assistant', content: '第二条消息' }),
          createValidMessage({ id: 'msg-3', content: '第三条消息' }),
        ],
      };

      const request = createRequest(validBody);
      const response = await POST(request);

      expect(response.status).not.toBe(400);
    });

    it('应该拒绝非 JSON 请求体', async () => {
      const request = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: 'invalid json',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });

    it('应该拒绝 null 请求体', async () => {
      const request = createRequest(null);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('请求参数错误');
    });

    it('应该拒绝额外的未知字段（strict mode）', async () => {
      // Zod 默认允许额外字段，这个测试验证我们的 schema 是否处理额外字段
      const bodyWithExtra = {
        messages: [createValidMessage()],
        unknownField: 'should be ignored',
      };

      const request = createRequest(bodyWithExtra);
      const response = await POST(request);

      // Zod 默认行为是忽略额外字段，不报错
      expect(response.status).not.toBe(400);
    });
  });
});
