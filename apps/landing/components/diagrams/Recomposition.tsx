"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * Recomposition: the same twelve nodes (people, processes) start tangled and,
 * as the figure scrolls into view, settle into a clear structure around one
 * hub. Nothing is added, nothing removed. Only the connections change.
 */

// Tangled positions (index = node identity).
const BEFORE: [number, number][] = [
  [42, 62], [122, 28], [212, 74], [292, 44], [70, 150], [160, 122],
  [252, 158], [300, 110], [30, 208], [132, 202], [222, 222], [290, 198],
];

// Recomposed positions: node 5 becomes the hub, 3 inner, 8 outer.
const CX = 160;
const CY = 122;
const polar = (r: number, deg: number): [number, number] => [
  +(CX + r * Math.cos((deg * Math.PI) / 180)).toFixed(1),
  +(CY + r * Math.sin((deg * Math.PI) / 180)).toFixed(1),
];
const AFTER: [number, number][] = [
  polar(86, -90), polar(86, -45), polar(86, 0), polar(86, 45),
  polar(40, 90), [CX, CY],
  polar(86, 90), polar(86, 135), polar(40, 210), polar(86, 180),
  polar(86, 225), polar(40, 330),
];

// Connections (same pairs before and after; only the geometry changes).
const LINKS: [number, number][] = [
  [5, 4], [5, 8], [5, 11],
  [11, 0], [11, 1], [11, 2],
  [4, 3], [4, 6], [4, 7],
  [8, 9], [8, 10],
];

const HUB = 5;
const INNER = new Set([4, 8, 11]);

export function Recomposition({ label }: { label: string }) {
  const shouldReduceMotion = useReducedMotion();
  const ease = [0.22, 1, 0.36, 1] as const;
  const at = (i: number) => (shouldReduceMotion ? AFTER[i] : BEFORE[i]);

  return (
    <svg
      viewBox="0 0 320 244"
      role="img"
      aria-label={label}
      data-nodes={BEFORE.length}
      className="h-auto w-full"
    >
      <title>{label}</title>

      {LINKS.map(([a, b], i) => (
        <motion.line
          key={`${a}-${b}`}
          data-link=""
          x1={at(a)[0]}
          y1={at(a)[1]}
          x2={at(b)[0]}
          y2={at(b)[1]}
          stroke="#d9a54d"
          strokeOpacity={0.2}
          strokeWidth={1}
          whileInView={
            shouldReduceMotion
              ? undefined
              : {
                  x1: AFTER[a][0],
                  y1: AFTER[a][1],
                  x2: AFTER[b][0],
                  y2: AFTER[b][1],
                  strokeOpacity: 0.55,
                }
          }
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 1.6, delay: 0.3 + i * 0.05, ease }}
        />
      ))}

      {BEFORE.map((_, i) => {
        const isHub = i === HUB;
        const r = isHub ? 7 : INNER.has(i) ? 5 : 4;
        return (
          <motion.circle
            key={i}
            data-node=""
            cx={at(i)[0]}
            cy={at(i)[1]}
            r={r}
            fill={isHub ? "#eac57c" : "#f2f1ee"}
            fillOpacity={isHub ? 1 : 0.85}
            whileInView={
              shouldReduceMotion
                ? undefined
                : { cx: AFTER[i][0], cy: AFTER[i][1] }
            }
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 1.6, delay: 0.3 + i * 0.04, ease }}
          />
        );
      })}

      {/* Hub ring, revealed once the structure has settled */}
      <motion.circle
        cx={CX}
        cy={CY}
        r={13}
        fill="none"
        stroke="#d9a54d"
        strokeOpacity={0}
        strokeWidth={1}
        whileInView={shouldReduceMotion ? { strokeOpacity: 0.6 } : { strokeOpacity: 0.6 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.8, delay: 1.8 }}
      />
    </svg>
  );
}
