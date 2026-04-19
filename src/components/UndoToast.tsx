"use client";

import { useEffect } from "react";
import type { Task } from "./TaskCard";

interface UndoToastProps {
  task: Task | null;
  visible: boolean;
  onDismiss: () => void;
  onUndo: (task: Task) => void;
}

export function UndoToast({ task, visible, onDismiss, onUndo }: UndoToastProps) {
  useEffect(() => {
    if (!visible) {
      return;
    }

    const timeoutId = window.setTimeout(onDismiss, 5000);
    return () => window.clearTimeout(timeoutId);
  }, [onDismiss, visible]);

  if (!task) {
    return null;
  }

  return (
    <div
      className={`fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-4 rounded-xl border border-white/10 bg-[#1A1A18] px-5 py-3 text-sm shadow-2xl transition-all duration-300 ${
        visible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
      }`}
    >
      <span className="text-white/80">Task deleted</span>
      <button
        type="button"
        onClick={() => onUndo(task)}
        className="font-medium text-blue-400 hover:text-blue-300"
      >
        Undo
      </button>
    </div>
  );
}
