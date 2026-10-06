"use client";

import { useLanguage } from "@/lib/i18n/LanguageContext";
import { RevealOnScroll } from "./ui/RevealOnScroll";
import { SectionEyebrow } from "./ui/SectionEyebrow";
import { Emphasis } from "./ui/Emphasis";
import { StepGrid } from "./ui/StepGrid";
import { PhaseTimeline } from "./ui/PhaseTimeline";
import { Recomposition } from "./diagrams/Recomposition";
import { LabsCase } from "./LabsCase";

export function Labs() {
  const { t } = useLanguage();

  return (
    <section id="labs" className="mx-auto max-w-5xl px-6 py-36">
      <div className="grid items-center gap-12 md:grid-cols-[1.1fr_0.9fr] md:gap-16">
        <RevealOnScroll>
          <SectionEyebrow>{t.labs.eyebrow}</SectionEyebrow>
          <h2 className="font-display mt-5 text-4xl font-semibold leading-[1.05] tracking-[-0.03em] text-pyxis-fg sm:text-5xl md:text-6xl">
            {t.labs.headlinePre} <Emphasis>{t.labs.headlineEmphasis}</Emphasis>
          </h2>
          <p className="mt-7 max-w-[58ch] text-base leading-relaxed text-pyxis-fg/65 sm:text-lg">
            {t.labs.body}
          </p>
        </RevealOnScroll>
        <RevealOnScroll delay={0.15}>
          <div className="mx-auto max-w-sm md:max-w-none">
            <Recomposition label={t.labs.diagramLabel} />
          </div>
        </RevealOnScroll>
      </div>

      <div className="mt-28">
        <RevealOnScroll>
          <SectionEyebrow>{t.labs.processEyebrow}</SectionEyebrow>
        </RevealOnScroll>
        <StepGrid steps={t.labs.steps} />
      </div>

      <LabsCase />

      <div className="mt-36">
        <RevealOnScroll>
          <SectionEyebrow>{t.labs.phasesEyebrow}</SectionEyebrow>
          <h3 className="font-display mt-5 text-3xl font-semibold leading-[1.05] tracking-[-0.03em] text-pyxis-fg sm:text-4xl md:text-5xl">
            {t.labs.phasesHeadlinePre}{" "}
            <Emphasis>{t.labs.phasesHeadlineEmphasis}</Emphasis>
          </h3>
        </RevealOnScroll>
        <PhaseTimeline phases={t.labs.phases} lineTestId="labs-line" />
      </div>
    </section>
  );
}
