"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface TypeChangeDialogProps {
  pendingType: string | null;
  onConfirm: () => void;
  onNewSession: () => void;
  onCancel: () => void;
}

export function TypeChangeDialog({
  pendingType,
  onConfirm,
  onNewSession,
  onCancel,
}: TypeChangeDialogProps) {
  if (!pendingType) return null;

  return (
    <AlertDialog open={!!pendingType} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>切换图表类型</AlertDialogTitle>
          <AlertDialogDescription>
            当前代码已修改。切换类型会用新模板替换当前代码。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction
            onClick={onNewSession}
            className="bg-secondary text-secondary-foreground hover:bg-secondary/80"
          >
            新建会话
          </AlertDialogAction>
          <AlertDialogAction onClick={onConfirm}>
            在当前会话切换
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
