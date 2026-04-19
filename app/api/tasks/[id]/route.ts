import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/src/lib/db";
import { normalizeDateKey } from "@/src/lib/datetime";
import { UpdateTaskSchema } from "@/src/lib/schemas/task";

type TaskRouteContext = {
  params: Promise<{ id: string }>;
};

function serializeTask<T extends { date: Date }>(task: T) {
  return {
    ...task,
    date: normalizeDateKey(task.date),
  };
}

export async function PATCH(req: NextRequest, context: TaskRouteContext) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const validated = UpdateTaskSchema.parse(body);
    const startTime = validated.startTime || null;
    const endTime = validated.endTime || null;
    const timeLabel =
      startTime && endTime
        ? `${startTime} - ${endTime}`
        : startTime || endTime || null;

    const task = await prisma.task.update({
      where: { id },
      data: {
        title: validated.title,
        description: validated.description || null,
        date: new Date(`${validated.date}T00:00:00`),
        startTime,
        endTime,
        timeLabel,
        priority: validated.priority,
        category: validated.category,
        isRecurring: validated.isRecurring,
        frequency: validated.frequency || null,
        recurringDay: validated.recurringDay || null,
      },
    });

    return NextResponse.json({ task: serializeTask(task) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }

    console.error("Update task by id error:", error);
    return NextResponse.json(
      { error: "Failed to update task" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: NextRequest, context: TaskRouteContext) {
  try {
    const { id } = await context.params;
    await prisma.task.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete task by id error:", error);
    return NextResponse.json(
      { error: "Failed to delete task" },
      { status: 500 }
    );
  }
}
