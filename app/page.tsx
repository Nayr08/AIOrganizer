"use client";

import { ArrowRight, Brain, Calendar, CheckCircle2, Clock, Sparkles } from "lucide-react";
import Link from "next/link";
import managementAnimation from "@/public/lottie/Data Management.json";
import { FeatureCard, LottiePlayer } from "@/src/components";

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

export default function Home() {
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
