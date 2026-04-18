import { NextResponse } from "next/server";
import { ai } from "@/src/lib/gemini";

export async function POST(req: Request) {
  try {
    const { input } = await req.json();

    if (!input || typeof input !== "string") {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const today = new Date().toISOString().split("T")[0];

    const prompt = `
You are an AI organizer.

Convert the user's natural language errands into structured JSON.

Rules:
- Return ONLY valid JSON.
- Return an array.
- Each object must contain:
  title
  date
  timeLabel
  category
  priority
  description
- date must be in YYYY-MM-DD format
- If date is unclear, assume ${today}
- If time is unclear, use an empty string
- Do not include markdown fences

Example:
[
  {
    "title": "Interview",
    "date": "2026-04-18",
    "timeLabel": "1:00 PM",
    "category": "Work",
    "priority": "High",
    "description": "Job interview"
  }
]

User input:
${input}
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const text = response.text?.trim() ?? "";

    let tasks;
    try {
      tasks = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { error: "AI response was not valid JSON", raw: text },
        { status: 500 }
      );
    }

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}