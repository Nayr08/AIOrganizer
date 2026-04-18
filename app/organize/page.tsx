"use client";

import { useEffect, useRef, useState } from "react";
import {
  Button,
  Card,
  Textarea,
  LoadingState,
  TaskCard,
  LottiePlayer,
} from "@/src/components";
import {
  Clock3,
  MessageSquareText,
  Mic,
  Plus,
  Sparkles,
  X,
} from "lucide-react";
import type { Task } from "@/src/components/TaskCard";
import {
  APP_TIMEZONE,
  compareDateKeys,
  getDateKeyInTimezone,
  getTimezoneNowLabel,
  timeLabelToMinutes,
} from "@/src/lib/datetime";
import robotSaysHiAnimation from "@/public/lottie/Robot Says Hi.json";

const ORGANIZE_MIN_LOADING_MS = 3000;

const EXAMPLE_PROMPTS = [
  "Buy groceries tomorrow morning, gym Tuesday 6pm, call mom this weekend",
  "Finish project by Friday, meeting Monday 2pm, review documents today",
  "April 19 8am church, 10 am to 12pm meeting, 2 pm meetup with bros, 4pm to 11pm work. April 20 8 am to 2pm going to province, 4 pm meeting and work until 11pm.",
];

type OrganizedTaskResponse = Partial<
  Pick<
    Task,
    "title" | "date" | "time" | "startTime" | "endTime" | "description" | "category" | "priority"
  >
> & {
  timeLabel?: string;
};

type OrganizeMode = "replace" | "append";
type VoiceMode = "mixed-ph" | "english";

type SpeechRecognitionResultShape = ArrayLike<{ transcript: string }>;

type SpeechRecognitionEventShape = Event & {
  results: ArrayLike<SpeechRecognitionResultShape>;
};

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onend: (() => void) | null;
  onerror: ((event: Event) => void) | null;
  onresult: ((event: SpeechRecognitionEventShape) => void) | null;
  start(): void;
  stop(): void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

function sortTasks(tasks: Task[]) {
  return [...tasks].sort((left, right) => {
    const dateDiff = compareDateKeys(left.date, right.date);
    if (dateDiff !== 0) {
      return dateDiff;
    }

    return (
      (timeLabelToMinutes(left.startTime || left.time) ?? Number.MAX_SAFE_INTEGER) -
      (timeLabelToMinutes(right.startTime || right.time) ?? Number.MAX_SAFE_INTEGER)
    );
  });
}

export default function OrganizePage() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState("");
  const [nowLabel, setNowLabel] = useState(() => getTimezoneNowLabel());
  const [addMoreModalOpen, setAddMoreModalOpen] = useState(false);
  const [organizeMode, setOrganizeMode] = useState<OrganizeMode>("replace");
  const [isListening, setIsListening] = useState(false);
  const [voiceMode, setVoiceMode] = useState<VoiceMode>("mixed-ph");
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const lastTranscriptRef = useRef("");

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNowLabel(getTimezoneNowLabel());
    }, 30_000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  const parseApiResponse = async (response: Response) => {
    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      return response.json();
    }

    const text = await response.text();
    throw new Error(
      text.includes("<!DOCTYPE")
        ? "The server returned an invalid response. Check the API route for build errors."
        : text || "Unexpected server response"
    );
  };

  const mapTasks = (organizedTasks: OrganizedTaskResponse[]) =>
    organizedTasks.map((task: OrganizedTaskResponse, idx: number) => ({
      id: `temp-${Date.now()}-${idx}`,
      title: task.title || "Untitled",
      date: task.date || getDateKeyInTimezone(),
      time: task.time || task.timeLabel || undefined,
      startTime: task.startTime || undefined,
      endTime: task.endTime || undefined,
      description: task.description || undefined,
      category: task.category || "General",
      priority: (task.priority?.toLowerCase() as Task["priority"]) || "medium",
      status: "pending" as const,
    }));

  const handleOrganize = async () => {
    if (!input.trim()) return;

    setLoading(true);
    setShowResults(true);
    setError("");

    try {
      const minimumLoadingDelay = new Promise((resolve) => {
        window.setTimeout(resolve, ORGANIZE_MIN_LOADING_MS);
      });

      const requestPromise = (async () => {
        const response = await fetch("/api/organize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input }),
        });

        const data = await parseApiResponse(response);
        return { response, data };
      })();

      const [{ response, data }] = await Promise.all([
        requestPromise,
        minimumLoadingDelay,
      ]);

      if (!response.ok) {
        throw new Error(data.error || "Failed to organize tasks");
      }

      const nextTasks = mapTasks(data.tasks || []);
      setTasks((currentTasks) =>
        sortTasks(
          organizeMode === "append" ? [...currentTasks, ...nextTasks] : nextTasks
        )
      );
      setOrganizeMode("replace");
      setInput("");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An error occurred";
      setError(errorMessage);
      console.error("Error organizing tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTasks = async () => {
    if (tasks.length === 0) return;

    setSaving(true);
    setError("");

    try {
      const response = await fetch("/api/organize", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks }),
      });

      const data = await parseApiResponse(response);

      if (!response.ok) {
        throw new Error(data.details || data.error || "Failed to save tasks");
      }

      setInput("");
      setTasks([]);
      setShowResults(false);
      alert("Tasks saved successfully!");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to save tasks";
      setError(errorMessage);
      console.error("Error saving tasks:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTask = (id: string) => {
    setTasks((currentTasks) => currentTasks.filter((task) => task.id !== id));
  };

  const handleDescriptionChange = (id: string, description: string) => {
    setTasks((currentTasks) =>
      currentTasks.map((task) =>
        task.id === id ? { ...task, description } : task
      )
    );
  };

  const openVoiceInput = () => {
    const RecognitionCtor =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!RecognitionCtor) {
      setError("Voice input is not supported in this browser.");
      return;
    }

    recognitionRef.current?.stop();

    const recognition = new RecognitionCtor();
    recognition.lang = voiceMode === "english" ? "en-PH" : "fil-PH";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const latestResult = event.results[event.results.length - 1];
      const transcript = latestResult?.[0]?.transcript?.trim() ?? "";

      if (!transcript) {
        return;
      }

      if (
        transcript.toLowerCase() === lastTranscriptRef.current.toLowerCase()
      ) {
        return;
      }

      setInput((currentInput) =>
        currentInput.trim()
          ? `${currentInput.trim().replace(/[,\s]+$/, "")}, ${transcript}`
          : transcript
      );
      lastTranscriptRef.current = transcript;
      setError("");
    };

    recognition.onerror = () => {
      setError("Voice input could not capture your prompt.");
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
      lastTranscriptRef.current = "";
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  const handleAddMoreChoice = (mode: OrganizeMode) => {
    setAddMoreModalOpen(false);
    setOrganizeMode(mode);
    if (mode === "replace") {
      setTasks([]);
    }
    setInput("");
    setShowResults(false);
    setError("");
  };

  return (
    <div className="min-h-screen w-full bg-[#212121]">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {!showResults ? (
          <div className="space-y-6">
            <div className="relative overflow-hidden rounded-[32px] border border-[#3e404b] bg-[#2f2f2f] p-6 sm:p-8">
              <div className="mb-6 flex items-start gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#4a4b57] bg-[#40414f]">
                  <MessageSquareText className="h-5 w-5 text-[#10a37f]" />
                </div>
                <div className="space-y-2">
                  <h1 className="text-3xl font-semibold text-[#f7f7f8] sm:text-4xl">
                    Organize your plans
                  </h1>
                  <p className="max-w-2xl text-sm leading-6 text-[#a9aab5] sm:text-base">
                    Paste errands, meetings, shifts, and trips in one message. The
                    organizer will break them into date-based task cards.
                  </p>
                  <div className="inline-flex items-center gap-2 rounded-full border border-[#4a4b57] bg-[#343541] px-3 py-1.5 text-xs text-[#c5c6d0]">
                    <Clock3 className="h-3.5 w-3.5 text-[#10a37f]" />
                    Based on {APP_TIMEZONE}: {nowLabel}
                  </div>
                </div>
              </div>

              <Card className="bg-[#343541] p-4 sm:p-5">
                <div className="grid gap-4 lg:grid-cols-[180px_minmax(0,1fr)]">
                  <div className="rounded-[28px] border border-[#4a4b57] bg-[#40414f] p-3">
                    <LottiePlayer
                      animationData={robotSaysHiAnimation}
                      className="mx-auto h-28 w-28 sm:h-32 sm:w-32"
                    />
                    <p className="mt-2 text-center text-xs leading-5 text-[#a9aab5]">
                      Speak or type your schedule. Commas help the AI separate each activity.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <Textarea
                      placeholder="Try: April 24 8am basketball, 10am to 12pm klase, 4pm to 11pm trabaho."
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      className="min-h-44 border-[#565869] bg-[#40414f]"
                    />

                    <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                      <p className="text-xs leading-5 text-[#8e8ea0]">
                        Date groups, time ranges, and words like tomorrow use Manila time. Separate each task with commas for the cleanest AI breakdown.
                      </p>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <select
                          value={voiceMode}
                          onChange={(event) =>
                            setVoiceMode(event.target.value as VoiceMode)
                          }
                          className="rounded-2xl border border-[#4a4b57] bg-[#343541] px-3 py-3 text-sm text-[#ececf1] transition-colors focus:border-[#10a37f] focus:ring-2 focus:ring-[#10a37f]/20"
                        >
                          <option value="mixed-ph">Voice: Filipino / Mixed</option>
                          <option value="english">Voice: English</option>
                        </select>
                        <Button
                          variant="secondary"
                          onClick={openVoiceInput}
                          disabled={loading || isListening}
                          className="w-full sm:w-auto"
                        >
                          <Mic className="h-4 w-4" />
                          {isListening ? "Listening..." : "Use Voice"}
                        </Button>
                        <Button
                          onClick={handleOrganize}
                          size="lg"
                          disabled={!input.trim() || loading}
                          className="w-full sm:w-auto"
                        >
                          <Sparkles className="h-4 w-4" />
                          Organize Now
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {tasks.length > 0 && (
              <Card className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-base font-semibold text-[#f7f7f8]">
                    Draft tasks ready to save
                  </p>
                  <p className="mt-1 text-sm text-[#a9aab5]">
                    {tasks.length} tasks are currently in your draft.
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button variant="secondary" onClick={() => setShowResults(true)}>
                    Review Draft
                  </Button>
                </div>
              </Card>
            )}

            <div className="grid gap-3 sm:grid-cols-3">
              {EXAMPLE_PROMPTS.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => setInput(prompt)}
                  className="rounded-3xl border border-[#3e404b] bg-[#2f2f2f] p-4 text-left text-sm leading-6 text-[#c5c6d0] transition-colors hover:bg-[#343541]"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col gap-4 rounded-[32px] border border-[#3e404b] bg-[#2f2f2f] p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-[#f7f7f8] sm:text-3xl">
                  Organized tasks
                </h2>
                <p className="mt-2 text-sm text-[#a9aab5]">
                  {tasks.length} {tasks.length === 1 ? "task" : "tasks"} ready to save
                </p>
              </div>
              <Button variant="secondary" onClick={() => setAddMoreModalOpen(true)}>
                <Plus className="h-4 w-4" />
                Add More Tasks
              </Button>
            </div>

            {error && (
              <Card className="border-red-500/20 bg-red-500/10">
                <p className="text-sm text-red-300">{error}</p>
              </Card>
            )}

            {loading ? (
              <LoadingState />
            ) : tasks.length === 0 ? (
              <Card className="py-12 text-center">
                <p className="text-[#a9aab5]">No tasks generated. Try again.</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {tasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onDelete={handleDeleteTask}
                    editableNotes
                    onDescriptionChange={handleDescriptionChange}
                    showStatusActions={false}
                  />
                ))}

                <div className="sticky bottom-20 rounded-3xl border border-[#3e404b] bg-[#212121]/95 p-3 backdrop-blur md:bottom-6">
                  <Button
                    size="lg"
                    className="w-full"
                    isLoading={saving}
                    disabled={saving}
                    onClick={handleSaveTasks}
                  >
                    <Sparkles className="h-4 w-4" />
                    {saving ? "Saving..." : "Save Tasks to Database"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {addMoreModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4">
          <div className="w-full max-w-lg rounded-[28px] border border-[#3e404b] bg-[#2f2f2f] p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-[#f7f7f8]">
                  Tasks ready to save
                </h3>
                <p className="mt-2 text-sm leading-6 text-[#a9aab5]">
                  You already have {tasks.length} draft tasks. Choose how you want
                  to continue.
                </p>
              </div>
              <button
                onClick={() => setAddMoreModalOpen(false)}
                className="rounded-xl border border-[#4a4b57] p-2 text-[#c5c6d0] transition-colors hover:bg-[#343541] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => handleAddMoreChoice("append")}
                className="w-full rounded-2xl border border-[#10a37f]/25 bg-[#10a37f]/10 px-4 py-4 text-left transition-colors hover:bg-[#10a37f]/15"
              >
                <p className="font-medium text-[#f7f7f8]">Keep draft and add another prompt</p>
                <p className="mt-1 text-sm text-[#a9aab5]">
                  Return to the prompt box and merge the next AI result with your current draft.
                </p>
              </button>

              <button
                onClick={() => handleAddMoreChoice("replace")}
                className="w-full rounded-2xl border border-[#4a4b57] bg-[#343541] px-4 py-4 text-left transition-colors hover:bg-[#40414f]"
              >
                <p className="font-medium text-[#f7f7f8]">Start a fresh prompt</p>
                <p className="mt-1 text-sm text-[#a9aab5]">
                  Clear the current draft and organize a new set of tasks.
                </p>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
