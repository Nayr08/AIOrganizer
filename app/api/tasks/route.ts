import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { normalizeDateKey } from "@/src/lib/datetime";

export async function GET() {
  try {
    const tasks = await prisma.task.findMany({
      orderBy: [{ date: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({
      tasks: tasks.map((task) => ({
        ...task,
        date: normalizeDateKey(task.date),
      })),
    });
  } catch (error) {
    console.error("Fetch tasks error:", error);
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 }
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
    const { id, status } = await req.json();

    if (!id || !status) {
      return NextResponse.json(
        { error: "Task ID and status required" },
        { status: 400 }
      );
    }

    const updated = await prisma.task.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json({
      task: {
        ...updated,
        date: normalizeDateKey(updated.date),
      },
    });
  } catch (error) {
    console.error("Update task error:", error);
    return NextResponse.json(
      { error: "Failed to update task" },
      { status: 500 }
    );
  }
}
