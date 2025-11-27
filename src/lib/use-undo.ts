/**
 * 撤销/重做 Hook
 * 使用 useReducer 管理撤销栈
 */
import { useReducer, useCallback, useMemo } from "react";
import { STORAGE_CONFIG } from "./constants";
import type { DiagramSnapshot } from "./storage";

// ============================================================================
// 类型定义
// ============================================================================

export interface UndoState {
  past: DiagramSnapshot[];
  present: DiagramSnapshot;
  future: DiagramSnapshot[];
}

type UndoAction =
  | { type: "SET"; payload: Partial<DiagramSnapshot> }
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "RESET"; payload: DiagramSnapshot }
  | { type: "CLEAR_HISTORY" };

// ============================================================================
// Reducer
// ============================================================================

function undoReducer(state: UndoState, action: UndoAction): UndoState {
  switch (action.type) {
    case "SET": {
      const newPresent: DiagramSnapshot = {
        ...state.present,
        ...action.payload,
        timestamp: Date.now(),
      };

      // 如果内容没有实际变化，不记录历史
      if (
        newPresent.diagram_code === state.present.diagram_code &&
        newPresent.diagram_type === state.present.diagram_type
      ) {
        return state;
      }

      return {
        past: [...state.past, state.present].slice(-STORAGE_CONFIG.maxUndoSteps),
        present: newPresent,
        future: [], // 新操作清空重做栈
      };
    }

    case "UNDO": {
      if (state.past.length === 0) return state;

      const previous = state.past[state.past.length - 1];
      const newPast = state.past.slice(0, -1);

      return {
        past: newPast,
        present: previous,
        future: [state.present, ...state.future],
      };
    }

    case "REDO": {
      if (state.future.length === 0) return state;

      const next = state.future[0];
      const newFuture = state.future.slice(1);

      return {
        past: [...state.past, state.present],
        present: next,
        future: newFuture,
      };
    }

    case "RESET": {
      return {
        past: [],
        present: action.payload,
        future: [],
      };
    }

    case "CLEAR_HISTORY": {
      return {
        past: [],
        present: state.present,
        future: [],
      };
    }

    default:
      return state;
  }
}

// ============================================================================
// Hook
// ============================================================================

export interface UseUndoOptions {
  initialState: DiagramSnapshot;
}

export interface UseUndoReturn {
  // 当前状态
  state: DiagramSnapshot;
  // 是否可以撤销/重做
  canUndo: boolean;
  canRedo: boolean;
  // 撤销/重做步数
  undoCount: number;
  redoCount: number;
  // 操作方法
  set: (payload: Partial<DiagramSnapshot>) => void;
  undo: () => void;
  redo: () => void;
  reset: (newState: DiagramSnapshot) => void;
  clearHistory: () => void;
  // 完整状态（用于调试或高级用例）
  fullState: UndoState;
}

export function useUndo({ initialState }: UseUndoOptions): UseUndoReturn {
  const [undoState, dispatch] = useReducer(undoReducer, {
    past: [],
    present: initialState,
    future: [],
  });

  const set = useCallback((payload: Partial<DiagramSnapshot>) => {
    dispatch({ type: "SET", payload });
  }, []);

  const undo = useCallback(() => {
    dispatch({ type: "UNDO" });
  }, []);

  const redo = useCallback(() => {
    dispatch({ type: "REDO" });
  }, []);

  const reset = useCallback((newState: DiagramSnapshot) => {
    dispatch({ type: "RESET", payload: newState });
  }, []);

  const clearHistory = useCallback(() => {
    dispatch({ type: "CLEAR_HISTORY" });
  }, []);

  return useMemo(
    () => ({
      state: undoState.present,
      canUndo: undoState.past.length > 0,
      canRedo: undoState.future.length > 0,
      undoCount: undoState.past.length,
      redoCount: undoState.future.length,
      set,
      undo,
      redo,
      reset,
      clearHistory,
      fullState: undoState,
    }),
    [undoState, set, undo, redo, reset, clearHistory]
  );
}
