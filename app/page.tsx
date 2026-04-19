"use client";

import { useEffect, useMemo, useState } from "react";
import { format, isFuture, isToday, parse } from "date-fns";
import {
  ArrowRight,
  Brain,
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import managementAnimation from "@/public/lottie/Data Management.json";
import { FeatureCard, LottiePlayer, RecurringBadge } from "@/src/components";
import type { Task } from "@/src/components/TaskCard";

const featureCards = [
  {
    icon: <Brain className="h-[18px] w-[18px]" />,
    title: "Natural Input",
    description:
      "Write the way you normally think and let the app separate events, dates, and categories.",
    featured: true,
    className: "landing-feature-span-2",
  },
  {
    icon: <Calendar className="h-[18px] w-[18px]" />,
    title: "Date Grouping",
    description:
      "Grouped schedules like April 19 and April 20 stay properly separated and readable.",
  },
  {
    icon: <Clock className="h-[18px] w-[18px]" />,
    title: "Time Ranges",
    description:
      "Single times and ranges such as 10 AM to 12 PM are preserved across organize and tasks.",
  },
  {
    icon: <CheckCircle2 className="h-[18px] w-[18px]" />,
    title: "Save Workflow",
    description:
      "Review AI output first, then save cleanly into your persistent task list.",
  },
  {
    icon: <Sparkles className="h-[18px] w-[18px]" />,
    title: "AI-Powered Organization",
    description:
      "Let the assistant turn rough text into polished, structured tasks without manual formatting.",
  },
];

function LandingPage() {
  return (
    <div className="landing-shell">
      <svg
        aria-hidden="true"
        className="landing-noise"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          zIndex: 999,
          opacity: 0.03,
        }}
      >
        <filter id="noise">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.65"
            numOctaves="3"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#noise)" />
      </svg>

      <section className="landing-section landing-hero">
        <div className="landing-container">
          <div className="landing-hero-grid">
            <div className="relative z-10">
              <span className="landing-eyebrow">Personal Planning</span>

              <h1 className="landing-hero-title mt-6">
                Turn rough plans into structured tasks.
              </h1>

              <p className="landing-muted mt-6 max-w-[420px] text-[16px] leading-[1.7]">
                AI Organizer now feels more like a focused assistant workspace:
                calm dark surfaces, clear hierarchy, and task output that reads
                like a clean conversation with your planner.
              </p>

              <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                <Link href="/organize" className="landing-button-primary">
                  Start Organizing
                  <ArrowRight className="h-[16px] w-[16px]" />
                </Link>
                <Link href="/tasks" className="landing-button-secondary">
                  Open Tasks
                </Link>
              </div>
            </div>

            <div className="landing-hero-animation">
              <div className="landing-hero-floating-art">
                <LottiePlayer
                  animationData={managementAnimation}
                  className="h-[220px] w-full sm:h-[280px] lg:h-[340px]"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section pb-6 pt-[60px] md:pt-[80px]">
        <div className="landing-container">
          <div className="landing-preview-section-grid">
            <div className="landing-card landing-preview-card">
              <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--text-muted)]">
                Preview
              </p>

              <div className="landing-card-elevated mt-4 p-[12px_14px]">
                <p className="text-[14px] text-[var(--text-secondary)]">
                  April 19 8am church, 10 am to 12pm meeting, 2 pm meetup with bros, 4pm
                  to 11pm work.
                </p>
              </div>

              <div className="mt-4 grid gap-3">
                <div className="landing-preview-pill">Church - 8:00 AM</div>
                <div className="landing-preview-pill">Meeting - 10:00 AM - 12:00 PM</div>
                <div className="landing-preview-pill">Meetup with bros - 2:00 PM</div>
                <div className="landing-preview-pill">Work - 4:00 PM - 11:00 PM</div>
              </div>
            </div>

            <div className="landing-card p-5">
              <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--text-muted)]">
                Why it works
              </p>
              <div className="mt-4 space-y-4">
                <div className="landing-why-row">
                  <span className="landing-why-dot" />
                  <span>Natural language in</span>
                </div>
                <div className="landing-why-row">
                  <span className="landing-why-dot" />
                  <span>Structured schedule out</span>
                </div>
                <div className="landing-why-row">
                  <span className="landing-why-dot" />
                  <span>Save directly to your task list</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section pb-20 pt-[60px] md:pt-[80px]">
        <div className="landing-container">
          <div className="max-w-[540px]">
            <h2 className="text-[28px] font-medium text-[var(--text-primary)]">
              Core features
            </h2>
            <p className="mt-3 text-[16px] text-[var(--text-secondary)]">
              Clean task organization with a tone and layout that feels
              familiar, calm, and readable.
            </p>
          </div>

          <div className="landing-features-grid mt-10">
            {featureCards.map((feature) => (
              <FeatureCard
                key={feature.title}
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
                featured={feature.featured}
                className={feature.className}
              />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function parseTaskStart(task: Task) {
  if (!task.startTime) {
    return null;
  }

  const parsed = parse(
    task.startTime,
    "h:mm a",
    new Date(`${format(new Date(), "yyyy-MM-dd")}T00:00:00`)
  );

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function TodayDashboard() {
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [dashboardNow, setDashboardNow] = useState<Date | null>(null);

  useEffect(() => {
    const nowTimeoutId = window.setTimeout(() => {
      setDashboardNow(new Date());
    }, 0);

    const loadTasks = async () => {
      try {
        const [todayResponse, upcomingResponse] = await Promise.all([
          fetch("/api/tasks?date=today"),
          fetch("/api/tasks?date=upcoming"),
        ]);
        const [todayData, upcomingData] = await Promise.all([
          todayResponse.json(),
          upcomingResponse.json(),
        ]);
        setTodayTasks(Array.isArray(todayData) ? todayData : []);
        setUpcomingTasks(Array.isArray(upcomingData) ? upcomingData.slice(0, 3) : []);
      } finally {
        setLoading(false);
      }
    };

    void loadTasks();

    return () => window.clearTimeout(nowTimeoutId);
  }, []);

  const greeting = useMemo(() => {
    if (!dashboardNow) return "Welcome back";

    const hour = dashboardNow.getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, [dashboardNow]);

  const nextTask = todayTasks.find((task) => {
    const start = parseTaskStart(task);
    return task.status === "pending" && start && isFuture(start);
  });

  return (
    <main className="relative min-h-screen overflow-hidden bg-[var(--bg-base)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[320px]"
        style={{
          background:
            "radial-gradient(ellipse 70% 40% at 50% 0%, rgba(79,142,247,0.10) 0%, transparent 70%)",
        }}
      />
      <div className="relative mx-auto w-full max-w-[920px] px-8 py-10 max-sm:px-6">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[12px] uppercase tracking-[0.08em] text-[var(--text-muted)]">
              {dashboardNow ? format(dashboardNow, "EEEE, MMMM d") : "Today"}
            </p>
            <h1
              className="mt-2 text-[clamp(2.2rem,5vw,3.3rem)] font-semibold leading-[1.08] text-[var(--text-primary)]"
              style={{ fontFamily: "Fraunces, serif" }}
            >
              {greeting}
            </h1>
          </div>
          <Link
            href="/organize"
            className="inline-flex items-center justify-center gap-2 rounded-[8px] bg-[var(--accent)] px-5 py-3 text-sm font-medium text-[#0A1628] transition-all hover:-translate-y-px hover:brightness-110"
          >
            Organize Now
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {loading ? (
          <div className="rounded-[16px] border border-[var(--border)] bg-[var(--bg-surface)] px-6 py-12 text-center text-[var(--text-secondary)]">
            Loading your day...
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[1.4fr_0.8fr]">
            <section className="rounded-[16px] border border-[var(--border)] bg-[var(--bg-surface)] p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-medium text-[var(--text-primary)]">
                  Today
                </h2>
                <span className="text-xs text-[var(--text-muted)]">
                  {todayTasks.length} tasks
                </span>
              </div>
              <div className="space-y-3">
                {todayTasks.length === 0 ? (
                  <p className="rounded-[12px] border border-white/10 bg-white/[0.03] px-4 py-8 text-center text-sm text-[var(--text-secondary)]">
                    Nothing scheduled today.
                  </p>
                ) : (
                  todayTasks.map((task) => (
                    <div
                      key={task.id}
                      className="rounded-[12px] border border-white/10 bg-white/[0.03] px-4 py-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-[var(--text-primary)]">
                            {task.title}
                          </p>
                          <p className="mt-1 text-xs text-[var(--text-secondary)]">
                            {task.startTime || "Any time"}
                          </p>
                          <RecurringBadge
                            isRecurring={task.isRecurring}
                            frequency={task.frequency}
                            recurringDay={task.recurringDay}
                          />
                        </div>
                        {task.id === nextTask?.id && (
                          <span className="rounded border border-blue-500/20 bg-blue-500/12 px-2 py-0.5 text-[10px] font-medium text-blue-400">
                            Next up
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-[16px] border border-[var(--border)] bg-[var(--bg-surface)] p-5">
              <h2 className="mb-4 text-lg font-medium text-[var(--text-primary)]">
                Upcoming
              </h2>
              <div className="space-y-3">
                {upcomingTasks.map((task) => (
                  <div
                    key={task.id}
                    className="rounded-[12px] border border-white/10 bg-white/[0.03] px-4 py-3"
                  >
                    <p className="font-medium text-[var(--text-primary)]">
                      {task.title}
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">
                      {isToday(new Date(`${task.date}T00:00:00`))
                        ? "Today"
                        : format(new Date(`${task.date}T00:00:00`), "MMM d")}
                    </p>
                  </div>
                ))}
                {upcomingTasks.length === 0 && (
                  <p className="text-sm text-[var(--text-secondary)]">
                    No upcoming tasks yet.
                  </p>
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}

export default function Home() {
  const isLoggedIn = true;
  return isLoggedIn ? <TodayDashboard /> : <LandingPage />;
}
