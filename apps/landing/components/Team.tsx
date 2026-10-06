"use client";

import { useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { RevealOnScroll } from "./ui/RevealOnScroll";
import { SectionEyebrow } from "./ui/SectionEyebrow";
import { Emphasis } from "./ui/Emphasis";
import { SpotlightCard } from "./ui/SpotlightCard";

export function Team() {
  const { t } = useLanguage();
  const shouldReduceMotion = useReducedMotion();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="team" className="mx-auto max-w-5xl px-6 py-36">
      <RevealOnScroll>
        <SectionEyebrow>{t.team.eyebrow}</SectionEyebrow>
        <h2 className="font-display mt-5 text-4xl font-semibold leading-[1.05] tracking-[-0.03em] text-pyxis-fg sm:text-5xl md:text-6xl">
          {t.team.headlinePre} <Emphasis>{t.team.headlineEmphasis}</Emphasis>
        </h2>
        <p className="mt-5 text-sm text-pyxis-fg/50">{t.team.expandHint}</p>
      </RevealOnScroll>

      <div className="mt-14 grid items-start gap-5 md:grid-cols-2">
        {t.team.members.map((member, index) => {
          const isOpen = openIndex === index;
          const panelId = `member-panel-${index}`;
          return (
            <RevealOnScroll key={member.name} delay={index * 0.15}>
              <SpotlightCard active={isOpen}>
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  className="group flex w-full items-start gap-5 p-5 text-left sm:p-6"
                >
                  <span className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full ring-1 ring-pyxis-accent/40 ring-offset-2 ring-offset-pyxis-bg">
                    <Image
                      src={member.photo}
                      alt={member.name}
                      width={96}
                      height={96}
                      className="h-24 w-24 object-cover saturate-[0.85] transition-[filter,transform] duration-700 group-hover:scale-[1.04] group-hover:saturate-100"
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="font-display block text-lg font-semibold tracking-[-0.01em] text-pyxis-fg transition-colors duration-300 group-hover:text-pyxis-accent-soft">
                      {member.name}
                    </span>
                    <span className="mt-0.5 block font-mono-label text-[11px] tracking-[0.12em] text-pyxis-accent">
                      {member.role}
                    </span>
                    <span className="mt-3 block text-sm leading-relaxed text-pyxis-fg/65">
                      {member.headline}
                    </span>
                  </span>
                  <motion.span
                    aria-hidden="true"
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.35 }}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-pyxis-line text-pyxis-accent transition-colors duration-300 group-hover:border-pyxis-accent/50"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M6 9l6 6 6-6"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </motion.span>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      id={panelId}
                      initial={shouldReduceMotion ? false : { height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={shouldReduceMotion ? undefined : { height: 0, opacity: 0 }}
                      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-pyxis-line px-5 pb-6 pt-5 sm:px-6">
                        <p className="text-sm leading-relaxed text-pyxis-fg/75">{member.bio}</p>

                        <p className="font-mono-label mt-6 text-[11px] uppercase tracking-[0.2em] text-pyxis-accent">
                          {t.team.experienceLabel}
                        </p>
                        <ul className="mt-4 space-y-3">
                          {member.experiences.map((exp) => (
                            <li key={exp.org} className="flex gap-3 text-sm">
                              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-pyxis-accent" />
                              <span className="min-w-0">
                                <span className="flex flex-wrap items-baseline gap-x-2">
                                  <span className="font-medium text-pyxis-fg">{exp.org}</span>
                                  <span className="font-mono-label text-[10px] tracking-widest text-pyxis-fg/40">
                                    {exp.period}
                                  </span>
                                </span>
                                <span className="block text-pyxis-fg/55">{exp.role}</span>
                              </span>
                            </li>
                          ))}
                        </ul>

                        <a
                          href={member.linkedin}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-pyxis-accent-soft transition-colors hover:text-pyxis-fg"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <path d="M4.98 3.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5zM3 9h4v12H3zM10 9h3.8v1.7h.05c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.78 2.65 4.78 6.1V21h-4v-5.4c0-1.29-.02-2.95-1.8-2.95-1.8 0-2.08 1.4-2.08 2.85V21h-4z" />
                          </svg>
                          {t.team.linkedinLabel}
                        </a>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </SpotlightCard>
            </RevealOnScroll>
          );
        })}
      </div>
    </section>
  );
}
