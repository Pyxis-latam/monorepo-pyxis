"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

/**
 * The one accented phrase in a headline: set in the serif italic, in soft
 * brass, a touch larger than the surrounding sans so it reads as a voice
 * change rather than a color change.
 */
export function Emphasis({ children }: { children: ReactNode }) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.em
      className="font-serif-accent pr-[0.06em] text-[1.12em] font-normal italic leading-none text-pyxis-accent-soft"
      initial={shouldReduceMotion ? false : { opacity: 0, filter: "blur(8px)" }}
      whileInView={{ opacity: 1, filter: "blur(0px)" }}
      viewport={{ once: true, amount: 0.6 }}
      transition={{ duration: 0.7, ease: "easeOut" }}
    >
      {children}
    </motion.em>
  );
}
