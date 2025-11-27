import React, { useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { EditorView } from "@codemirror/view";
import { toast } from "sonner";
import { handleError } from "@/lib/error-handler";

interface CodeEditorProps {
  code: string;
  diagramType: string;
  onChange: (code: string) => void;
  readOnly?: boolean;
  isLoading?: boolean;
}

export function CodeEditor({
  code,
  diagramType: _diagramType,
  onChange,
  readOnly = false,
  isLoading: _isLoading = false,
}: CodeEditorProps) {
  const [showLineNumbers, setShowLineNumbers] = useState(false);
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
      handleError(error, { level: "warning", userMessage: "复制失败" });
    }
  };

  const lineCount = code.split("\n").length;

  return (
    <div className="panel flex flex-col h-full overflow-hidden">
      {/* 面板头部 */}
      <div className="panel-header flex items-center justify-between rounded-t-xl">
        <div className="flex items-center">
          <span className="text-[13px] font-semibold text-foreground">代码</span>
          <span className="text-[11px] text-muted-foreground ml-2">{lineCount} 行</span>
        </div>
        <div className="flex items-center gap-0.5">
          {/* 行号切换 */}
          <button
            onClick={() => setShowLineNumbers(!showLineNumbers)}
            className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors ${
              showLineNumbers
                ? "text-primary bg-primary/10"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            }`}
            title="切换行号"
          >
            <svg
              className="w-[15px] h-[15px]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 6h16M4 10h16M4 14h16M4 18h16"
              />
            </svg>
          </button>

          {/* 复制代码 */}
          <button
            onClick={handleCopyCode}
            disabled={!code}
            className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="复制代码"
          >
            {copySuccess ? (
              <svg
                className="w-[15px] h-[15px] text-success"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            ) : (
              <svg
                className="w-[15px] h-[15px]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* CodeMirror 编辑器 */}
      <div className="flex-1 overflow-hidden bg-white/30 rounded-b-xl">
        <CodeMirror
          value={code}
          height="100%"
          theme="light"
          extensions={[...getLanguageExtension(), EditorView.lineWrapping]}
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
