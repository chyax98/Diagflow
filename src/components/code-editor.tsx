import React, { useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { EditorView } from "@codemirror/view";
import { toast } from "sonner";

interface CodeEditorProps {
  code: string;
  diagramType: string;
  onChange: (code: string) => void;
  onTypeChange?: (type: string) => void;
  readOnly?: boolean;
  isLoading?: boolean;
}

const DIAGRAM_TYPES = [
  { value: "mermaid", label: "Mermaid" },
  { value: "plantuml", label: "PlantUML" },
  { value: "d2", label: "D2" },
  { value: "dbml", label: "DBML" },
  { value: "graphviz", label: "Graphviz" },
  { value: "c4plantuml", label: "C4-PlantUML" },
  { value: "nomnoml", label: "Nomnoml" },
  { value: "erd", label: "ERD" },
  { value: "ditaa", label: "Ditaa" },
  { value: "svgbob", label: "Svgbob" },
  { value: "wavedrom", label: "WaveDrom" },
  { value: "blockdiag", label: "BlockDiag" },
  { value: "seqdiag", label: "SeqDiag" },
  { value: "nwdiag", label: "NwDiag" },
];

export function CodeEditor({
  code,
  diagramType,
  onChange,
  onTypeChange,
  readOnly = false,
  isLoading = false,
}: CodeEditorProps) {
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [copySuccess, setCopySuccess] = useState(false);

  const getLanguageExtension = () => {
    return [javascript()];
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
      toast.success("代码已复制到剪贴板");
    } catch (error) {
      const message = error instanceof Error ? error.message : "复制失败";
      toast.error(message);
    }
  };

  const currentType = DIAGRAM_TYPES.find((t) => t.value === diagramType) || DIAGRAM_TYPES[0];

  const toolbarButton = "p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors";
  const toolbarButtonActive = "p-1.5 text-blue-600 bg-blue-50 rounded";

  return (
    <div className="flex flex-col h-full bg-white">
      {/* 工具栏 */}
      <div className="flex items-center justify-between px-3 border-b bg-white" style={{ height: "56px" }}>
        <div className="flex items-center gap-3">
          {/* Logo */}
          <div className="flex items-center gap-2 pr-3 border-r border-gray-200">
            <img src="/logo.svg" alt="DiagFlow" className="w-6 h-6" />
            <div className="flex items-baseline gap-1.5">
              <span className="text-base font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
                DiagFlow
              </span>
              <span className="text-[10px] text-gray-400">AI 图表</span>
            </div>
          </div>

          {/* 图表类型选择器 */}
          {onTypeChange ? (
            <select
              value={diagramType}
              onChange={(e) => onTypeChange(e.target.value)}
              disabled={readOnly}
              className="px-2 py-1 text-sm font-medium text-gray-700 bg-transparent border-none cursor-pointer hover:text-gray-900 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {DIAGRAM_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          ) : (
            <span className="text-sm font-medium text-gray-700">
              {currentType.label}
            </span>
          )}

          {isLoading && (
            <span className="text-xs text-blue-600 flex items-center">
              <svg className="w-3 h-3 animate-spin mr-1" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              同步中
            </span>
          )}
        </div>

        {/* 工具按钮 */}
        <div className="flex items-center gap-0.5">
          {/* 行号切换 */}
          <button
            onClick={() => setShowLineNumbers(!showLineNumbers)}
            className={showLineNumbers ? toolbarButtonActive : toolbarButton}
            title="切换行号"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
          </button>

          {/* 复制代码 */}
          <button
            onClick={handleCopyCode}
            disabled={!code}
            className={`${toolbarButton} disabled:opacity-30 disabled:cursor-not-allowed`}
            title="复制代码"
          >
            {copySuccess ? (
              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </button>

          {/* 行数 */}
          <span className="text-xs text-gray-400 ml-2 tabular-nums">
            {code.split("\n").length}
          </span>
        </div>
      </div>

      {/* CodeMirror 编辑器 */}
      <div className="flex-1 overflow-hidden">
        <CodeMirror
          value={code}
          height="100%"
          theme="light"
          extensions={[
            ...getLanguageExtension(),
            EditorView.lineWrapping,
          ]}
          onChange={(value) => {
            if (!readOnly) {
              onChange(value);
            }
          }}
          editable={!readOnly}
          basicSetup={{
            lineNumbers: showLineNumbers,
            highlightActiveLineGutter: true,
            highlightSpecialChars: true,
            foldGutter: true,
            drawSelection: true,
            dropCursor: true,
            allowMultipleSelections: true,
            indentOnInput: true,
            bracketMatching: true,
            closeBrackets: true,
            autocompletion: true,
            rectangularSelection: true,
            crosshairCursor: true,
            highlightActiveLine: true,
            highlightSelectionMatches: true,
            closeBracketsKeymap: true,
            searchKeymap: true,
            foldKeymap: true,
            completionKeymap: true,
            lintKeymap: true,
          }}
          className={`h-full ${readOnly ? "opacity-60" : ""}`}
        />
      </div>
    </div>
  );
}
