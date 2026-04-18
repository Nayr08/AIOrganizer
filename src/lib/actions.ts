"use server";

import { prisma } from "@/src/lib/db";

type ActionTaskInput = {
  title: string;
  date: string;
  time?: string | null;
  timeLabel?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  description?: string | null;
  category?: string | null;
  priority?: string | null;
};

export async function createTasks(tasks: ActionTaskInput[]) {
  try {
    const created = await prisma.task.createMany({
      data: tasks.map((task) => ({
        title: task.title,
        description: task.description || "",
        date: new Date(task.date + "T00:00:00"),
        timeLabel: task.timeLabel || task.time || null,
        startTime: task.startTime || task.time || null,
        endTime: task.endTime || null,
        category: task.category || "General",
        priority: task.priority || "medium",
        status: "pending",
      })),
    });
    return created;
  } catch (error) {
    console.error("Error creating tasks:", error);
    throw error;
  }
}

export async function getTasks() {
  try {
    const tasks = await prisma.task.findMany({
      orderBy: [{ date: "asc" }, { createdAt: "desc" }],
    });
    return tasks;
  } catch (error) {
    console.error("Error fetching tasks:", error);
    throw error;
  }
}

export async function updateTaskStatus(id: string, status: string) {
  try {
    const updated = await prisma.task.update({
      where: { id },
      data: { status },
    });
    return updated;
  } catch (error) {
    console.error("Error updating task status:", error);
    throw error;
  }
}

export async function deleteTask(id: string) {
  try {
    const deleted = await prisma.task.delete({
      where: { id },
    });
    return deleted;
  } catch (error) {
    console.error("Error deleting task:", error);
    throw error;
  }
}

export async function deleteAllTasks() {
  try {
    const result = await prisma.task.deleteMany();
    return result;
  } catch (error) {
    console.error("Error deleting all tasks:", error);
    throw error;
  }
}
