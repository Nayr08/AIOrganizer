"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { format } from "date-fns";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  PencilLine,
  PlayCircle,
  RefreshCcw,
  SkipForward,
  Trash2,
} from "lucide-react";
import { RecurringBadge } from "./RecurringBadge";
import { formatDateWithMonthName } from "@/src/lib/datetime";
import {
  UpdateTaskSchema,
  type UpdateTaskInput,
} from "@/src/lib/schemas/task";

export interface Task {
  id: string;
  title: string;
  date: string;
  time?: string;
  startTime?: string;
  endTime?: string;
  description?: string;
  category?: string;
  priority: "low" | "medium" | "high";
  status: "pending" | "in_progress" | "completed" | "missed" | "skipped";
  isRecurring?: boolean;
  frequency?: string | null;
  recurringDay?: string | null;
}

interface TaskCardProps {
  task: Task;
  onStatusChange?: (id: string, nextStatus: Task["status"]) => void;
  onDelete?: (id: string) => void;
  editableNotes?: boolean;
  onDescriptionChange?: (id: string, value: string) => void;
  showStatusActions?: boolean;
  overdue?: boolean;
  onReschedule?: (task: Task) => void;
  onTaskUpdated?: () => void;
  onTaskDeleted?: (id: string) => void;
  showUndoToast?: (task: Task) => void;
}

function getPriorityAccent(task: Task, overdue?: boolean) {
  if (task.status === "completed") {
    return "rgba(29,158,117,0.5)";
  }

  if (overdue || task.status === "missed") {
    return task.priority === "high" ? "#E24B4A" : "#EF9F27";
  }

  if (task.priority === "high") {
    return "#E24B4A";
  }

  if (task.priority === "medium") {
    return "#EF9F27";
  }

  return "rgba(255,255,255,0.08)";
}

function getCategoryLabel(category?: string) {
  return category || "General";
}

function getPriorityTag(priority: Task["priority"]) {
  if (priority === "high") {
    return {
      label: "High",
      className: "bg-[rgba(226,75,74,0.12)] text-[#E24B4A]",
    };
  }

  if (priority === "medium") {
    return {
      label: "Medium",
      className: "bg-[rgba(239,159,39,0.12)] text-[#BA7517]",
    };
  }

  return {
    label: "Low",
    className: "bg-[rgba(255,255,255,0.07)] text-[var(--text-secondary)]",
  };
}

function getStatusTag(status: Task["status"]) {
  if (status === "in_progress") {
    return {
      label: "Active",
      className: "bg-[rgba(79,142,247,0.12)] text-[var(--accent)]",
    };
  }

  if (status === "completed") {
    return {
      label: "Completed",
      className: "bg-[rgba(29,158,117,0.12)] text-[#1D9E75]",
    };
  }

  if (status === "missed") {
    return {
      label: "Missed",
      className: "bg-[rgba(226,75,74,0.12)] text-[#E24B4A]",
    };
  }

  if (status === "skipped") {
    return {
      label: "Skipped",
      className:
        "border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.06)] text-[var(--text-secondary)]",
    };
  }

  return {
    label: "Pending",
    className:
      "border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.06)] text-[var(--text-muted)]",
  };
}

function Tag({
  children,
  className,
}: {
  children: ReactNode;
  className: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-[4px] px-2 py-[3px] text-[11px] font-medium tracking-[0.02em] ${className}`}
    >
      {children}
    </span>
  );
}

export function TaskCard({
  task,
  onStatusChange,
  onDelete,
  editableNotes = false,
  onDescriptionChange,
  showStatusActions = true,
  overdue = false,
  onReschedule,
  onTaskUpdated,
  onTaskDeleted,
  showUndoToast,
}: TaskCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const editableTask = Boolean(onTaskUpdated);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdateTaskInput>({
    resolver: zodResolver(UpdateTaskSchema),
    values: {
      title: task.title,
      date: format(new Date(`${task.date}T00:00:00`), "yyyy-MM-dd"),
      startTime: task.startTime ?? "",
      endTime: task.endTime ?? "",
      priority: task.priority,
      category: task.category ?? "",
      description: task.description ?? "",
      isRecurring: task.isRecurring ?? false,
      frequency:
        task.frequency === "daily" ||
        task.frequency === "weekly" ||
        task.frequency === "monthly"
          ? task.frequency
          : undefined,
      recurringDay: task.recurringDay ?? "",
    },
  });

  const timeDisplay =
    task.startTime && task.endTime
      ? `${task.startTime} - ${task.endTime}`
      : task.startTime || task.endTime || task.time;

  const priorityTag = getPriorityTag(task.priority);
  const statusTag = getStatusTag(task.status);
  const completed = task.status === "completed";
  const missed = task.status === "missed";
  const skipped = task.status === "skipped";
  const categoryLabel = getCategoryLabel(task.category);
  const cardTone = overdue || missed ? "bg-[rgba(226,75,74,0.04)]" : "bg-[var(--bg-surface)]";

  const onSave = async (data: UpdateTaskInput) => {
    const response = await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (response.ok) {
      setIsEditing(false);
      setIsSuccess(true);
      window.setTimeout(() => setIsSuccess(false), 1000);
      onTaskUpdated?.();
    }
  };

  const handleDelete = async () => {
    if (!onTaskDeleted) {
      onDelete?.(task.id);
      return;
    }

    setIsDeleting(true);
    const response = await fetch(`/api/tasks/${task.id}`, {
      method: "DELETE",
    });

    if (response.ok) {
      onTaskDeleted(task.id);
      showUndoToast?.(task);
    }

    setIsDeleting(false);
  };

  return (
    <div
      className={`group relative mb-2 overflow-hidden rounded-[14px] border ${isSuccess ? "border-green-500/40" : "border-[rgba(255,255,255,0.07)]"} ${cardTone} px-6 py-5 transition-all duration-200 hover:-translate-y-px hover:border-[rgba(255,255,255,0.13)] ${
        completed ? "opacity-50" : ""
      } ${skipped ? "opacity-60" : ""}`}
    >
      {editableTask && !isEditing && (
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 opacity-100 transition-all duration-150 hover:border-blue-500/20 hover:bg-blue-500/10 sm:opacity-0 sm:group-hover:opacity-100"
        >
          <PencilLine
            size={13}
            className="text-white/50 group-hover:text-blue-400"
          />
        </button>
      )}

      {!isEditing && (
        <button
          type="button"
          onClick={() => setShowConfirm(true)}
          className={`absolute top-3 flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 opacity-100 transition-all duration-150 hover:border-red-500/20 hover:bg-red-500/10 sm:opacity-0 sm:group-hover:opacity-100 ${
            editableTask ? "right-12" : "right-3"
          }`}
        >
          <Trash2 size={13} className="text-white/50 hover:text-red-400" />
        </button>
      )}

      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-[3px]"
        style={{ background: getPriorityAccent(task, overdue) }}
      />

      <div className="flex gap-4">
        <button
          type="button"
          onClick={() =>
            onStatusChange?.(
              task.id,
              task.status === "completed" ? "pending" : "completed"
            )
          }
          className={`mt-1 flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-full border-[1.5px] transition-all duration-150 hover:cursor-pointer ${
            completed
              ? "border-[var(--accent)] bg-[var(--accent)]"
              : "border-[rgba(255,255,255,0.18)] bg-transparent hover:border-[var(--accent)] hover:bg-[rgba(79,142,247,0.08)]"
          }`}
        >
          {completed && (
            <span className="animate-[checkbox-pop_0.2s_ease]">
              <Check className="h-3 w-3 text-white" />
            </span>
          )}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <h3
                className={`text-lg font-medium ${
                  completed
                    ? "text-[var(--text-muted)] line-through"
                    : "text-[var(--text-primary)]"
                }`}
              >
                {task.title}
              </h3>
              <RecurringBadge
                isRecurring={task.isRecurring}
                frequency={task.frequency}
                recurringDay={task.recurringDay}
              />

              {isEditing && (
                <form
                  onSubmit={handleSubmit(onSave)}
                  className="mt-3 flex flex-col gap-3"
                >
                  <input
                    {...register("title")}
                    className="w-full rounded-lg border border-blue-400/30 bg-white/5 px-3 py-2 text-sm font-medium text-white focus:outline-none focus:ring-1 focus:ring-blue-400/20"
                  />
                  {errors.title && (
                    <p className="text-xs text-red-300">{errors.title.message}</p>
                  )}
                  <div className="flex gap-2">
                    <input
                      type="date"
                      {...register("date")}
                      className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 focus:border-blue-400/30 focus:outline-none"
                    />
                    <input
                      type="time"
                      {...register("startTime")}
                      className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 focus:border-blue-400/30 focus:outline-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <select
                      {...register("priority")}
                      className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 focus:border-blue-400/30 focus:outline-none"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                    <input
                      {...register("category")}
                      placeholder="Category"
                      className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 focus:border-blue-400/30 focus:outline-none"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="rounded-lg border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-white/50 transition-all hover:bg-white/10"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="rounded-lg bg-blue-500 px-4 py-1.5 text-sm font-medium text-[#0A1628] transition-all hover:brightness-110"
                    >
                      Save
                    </button>
                  </div>
                </form>
              )}

              {!isEditing && <div className="mt-3 flex flex-wrap gap-2">
                <Tag className="bg-[rgba(79,142,247,0.10)] text-[var(--accent)]">
                  {categoryLabel}
                </Tag>
                <Tag className={priorityTag.className}>{priorityTag.label}</Tag>
                {showStatusActions && (
                  <Tag className={statusTag.className}>{statusTag.label}</Tag>
                )}
              </div>}

              {!isEditing && <div className="mt-4 space-y-2">
                <p className="flex items-center gap-2 text-base font-medium text-[var(--text-primary)] sm:text-lg">
                  <CalendarDays className="h-4 w-4 text-[var(--text-secondary)]" />
                  <span>{formatDateWithMonthName(task.date)}</span>
                </p>
                {timeDisplay && (
                  <p className="flex items-center gap-2 text-lg font-medium text-[var(--text-primary)] sm:text-xl">
                    <Clock3 className="h-4 w-4 text-[var(--text-secondary)]" />
                    <span>{timeDisplay}</span>
                  </p>
                )}
              </div>}
            </div>

            {!isEditing && <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap lg:justify-end">
              {overdue && !completed && !missed && !skipped && (
                <>
                  <button
                    type="button"
                    onClick={() => onStatusChange?.(task.id, "completed")}
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-[7px] border border-[rgba(29,158,117,0.22)] bg-[rgba(29,158,117,0.10)] px-3 py-[5px] text-[12px] font-medium text-[#1D9E75] transition-all duration-150 hover:bg-[rgba(29,158,117,0.18)] sm:w-auto"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Done anyway
                  </button>
                  <button
                    type="button"
                    onClick={() => onReschedule?.(task)}
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-[7px] border border-[rgba(79,142,247,0.22)] bg-[rgba(79,142,247,0.10)] px-3 py-[5px] text-[12px] font-medium text-[var(--accent)] transition-all duration-150 hover:bg-[rgba(79,142,247,0.20)] sm:w-auto"
                  >
                    <RefreshCcw className="h-3.5 w-3.5" />
                    Reschedule
                  </button>
                  <button
                    type="button"
                    onClick={() => onStatusChange?.(task.id, "skipped")}
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-[7px] border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.06)] px-3 py-[5px] text-[12px] font-medium text-[var(--text-secondary)] transition-all duration-150 hover:bg-[rgba(255,255,255,0.10)] sm:w-auto"
                  >
                    <SkipForward className="h-3.5 w-3.5" />
                    Skip
                  </button>
                </>
              )}

              {showStatusActions &&
                task.status !== "in_progress" &&
                task.status !== "completed" &&
                task.status !== "missed" &&
                task.status !== "skipped" &&
                !overdue && (
                  <button
                    type="button"
                    onClick={() => onStatusChange?.(task.id, "in_progress")}
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-[7px] border border-[rgba(79,142,247,0.22)] bg-[rgba(79,142,247,0.10)] px-3 py-[5px] text-[12px] font-medium text-[var(--accent)] transition-all duration-150 hover:bg-[rgba(79,142,247,0.20)] sm:w-auto"
                  >
                    <PlayCircle className="h-3.5 w-3.5" />
                    I&apos;m In
                  </button>
                )}

              {showStatusActions && task.status === "in_progress" && !overdue && (
                <button
                  type="button"
                  onClick={() => onStatusChange?.(task.id, "completed")}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-[7px] border border-[rgba(29,158,117,0.22)] bg-[rgba(29,158,117,0.10)] px-3 py-[5px] text-[12px] font-medium text-[#1D9E75] transition-all duration-150 hover:bg-[rgba(29,158,117,0.18)] sm:w-auto"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Mark Done
                </button>
              )}

              {completed && showStatusActions && (
                <span className="inline-flex items-center gap-1 text-[12px] text-[#1D9E75]">
                  <Check className="h-3.5 w-3.5" />
                  Done
                </span>
              )}

            </div>}
          </div>

          {showConfirm && (
            <div className="mt-3 flex items-center gap-3 border-t border-white/7 pt-3 text-sm">
              <span className="flex-1 text-white/50">Delete this task?</span>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-1 text-xs text-red-400 transition-all hover:bg-red-500/20 disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Yes, delete"}
              </button>
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="rounded-md border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/40 transition-all"
              >
                Cancel
              </button>
            </div>
          )}

          {!isEditing && editableNotes ? (
            <div className="mt-5 grid gap-3 lg:grid-cols-[auto_1fr] lg:items-start">
              <div className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <PencilLine className="h-4 w-4 text-[var(--accent)]" />
                AI notes
              </div>
              <textarea
                value={task.description ?? ""}
                onChange={(event) =>
                  onDescriptionChange?.(task.id, event.target.value)
                }
                placeholder="Add or refine notes for this task."
                className="min-h-28 w-full rounded-[12px] border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3 text-sm leading-6 text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] transition-colors duration-200 focus:border-[rgba(79,142,247,0.30)] focus:outline-none"
              />
            </div>
          ) : !isEditing && task.description ? (
            <p className="mt-4 text-sm leading-relaxed text-[var(--text-secondary)]">
              {task.description}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
