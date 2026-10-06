"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { PyxisCompass } from "./PyxisCompass";
import { ScheduleButton } from "./ui/ScheduleButton";
import { Emphasis } from "./ui/Emphasis";

export function Hero() {
  const { t } = useLanguage();
  const shouldReduceMotion = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const headlineY = useTransform(scrollYProgress, [0, 1], shouldReduceMotion ? [0, 0] : [0, 90]);
  const headlineOpacity = useTransform(scrollYProgress, [0, 0.7], [1, shouldReduceMotion ? 1 : 0.15]);

  const words = t.hero.headlinePre.split(" ");
  // The headline is the page's largest paint, so it enters with motion and
  // blur only, never from opacity 0: the text is on screen from the first paint.
  const enter = (i: number) =>
    shouldReduceMotion
      ? {}
      : {
          initial: { y: 14, filter: "blur(5px)" },
          animate: { y: 0, filter: "blur(0px)" },
          transition: { duration: 0.6, delay: 0.1 + i * 0.04, ease: [0.22, 1, 0.36, 1] as const },
        };

  return (
    <section
      id="top"
      ref={sectionRef}
      className="relative flex min-h-[100dvh] items-center overflow-hidden"
    >
      {/* Brass glow behind the mark, and a fade into the page at the bottom */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-[38%] h-[70vmin] w-[70vmin] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(217,165,77,0.16),transparent_62%)] blur-2xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-pyxis-bg"
      />

      <motion.div
        style={{ y: headlineY, opacity: headlineOpacity }}
        className="relative z-10 mx-auto max-w-5xl px-6 pb-28 pt-28 text-center"
      >
        <motion.div
          className="mb-7 flex flex-col items-center gap-3"
          initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        >
          <PyxisCompass size={88} />
          <p className="font-serif-accent text-xl italic text-pyxis-accent-soft/90">
            {t.hero.eyebrow}
          </p>
        </motion.div>

        <h1 className="font-display text-[2.5rem] font-semibold leading-[1.02] tracking-[-0.035em] text-pyxis-fg sm:text-6xl md:text-[4.6rem]">
          {words.map((word, i) => (
            <motion.span key={`${word}-${i}`} className="inline-block" {...enter(i)}>
              {word}
              {i < words.length - 1 ? " " : ""}
            </motion.span>
          ))}{" "}
          <Emphasis>{t.hero.headlineEmphasis}</Emphasis>
        </h1>

        <motion.p
          className="mx-auto mt-7 max-w-xl text-base leading-relaxed text-pyxis-fg/70 sm:text-lg"
          initial={shouldReduceMotion ? false : { y: 10 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.7, delay: 0.4, ease: "easeOut" }}
        >
          {t.hero.subheadline}
        </motion.p>

        <motion.div
          className="mt-10 flex flex-col items-center gap-4"
          initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.7, ease: "easeOut" }}
        >
          <ScheduleButton label={t.cta.schedule} />
          <span className="font-mono-label text-[11px] tracking-[0.14em] text-pyxis-fg/45">
            {t.cta.scheduleHint}
          </span>
        </motion.div>
      </motion.div>

      <a
        href="#divisions"
        aria-label={t.hero.scrollCue}
        className="absolute bottom-7 left-1/2 z-10 hidden -translate-x-1/2 flex-col items-center gap-3 text-pyxis-fg/45 transition-colors hover:text-pyxis-accent md:[@media(min-height:880px)]:flex"
      >
        <span className="font-mono-label text-[10px] tracking-[0.3em]">{t.hero.scrollCue}</span>
        <span className="block h-10 w-px overflow-hidden bg-pyxis-fg/10">
          <span className="scroll-cue-line block h-full w-full bg-current" />
        </span>
      </a>
    </section>
  );
}
