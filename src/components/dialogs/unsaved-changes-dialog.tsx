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

type PendingAction =
  | { kind: "typeChange"; type: string }
  | { kind: "newSession" }
  | { kind: "loadSession"; id: string }
  | null;

interface UnsavedChangesDialogProps {
  pendingAction: PendingAction;
  onProceed: (save: boolean) => void;
  onCancel: () => void;
}

export function UnsavedChangesDialog({
  pendingAction,
  onProceed,
  onCancel,
}: UnsavedChangesDialogProps) {
  if (!pendingAction) return null;

  return (
    <AlertDialog open={!!pendingAction} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>未保存的更改</AlertDialogTitle>
          <AlertDialogDescription>检测到未保存的更改。是否保存后继续操作？</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction
            className="bg-secondary text-secondary-foreground hover:bg-secondary/80"
            onClick={() => onProceed(false)}
          >
            不保存继续
          </AlertDialogAction>
          <AlertDialogAction onClick={() => onProceed(true)}>保存后继续</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
