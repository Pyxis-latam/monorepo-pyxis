"use client";

import { motion, useReducedMotion } from "framer-motion";
import { RevealOnScroll } from "./RevealOnScroll";

export type Phase = { label: string; title: string; body: string };

type PhaseTimelineProps = {
  phases: ReadonlyArray<Phase>;
  lineTestId: string;
};

export function PhaseTimeline({ phases, lineTestId }: PhaseTimelineProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="relative mt-20">
      <svg
        className="absolute left-0 top-[6px] hidden w-full sm:block"
        height="2"
        preserveAspectRatio="none"
        data-testid={lineTestId}
      >
        <motion.line
          x1="0"
          y1="1"
          x2="100%"
          y2="1"
          stroke="#D9A54D"
          strokeOpacity="0.6"
          strokeWidth="1.5"
          initial={shouldReduceMotion ? { pathLength: 1 } : { pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 1.4, ease: "easeInOut" }}
        />
      </svg>
      <div className="grid gap-12 sm:grid-cols-3 sm:gap-8">
        {phases.map((phase, index) => (
          <RevealOnScroll key={phase.label} delay={index * 0.2}>
            <div className="relative pt-9">
              <span
                className={`absolute left-0 top-0 h-3.5 w-3.5 rounded-full ${
                  index === 0
                    ? "bg-pyxis-accent-soft shadow-[0_0_0_5px_rgba(217,165,77,0.18),0_0_18px_rgba(217,165,77,0.6)]"
                    : "border border-pyxis-accent/70 bg-pyxis-bg"
                }`}
              />
              <span className="font-mono-label text-[11px] tracking-[0.2em] text-pyxis-accent">
                {phase.label}
              </span>
              <h3 className="font-display mt-3 text-[1.35rem] font-semibold tracking-[-0.02em] text-pyxis-fg">
                {phase.title}
              </h3>
              <p className="mt-3 max-w-[30ch] leading-relaxed text-pyxis-fg/65">{phase.body}</p>
            </div>
          </RevealOnScroll>
        ))}
      </div>
    </div>
  );
}
