"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, CheckSquare, ChevronDown, Clock3, Plus, X } from "lucide-react";
import Link from "next/link";
import { EmptyState, TaskCard } from "@/src/components";
import type { Task } from "@/src/components/TaskCard";
import {
  APP_TIMEZONE,
  addDaysToDateKey,
  compareDateKeys,
  getDateKeyInTimezone,
  getNowMinutesInTimezone,
  normalizeDateKey,
  timeLabelToMinutes,
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

function getSectionHeader(dateString: string) {
  const normalizedDate = normalizeDateKey(dateString);
  const today = getDateKeyInTimezone();
  const tomorrow = addDaysToDateKey(today, 1);
  const date = new Date(`${normalizedDate}T00:00:00`);

  if (normalizedDate === today) {
    return { label: "TODAY", isToday: true };
  }

  if (normalizedDate === tomorrow) {
    return { label: "TOMORROW", isToday: false };
  }

  if (Number.isNaN(date.getTime())) {
    return { label: normalizedDate.toUpperCase(), isToday: false };
  }

  const formatted = date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return { label: formatted.toUpperCase(), isToday: false };
}

function getTaskStartMinutes(task: Task) {
  return timeLabelToMinutes(task.startTime || task.time);
}

function isTaskOverdue(task: Task) {
  if (
    task.status === "completed" ||
    task.status === "missed" ||
    task.status === "skipped"
  ) {
    return false;
  }

  const todayKey = getDateKeyInTimezone();
  const dateComparison = compareDateKeys(task.date, todayKey);

  if (dateComparison < 0) {
    return true;
  }

  if (dateComparison > 0) {
    return false;
  }

  const startMinutes = getTaskStartMinutes(task);
  if (startMinutes === null) {
    return false;
  }

  return startMinutes < getNowMinutesInTimezone();
}

function isTaskOlderThanDay(task: Task) {
  if (
    task.status === "completed" ||
    task.status === "missed" ||
    task.status === "skipped"
  ) {
    return false;
  }

  const todayKey = getDateKeyInTimezone();
  const yesterdayKey = addDaysToDateKey(todayKey, -1);

  if (compareDateKeys(task.date, yesterdayKey) < 0) {
    return true;
  }

  if (task.date !== yesterdayKey) {
    return false;
  }

  const startMinutes = getTaskStartMinutes(task);
  if (startMinutes === null) {
    return true;
  }

  return getNowMinutesInTimezone() >= startMinutes;
}

function buildTimeLabel(startTime: string, endTime: string) {
  if (startTime && endTime) {
    return `${startTime} - ${endTime}`;
  }
  return startTime || endTime || "";
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<FilterType>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [remindersEnabled, setRemindersEnabled] = useState(
    () =>
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "granted"
  );
  const [missedOpen, setMissedOpen] = useState(false);
  const [rescheduleTask, setRescheduleTask] = useState<Task | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleStartTime, setRescheduleStartTime] = useState("");
  const [rescheduleEndTime, setRescheduleEndTime] = useState("");

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
          status: (dbTask.status || "pending") as Task["status"],
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
    if (!tasks.length) {
      return;
    }

    const tasksToMarkMissed = tasks.filter(isTaskOlderThanDay);
    if (!tasksToMarkMissed.length) {
      return;
    }

    const markMissed = async () => {
      try {
        await Promise.all(
          tasksToMarkMissed.map((task) =>
            fetch("/api/tasks", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id: task.id, status: "missed" }),
            })
          )
        );

        setTasks((currentTasks) =>
          currentTasks.map((task) =>
            tasksToMarkMissed.some((candidate) => candidate.id === task.id)
              ? { ...task, status: "missed" }
              : task
          )
        );
      } catch (markError) {
        console.error("Error marking tasks missed:", markError);
      }
    };

    void markMissed();
  }, [tasks]);

  useEffect(() => {
    if (!remindersEnabled || typeof window === "undefined") {
      return;
    }

    const maybeNotify = () => {
      const todayKey = getDateKeyInTimezone();
      const tomorrowKey = addDaysToDateKey(todayKey, 1);
      const nowMinutes = getNowMinutesInTimezone();

      tasks
        .filter(
          (task) =>
            task.status !== "completed" &&
            task.status !== "missed" &&
            task.status !== "skipped"
        )
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

          const reminderKeyBase = `ai-organizer-reminder:${task.id}:${task.date}:${startMinutes}`;

          if (minutesUntilStart <= 0 && minutesUntilStart >= -5) {
            if (!window.localStorage.getItem(`${reminderKeyBase}:start`)) {
              new Notification("Task starting now", {
                body: `${task.title} starts at ${task.startTime || task.time}.`,
              });
              window.localStorage.setItem(`${reminderKeyBase}:start`, "sent");
            }
          } else if (minutesUntilStart <= -30 && minutesUntilStart >= -35) {
            if (!window.localStorage.getItem(`${reminderKeyBase}:30`)) {
              new Notification("Task still pending", {
                body: `${task.title} is now 30 minutes overdue.`,
              });
              window.localStorage.setItem(`${reminderKeyBase}:30`, "sent");
            }
          } else if (minutesUntilStart <= -120 && minutesUntilStart >= -125) {
            if (!window.localStorage.getItem(`${reminderKeyBase}:120`)) {
              new Notification("Task needs attention", {
                body: `${task.title} is now 2 hours overdue.`,
              });
              window.localStorage.setItem(`${reminderKeyBase}:120`, "sent");
            }
          }
        });
    };

    maybeNotify();
    const intervalId = window.setInterval(maybeNotify, 60_000);

    return () => window.clearInterval(intervalId);
  }, [remindersEnabled, tasks]);

  const filteredTasks = useMemo(() => {
    let nextTasks = tasks;

    if (selectedDate) {
      nextTasks = nextTasks.filter((task) => task.date === selectedDate);
    }

    return nextTasks.filter((task) => {
      if (filter === "completed") return task.status === "completed";
      if (filter === "in_progress") return task.status === "in_progress";
      if (filter === "pending") return task.status === "pending";
      return !["missed", "skipped"].includes(task.status);
    });
  }, [filter, selectedDate, tasks]);

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

  const missedTasks = useMemo(
    () =>
      tasks.filter((task) =>
        selectedDate
          ? task.date === selectedDate &&
            (task.status === "missed" || task.status === "skipped")
          : task.status === "missed" || task.status === "skipped"
      ),
    [selectedDate, tasks]
  );

  const overdueTasks = useMemo(
    () => filteredTasks.filter((task) => isTaskOverdue(task)),
    [filteredTasks]
  );

  const handleTaskPatch = async (
    id: string,
    payload: Partial<{
      status: Task["status"];
      date: string;
      startTime: string;
      endTime: string;
      timeLabel: string;
    }>
  ) => {
    const response = await fetch("/api/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...payload }),
    });

    if (!response.ok) {
      throw new Error("Failed to update task");
    }
  };

  const handleStatusChange = async (id: string, nextStatus: Task["status"]) => {
    try {
      await handleTaskPatch(id, { status: nextStatus });
      setTasks((currentTasks) =>
        currentTasks.map((task) =>
          task.id === id ? { ...task, status: nextStatus } : task
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

      setTasks((currentTasks) => currentTasks.filter((task) => task.id !== id));
    } catch (err) {
      console.error("Error deleting task:", err);
      setError("Failed to delete task");
    }
  };

  const handleDismissAllOverdue = async () => {
    try {
      await Promise.all(
        overdueTasks.map((task) =>
          handleTaskPatch(task.id, { status: "skipped" })
        )
      );
      setTasks((currentTasks) =>
        currentTasks.map((task) =>
          overdueTasks.some((overdueTask) => overdueTask.id === task.id)
            ? { ...task, status: "skipped" }
            : task
        )
      );
    } catch (dismissError) {
      console.error("Error dismissing overdue tasks:", dismissError);
      setError("Failed to dismiss overdue tasks");
    }
  };

  const openRescheduleModal = (task: Task) => {
    setRescheduleTask(task);
    setRescheduleDate(task.date);
    setRescheduleStartTime(task.startTime || task.time || "");
    setRescheduleEndTime(task.endTime || "");
  };

  const submitReschedule = async () => {
    if (!rescheduleTask || !rescheduleDate) {
      return;
    }

    const nextTimeLabel = buildTimeLabel(rescheduleStartTime, rescheduleEndTime);

    try {
      await handleTaskPatch(rescheduleTask.id, {
        status: "pending",
        date: rescheduleDate,
        startTime: rescheduleStartTime,
        endTime: rescheduleEndTime,
        timeLabel: nextTimeLabel,
      });

      setTasks((currentTasks) =>
        currentTasks
          .map((task) =>
            task.id === rescheduleTask.id
              ? {
                  ...task,
                  status: "pending" as const,
                  date: rescheduleDate,
                  startTime: rescheduleStartTime || undefined,
                  endTime: rescheduleEndTime || undefined,
                  time: nextTimeLabel || undefined,
                }
              : task
          )
          .sort((left, right) => {
            const dateDiff = compareDateKeys(left.date, right.date);
            if (dateDiff !== 0) {
              return dateDiff;
            }

            return (
              (timeLabelToMinutes(left.startTime || left.time) ?? Number.MAX_SAFE_INTEGER) -
              (timeLabelToMinutes(right.startTime || right.time) ?? Number.MAX_SAFE_INTEGER)
            );
          })
      );

      setRescheduleTask(null);
      setRescheduleDate("");
      setRescheduleStartTime("");
      setRescheduleEndTime("");
    } catch (rescheduleError) {
      console.error("Error rescheduling task:", rescheduleError);
      setError("Failed to reschedule task");
    }
  };

  const completedCount = tasks.filter((task) => task.status === "completed").length;
  const pendingCount = tasks.filter((task) => task.status === "pending").length;
  const inProgressCount = tasks.filter((task) => task.status === "in_progress").length;

  const statItems = [
    { label: "ALL", value: tasks.length, filterValue: "all" as FilterType },
    { label: "PENDING", value: pendingCount, filterValue: "pending" as FilterType },
    { label: "ACTIVE", value: inProgressCount, filterValue: "in_progress" as FilterType },
    { label: "DONE", value: completedCount, filterValue: "completed" as FilterType },
  ];

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
    <div className="relative min-h-screen overflow-hidden bg-[var(--bg-base)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[320px]"
        style={{
          background:
            "radial-gradient(ellipse 70% 40% at 50% 0%, rgba(79,142,247,0.08) 0%, transparent 70%)",
        }}
      />

      <div className="relative mx-auto w-full max-w-[860px] px-8 py-10 max-md:px-4">
        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1
              className="flex items-center gap-3 text-[clamp(2.2rem,5vw,3.3rem)] font-semibold leading-[1.08] tracking-[-0.02em] text-[var(--text-primary)]"
              style={{ fontFamily: "Fraunces, serif" }}
            >
              <CheckSquare className="h-8 w-8 text-[var(--accent)]" />
              Tasks
            </h1>
            <p className="mt-3 max-w-[520px] text-[15px] leading-[1.7] text-[var(--text-secondary)]">
              Review what is pending, what is already in motion, and what is done.
            </p>
            <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
              <Clock3 className="h-[14px] w-[14px] text-[var(--text-muted)]" />
              <span>{APP_TIMEZONE}</span>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:w-auto sm:items-end">
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={enableReminders}
                className="inline-flex items-center justify-center rounded-[8px] border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.06)] px-4 py-[10px] text-[13px] text-[var(--text-primary)] backdrop-blur-[4px] transition-all duration-200 hover:bg-[rgba(255,255,255,0.10)]"
              >
                {remindersEnabled ? "Reminders On" : "Enable Reminders"}
              </button>
              <Link href="/organize">
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-2 rounded-[8px] border-0 bg-[var(--accent)] px-4 py-[10px] text-[13px] font-medium text-[#0A1628] transition-all duration-200 hover:brightness-110"
                >
                  <Plus className="h-4 w-4" />
                  New Organization
                </button>
              </Link>
            </div>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {statItems.map((stat) => {
            const active = filter === stat.filterValue;
            return (
              <button
                key={stat.label}
                type="button"
                onClick={() => setFilter(stat.filterValue)}
                className={`px-5 py-4 text-left transition-all duration-200 ${
                  active
                    ? "rounded-[8px] border-b-2 border-b-[var(--accent)] bg-[rgba(79,142,247,0.06)]"
                    : "border-b-2 border-b-transparent bg-transparent"
                }`}
              >
                <p
                  className={`text-[28px] font-medium leading-none ${
                    active ? "text-[var(--accent)]" : "text-[var(--text-primary)]"
                  }`}
                >
                  {stat.value}
                </p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.07em] text-[var(--text-muted)]">
                  {stat.label}
                </p>
              </button>
            );
          })}
        </div>

        <div className="mb-6 flex flex-col items-stretch gap-2 sm:flex-row sm:justify-end">
          <label className="group inline-flex items-center gap-2 rounded-[8px] border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.06)] px-3 py-[10px] text-[13px] text-[var(--text-primary)] shadow-[0_10px_30px_rgba(0,0,0,0.12)] backdrop-blur-[4px] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-[rgba(79,142,247,0.35)] hover:bg-[rgba(255,255,255,0.09)] hover:shadow-[0_14px_36px_rgba(79,142,247,0.10)] focus-within:-translate-y-0.5 focus-within:border-[rgba(79,142,247,0.45)] focus-within:bg-[rgba(255,255,255,0.10)]">
            <CalendarDays className="h-4 w-4 text-[var(--accent)] transition-transform duration-300 ease-out group-hover:scale-110 group-focus-within:scale-110" />
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              className="bg-transparent text-[13px] text-[var(--text-primary)] outline-none transition-colors duration-300 ease-out"
            />
          </label>
          {selectedDate && (
            <button
              type="button"
              onClick={() => setSelectedDate("")}
              className="rounded-[8px] border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.06)] px-3 py-[10px] text-[13px] text-[var(--text-primary)] shadow-[0_10px_30px_rgba(0,0,0,0.10)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-[rgba(79,142,247,0.32)] hover:bg-[rgba(255,255,255,0.10)] hover:shadow-[0_14px_36px_rgba(79,142,247,0.10)]"
            >
              Clear Date
            </button>
          )}
        </div>

        {overdueTasks.length > 0 && (
          <div className="mb-6 rounded-[14px] border border-[rgba(226,75,74,0.14)] bg-[rgba(226,75,74,0.06)] px-5 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[15px] font-medium text-[var(--text-primary)]">
                  {overdueTasks.length} overdue {overdueTasks.length === 1 ? "task" : "tasks"}
                </p>
                <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
                  Handle them individually or dismiss all quietly into skipped history.
                </p>
              </div>
              <button
                type="button"
                onClick={handleDismissAllOverdue}
                className="inline-flex items-center justify-center rounded-[8px] border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.06)] px-4 py-[10px] text-[13px] text-[var(--text-primary)] transition-all duration-200 hover:bg-[rgba(255,255,255,0.10)]"
              >
                Dismiss All
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-[14px] border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {loading && (
          <div className="rounded-[14px] border border-[var(--border)] bg-[var(--bg-surface)] px-6 py-12 text-center">
            <div className="inline-flex flex-col items-center gap-4">
              <div className="relative h-10 w-10">
                <div className="absolute inset-0 animate-spin rounded-full border-2 border-[rgba(79,142,247,0.14)] border-t-[var(--accent)]" />
              </div>
              <p className="text-sm text-[var(--text-secondary)]">Loading tasks...</p>
            </div>
          </div>
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
          <div>
            {sortedDates.map((date) => {
              const header = getSectionHeader(date);
              return (
                <section key={date}>
                  <div className="mb-[10px] border-b border-[rgba(255,255,255,0.07)] pb-[10px] pt-6 text-[11px] uppercase tracking-[0.08em]">
                    {header.isToday ? (
                      <div className="flex items-center gap-2 font-medium text-[var(--accent)]">
                        <span>{header.label}</span>
                        <span className="rounded-full bg-[rgba(79,142,247,0.12)] px-2 py-[2px] text-[10px] normal-case tracking-normal text-[var(--accent)]">
                          now
                        </span>
                      </div>
                    ) : (
                      <span className="text-[var(--text-muted)]">{header.label}</span>
                    )}
                  </div>

                  <div>
                    {groupedTasks[date].map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        overdue={isTaskOverdue(task)}
                        onStatusChange={handleStatusChange}
                        onDelete={handleDeleteTask}
                        onReschedule={openRescheduleModal}
                      />
                    ))}
                  </div>
                </section>
              );
            })}

            {missedTasks.length > 0 && (
              <section className="pt-6">
                <button
                  type="button"
                  onClick={() => setMissedOpen((current) => !current)}
                  className="mb-[10px] flex items-center gap-2 border-b border-[rgba(255,255,255,0.07)] pb-[10px] text-[11px] uppercase tracking-[0.08em] text-[var(--text-muted)]"
                >
                  <span>Missed History</span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform duration-200 ${
                      missedOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {missedOpen && (
                  <div>
                    {missedTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onStatusChange={handleStatusChange}
                        onDelete={handleDeleteTask}
                        onReschedule={openRescheduleModal}
                      />
                    ))}
                  </div>
                )}
              </section>
            )}
          </div>
        ) : null}
      </div>

      {rescheduleTask && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-[16px] border border-[var(--border)] bg-[var(--bg-surface)] p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3
                  className="text-[1.6rem] font-semibold text-[var(--text-primary)]"
                  style={{ fontFamily: "Fraunces, serif" }}
                >
                  Reschedule task
                </h3>
                <p className="mt-2 text-[14px] leading-[1.7] text-[var(--text-secondary)]">
                  Move {rescheduleTask.title} to a better time.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRescheduleTask(null)}
                className="rounded-[10px] border border-[var(--border)] bg-[var(--bg-elevated)] p-2 text-[var(--text-secondary)] transition-colors duration-200 hover:border-[var(--border-hover)] hover:text-[var(--text-primary)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <label className="block text-[13px] text-[var(--text-secondary)]">
                <span className="mb-2 block">New date</span>
                <input
                  type="date"
                  value={rescheduleDate}
                  onChange={(event) => setRescheduleDate(event.target.value)}
                  className="w-full rounded-[10px] border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-[10px] text-[var(--text-primary)] outline-none focus:border-[rgba(79,142,247,0.30)]"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-[13px] text-[var(--text-secondary)]">
                  <span className="mb-2 block">Start time</span>
                  <input
                    type="text"
                    value={rescheduleStartTime}
                    onChange={(event) => setRescheduleStartTime(event.target.value)}
                    placeholder="4:00 PM"
                    className="w-full rounded-[10px] border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-[10px] text-[var(--text-primary)] outline-none focus:border-[rgba(79,142,247,0.30)]"
                  />
                </label>

                <label className="block text-[13px] text-[var(--text-secondary)]">
                  <span className="mb-2 block">End time</span>
                  <input
                    type="text"
                    value={rescheduleEndTime}
                    onChange={(event) => setRescheduleEndTime(event.target.value)}
                    placeholder="6:00 PM"
                    className="w-full rounded-[10px] border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-[10px] text-[var(--text-primary)] outline-none focus:border-[rgba(79,142,247,0.30)]"
                  />
                </label>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setRescheduleTask(null)}
                  className="rounded-[8px] border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.06)] px-4 py-[10px] text-[13px] text-[var(--text-primary)] transition-all duration-200 hover:bg-[rgba(255,255,255,0.10)]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submitReschedule}
                  className="rounded-[8px] border-0 bg-[var(--accent)] px-4 py-[10px] text-[13px] font-medium text-[#0A1628] transition-all duration-200 hover:brightness-110"
                >
                  Save reschedule
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
