"use client";

import { useLanguage } from "@/lib/i18n/LanguageContext";
import { RevealOnScroll } from "./ui/RevealOnScroll";

export function SocialProof() {
  const { t } = useLanguage();

  return (
    <section className="mx-auto max-w-5xl px-6">
      <div className="hairline" />
      <RevealOnScroll>
        <div className="flex flex-col gap-3 py-6 sm:flex-row sm:items-center sm:gap-8">
          <span className="inline-flex shrink-0 items-center gap-3 font-mono-label text-[11px] tracking-[0.2em] text-pyxis-accent-soft">
            <span className="status-dot" aria-hidden="true" />
            {t.socialProof.status}
          </span>
          <p className="text-sm leading-relaxed text-pyxis-fg/60">{t.socialProof.text}</p>
        </div>
      </RevealOnScroll>
      <div className="hairline" />
    </section>
  );
}
