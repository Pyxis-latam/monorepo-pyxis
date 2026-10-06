"use client";

import { useLanguage } from "@/lib/i18n/LanguageContext";
import { RevealOnScroll } from "./ui/RevealOnScroll";
import { ScheduleButton } from "./ui/ScheduleButton";
import { Emphasis } from "./ui/Emphasis";
import { PyxisCompass } from "./PyxisCompass";

export function FinalCta() {
  const { t } = useLanguage();

  return (
    <section className="relative overflow-hidden px-6 py-40">
      {/* Watermark of the mark behind the closing statement */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.07]"
      >
        <PyxisCompass size={640} />
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-[60vmin] w-[60vmin] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(217,165,77,0.14),transparent_60%)] blur-3xl"
      />

      <RevealOnScroll>
        <div className="relative mx-auto max-w-3xl text-center">
          <h2 className="font-display text-4xl font-semibold leading-[1.05] tracking-[-0.03em] text-pyxis-fg sm:text-5xl md:text-6xl">
            {t.finalCta.headlinePre} <Emphasis>{t.finalCta.headlineEmphasis}</Emphasis>
          </h2>
          <p className="mx-auto mt-7 max-w-xl text-base leading-relaxed text-pyxis-fg/65 sm:text-lg">
            {t.finalCta.body}
          </p>
          <div className="mt-10 flex flex-col items-center gap-5">
            <ScheduleButton label={t.cta.schedule} />
            <a
              href={`mailto:${t.footer.email}`}
              className="font-mono-label text-xs tracking-[0.12em] text-pyxis-fg/50 transition-colors hover:text-pyxis-accent-soft"
            >
              {t.footer.email}
            </a>
          </div>
        </div>
      </RevealOnScroll>
    </section>
  );
}
