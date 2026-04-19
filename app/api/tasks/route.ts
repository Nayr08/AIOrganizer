import { endOfDay, startOfDay } from "date-fns";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { normalizeDateKey } from "@/src/lib/datetime";
import { CreateTaskSchema } from "@/src/lib/schemas/task";

function serializeTask<T extends { date: Date }>(task: T) {
  return {
    ...task,
    date: normalizeDateKey(task.date),
  };
}

export async function GET(req: NextRequest) {
  try {
    const dateFilter = req.nextUrl.searchParams.get("date");
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const where =
      dateFilter === "today"
        ? { date: { gte: todayStart, lte: todayEnd } }
        : dateFilter === "upcoming"
          ? { date: { gt: todayEnd } }
          : {};

    const tasks = await prisma.task.findMany({
      where,
      orderBy: [{ date: "asc" }, { startTime: "asc" }, { createdAt: "desc" }],
    });

    const serializedTasks = tasks.map(serializeTask);

    if (dateFilter) {
      return NextResponse.json(serializedTasks);
    }

    return NextResponse.json({ tasks: serializedTasks });
  } catch (error) {
    console.error("Fetch tasks error:", error);
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = CreateTaskSchema.parse(body);
    const startTime = validated.startTime || null;
    const endTime = validated.endTime || null;
    const timeLabel =
      startTime && endTime
        ? `${startTime} - ${endTime}`
        : startTime || endTime || null;

    const task = await prisma.task.create({
      data: {
        title: validated.title,
        description: validated.description || null,
        date: new Date(`${validated.date}T00:00:00`),
        startTime,
        endTime,
        timeLabel,
        priority: validated.priority || "medium",
        category: validated.category || "General",
        status: "pending",
        isRecurring: validated.isRecurring ?? false,
        frequency: validated.frequency || null,
        recurringDay: validated.recurringDay || null,
      },
    });

    return NextResponse.json({
      task: serializeTask(task),
    });
  } catch (error) {
    console.error("Create task error:", error);
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 400 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "Task ID required" }, { status: 400 });
    }

    await prisma.task.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete task error:", error);
    return NextResponse.json(
      { error: "Failed to delete task" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const { id, status, date, startTime, endTime, timeLabel } = await req.json();

    if (!id) {
      return NextResponse.json(
        { error: "Task ID required" },
        { status: 400 }
      );
    }

    const updateData: {
      status?: string;
      date?: Date;
      startTime?: string | null;
      endTime?: string | null;
      timeLabel?: string | null;
    } = {};

    if (status) {
      updateData.status = status;
    }

    if (date) {
      updateData.date = new Date(`${date}T00:00:00`);
    }

    if (startTime !== undefined) {
      updateData.startTime = startTime || null;
    }

    if (endTime !== undefined) {
      updateData.endTime = endTime || null;
    }

    if (timeLabel !== undefined) {
      updateData.timeLabel = timeLabel || null;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No task updates provided" },
        { status: 400 }
      );
    }

    const updated = await prisma.task.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ task: serializeTask(updated) });
  } catch (error) {
    console.error("Update task error:", error);
    return NextResponse.json(
      { error: "Failed to update task" },
      { status: 500 }
    );
  }
}
