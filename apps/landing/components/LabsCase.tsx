"use client";

import { useLanguage } from "@/lib/i18n/LanguageContext";
import { RevealOnScroll } from "./ui/RevealOnScroll";

/**
 * The one engagement Labs can already point to, written like a case note:
 * who the client was, what was built inside the company, what changed.
 * Sober on purpose: no animation beyond the reveal, no numbers we don't have.
 */
export function LabsCase() {
  const { t } = useLanguage();
  const c = t.labs.case;

  return (
    <RevealOnScroll>
      <article className="mt-24 rounded-[22px] border border-pyxis-line bg-pyxis-panel/70 p-8 sm:p-10 md:p-12">
        <div className="grid gap-10 md:grid-cols-[1fr_1fr] md:gap-16">
          <div>
            <p className="flex items-center gap-3 font-mono-label text-[11px] uppercase tracking-[0.2em] text-pyxis-accent">
              <span aria-hidden="true" className="h-px w-7 bg-pyxis-accent/70" />
              {c.eyebrow}
            </p>
            <h3 className="font-display mt-5 text-2xl font-semibold leading-[1.1] tracking-[-0.02em] text-pyxis-fg sm:text-3xl">
              {c.title}
            </h3>
            <p className="font-mono-label mt-3 text-[11px] tracking-[0.14em] text-pyxis-fg/50">
              {c.meta}
            </p>
            <p className="mt-6 max-w-[48ch] leading-relaxed text-pyxis-fg/70">{c.intro}</p>
          </div>

          <div className="flex flex-col">
            <p className="font-mono-label text-[11px] uppercase tracking-[0.2em] text-pyxis-accent">
              {c.workLabel}
            </p>
            <ul className="mt-5 space-y-4">
              {c.items.map((item) => (
                <li key={item} className="flex gap-4 border-t border-pyxis-line pt-4 text-pyxis-fg/80">
                  <span aria-hidden="true" className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-pyxis-accent" />
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
            <p className="font-serif-accent mt-8 text-xl italic leading-snug text-pyxis-accent-soft">
              {c.outcome}
            </p>
          </div>
        </div>
      </article>
    </RevealOnScroll>
  );
}
