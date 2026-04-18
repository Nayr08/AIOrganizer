"use client";

import { useEffect, useState } from "react";
import { Button, Card, TaskCard, EmptyState } from "@/src/components";
import { CheckSquare, Clock3, Plus } from "lucide-react";
import Link from "next/link";
import type { Task } from "@/src/components/TaskCard";
import {
  APP_TIMEZONE,
  compareDateKeys,
  getDateKeyInTimezone,
  getTimezoneNowLabel,
  normalizeDateKey,
  timeLabelToMinutes,
  addDaysToDateKey,
  getNowMinutesInTimezone,
} from "@/src/lib/datetime";

type FilterType = "all" | "pending" | "in_progress" | "completed";

interface DBTask {
  id: string;
  title: string;
  description?: string;
  date: Date | string;
  timeLabel?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  category?: string | null;
  priority?: string | null;
  status: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

function formatDate(dateString: string) {
  const normalizedDate = normalizeDateKey(dateString);
  const date = new Date(`${normalizedDate}T00:00:00`);
  const today = getDateKeyInTimezone();
  const tomorrow = getDateKeyInTimezone(new Date(Date.now() + 24 * 60 * 60 * 1000));

  if (normalizedDate === today) {
    return "Today";
  }

  if (normalizedDate === tomorrow) {
    return "Tomorrow";
  }

  if (Number.isNaN(date.getTime())) {
    return normalizedDate;
  }

  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<FilterType>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [nowLabel, setNowLabel] = useState(() => getTimezoneNowLabel());
  const [remindersEnabled, setRemindersEnabled] = useState(
    () =>
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "granted"
  );

  async function fetchTasks() {
    try {
      setLoading(true);
      const response = await fetch("/api/tasks");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch tasks");
      }

      const formattedTasks: Task[] = (data.tasks || [])
        .map((dbTask: DBTask) => ({
          id: dbTask.id,
          title: dbTask.title,
          date: normalizeDateKey(dbTask.date),
          time: dbTask.timeLabel || undefined,
          startTime: dbTask.startTime || undefined,
          endTime: dbTask.endTime || undefined,
          description: dbTask.description || undefined,
          category: dbTask.category || undefined,
          priority: (dbTask.priority?.toLowerCase() || "medium") as Task["priority"],
          status: (
            dbTask.status === "in_progress" ? "in_progress" : dbTask.status || "pending"
          ) as Task["status"],
        }))
        .sort((left: Task, right: Task) => {
          const dateDiff = compareDateKeys(left.date, right.date);
          if (dateDiff !== 0) {
            return dateDiff;
          }

          return (
            (timeLabelToMinutes(left.startTime || left.time) ?? Number.MAX_SAFE_INTEGER) -
            (timeLabelToMinutes(right.startTime || right.time) ?? Number.MAX_SAFE_INTEGER)
          );
        });

      setTasks(formattedTasks);
      setError("");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch tasks";
      setError(errorMessage);
      console.error("Error fetching tasks:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchTasks();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNowLabel(getTimezoneNowLabel());
    }, 30_000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!remindersEnabled || typeof window === "undefined") {
      return;
    }

    const maybeNotify = () => {
      const todayKey = getDateKeyInTimezone();
      const tomorrowKey = addDaysToDateKey(todayKey, 1);
      const nowMinutes = getNowMinutesInTimezone();

      tasks
        .filter((task) => task.status !== "completed")
        .forEach((task) => {
          if (task.date !== todayKey && task.date !== tomorrowKey) {
            return;
          }

          const startMinutes = timeLabelToMinutes(task.startTime || task.time);
          if (startMinutes === null) {
            return;
          }

          const minutesUntilStart =
            task.date === todayKey
              ? startMinutes - nowMinutes
              : 24 * 60 - nowMinutes + startMinutes;

          if (minutesUntilStart < 0 || minutesUntilStart > 15) {
            return;
          }

          const reminderKey = `ai-organizer-reminder:${task.id}:${task.date}:${startMinutes}`;
          if (window.localStorage.getItem(reminderKey)) {
            return;
          }

          new Notification("Upcoming task", {
            body: `${task.title} starts at ${task.startTime || task.time}.`,
          });
          window.localStorage.setItem(reminderKey, "sent");
        });
    };

    maybeNotify();
    const intervalId = window.setInterval(maybeNotify, 60_000);

    return () => window.clearInterval(intervalId);
  }, [remindersEnabled, tasks]);

  const filteredTasks = tasks.filter((task) => {
    if (filter === "completed") return task.status === "completed";
    if (filter === "in_progress") return task.status === "in_progress";
    if (filter === "pending") return task.status === "pending";
    return true;
  });

  const groupedTasks = filteredTasks.reduce(
    (acc, task) => {
      if (!acc[task.date]) {
        acc[task.date] = [];
      }
      acc[task.date].push(task);
      return acc;
    },
    {} as Record<string, Task[]>
  );

  const sortedDates = Object.keys(groupedTasks).sort();

  const handleStatusChange = async (id: string, nextStatus: Task["status"]) => {

    try {
      const response = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: nextStatus }),
      });

      if (!response.ok) {
        throw new Error("Failed to update task");
      }

      setTasks(
        tasks.map((t) =>
          t.id === id ? { ...t, status: nextStatus } : t
        )
      );
    } catch (err) {
      console.error("Error updating task:", err);
      setError("Failed to update task");
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      const response = await fetch("/api/tasks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete task");
      }

      setTasks(tasks.filter((t) => t.id !== id));
    } catch (err) {
      console.error("Error deleting task:", err);
      setError("Failed to delete task");
    }
  };

  const completedCount = tasks.filter((t) => t.status === "completed").length;
  const pendingCount = tasks.filter((t) => t.status === "pending").length;
  const inProgressCount = tasks.filter((t) => t.status === "in_progress").length;

  const enableReminders = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setError("This browser does not support notifications.");
      return;
    }

    const permission = await Notification.requestPermission();
    setRemindersEnabled(permission === "granted");
    if (permission !== "granted") {
      setError("Notifications were not allowed.");
    } else {
      setError("");
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#212121]">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 rounded-[32px] border border-[#3e404b] bg-[#2f2f2f] p-6">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="flex items-center gap-3 text-3xl font-semibold text-[#f7f7f8] sm:text-4xl">
                <CheckSquare className="h-8 w-8 text-[#10a37f]" />
                Tasks
              </h1>
              <p className="mt-2 text-sm text-[#a9aab5]">
                {pendingCount} pending | {completedCount} completed
              </p>
              <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-[#4a4b57] bg-[#343541] px-3 py-1.5 text-xs text-[#c5c6d0]">
                <Clock3 className="h-3.5 w-3.5 text-[#10a37f]" />
                {APP_TIMEZONE}: {nowLabel}
              </div>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
              <Button
                variant={remindersEnabled ? "secondary" : "primary"}
                className="w-full sm:w-auto"
                onClick={enableReminders}
              >
                {remindersEnabled ? "Reminders On" : "Enable Reminders"}
              </Button>
              <Link href="/organize">
                <Button variant="secondary" className="w-full sm:w-auto">
                  <Plus className="h-4 w-4" />
                  New Organization
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "All", value: tasks.length },
              { label: "Pending", value: pendingCount },
              { label: "Active", value: inProgressCount },
              { label: "Done", value: completedCount },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-[#444654] bg-[#343541] px-4 py-4"
              >
                <p className="text-2xl font-semibold text-[#f7f7f8]">{stat.value}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[#8e8ea0]">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
          {[
            { label: "All", value: "all" as FilterType },
            { label: "Pending", value: "pending" as FilterType },
            { label: "Active", value: "in_progress" as FilterType },
            { label: "Completed", value: "completed" as FilterType },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm transition-colors ${
                filter === f.value
                  ? "border-[#10a37f]/30 bg-[#10a37f]/10 text-[#d8fff5]"
                  : "border-[#444654] bg-[#2f2f2f] text-[#b4b6c2] hover:bg-[#343541] hover:text-white"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {error && (
          <Card className="mb-6 border-red-500/20 bg-red-500/10">
            <p className="text-sm text-red-300">{error}</p>
          </Card>
        )}

        {loading && (
          <Card className="py-12 text-center">
            <div className="inline-flex flex-col items-center gap-4">
              <div className="relative h-10 w-10">
                <div className="absolute inset-0 animate-spin rounded-full border-2 border-[#10a37f]/20 border-t-[#10a37f]" />
              </div>
              <p className="text-sm text-[#a9aab5]">Loading tasks...</p>
            </div>
          </Card>
        )}

        {!loading && filteredTasks.length === 0 ? (
          <EmptyState
            title={filter === "all" ? "No tasks yet" : `No ${filter} tasks`}
            description={
              filter === "all"
                ? "Start organizing to create your first task"
                : `You have no ${filter} tasks right now.`
            }
          />
        ) : !loading ? (
          <div className="space-y-8">
            {sortedDates.map((date) => (
              <section key={date} className="space-y-3">
                <h2 className="px-1 text-sm font-medium uppercase tracking-[0.16em] text-[#8e8ea0]">
                  {formatDate(date)}
                </h2>
                <div className="space-y-3">
                  {groupedTasks[date].map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onStatusChange={handleStatusChange}
                      onDelete={handleDeleteTask}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
