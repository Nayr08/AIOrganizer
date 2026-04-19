"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BriefcaseBusiness,
  CalendarDays,
  ChevronRight,
  Clock3,
  Layers3,
  Mic,
  Plus,
  Sparkles,
  X,
} from "lucide-react";
import { LoadingState, TaskCard } from "@/src/components";
import type { Task } from "@/src/components/TaskCard";
import {
  APP_TIMEZONE,
  compareDateKeys,
  formatDateWithMonthName,
  getDateKeyInTimezone,
  timeLabelToMinutes,
} from "@/src/lib/datetime";

const ORGANIZE_MIN_LOADING_MS = 3000;

const EXAMPLE_PROMPTS = [
  {
    label: "DAILY SCHEDULE",
    prompt:
      "April 24 8am basketball, 10am to 12pm klase, 4pm to 11pm trabaho.",
    Icon: CalendarDays,
  },
  {
    label: "WORK WEEK",
    prompt:
      "Monday 9am team sync, Tuesday 1pm client review, Wednesday to Friday focus work blocks.",
    Icon: BriefcaseBusiness,
  },
  {
    label: "MULTI-DAY",
    prompt:
      "April 19 8am church, 10am to 12pm meeting, April 20 8am to 2pm going to province.",
    Icon: Layers3,
  },
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
type VoiceState = "idle" | "recording" | "done";

type TranscriptSegment = {
  id: string;
  text: string;
  uncertain: boolean;
};

type SpeechRecognitionErrorEvent = Event & {
  error: string;
};

type SpeechRecognitionResultItem = {
  transcript: string;
  confidence: number;
};

type SpeechRecognitionResult = {
  0: SpeechRecognitionResultItem;
  isFinal: boolean;
};

type SpeechRecognitionResultList = {
  length: number;
  [index: number]: SpeechRecognitionResult;
};

type SpeechRecognitionEvent = Event & {
  resultIndex: number;
  results: SpeechRecognitionResultList;
};

type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

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

function splitTranscriptIntoSegments(text: string, uncertain: boolean) {
  return text
    .split(/(\s+)/)
    .filter(Boolean)
    .map((part, index) => ({
      id: `${Date.now()}-${index}-${part}`,
      text: part,
      uncertain: uncertain && part.trim().length > 0,
    }));
}

export default function OrganizePage() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState("");
  const [dateLabel, setDateLabel] = useState(() =>
    formatDateWithMonthName(getDateKeyInTimezone())
  );
  const [addMoreModalOpen, setAddMoreModalOpen] = useState(false);
  const [organizeMode, setOrganizeMode] = useState<OrganizeMode>("replace");
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [voiceSupported, setVoiceSupported] = useState(true);
  const [voiceError, setVoiceError] = useState("");
  const [retryBarVisible, setRetryBarVisible] = useState(false);
  const [transcriptSegments, setTranscriptSegments] = useState<TranscriptSegment[]>([]);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [selectedUncertainId, setSelectedUncertainId] = useState("");
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const startRecognitionRef = useRef<
    ((options?: { clearInput?: boolean; lang?: string }) => void) | null
  >(null);
  const finalTextRef = useRef("");
  const finalSegmentsRef = useRef<TranscriptSegment[]>([]);
  const confidenceScoresRef = useRef<number[]>([]);
  const inputRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setDateLabel(formatDateWithMonthName(getDateKeyInTimezone()));
    }, 30_000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setVoiceSupported(
        Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)
      );
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
    };
  }, []);

  const handleInputChange = () => {
    const nextInput = inputRef.current?.textContent || "";
    setInput(nextInput);
    setTranscriptSegments([]);
    setInterimTranscript("");
    setSelectedUncertainId("");
    setRetryBarVisible(false);
    finalTextRef.current = nextInput;
    finalSegmentsRef.current = nextInput
      ? [{ id: "typed-input", text: nextInput, uncertain: false }]
      : [];
    if (!nextInput.trim()) {
      setVoiceState("idle");
    }
  };

  const stopRecognition = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const startRecognition = useCallback(
    (options?: { clearInput?: boolean; lang?: string }) => {
      if (typeof window === "undefined") {
        return;
      }

      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;

      if (!SpeechRecognition) {
        setVoiceSupported(false);
        setVoiceError("");
        return;
      }

      recognitionRef.current?.abort();

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.lang = "fil-PH";
      if (options?.lang) {
        recognition.lang = options.lang;
      }
      confidenceScoresRef.current = [];

      if (options?.clearInput) {
        setInput("");
        setTranscriptSegments([]);
        setInterimTranscript("");
        finalTextRef.current = "";
        finalSegmentsRef.current = [];
      } else {
        finalTextRef.current = input;
        finalSegmentsRef.current = input
          ? [{ id: "existing-input", text: input, uncertain: false }]
          : [];
      }

      setVoiceState("recording");
      setVoiceError("");
      setRetryBarVisible(false);
      window.setTimeout(() => inputRef.current?.focus(), 0);

      recognition.onresult = (event) => {
        let nextInterimText = "";
        const nextFinalSegments: TranscriptSegment[] = [];

        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const result = event.results[index];
          const transcript = result[0].transcript;
          const confidence = result[0].confidence;

          if (result.isFinal) {
            confidenceScoresRef.current = [
              ...confidenceScoresRef.current,
              confidence,
            ];
            nextFinalSegments.push(
              ...splitTranscriptIntoSegments(transcript, confidence < 0.8)
            );
          } else {
            nextInterimText += transcript;
          }
        }

        if (nextFinalSegments.length > 0) {
          finalSegmentsRef.current = [
            ...finalSegmentsRef.current,
            ...nextFinalSegments,
          ];
          finalTextRef.current = `${finalTextRef.current}${nextFinalSegments
            .map((segment) => segment.text)
            .join("")}`;
        }

        setTranscriptSegments(finalSegmentsRef.current);
        setInterimTranscript(nextInterimText);
        setInput(`${finalTextRef.current}${nextInterimText}`);
      };

      recognition.onerror = (event) => {
        if (event.error === "not-allowed") {
          setVoiceError(
            "Microphone access denied. Enable it in your browser settings."
          );
          setVoiceState("idle");
        } else if (event.error === "no-speech") {
          setVoiceError("No speech detected - try again.");
          setVoiceState("idle");
          window.setTimeout(() => setVoiceError(""), 2000);
        } else if (event.error === "network") {
          setVoiceError("Voice requires an internet connection.");
          setVoiceState("idle");
        }
      };

      recognition.onend = () => {
        const confidenceScores = confidenceScoresRef.current;
        const avgConfidence =
          confidenceScores.length > 0
            ? confidenceScores.reduce((sum, score) => sum + score, 0) /
              confidenceScores.length
            : 1;
        const lowConfidenceWordCount = finalSegmentsRef.current.filter(
          (segment) => segment.uncertain
        ).length;

        setInterimTranscript("");
        setInput(finalTextRef.current);
        setTranscriptSegments(finalSegmentsRef.current);
        setRetryBarVisible(
          finalTextRef.current.trim().length > 0 &&
            (avgConfidence < 0.75 || lowConfidenceWordCount > 2)
        );
        confidenceScoresRef.current = [];
        setVoiceState(finalTextRef.current.trim() ? "done" : "idle");
      };

      recognitionRef.current = recognition;

      try {
        recognition.start();
      } catch {
        recognition.lang = "en-US";
        recognition.start();
      }
    },
    [input]
  );

  useEffect(() => {
    startRecognitionRef.current = startRecognition;
  }, [startRecognition]);

  const handleVoiceClick = () => {
    if (voiceState === "recording") {
      stopRecognition();
      return;
    }

    startRecognition({ clearInput: voiceState === "done" });
  };

  const hideRetryBar = () => {
    setRetryBarVisible(false);
  };

  const retryWithLang = (lang: string) => {
    setRetryBarVisible(false);
    setInput("");
    setTranscriptSegments([]);
    setInterimTranscript("");
    setSelectedUncertainId("");
    finalTextRef.current = "";
    finalSegmentsRef.current = [];
    confidenceScoresRef.current = [];
    startRecognition({ clearInput: true, lang });
  };

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
    } catch (organizeError) {
      const errorMessage =
        organizeError instanceof Error ? organizeError.message : "An error occurred";
      setError(errorMessage);
      console.error("Error organizing tasks:", organizeError);
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
    } catch (saveError) {
      const errorMessage =
        saveError instanceof Error ? saveError.message : "Failed to save tasks";
      setError(errorMessage);
      console.error("Error saving tasks:", saveError);
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

  const hasInput = input.trim().length > 0;
  const voiceHint =
    voiceState === "recording"
      ? "Speaking... words appear as you talk. Dashed words were unclear - tap to fix."
      : voiceState === "done"
        ? "Looks good - fix anything above then hit Organize Now."
        : "Separate each task with a comma for the most accurate breakdown.";
  const voiceHintClass =
    voiceState === "recording"
      ? "text-[rgba(79,142,247,0.65)]"
      : voiceState === "done"
        ? "text-[#55534E]"
        : "text-[var(--text-muted)]";
  const voiceButtonRecording = voiceState === "recording";
  const voiceButtonLabel = voiceButtonRecording
    ? "Listening... tap to stop"
    : voiceState === "done"
      ? "Re-record"
      : "Use Voice";

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--bg-base)]">
      <style jsx global>{`
        @keyframes wave {
          from {
            height: 4px;
          }
          to {
            height: 14px;
          }
        }

        .wave-bar {
          width: 3px;
          height: 4px;
          border-radius: 2px;
          background: #e24b4a;
          animation: wave 0.8s ease-in-out infinite alternate;
        }
      `}</style>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[340px]"
        style={{
          background:
            "radial-gradient(ellipse 70% 40% at 50% 0%, rgba(79,142,247,0.10) 0%, transparent 70%)",
        }}
      />

      <div className="relative mx-auto w-full max-w-[760px] px-8 py-10 max-sm:px-6">
        {!showResults ? (
          <div className="space-y-8">
            <div className="space-y-3 pt-4">
              <h1
                className="text-[clamp(2.2rem,5vw,3.3rem)] font-semibold leading-[1.08] tracking-[-0.02em] text-[var(--text-primary)]"
                style={{ fontFamily: "Fraunces, serif" }}
              >
                Organize your plans
              </h1>
              <p className="max-w-[500px] text-[15px] leading-[1.7] text-[var(--text-secondary)]">
                Paste errands, meetings, shifts, and trips in one message. The
                organizer will break them into clear date-based task cards.
              </p>
              <div className="inline-flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
                <Clock3 className="h-[14px] w-[14px] text-[var(--text-muted)]" />
                <span>{`\u00B7 ${APP_TIMEZONE} \u2014 ${dateLabel}`}</span>
              </div>
            </div>

            <div className="rounded-[16px] border border-[var(--border)] bg-[var(--bg-surface)] p-6">
              <div className="relative">
                {!input && voiceState !== "recording" && (
                  <p className="pointer-events-none absolute left-4 top-4 text-[15px] leading-[1.7] text-[var(--text-secondary)]">
                    Try: April 24 8am basketball, 10am to 12pm klase, 4pm to 11pm trabaho...
                  </p>
                )}
                <div
                  id="schedule-input"
                  ref={inputRef}
                  role="textbox"
                  aria-multiline="true"
                  contentEditable
                  suppressContentEditableWarning
                  onInput={handleInputChange}
                  className={`min-h-[160px] w-full resize-none overflow-y-auto rounded-[12px] border bg-[var(--bg-elevated)] px-4 py-4 text-[15px] leading-[1.7] text-[var(--text-primary)] transition-[border-color,box-shadow] duration-200 focus:border-[rgba(79,142,247,0.30)] focus:shadow-[inset_0_0_0_1px_rgba(79,142,247,0.35)] focus:outline-none ${
                    voiceState === "recording"
                      ? "border-[rgba(79,142,247,0.30)] shadow-[inset_0_0_0_1px_rgba(79,142,247,0.20)]"
                      : "border-[var(--border)]"
                  }`}
                >
                  {transcriptSegments.length > 0 ? (
                    <>
                      {transcriptSegments.map((segment) =>
                        segment.uncertain ? (
                          <span
                            key={segment.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => setSelectedUncertainId(segment.id)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                setSelectedUncertainId(segment.id);
                              }
                            }}
                            className={`uncertain-word text-[var(--text-secondary)] outline-none ${
                              selectedUncertainId === segment.id
                                ? "bg-[rgba(79,142,247,0.18)]"
                                : ""
                            }`}
                            style={{
                              borderBottom:
                                "1px dashed rgba(255,255,255,0.25)",
                            }}
                          >
                            {segment.text}
                          </span>
                        ) : (
                          <span key={segment.id}>{segment.text}</span>
                        )
                      )}
                      {interimTranscript && (
                        <span className="text-[rgba(79,142,247,0.78)]">
                          {interimTranscript}
                        </span>
                      )}
                    </>
                  ) : (
                    input
                  )}
                </div>
              </div>

              {retryBarVisible ? (
                <div
                  id="retry-bar"
                  className="mt-2 rounded-[10px] border border-[rgba(255,255,255,0.09)] bg-[rgba(255,255,255,0.03)] px-[14px] py-3"
                >
                  <p className="mb-[10px] text-[12px] leading-[1.5] text-[#8A8880]">
                    Some words may not have been captured clearly - try again in a different language?
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => retryWithLang("en-US")}
                      className="rounded-[8px] border border-[rgba(79,142,247,0.22)] bg-[rgba(79,142,247,0.10)] px-[14px] py-1.5 text-[12px] text-[#4F8EF7] transition-all duration-200 hover:-translate-y-px hover:bg-[rgba(79,142,247,0.14)]"
                    >
                      Try English
                    </button>
                    <button
                      type="button"
                      onClick={() => retryWithLang("fil-PH")}
                      className="rounded-[8px] border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.05)] px-[14px] py-1.5 text-[12px] text-[#8A8880] transition-all duration-200 hover:-translate-y-px hover:bg-[rgba(255,255,255,0.08)]"
                    >
                      Try Filipino
                    </button>
                    <button
                      type="button"
                      onClick={hideRetryBar}
                      className="rounded-[8px] border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.05)] px-[14px] py-1.5 text-[12px] text-[#8A8880] transition-all duration-200 hover:-translate-y-px hover:bg-[rgba(255,255,255,0.08)]"
                    >
                      Keep this & edit
                    </button>
                  </div>
                </div>
              ) : (
                <p className={`mt-3 text-[12px] leading-[1.6] ${voiceHintClass}`}>
                  {voiceHint}
                </p>
              )}

              <div className="mt-[14px] flex flex-col gap-[10px] sm:flex-row sm:items-center">
                {voiceSupported ? (
                  <div className="sm:relative">
                    <button
                      id="voice-btn"
                      type="button"
                      onClick={handleVoiceClick}
                      className={`inline-flex w-full items-center justify-center gap-2 rounded-[9px] border px-4 py-[9px] font-['DM_Sans'] text-[13px] transition-all duration-200 hover:-translate-y-px sm:w-auto ${
                        voiceButtonRecording
                          ? "border-[rgba(226,75,74,0.25)] bg-[rgba(226,75,74,0.10)] text-[#E24B4A]"
                          : "border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.06)] text-[var(--text-secondary)] hover:bg-[rgba(255,255,255,0.10)]"
                      }`}
                    >
                      {voiceButtonRecording ? (
                        <span className="flex h-[14px] items-center gap-[2px]">
                          {[0, 0.1, 0.2, 0.15, 0.05].map((delay) => (
                            <span
                              key={delay}
                              className="wave-bar"
                              style={{ animationDelay: `${delay}s` }}
                            />
                          ))}
                        </span>
                      ) : (
                        <Mic className="h-[14px] w-[14px] text-[var(--text-secondary)]" />
                      )}
                      <span>{voiceButtonLabel}</span>
                    </button>
                    {voiceError && (
                      <p className="mt-2 text-[12px] leading-[1.5] text-[#E24B4A] sm:absolute sm:left-0 sm:top-full sm:w-[240px]">
                        {voiceError}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Voice not supported in this browser. Try Chrome or Edge.
                  </p>
                )}

                <div className="hidden flex-1 sm:block" />

                <div className="sm:ml-auto">
                  <button
                    id="organize-btn"
                    type="button"
                    onClick={handleOrganize}
                    disabled={loading}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-[8px] border-0 bg-[var(--accent)] px-[22px] py-[10px] text-[14px] font-medium text-[#0A1628] transition-all duration-200 hover:-translate-y-px hover:brightness-110 disabled:cursor-not-allowed sm:w-auto"
                    style={{
                      opacity: hasInput ? 1 : 0.4,
                      pointerEvents: hasInput ? "auto" : "none",
                      cursor: hasInput ? "pointer" : "default",
                    }}
                  >
                    <span>Organize Now</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <div className="rounded-[14px] border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            {tasks.length > 0 && (
              <div className="rounded-[14px] border border-[var(--border)] bg-[var(--bg-surface)] px-5 py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[15px] font-medium text-[var(--text-primary)]">
                      Draft tasks ready to save
                    </p>
                    <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
                      {tasks.length} tasks are currently in your draft.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowResults(true)}
                    className="inline-flex items-center justify-center rounded-[8px] border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.06)] px-[18px] py-[10px] text-[13px] text-[var(--text-primary)] transition-all duration-200 hover:bg-[rgba(255,255,255,0.10)]"
                  >
                    Review Draft
                  </button>
                </div>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-3">
              {EXAMPLE_PROMPTS.map(({ label, prompt, Icon }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setInput(prompt)}
                  className="group rounded-[14px] border border-[var(--border)] bg-[var(--bg-surface)] px-5 py-[18px] text-left transition-all duration-200 hover:-translate-y-[2px] hover:border-[var(--border-hover)]"
                >
                  <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.06em] text-[var(--accent)]">
                    <Icon className="h-[14px] w-[14px]" />
                    <span>{label}</span>
                  </div>
                  <p
                    className="my-[10px] text-[13px] leading-[1.6] text-[var(--text-secondary)]"
                    style={{
                      display: "-webkit-box",
                      WebkitBoxOrient: "vertical",
                      WebkitLineClamp: 2,
                      overflow: "hidden",
                    }}
                  >
                    {prompt}
                  </p>
                  <span className="text-[12px] text-[var(--text-muted)] transition-colors duration-200 group-hover:text-[var(--accent)]">
                    {`Use this \u2192`}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2
                  className="text-[clamp(1.9rem,4vw,2.6rem)] font-semibold leading-[1.08] tracking-[-0.02em] text-[var(--text-primary)]"
                  style={{ fontFamily: "Fraunces, serif" }}
                >
                  Organized tasks
                </h2>
                <p className="mt-2 text-[14px] text-[var(--text-secondary)]">
                  {tasks.length} {tasks.length === 1 ? "task" : "tasks"} ready to save
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAddMoreModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-[8px] border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.06)] px-[18px] py-[10px] text-[13px] text-[var(--text-primary)] transition-all duration-200 hover:bg-[rgba(255,255,255,0.10)]"
              >
                <Plus className="h-4 w-4 text-[var(--accent)]" />
                Add More Tasks
              </button>
            </div>

            {error && (
              <div className="rounded-[14px] border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            {loading ? (
              <LoadingState />
            ) : tasks.length === 0 ? (
              <div className="rounded-[16px] border border-[var(--border)] bg-[var(--bg-surface)] px-6 py-12 text-center text-[var(--text-secondary)]">
                No tasks generated. Try again.
              </div>
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

                <div className="sticky bottom-20 rounded-[16px] border border-[var(--border)] bg-[rgba(17,17,16,0.92)] p-3 backdrop-blur md:bottom-6">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={handleSaveTasks}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-[8px] border-0 bg-[var(--accent)] px-[22px] py-[12px] text-[14px] font-medium text-[#0A1628] transition-all duration-200 hover:-translate-y-px hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Sparkles className="h-4 w-4" />
                    {saving ? "Saving..." : "Save Tasks to Database"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {addMoreModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-lg rounded-[16px] border border-[var(--border)] bg-[var(--bg-surface)] p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3
                  className="text-[1.6rem] font-semibold text-[var(--text-primary)]"
                  style={{ fontFamily: "Fraunces, serif" }}
                >
                  Tasks ready to save
                </h3>
                <p className="mt-2 text-[14px] leading-[1.7] text-[var(--text-secondary)]">
                  You already have {tasks.length} draft tasks. Choose how you want
                  to continue.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAddMoreModalOpen(false)}
                className="rounded-[10px] border border-[var(--border)] bg-[var(--bg-elevated)] p-2 text-[var(--text-secondary)] transition-colors duration-200 hover:border-[var(--border-hover)] hover:text-[var(--text-primary)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => handleAddMoreChoice("append")}
                className="w-full rounded-[14px] border border-[rgba(79,142,247,0.20)] bg-[rgba(79,142,247,0.08)] px-4 py-4 text-left transition-all duration-200 hover:border-[rgba(79,142,247,0.35)] hover:bg-[rgba(79,142,247,0.12)]"
              >
                <p className="font-medium text-[var(--text-primary)]">
                  Keep draft and add another prompt
                </p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Return to the prompt box and merge the next AI result with your current draft.
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleAddMoreChoice("replace")}
                className="w-full rounded-[14px] border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-4 text-left transition-all duration-200 hover:border-[var(--border-hover)]"
              >
                <p className="font-medium text-[var(--text-primary)]">Start a fresh prompt</p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
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
