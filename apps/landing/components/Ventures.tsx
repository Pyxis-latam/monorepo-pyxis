"use client";

import { useLanguage } from "@/lib/i18n/LanguageContext";
import { RevealOnScroll } from "./ui/RevealOnScroll";
import { SectionEyebrow } from "./ui/SectionEyebrow";
import { Emphasis } from "./ui/Emphasis";
import { StepGrid } from "./ui/StepGrid";
import { HermesLoop } from "./diagrams/HermesLoop";

export function Ventures() {
  const { t } = useLanguage();
  const stations = t.ventures.pillars.map((p) => p.title);

  return (
    <section id="ventures" className="mx-auto max-w-5xl px-6 pb-20 pt-36">
      <div className="grid items-center gap-12 md:grid-cols-[1.1fr_0.9fr] md:gap-16">
        <RevealOnScroll>
          <SectionEyebrow>{t.ventures.eyebrow}</SectionEyebrow>
          <h2 className="font-display mt-5 text-4xl font-semibold leading-[1.05] tracking-[-0.03em] text-pyxis-fg sm:text-5xl md:text-6xl">
            {t.ventures.headlinePre}{" "}
            <Emphasis>{t.ventures.headlineEmphasis}</Emphasis>
          </h2>
          <p className="mt-7 max-w-[60ch] text-base leading-relaxed text-pyxis-fg/65 sm:text-lg">
            {t.ventures.body}
          </p>
        </RevealOnScroll>
        <RevealOnScroll delay={0.15}>
          <div className="mx-auto max-w-sm md:max-w-none">
            <HermesLoop
              label={t.ventures.diagramLabel}
              stations={stations}
              centerLabel={t.ventures.loopCenter}
            />
          </div>
        </RevealOnScroll>
      </div>

      <StepGrid steps={t.ventures.pillars} />
    </section>
  );
}
