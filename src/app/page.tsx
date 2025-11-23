"use client";

import { useEffect, useState, useRef, createContext, useContext } from "react";
import { useCoAgent, useCopilotAction, useCopilotChat, CatchAllActionRenderProps, useCopilotChatInternal } from "@copilotkit/react-core";
import { CopilotSidebar, HeaderProps, useChatContext } from "@copilotkit/react-ui";
import { toast } from "sonner";
import { AgentState } from "@/lib/types";
import { CodeEditor } from "@/components/code-editor";
import { SvgPreview } from "@/components/svg-preview";
import { renderDiagram, exportPng, exportPngOpaque, exportJpeg, exportPdf } from "@/lib/kroki";
import { useDebounce } from "@/lib/hooks";

// 各图表类型的默认模板
const DEFAULT_TEMPLATES: Record<string, string> = {
  mermaid: "flowchart TD\n  A[开始] --> B[结束]",
  plantuml: "@startuml\nAlice -> Bob: Hello\nBob --> Alice: Hi\n@enduml",
  d2: `用户: {shape: person}
Web界面: {
  shape: rectangle
  style.fill: "#e3f2fd"
}
数据库: {
  shape: cylinder
  style.fill: "#ffccbc"
}

用户 -> Web界面: "访问"
Web界面 -> 数据库: "查询"`,
  dbml: "Table users {\n  id integer [pk]\n  name varchar\n}",
  graphviz: "digraph G {\n  A -> B\n}",
  c4plantuml: `@startuml
!include <C4/C4_Context>

Person(user, "用户", "系统使用者")
System(system, "系统", "核心系统")

Rel(user, system, "使用", "HTTPS")

LAYOUT_WITH_LEGEND()
@enduml`,
  nomnoml: "[Hello] -> [World]",
  erd: "[Person]\n*name",
  ditaa: `+--------+   +-------+
|  开始  |-->|  结束  |
+--------+   +-------+`,
  svgbob: `  .---.
 /     \\
+  Box  +
 \\     /
  '---'`,
  wavedrom: `{ "signal": [
  { "name": "clk", "wave": "p......" },
  { "name": "data", "wave": "x.345x.", "data": ["A", "B", "C"] }
]}`,
  blockdiag: `blockdiag {
  A -> B -> C;
  B -> D;
}`,
  seqdiag: `seqdiag {
  客户端 -> 服务器 [label = "请求"];
  客户端 <-- 服务器 [label = "响应"];
}`,
  nwdiag: `nwdiag {
  network dmz {
    address = "210.1.1.0/24";
    webserver [address = ".10", description = "Web服务器"];
  }
  network internal {
    address = "172.16.0.0/24";
    webserver [address = ".1", description = "Web服务器"];
    database [address = ".100", description = "数据库"];
  }
}`,
};

// 创建 Context 用于清空功能
const ClearChatContext = createContext<() => void>(() => {});

// 自定义 Header 组件，包含清空对话按钮
function CustomHeader({}: HeaderProps) {
  const { setOpen, icons, labels } = useChatContext();
  const handleClearChat = useContext(ClearChatContext);

  const onClearClick = () => {
    handleClearChat();

    toast("对话已清空", {
      duration: 2000,
      style: {
        background: "#f0fdf4",
        border: "1px solid #86efac",
        color: "#166534",
        fontSize: "14px",
        padding: "12px 16px",
      },
    });
  };

  return (
    <div className="flex justify-between items-center p-4 border-b border-gray-200">
      <div className="text-lg font-semibold">{labels.title}</div>
      <div className="flex items-center gap-2">
        <button
          onClick={onClearClick}
          className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
          title="清空对话"
        >
          清空
        </button>
        <button
          onClick={() => setOpen(false)}
          className="text-gray-500 hover:text-gray-700 transition-colors"
          aria-label="关闭"
        >
          {icons.headerCloseIcon}
        </button>
      </div>
    </div>
  );
}

export default function Home() {
  const themeColor = "#6366f1";

  const { state, setState } = useCoAgent<AgentState>({
    name: "my_agent",
    initialState: {
      diagram_type: "mermaid",
      diagram_name: "flowchart",
      diagram_code: "flowchart TD\n  Start --> End",
      svg_content: "",
      error_message: null,
      is_loading: false,
      retry_count: 0,
      last_modified: Date.now(),
    },
  });

  // 本地代码状态（用于编辑时的即时显示）
  const [localCode, setLocalCode] = useState(state.diagram_code);
  // 当前期望的类型（用于避免竞态条件）
  const currentTypeRef = useRef(state.diagram_type);
  const lastSyncedCode = useRef(state.diagram_code);
  // 渲染版本号（用于检测过期的异步渲染）
  const renderVersionRef = useRef(0);

  // 当 Agent 更新状态时，同步到本地
  useEffect(() => {
    // 只有当 state 变化来自外部（Agent）时才同步代码
    if (state.diagram_code !== lastSyncedCode.current) {
      // Agent 更新了代码，递增版本号使旧的 debounce 渲染失效
      renderVersionRef.current++;
      setLocalCode(state.diagram_code);
      lastSyncedCode.current = state.diagram_code;
    }
  }, [state.diagram_code]);

  // Agent 更新类型时同步（但不覆盖用户刚切换的类型）
  useEffect(() => {
    // 如果 state 类型和 ref 不一致，说明是 Agent 更新的，需要同步
    // 但如果是用户切换触发的 setState，此时 ref 已经是新值，不需要同步
    if (state.diagram_type !== currentTypeRef.current) {
      // 检查是否是 Agent 主动设置的（代码也变了）
      if (state.diagram_code !== localCode) {
        // Agent 更新了类型，递增版本号
        renderVersionRef.current++;
        currentTypeRef.current = state.diagram_type;
        setLocalCode(state.diagram_code);
        lastSyncedCode.current = state.diagram_code;
      }
    }
  }, [state.diagram_type]);

  const debouncedCode = useDebounce(localCode, 500);

  // 捕获并显示所有工具调用
  useCopilotAction({
    name: "*",
    render: ({ name, args, status, result }: CatchAllActionRenderProps<[]>) => {
      const toolDisplayInfo: Record<string, { label: string; color: string }> = {
        get_diagram_syntax: {
          label: "查询语法规则",
          color: "bg-blue-50 border-blue-200 text-blue-800"
        },
        validate_and_render: {
          label: "验证并渲染图表",
          color: "bg-purple-50 border-purple-200 text-purple-800"
        },
        get_current_diagram: {
          label: "获取当前图表",
          color: "bg-green-50 border-green-200 text-green-800"
        },
      };

      const info = toolDisplayInfo[name] || {
        label: name,
        color: "bg-gray-50 border-gray-200 text-gray-800"
      };

      return (
        <div className={`my-2 p-3 rounded-lg border ${info.color}`}>
          <div className="flex items-center justify-between">
            <span className="font-medium text-sm">{info.label}</span>
            <div className="text-xs">
              {status === "executing" && (
                <span className="flex items-center gap-1">
                  <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  执行中
                </span>
              )}
              {status === "complete" && (
                <span className="text-green-600">✓ 完成</span>
              )}
            </div>
          </div>
          {args && Object.keys(args).length > 0 && (
            <details className="mt-2 text-xs opacity-75 cursor-pointer">
              <summary className="font-medium">参数</summary>
              <pre className="mt-1 p-2 bg-white/50 rounded text-[10px] overflow-auto max-h-32">
                {JSON.stringify(args, null, 2)}
              </pre>
            </details>
          )}
          {status === "complete" && result && (
            <details className="mt-2 text-xs opacity-75 cursor-pointer">
              <summary className="font-medium">结果</summary>
              <pre className="mt-1 p-2 bg-white/50 rounded text-[10px] overflow-auto max-h-32">
                {typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
              </pre>
            </details>
          )}
        </div>
      );
    },
  });

  useEffect(() => {
    const currentVersion = renderVersionRef.current;

    const performRender = async () => {
      if (!debouncedCode.trim()) return;
      // 跳过重复渲染
      if (debouncedCode === state.diagram_code && state.svg_content) return;

      const type = currentTypeRef.current || "mermaid";

      try {
        const svg = await renderDiagram(type, debouncedCode);
        // 检查类型是否变化 或 渲染版本是否过期
        if (type !== currentTypeRef.current || renderVersionRef.current !== currentVersion) return;

        setState((prev) => {
          const base = prev || state;
          return {
            ...base,
            diagram_type: type,
            diagram_code: debouncedCode,
            svg_content: svg,
            error_message: null,
            last_modified: Date.now()/1000,
          };
        });
        lastSyncedCode.current = debouncedCode;
      } catch (e) {
        // 检查类型是否变化 或 渲染版本是否过期
        if (type !== currentTypeRef.current || renderVersionRef.current !== currentVersion) return;

        setState((prev) => {
          const base = prev || state;
          return {
            ...base,
            diagram_type: type,
            diagram_code: debouncedCode,
            error_message: e instanceof Error ? e.message : String(e),
            last_modified: Date.now()/1000,
          };
        });
        lastSyncedCode.current = debouncedCode;
      }
    };

    performRender();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedCode]);

  // 使用内部 API 访问 setMessages
  const { setMessages } = useCopilotChatInternal();

  // 清空对话消息（不影响 Agent 状态和图表代码）
  const handleClearChat = () => {
    // 使用 setMessages([]) 只清空消息历史
    // 不会触发 Agent 状态重置，保留图表代码
    setMessages([]);
  };

  const handleExport = async (format: 'svg' | 'png' | 'png-opaque' | 'jpeg' | 'pdf') => {
    const diagramType = state.diagram_type || "mermaid";
    const timestamp = Date.now();

    const downloadBlob = (blob: Blob, ext: string) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `diagram-${timestamp}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
    };

    try {
      if (format === 'svg') {
        const blob = new Blob([state.svg_content], { type: 'image/svg+xml' });
        downloadBlob(blob, 'svg');
      } else if (format === 'png') {
        const blob = await exportPng(diagramType, state.diagram_code);
        downloadBlob(blob, 'png');
      } else if (format === 'png-opaque') {
        const blob = await exportPngOpaque(diagramType, state.diagram_code);
        downloadBlob(blob, 'png');
      } else if (format === 'jpeg') {
        const blob = await exportJpeg(diagramType, state.diagram_code);
        downloadBlob(blob, 'jpg');
      } else if (format === 'pdf') {
        const blob = await exportPdf(diagramType, state.diagram_code);
        downloadBlob(blob, 'pdf');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "导出失败";
      toast.error(message);
    }
  };

  return (
    <ClearChatContext.Provider value={handleClearChat}>
      <div className="flex h-screen bg-white" style={{ "--copilot-kit-primary-color": themeColor } as React.CSSProperties}>
        {/* 左侧: 代码编辑器 (25%) */}
      <div className="w-1/4 border-r border-gray-200">
        <CodeEditor
          code={localCode}
          diagramType={state.diagram_type}
          onChange={setLocalCode}
          onTypeChange={async (type) => {
            const newCode = DEFAULT_TEMPLATES[type] || "";

            // 递增版本号，使旧的 debounce 渲染失效
            renderVersionRef.current++;
            const currentVersion = renderVersionRef.current;

            // 先更新类型 ref（同步，避免竞态）
            currentTypeRef.current = type;

            // 更新本地代码
            setLocalCode(newCode);
            lastSyncedCode.current = newCode;

            // 先清空预览，显示加载状态
            setState((prev) => {
              const base = prev || state;
              return {
                ...base,
                diagram_type: type,
                diagram_code: newCode,
                svg_content: "",
                error_message: null,
              };
            });

            // 立即渲染新类型的代码
            try {
              const svg = await renderDiagram(type, newCode);
              // 检查类型是否还匹配 和 版本是否过期
              if (currentTypeRef.current !== type || renderVersionRef.current !== currentVersion) {
                return;
              }

              setState((prev) => {
                const base = prev || state;
                return {
                  ...base,
                  diagram_type: type,
                  diagram_code: newCode,
                  svg_content: svg,
                  error_message: null,
                };
              });
            } catch (e) {
              // 检查类型是否还匹配 和 版本是否过期
              if (currentTypeRef.current !== type || renderVersionRef.current !== currentVersion) {
                return;
              }

              setState((prev) => {
                const base = prev || state;
                return {
                  ...base,
                  diagram_type: type,
                  diagram_code: newCode,
                  svg_content: "",
                  error_message: e instanceof Error ? e.message : String(e),
                };
              });
            }
          }}
          readOnly={state.is_loading}
          isLoading={state.is_loading}
        />
      </div>

      {/* 中间: SVG 预览 (自动扩展) */}
      <div className="flex-1 min-w-0">
        <SvgPreview
          svg={state.svg_content}
          diagramType={state.diagram_type}
          isLoading={state.is_loading}
          error={state.error_message}
          onExport={handleExport}
        />
      </div>

        {/* 右侧: Copilot 侧边栏 */}
        <CopilotSidebar
          defaultOpen={true}
          clickOutsideToClose={false}
          Header={CustomHeader}
          labels={{
            title: "Kroki Agent",
            initial: "我可以帮你生成各种图表！点击下面的案例快速开始，或直接描述你想要的图表。",
          }}
          suggestions={[
          {
            title: "登录流程图",
            message: "用 Mermaid 生成一个用户登录的流程图",
          },
          {
            title: "系统架构图",
            message: "用 D2 画一个 Web 应用的三层架构图，包含前端、后端、数据库",
          },
          {
            title: "数据库设计",
            message: "用 DBML 设计一个博客系统的数据库，包含用户、文章、评论表",
          },
          {
            title: "C4 架构",
            message: "用 C4 PlantUML 画一个电商系统的上下文图",
          },
          ]}
        />
      </div>
    </ClearChatContext.Provider>
  );
}
