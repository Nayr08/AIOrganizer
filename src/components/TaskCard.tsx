"use client";

import { Badge } from "./Badge";
import { Card } from "./Card";
import {
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock3,
  PencilLine,
  PlayCircle,
  Trash2,
} from "lucide-react";
import { formatDateWithMonthName } from "@/src/lib/datetime";

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
  status: "pending" | "in_progress" | "completed";
}

interface TaskCardProps {
  task: Task;
  onStatusChange?: (id: string, nextStatus: Task["status"]) => void;
  onDelete?: (id: string) => void;
  editableNotes?: boolean;
  onDescriptionChange?: (id: string, value: string) => void;
  showStatusActions?: boolean;
}

export function TaskCard({
  task,
  onStatusChange,
  onDelete,
  editableNotes = false,
  onDescriptionChange,
  showStatusActions = true,
}: TaskCardProps) {
  const priorityVariant = {
    high: "error",
    medium: "warning",
    low: "info",
  } as const;

  const priorityLabel = {
    high: "High",
    medium: "Medium",
    low: "Low",
  };

  const statusVariant = {
    pending: "default",
    in_progress: "info",
    completed: "success",
  } as const;

  const statusLabel = {
    pending: "Pending",
    in_progress: "In Progress",
    completed: "Completed",
  };

  const timeDisplay =
    task.startTime && task.endTime
      ? `${task.startTime} - ${task.endTime}`
      : task.startTime || task.endTime || task.time;

  return (
    <Card hover className="group relative p-5">
      <div className="flex gap-4">
        <button
          onClick={() =>
            onStatusChange?.(
              task.id,
              task.status === "completed" ? "pending" : "completed"
            )
          }
          className="mt-1 flex-shrink-0 text-slate-400 transition-colors hover:text-white"
        >
          {task.status === "completed" ? (
            <CheckCircle2 className="h-6 w-6 text-[#10a37f]" />
          ) : (
            <Circle className="h-6 w-6" />
          )}
        </button>

        <div className="flex-1">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex-1">
              <h3
                className={`text-lg font-semibold ${
                  task.status === "completed"
                    ? "text-slate-400 line-through"
                    : "text-white"
                }`}
              >
                {task.title}
              </h3>

              <div className="mt-3 flex flex-wrap gap-2">
                {task.category && (
                  <Badge variant="info" size="sm">
                    {task.category}
                  </Badge>
                )}
                  <Badge variant={priorityVariant[task.priority]} size="sm">
                    {priorityLabel[task.priority]}
                  </Badge>
                {showStatusActions && (
                  <Badge variant={statusVariant[task.status]} size="sm">
                    {statusLabel[task.status]}
                  </Badge>
                )}
              </div>

              <div className="mt-4 space-y-2">
                <p className="flex items-center gap-2 text-base font-semibold text-[#f7f7f8] sm:text-lg">
                  <CalendarDays className="h-4 w-4 text-[#8e8ea0]" />
                  <span>{formatDateWithMonthName(task.date)}</span>
                </p>
                {timeDisplay && (
                  <p className="flex items-center gap-2 text-lg font-semibold text-[#d7d7df] sm:text-xl">
                    <Clock3 className="h-4 w-4 text-[#8e8ea0]" />
                    <span>{timeDisplay}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap lg:justify-end">
              {showStatusActions &&
                task.status !== "in_progress" &&
                task.status !== "completed" && (
                <button
                  onClick={() => onStatusChange?.(task.id, "in_progress")}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[#10a37f]/30 bg-[#10a37f]/10 px-3 py-2 text-sm text-[#d8fff5] transition-colors hover:bg-[#10a37f]/20 sm:w-auto"
                >
                  <PlayCircle className="h-4 w-4" />
                  I&apos;m In
                </button>
              )}
              {showStatusActions && task.status === "in_progress" && (
                <button
                  onClick={() => onStatusChange?.(task.id, "completed")}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[#10a37f]/30 bg-[#10a37f]/10 px-3 py-2 text-sm text-[#d8fff5] transition-colors hover:bg-[#10a37f]/20 sm:w-auto"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Mark Done
                </button>
              )}
              <button
                onClick={() => onDelete?.(task.id)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[#4a4b57] bg-[#343541] px-3 py-2 text-sm text-[#c5c6d0] opacity-100 transition-all hover:border-red-500/20 hover:text-red-300 sm:w-auto sm:opacity-0 sm:group-hover:opacity-100"
              >
                <Trash2 className="h-4 w-4" />
                Remove
              </button>
            </div>
          </div>

          {editableNotes ? (
            <div className="mt-5 grid gap-3 lg:grid-cols-[auto_1fr] lg:items-start">
              <div className="inline-flex items-center gap-2 text-sm text-[#a9aab5]">
                <PencilLine className="h-4 w-4 text-[#10a37f]" />
                AI notes
              </div>
              <textarea
                value={task.description ?? ""}
                onChange={(event) =>
                  onDescriptionChange?.(task.id, event.target.value)
                }
                placeholder="Add or refine notes for this task."
                className="min-h-28 w-full rounded-2xl border border-[#4a4b57] bg-[#343541] px-4 py-3 text-sm leading-6 text-[#ececf1] placeholder:text-[#8e8ea0] transition-colors duration-200 focus:border-[#10a37f] focus:ring-2 focus:ring-[#10a37f]/20"
              />
            </div>
          ) : task.description ? (
            <p className="mt-4 text-sm leading-relaxed text-[#a9aab5]">
              {task.description}
            </p>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
