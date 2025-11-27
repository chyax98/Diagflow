import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SessionHistory } from '../session-history';
import type { Session } from '@/lib/storage';

describe('SessionHistory', () => {
  const mockSessions: Session[] = [
    {
      id: '1',
      name: '会话1',
      diagram: {
        diagram_type: 'mermaid',
        diagram_code: 'graph TD\nA-->B',
        timestamp: Date.now(),
      },
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: '2',
      name: '会话2',
      diagram: {
        diagram_type: 'plantuml',
        diagram_code: '@startuml\nA -> B\n@enduml',
        timestamp: Date.now() - 1000,
      },
      messages: [],
      createdAt: Date.now() - 1000,
      updatedAt: Date.now() - 1000,
    },
  ];

  const defaultProps = {
    sessions: mockSessions,
    currentSessionId: '1',
    isOpen: true,
    onClose: vi.fn(),
    onSelect: vi.fn(),
    onNew: vi.fn(),
    onDelete: vi.fn(),
    onRename: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('渲染行为', () => {
    it('渲染会话列表', () => {
      render(<SessionHistory {...defaultProps} />);
      expect(screen.getByText('会话1')).toBeInTheDocument();
      expect(screen.getByText('会话2')).toBeInTheDocument();
    });

    it('当前会话高亮显示', () => {
      render(<SessionHistory {...defaultProps} />);
      const activeItem = screen.getByText('会话1').closest('div[role="button"]');
      expect(activeItem).toHaveClass('bg-primary/10');
    });

    it('空会话列表显示提示信息', () => {
      render(<SessionHistory {...defaultProps} sessions={[]} />);
      expect(screen.getByText('暂无历史对话')).toBeInTheDocument();
      expect(screen.getByText('开始新对话后会在这里显示')).toBeInTheDocument();
    });

    it('关闭按钮存在', () => {
      render(<SessionHistory {...defaultProps} />);
      const closeButton = screen.getByRole('button', { name: /关闭/i });
      expect(closeButton).toBeInTheDocument();
    });

    it('新建会话按钮存在', () => {
      render(<SessionHistory {...defaultProps} />);
      expect(screen.getByText('开始新对话')).toBeInTheDocument();
    });
  });

  describe('交互行为', () => {
    it('点击关闭按钮触发 onClose', () => {
      const onClose = vi.fn();
      render(<SessionHistory {...defaultProps} onClose={onClose} />);
      const closeButtons = screen.getAllByRole('button');
      const closeButton = closeButtons.find((btn) =>
        btn.querySelector('svg path[d*="M6 18L18 6"]')
      );
      fireEvent.click(closeButton!);
      expect(onClose).toHaveBeenCalled();
    });

    it('点击切换会话触发 onSelect', () => {
      const onSelect = vi.fn();
      render(<SessionHistory {...defaultProps} onSelect={onSelect} />);
      fireEvent.click(screen.getByText('会话2'));
      expect(onSelect).toHaveBeenCalledWith('2');
    });

    it('点击新建会话触发 onNew', () => {
      const onNew = vi.fn();
      render(<SessionHistory {...defaultProps} onNew={onNew} />);
      fireEvent.click(screen.getByText('开始新对话'));
      expect(onNew).toHaveBeenCalled();
    });

    it('点击删除按钮触发 onDelete', () => {
      const onDelete = vi.fn();
      render(<SessionHistory {...defaultProps} onDelete={onDelete} />);
      const deleteButtons = screen.getAllByTitle('删除');
      fireEvent.click(deleteButtons[0]);
      expect(onDelete).toHaveBeenCalledWith('1');
    });

    it('编辑会话名称', () => {
      const onRename = vi.fn();
      render(<SessionHistory {...defaultProps} onRename={onRename} />);

      // 点击编辑按钮
      const editButton = screen.getAllByTitle('重命名')[0];
      fireEvent.click(editButton);

      // 输入框应该出现
      const input = screen.getByDisplayValue('会话1');
      expect(input).toBeInTheDocument();

      // 修改名称
      fireEvent.change(input, { target: { value: '新名称' } });
      expect(input).toHaveValue('新名称');

      // 失焦保存
      fireEvent.blur(input);
      expect(onRename).toHaveBeenCalledWith('1', '新名称');
    });

    it('按 Enter 键保存重命名', () => {
      const onRename = vi.fn();
      render(<SessionHistory {...defaultProps} onRename={onRename} />);

      const editButton = screen.getAllByTitle('重命名')[0];
      fireEvent.click(editButton);

      const input = screen.getByDisplayValue('会话1');
      fireEvent.change(input, { target: { value: '新名称' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(onRename).toHaveBeenCalledWith('1', '新名称');
    });

    it('按 Escape 键取消重命名', () => {
      const onRename = vi.fn();
      render(<SessionHistory {...defaultProps} onRename={onRename} />);

      const editButton = screen.getAllByTitle('重命名')[0];
      fireEvent.click(editButton);

      const input = screen.getByDisplayValue('会话1');
      fireEvent.change(input, { target: { value: '新名称' } });
      fireEvent.keyDown(input, { key: 'Escape' });

      // 应该恢复原名称，不触发 onRename
      expect(onRename).not.toHaveBeenCalled();
      expect(screen.getByText('会话1')).toBeInTheDocument();
    });

    it('键盘 Enter 切换会话', () => {
      const onSelect = vi.fn();
      render(<SessionHistory {...defaultProps} onSelect={onSelect} />);

      const session2Item = screen.getByText('会话2').closest('div[role="button"]');
      fireEvent.keyDown(session2Item!, { key: 'Enter' });

      expect(onSelect).toHaveBeenCalledWith('2');
    });

    it('键盘 Space 切换会话', () => {
      const onSelect = vi.fn();
      render(<SessionHistory {...defaultProps} onSelect={onSelect} />);

      const session2Item = screen.getByText('会话2').closest('div[role="button"]');
      fireEvent.keyDown(session2Item!, { key: ' ' });

      expect(onSelect).toHaveBeenCalledWith('2');
    });
  });

  describe('状态管理', () => {
    it('编辑时阻止点击切换会话', () => {
      const onSelect = vi.fn();
      render(<SessionHistory {...defaultProps} onSelect={onSelect} />);

      // 开始编辑
      const editButton = screen.getAllByTitle('重命名')[0];
      fireEvent.click(editButton);

      // 点击会话项
      const input = screen.getByDisplayValue('会话1');
      const container = input.closest('div[class*="flex items-center"]');
      if (container) {
        fireEvent.click(container);
      }

      // 不应该触发切换
      expect(onSelect).not.toHaveBeenCalled();
    });

    it('编辑时隐藏操作按钮', () => {
      render(<SessionHistory {...defaultProps} />);

      const editButton = screen.getAllByTitle('重命名')[0];
      fireEvent.click(editButton);

      // 操作按钮应该消失
      const remainingEditButtons = screen.queryAllByTitle('重命名');
      expect(remainingEditButtons.length).toBe(1); // 只剩下第二个会话的按钮
    });
  });

  describe('时间格式化', () => {
    it('显示相对时间', () => {
      const now = Date.now();
      const sessions: Session[] = [
        {
          ...mockSessions[0],
          updatedAt: now - 1000, // 1 秒前
        },
      ];

      render(<SessionHistory {...defaultProps} sessions={sessions} />);

      // 应该显示时间文本（具体格式由实现决定）
      const timeElements = screen.getAllByText(/刚刚|秒前|分钟前|小时前|天前|月前/);
      expect(timeElements.length).toBeGreaterThan(0);
    });
  });
});
