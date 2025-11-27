/**
 * 撤销/重做 Hook 测试
 */
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUndo, type UseUndoOptions } from '../use-undo';
import type { DiagramSnapshot } from '../storage';

function createSnapshot(
  code: string,
  type = 'mermaid',
  timestamp = Date.now()
): DiagramSnapshot {
  return {
    diagram_type: type,
    diagram_code: code,
    timestamp,
  };
}

function setup(options?: Partial<UseUndoOptions>) {
  const initialState = createSnapshot('initial code');
  return renderHook(() =>
    useUndo({
      initialState,
      ...options,
    })
  );
}

describe('useUndo', () => {
  describe('初始状态', () => {
    it('返回初始状态', () => {
      const { result } = setup();

      expect(result.current.state.diagram_code).toBe('initial code');
      expect(result.current.canUndo).toBe(false);
      expect(result.current.canRedo).toBe(false);
      expect(result.current.undoCount).toBe(0);
      expect(result.current.redoCount).toBe(0);
    });
  });

  describe('set', () => {
    it('更新当前状态', () => {
      const { result } = setup();

      act(() => {
        result.current.set({ diagram_code: 'new code' });
      });

      expect(result.current.state.diagram_code).toBe('new code');
    });

    it('保留未更新的字段', () => {
      const { result } = setup();

      act(() => {
        result.current.set({ diagram_code: 'new code' });
      });

      expect(result.current.state.diagram_type).toBe('mermaid');
    });

    it('记录历史到撤销栈', () => {
      const { result } = setup();

      act(() => {
        result.current.set({ diagram_code: 'new code' });
      });

      expect(result.current.canUndo).toBe(true);
      expect(result.current.undoCount).toBe(1);
    });

    it('清空重做栈', () => {
      const { result } = setup();

      // 创建历史
      act(() => {
        result.current.set({ diagram_code: 'code 1' });
        result.current.set({ diagram_code: 'code 2' });
      });

      // 撤销一次
      act(() => {
        result.current.undo();
      });

      expect(result.current.canRedo).toBe(true);

      // 新操作
      act(() => {
        result.current.set({ diagram_code: 'code 3' });
      });

      expect(result.current.canRedo).toBe(false);
    });

    it('相同内容不记录历史', () => {
      const { result } = setup();

      act(() => {
        result.current.set({ diagram_code: 'initial code' }); // 与初始相同
      });

      expect(result.current.canUndo).toBe(false);
    });
  });

  describe('undo', () => {
    it('恢复到上一个状态', () => {
      const { result } = setup();

      act(() => {
        result.current.set({ diagram_code: 'code 1' });
        result.current.set({ diagram_code: 'code 2' });
      });

      act(() => {
        result.current.undo();
      });

      expect(result.current.state.diagram_code).toBe('code 1');
    });

    it('多次撤销', () => {
      const { result } = setup();

      act(() => {
        result.current.set({ diagram_code: 'code 1' });
        result.current.set({ diagram_code: 'code 2' });
        result.current.set({ diagram_code: 'code 3' });
      });

      act(() => {
        result.current.undo();
        result.current.undo();
        result.current.undo();
      });

      expect(result.current.state.diagram_code).toBe('initial code');
      expect(result.current.canUndo).toBe(false);
    });

    it('撤销后可以重做', () => {
      const { result } = setup();

      act(() => {
        result.current.set({ diagram_code: 'code 1' });
      });

      act(() => {
        result.current.undo();
      });

      expect(result.current.canRedo).toBe(true);
      expect(result.current.redoCount).toBe(1);
    });

    it('没有历史时不做任何操作', () => {
      const { result } = setup();

      const stateBefore = result.current.state;

      act(() => {
        result.current.undo();
      });

      expect(result.current.state).toBe(stateBefore);
    });
  });

  describe('redo', () => {
    it('重做撤销的操作', () => {
      const { result } = setup();

      act(() => {
        result.current.set({ diagram_code: 'code 1' });
      });

      act(() => {
        result.current.undo();
      });

      act(() => {
        result.current.redo();
      });

      expect(result.current.state.diagram_code).toBe('code 1');
    });

    it('多次重做', () => {
      const { result } = setup();

      act(() => {
        result.current.set({ diagram_code: 'code 1' });
        result.current.set({ diagram_code: 'code 2' });
      });

      act(() => {
        result.current.undo();
        result.current.undo();
      });

      act(() => {
        result.current.redo();
        result.current.redo();
      });

      expect(result.current.state.diagram_code).toBe('code 2');
      expect(result.current.canRedo).toBe(false);
    });

    it('没有重做历史时不做任何操作', () => {
      const { result } = setup();

      const stateBefore = result.current.state;

      act(() => {
        result.current.redo();
      });

      expect(result.current.state).toBe(stateBefore);
    });
  });

  describe('reset', () => {
    it('重置到新状态并清空历史', () => {
      const { result } = setup();

      act(() => {
        result.current.set({ diagram_code: 'code 1' });
        result.current.set({ diagram_code: 'code 2' });
      });

      const newState = createSnapshot('reset code', 'd2');

      act(() => {
        result.current.reset(newState);
      });

      expect(result.current.state.diagram_code).toBe('reset code');
      expect(result.current.state.diagram_type).toBe('d2');
      expect(result.current.canUndo).toBe(false);
      expect(result.current.canRedo).toBe(false);
    });
  });

  describe('clearHistory', () => {
    it('清空历史但保留当前状态', () => {
      const { result } = setup();

      act(() => {
        result.current.set({ diagram_code: 'code 1' });
        result.current.set({ diagram_code: 'code 2' });
      });

      act(() => {
        result.current.undo();
      });

      act(() => {
        result.current.clearHistory();
      });

      expect(result.current.state.diagram_code).toBe('code 1'); // 当前状态保留
      expect(result.current.canUndo).toBe(false);
      expect(result.current.canRedo).toBe(false);
    });
  });

  describe('历史限制', () => {
    it('撤销栈不超过最大限制', () => {
      const { result } = setup();

      // 创建超过限制的历史（假设限制是 50）
      act(() => {
        for (let i = 0; i < 60; i++) {
          result.current.set({ diagram_code: `code ${i}` });
        }
      });

      expect(result.current.undoCount).toBeLessThanOrEqual(50);
    });
  });
});
