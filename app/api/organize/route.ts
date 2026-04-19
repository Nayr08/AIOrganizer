import { NextResponse } from "next/server";
import {
  APP_TIMEZONE,
  addDaysToDateKey,
  getDateKeyInTimezone,
} from "@/src/lib/datetime";

export const runtime = "nodejs";

type TaskPriority = "low" | "medium" | "high";

type OrganizedTask = {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  timeLabel: string;
  category: string;
  priority: TaskPriority;
  description: string;
  isRecurring: boolean;
  frequency?: "daily" | "weekly" | "monthly";
  recurringDay?: string | null;
};

type RawTaskInput = Partial<OrganizedTask> & {
  time?: string;
  status?: string;
};

const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
] as const;

const CATEGORY_RULES = [
  {
    keywords: [
      "meeting",
      "meet",
      "work",
      "project",
      "review",
      "documents",
      "trabaho",
      "meeting",
      "opisina",
    ],
    category: "Work",
  },
  {
    keywords: ["church", "mass", "worship", "simba"],
    category: "Spiritual",
  },
  {
    keywords: ["travel", "trip", "province", "flight", "commute", "biyahe", "lakaw"],
    category: "Travel",
  },
  {
    keywords: ["meetup", "bros", "friends", "hangout", "dinner", "laag", "barkada"],
    category: "Social",
  },
  {
    keywords: ["gym", "exercise", "workout", "dentist", "doctor", "ehersisyo"],
    category: "Health",
  },
  {
    keywords: ["groceries", "grocery", "shop", "shopping", "palit", "pamili"],
    category: "Shopping",
  },
  {
    keywords: ["bill", "rent", "payment", "bayad"],
    category: "Finance",
  },
  {
    keywords: ["class", "klase", "school", "eskwela", "study", "tuon"],
    category: "School",
  },
  {
    keywords: ["basketball", "training", "practice", "ensayo", "duwa"],
    category: "Sports",
  },
] as const;

let ai: {
  models: {
    generateContent: (args: {
      model: string;
      contents: string;
    }) => Promise<{ text?: string }>;
  };
} | null = null;

async function getAiClient() {
  if (ai || !process.env.GEMINI_API_KEY) {
    return ai;
  }

  try {
    const { GoogleGenAI } = await import("@google/genai");
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  } catch {
    console.log("Gemini API not available, using fallback parser");
  }

  return ai;
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function toTitleCase(value: string) {
  return value
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function normalizeTimeValue(value?: string | null) {
  if (!value) {
    return "";
  }

  const match = normalizeWhitespace(value.toLowerCase()).match(
    /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/
  );

  if (!match) {
    return "";
  }

  const hour = Number(match[1]);
  const minutes = match[2] ?? "00";
  const meridiem = match[3].toUpperCase();

  if (hour < 1 || hour > 12) {
    return "";
  }

  return `${hour}:${minutes} ${meridiem}`;
}

function buildTimeLabel(startTime: string, endTime: string, fallback?: string) {
  if (startTime && endTime) {
    return `${startTime} - ${endTime}`;
  }

  if (startTime) {
    return startTime;
  }

  if (endTime) {
    return `Until ${endTime}`;
  }

  return fallback ? normalizeTimeValue(fallback) : "";
}

function inferCategory(title: string, description = "") {
  const haystack = `${title} ${description}`.toLowerCase();

  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((keyword) => haystack.includes(keyword))) {
      return rule.category;
    }
  }

  return "General";
}

function inferPriority(category: string, title: string) {
  const haystack = `${category} ${title}`.toLowerCase();

  if (haystack.includes("work") || haystack.includes("meeting")) {
    return "high";
  }

  if (haystack.includes("travel") || haystack.includes("doctor")) {
    return "medium";
  }

  return "medium";
}

function generateTaskDescription(task: {
  title: string;
  category: string;
  startTime: string;
  endTime: string;
}) {
  if (task.startTime && task.endTime) {
    const knownByCategory: Record<string, string> = {
      Work: "Scheduled work block.",
      School: "Scheduled class block.",
      Travel: "Travel window reserved.",
      Sports: "Activity block scheduled.",
      Social: "Planned social time.",
    };

    return knownByCategory[task.category] ?? "Scheduled time block.";
  }

  const knownByCategory: Record<string, string> = {
    Spiritual: "Set aside as a personal priority.",
    Work: "Work item on your schedule.",
    School: "Academic item on your schedule.",
    Travel: "Travel-related item on your schedule.",
    Sports: "Activity planned for this time.",
    Social: "Social activity planned for this time.",
  };

  return knownByCategory[task.category] ?? "Planned item for your schedule.";
}

function inferRecurring(value: string): Pick<
  OrganizedTask,
  "isRecurring" | "frequency" | "recurringDay"
> {
  const haystack = value.toLowerCase();
  const weekdays = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const weekday = weekdays.find((day) =>
    haystack.includes(`every ${day.toLowerCase()}`)
  );

  if (
    haystack.includes("every day") ||
    haystack.includes("daily") ||
    haystack.includes("every morning")
  ) {
    return { isRecurring: true, frequency: "daily", recurringDay: null };
  }

  if (weekday || haystack.includes("every week") || haystack.includes("weekly")) {
    return {
      isRecurring: true,
      frequency: "weekly",
      recurringDay: weekday || null,
    };
  }

  if (haystack.includes("monthly") || haystack.includes("every month")) {
    return { isRecurring: true, frequency: "monthly", recurringDay: null };
  }

  return { isRecurring: false, frequency: undefined, recurringDay: null };
}

function normalizeTask(task: RawTaskInput, fallbackDate: string): OrganizedTask {
  const startTime = normalizeTimeValue(task.startTime ?? task.time ?? task.timeLabel);
  const endTime = normalizeTimeValue(task.endTime);
  const title = normalizeWhitespace(String(task.title ?? "Untitled task")) || "Untitled task";
  const description = normalizeWhitespace(String(task.description ?? ""));
  const category =
    normalizeWhitespace(String(task.category ?? "")) ||
    inferCategory(title, description);

  const normalizedPriority = String(task.priority ?? inferPriority(category, title)).toLowerCase();
  const priority: TaskPriority =
    normalizedPriority === "high" ||
    normalizedPriority === "low" ||
    normalizedPriority === "medium"
      ? normalizedPriority
      : "medium";
  const recurring = task.isRecurring
    ? {
        isRecurring: true,
        frequency:
          task.frequency === "daily" ||
          task.frequency === "weekly" ||
          task.frequency === "monthly"
            ? task.frequency
            : inferRecurring(`${title} ${description}`).frequency,
        recurringDay: task.recurringDay ?? null,
      }
    : inferRecurring(`${title} ${description}`);

  return {
    title,
    date: String(task.date ?? fallbackDate),
    startTime,
    endTime,
    timeLabel: buildTimeLabel(startTime, endTime, task.timeLabel ?? task.time),
    category,
    priority,
    description: description || generateTaskDescription({ title, category, startTime, endTime }),
    isRecurring: recurring.isRecurring,
    frequency: recurring.frequency,
    recurringDay: recurring.recurringDay ?? null,
  };
}

function extractJsonArray(raw: string) {
  const trimmed = raw.trim();

  if (!trimmed) {
    throw new Error("Empty AI response");
  }

  if (trimmed.startsWith("[")) {
    return trimmed;
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }

  const arrayStart = trimmed.indexOf("[");
  const arrayEnd = trimmed.lastIndexOf("]");

  if (arrayStart >= 0 && arrayEnd > arrayStart) {
    return trimmed.slice(arrayStart, arrayEnd + 1);
  }

  throw new Error("No JSON array found in AI response");
}

function resolveDateLabel(rawDate: string, baseDate: Date) {
  const match = normalizeWhitespace(rawDate.toLowerCase()).match(
    /^(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:,\s*(\d{4}))?$/
  );

  if (!match) {
    return getDateKeyInTimezone(baseDate);
  }

  const monthIndex = MONTHS.indexOf(match[1] as (typeof MONTHS)[number]);
  const day = Number(match[2]);
  const year = match[3] ? Number(match[3]) : baseDate.getFullYear();
  const resolvedDate = new Date(year, monthIndex, day);

  if (!match[3] && resolvedDate < new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() - 1)) {
    resolvedDate.setFullYear(year + 1);
  }

  return getDateKeyInTimezone(resolvedDate);
}

function splitIntoDateSections(input: string, baseDate: Date) {
  const fallbackDate = getDateKeyInTimezone(baseDate);
  const pattern =
    /((?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}(?:,\s*\d{4})?)([\s\S]*?)(?=(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}(?:,\s*\d{4})?|$)/gi;

  const sections = Array.from(input.matchAll(pattern)).map((match) => ({
    date: resolveDateLabel(match[1], baseDate),
    text: normalizeWhitespace(match[2].replace(/^[,:-]+/, " ")),
  }));

  if (sections.length > 0) {
    return sections;
  }

  const relativeSections = [
    { label: "day after tomorrow", date: addDaysToDateKey(fallbackDate, 2) },
    { label: "next tomorrow", date: addDaysToDateKey(fallbackDate, 2) },
    { label: "tomorrow", date: addDaysToDateKey(fallbackDate, 1) },
    { label: "today", date: fallbackDate },
  ]
    .map((entry) => {
      const match = input.match(new RegExp(`\\b${entry.label}\\b`, "i"));

      if (!match || match.index === undefined) {
        return null;
      }

      return {
        index: match.index,
        length: match[0].length,
        date: entry.date,
      };
    })
    .filter((entry): entry is { index: number; length: number; date: string } => Boolean(entry))
    .sort((a, b) => a.index - b.index);

  if (relativeSections.length > 0) {
    return relativeSections.map((section, index) => {
      const start = section.index + section.length;
      const end =
        index + 1 < relativeSections.length
          ? relativeSections[index + 1].index
          : input.length;

      return {
        date: section.date,
        text: normalizeWhitespace(input.slice(start, end).replace(/^[,:-]+/, " ")),
      };
    });
  }

  return [{ date: fallbackDate, text: normalizeWhitespace(input) }];
}

function expandCompoundClauses(clause: string) {
  const parts = clause
    .split(/\s+(?:and|then|unya|sunod|katapos|tapos|og)\s+/i)
    .map((part) => normalizeWhitespace(part.replace(/^[,.;]+|[,.;]+$/g, "")))
    .filter(Boolean);

  if (parts.length <= 1) {
    return [clause];
  }

  const expanded: string[] = [];
  let inheritedStartTime = "";

  for (const part of parts) {
    const explicitStart = part.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm))/i)?.[1] ?? "";
    if (explicitStart) {
      inheritedStartTime = explicitStart;
      expanded.push(part);
      continue;
    }

    if (inheritedStartTime && /\b(?:until|hangtod|until sa|kutob sa)\b/i.test(part)) {
      expanded.push(`${inheritedStartTime} ${part}`);
      continue;
    }

    expanded.push(part);
  }

  return expanded;
}

function parseClauseToTask(clause: string, date: string) {
  const cleanedClause = normalizeWhitespace(clause.replace(/^[,.;]+|[,.;]+$/g, ""));
  if (!cleanedClause) {
    return null;
  }

  let titleText = cleanedClause;
  let startTime = "";
  let endTime = "";

  const rangeMatch = titleText.match(
    /(\d{1,2}(?::\d{2})?\s*(?:am|pm))\s*(?:to|-)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm))/i
  );

  if (rangeMatch) {
    startTime = normalizeTimeValue(rangeMatch[1]);
    endTime = normalizeTimeValue(rangeMatch[2]);
    titleText = normalizeWhitespace(titleText.replace(rangeMatch[0], " "));
  } else {
    const untilMatch = titleText.match(/\buntil\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm))/i);
    if (untilMatch) {
      endTime = normalizeTimeValue(untilMatch[1]);
      titleText = normalizeWhitespace(titleText.replace(untilMatch[0], " "));
    }

    const singleTimeMatch = titleText.match(/(^|\b)(\d{1,2}(?::\d{2})?\s*(?:am|pm))\b/i);
    if (singleTimeMatch) {
      startTime = normalizeTimeValue(singleTimeMatch[2]);
      titleText = normalizeWhitespace(titleText.replace(singleTimeMatch[0], " "));
    }
  }

  titleText = normalizeWhitespace(
    titleText
      .replace(/\b(at|on|for|karong|ugma|sunod|sa)\b/gi, " ")
      .replace(/\bgoing to\b/gi, "Go to")
      .replace(/\btrabaho\b/gi, "Work")
      .replace(/\bklase\b/gi, "Class")
      .replace(/\bsimba\b/gi, "Church")
  );

  const title = toTitleCase(titleText) || "Untitled task";

  return normalizeTask(
    {
      title,
      date,
      startTime,
      endTime,
      description: "",
    },
    date
  );
}

function generateFallbackTasks(input: string, baseDate: Date): OrganizedTask[] {
  const sections = splitIntoDateSections(input, baseDate);
  const tasks: OrganizedTask[] = [];

  for (const section of sections) {
    const clauses = section.text
      .split(/[,\n]+/)
      .flatMap((clause) => expandCompoundClauses(clause))
      .map((clause) => normalizeWhitespace(clause))
      .filter(Boolean);

    for (const clause of clauses) {
      const parsed = parseClauseToTask(clause, section.date);
      if (parsed) {
        tasks.push(parsed);
      }
    }
  }

  if (tasks.length > 0) {
    return tasks;
  }

  return [
    normalizeTask(
      {
        title: input.substring(0, 80).trim() || "New task",
        date: getDateKeyInTimezone(baseDate),
        description: input,
      },
      getDateKeyInTimezone(baseDate)
    ),
  ];
}

export async function POST(req: Request) {
  try {
    const { input } = await req.json();

    if (!input || typeof input !== "string") {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const baseDate = new Date();
    const fallbackDate = getDateKeyInTimezone(baseDate);
    let tasks: OrganizedTask[];
    const aiClient = await getAiClient();

    if (aiClient && process.env.GEMINI_API_KEY) {
      try {
        const prompt = `
You are an AI organizer. Convert the user's schedule into structured JSON.

Rules:
- Return ONLY a valid JSON array.
- Each item must have: title, date, startTime, endTime, category, priority, description, isRecurring, frequency, recurringDay.
- date must be YYYY-MM-DD.
- startTime and endTime must be in HH:MM AM/PM format or an empty string.
- Understand English, Tagalog, Bisaya, and mixed-language inputs.
- Words like "trabaho", "klase", "simba", "laag", "karong", and "unya" may appear.
- If the user gives a time range like "10 am to 12 pm", put 10:00 AM in startTime and 12:00 PM in endTime.
- If the user gives a single time like "8 am church", put it in startTime and leave endTime empty.
- Split different activities into separate tasks, even when they are listed in one sentence.
- If the user chains activities with words like "then", "unya", or "tapos", split them into separate tasks.
- Respect grouped dates like "April 19 ..." and "April 20 ...".
- Choose a practical category such as Work, Travel, Social, Spiritual, Health, Shopping, Finance, School, Sports, or Personal.
- Priority must be one of low, medium, or high.
- If the user mentions "every day", "daily", "every week", "every [weekday]", "weekly", "monthly", "every morning", or any recurring pattern, include in that task's JSON: {"isRecurring": true, "frequency": "daily" | "weekly" | "monthly", "recurringDay": "Monday" | "Tuesday" | ... | null}.
- For non-recurring tasks: "isRecurring": false, "frequency": null, and "recurringDay": null.
- Resolve relative dates using timezone ${APP_TIMEZONE}.
- Use ${fallbackDate} if a date is missing.
- Do not include markdown fences or explanations.

User input: ${input}
`;

        const response = await aiClient.models.generateContent({
          model: "gemini-2.0-flash",
          contents: prompt,
        });

        const rawText = response.text ?? "";
        const parsed = JSON.parse(extractJsonArray(rawText));

        if (!Array.isArray(parsed)) {
          throw new Error("AI response was not an array");
        }

        tasks = parsed.map((task) => normalizeTask(task, fallbackDate));
      } catch (aiError) {
        console.log("AI parsing failed, falling back to local parser:", aiError);
        tasks = generateFallbackTasks(input, baseDate);
      }
    } else {
      tasks = generateFallbackTasks(input, baseDate);
    }

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error("Organize error:", error);
    return NextResponse.json(
      { error: "Failed to organize tasks", details: String(error) },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const { tasks } = await req.json();

    if (!Array.isArray(tasks)) {
      return NextResponse.json({ error: "Invalid tasks" }, { status: 400 });
    }

    const { prisma } = await import("@/src/lib/db");

    const created = await prisma.task.createMany({
      data: tasks.map((task: RawTaskInput) => {
        const normalized = normalizeTask(task, getDateKeyInTimezone(new Date()));
        return {
          title: normalized.title,
          description: normalized.description || null,
          date: new Date(`${normalized.date}T00:00:00`),
          timeLabel: normalized.timeLabel || null,
          startTime: normalized.startTime || null,
          endTime: normalized.endTime || null,
          category: normalized.category,
          priority: normalized.priority,
          status: String(task.status ?? "pending"),
          isRecurring: normalized.isRecurring,
          frequency: normalized.frequency || null,
          recurringDay: normalized.recurringDay || null,
        };
      }),
    });

    return NextResponse.json({ created });
  } catch (error) {
    console.error("Save tasks error:", error);
    return NextResponse.json(
      { error: "Failed to save tasks", details: String(error) },
      { status: 500 }
    );
  }
}
