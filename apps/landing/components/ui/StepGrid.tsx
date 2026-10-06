"use client";

import { RevealOnScroll } from "./RevealOnScroll";

export type Step = { number: string; title: string; body: string };

/**
 * Sequence of three or four stages. Each column opens with a hairline rule
 * carrying a short brass segment and its number, so the order reads before
 * the words do.
 */
export function StepGrid({ steps }: { steps: ReadonlyArray<Step> }) {
  const columns =
    steps.length >= 4 ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-3";

  return (
    <div className={`mt-20 grid gap-12 sm:gap-8 ${columns}`}>
      {steps.map((step, index) => (
        <RevealOnScroll key={step.number} delay={index * 0.12}>
          <div className="relative border-t border-pyxis-line pt-7 before:absolute before:-top-px before:left-0 before:h-px before:w-12 before:bg-pyxis-accent">
            <span className="font-mono-label text-[11px] tracking-[0.2em] text-pyxis-accent">
              {step.number}
            </span>
            <h3 className="font-display mt-4 text-[1.35rem] font-semibold tracking-[-0.02em] text-pyxis-fg">
              {step.title}
            </h3>
            <p className="mt-3 max-w-[30ch] leading-relaxed text-pyxis-fg/65">{step.body}</p>
          </div>
        </RevealOnScroll>
      ))}
    </div>
  );
}
