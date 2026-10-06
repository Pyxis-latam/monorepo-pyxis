"use client";

import { useLanguage } from "@/lib/i18n/LanguageContext";
import { RevealOnScroll } from "./ui/RevealOnScroll";
import { SectionEyebrow } from "./ui/SectionEyebrow";
import { Emphasis } from "./ui/Emphasis";
import { SpotlightCard } from "./ui/SpotlightCard";

export function Divisions() {
  const { t } = useLanguage();

  return (
    <section id="divisions" className="mx-auto max-w-5xl px-6 pb-36 pt-28">
      <RevealOnScroll>
        <SectionEyebrow>{t.divisions.eyebrow}</SectionEyebrow>
        <h2 className="font-display mt-5 text-4xl font-semibold leading-[1.05] tracking-[-0.03em] text-pyxis-fg sm:text-5xl md:text-6xl">
          {t.divisions.headlinePre}{" "}
          <Emphasis>{t.divisions.headlineEmphasis}</Emphasis>
        </h2>
      </RevealOnScroll>

      <div className="mt-16 grid gap-5 md:grid-cols-2">
        {t.divisions.items.map((item, index) => (
          <RevealOnScroll key={item.code} delay={index * 0.12}>
            <SpotlightCard className="h-full hover:-translate-y-1">
              <a href={item.href} className="group relative flex h-full flex-col p-8 sm:p-10">
                <span className="font-mono-label text-[11px] tracking-[0.3em] text-pyxis-accent">
                  {item.code}
                </span>
                <h3 className="font-display mt-6 text-3xl font-semibold tracking-[-0.025em] text-pyxis-fg sm:text-[2.1rem]">
                  {item.name}
                </h3>
                <p className="font-serif-accent mt-2 text-xl italic text-pyxis-accent-soft/90">
                  {item.tagline}
                </p>
                <p className="mt-6 flex-1 leading-relaxed text-pyxis-fg/65">{item.body}</p>
                <span className="mt-10 inline-flex items-center gap-2 text-sm font-medium text-pyxis-fg/70 transition-colors duration-300 group-hover:text-pyxis-accent-soft">
                  {item.linkLabel}
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                    className="transition-transform duration-300 group-hover:translate-y-0.5"
                  >
                    <path
                      d="M12 5v14M6 13l6 6 6-6"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </a>
            </SpotlightCard>
          </RevealOnScroll>
        ))}
      </div>
    </section>
  );
}
