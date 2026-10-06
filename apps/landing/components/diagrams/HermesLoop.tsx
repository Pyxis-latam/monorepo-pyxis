"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * Hermes: a closed loop through three stations with one pulse of light
 * running around it without stopping. The centre stays empty on purpose.
 */

const STATIONS: [number, number][] = [
  [160, 42],
  [52, 196],
  [268, 196],
];

// Smooth closed path through the three stations (clockwise).
const LOOP =
  "M160 42 C 236 42, 290 118, 268 196 C 250 240, 70 240, 52 196 C 30 118, 84 42, 160 42 Z";

export function HermesLoop({
  label,
  stations,
  centerLabel,
}: {
  label: string;
  stations: readonly [string, string, string] | readonly string[];
  centerLabel?: string;
}) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <svg viewBox="0 0 320 244" role="img" aria-label={label} className="h-auto w-full">
      <title>{label}</title>
      <defs>
        <radialGradient id="hermes-pulse-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#f3d68f" stopOpacity="0.9" />
          <stop offset="1" stopColor="#d9a54d" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Track */}
      <path d={LOOP} fill="none" stroke="#d9a54d" strokeOpacity="0.25" strokeWidth="1.2" />
      <motion.path
        d={LOOP}
        fill="none"
        stroke="#d9a54d"
        strokeOpacity="0.7"
        strokeWidth="1.2"
        initial={shouldReduceMotion ? { pathLength: 1 } : { pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 2, ease: "easeInOut" }}
      />

      {/* Empty centre */}
      <circle cx="160" cy="146" r="34" fill="none" stroke="#f2f1ee" strokeOpacity="0.12" strokeWidth="1" strokeDasharray="1 4" />
      {centerLabel && (
        <text
          x="160"
          y="150"
          textAnchor="middle"
          fontFamily="var(--font-mono-label), ui-monospace, monospace"
          fontSize="9"
          letterSpacing="1.5"
          fill="#f2f1ee"
          fillOpacity="0.45"
        >
          {centerLabel}
        </text>
      )}

      {/* Stations */}
      {STATIONS.map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="13" fill="#0e1016" stroke="#d9a54d" strokeOpacity="0.8" strokeWidth="1.2" />
          <circle cx={x} cy={y} r="3" fill="#eac57c" />
          <text
            x={x}
            y={i === 0 ? y - 22 : y + 30}
            textAnchor="middle"
            fontFamily="var(--font-mono-label), ui-monospace, monospace"
            fontSize="10"
            letterSpacing="2"
            fill="#eac57c"
          >
            {stations[i]}
          </text>
        </g>
      ))}

      {/* Pulse running the loop */}
      <motion.g
        data-testid="hermes-pulse"
        style={{ offsetPath: `path("${LOOP}")`, offsetRotate: "0deg" }}
        animate={shouldReduceMotion ? undefined : { offsetDistance: ["0%", "100%"] }}
        transition={{ duration: 7, ease: "linear", repeat: Infinity }}
      >
        <circle r="10" fill="url(#hermes-pulse-glow)" />
        <circle r="3" fill="#fff" />
      </motion.g>
    </svg>
  );
}
