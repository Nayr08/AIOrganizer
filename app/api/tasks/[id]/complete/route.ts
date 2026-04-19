import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { getNextOccurrence, normalizeDateKey } from "@/src/lib/datetime";

type CompleteRouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_req: NextRequest, context: CompleteRouteContext) {
  try {
    const { id } = await context.params;
    const task = await prisma.task.findUnique({ where: { id } });

    if (!task) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.task.update({
      where: { id },
      data: { status: "completed" },
    });

    if (task.isRecurring && task.frequency) {
      const nextDate = getNextOccurrence(
        task.date,
        task.frequency,
        task.recurringDay
      );

      const nextTask = await prisma.task.create({
        data: {
          title: task.title,
          description: task.description,
          date: nextDate,
          timeLabel: task.timeLabel,
          startTime: task.startTime,
          endTime: task.endTime,
          priority: task.priority,
          category: task.category,
          status: "pending",
          isRecurring: true,
          frequency: task.frequency,
          recurringDay: task.recurringDay,
          parentTaskId: id,
        },
      });

      return NextResponse.json({
        completed: true,
        nextDate: normalizeDateKey(nextTask.date),
      });
    }

    return NextResponse.json({ completed: true });
  } catch (error) {
    console.error("Complete task error:", error);
    return NextResponse.json(
      { error: "Failed to complete task" },
      { status: 500 }
    );
  }
}
