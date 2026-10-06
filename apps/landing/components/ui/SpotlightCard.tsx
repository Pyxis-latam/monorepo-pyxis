"use client";

import type { MouseEvent, ReactNode } from "react";

/**
 * A dark glass panel: hairline border, a light catch along the top edge and a
 * brass spotlight that follows the cursor. Wrap any block that deserves a
 * surface; keep the inside padding to the child.
 */
export function SpotlightCard({
  children,
  className = "",
  active = false,
}: {
  children: ReactNode;
  className?: string;
  active?: boolean;
}) {
  const track = (event: MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty("--mx", `${event.clientX - rect.left}px`);
    event.currentTarget.style.setProperty("--my", `${event.clientY - rect.top}px`);
  };

  return (
    <div
      onMouseMove={track}
      data-active={active ? "true" : "false"}
      className={`group/card relative overflow-hidden rounded-[22px] border bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.012))] shadow-[0_30px_60px_-40px_rgba(0,0,0,0.9)] transition-[border-color,transform] duration-500 before:pointer-events-none before:absolute before:inset-x-6 before:top-0 before:h-px before:bg-[linear-gradient(90deg,transparent,rgba(242,241,238,0.35),transparent)] after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:opacity-0 after:transition-opacity after:duration-500 after:content-[''] after:bg-[radial-gradient(420px_circle_at_var(--mx,50%)_var(--my,0%),rgba(217,165,77,0.13),transparent_60%)] hover:after:opacity-100 ${
        active ? "border-pyxis-accent/45" : "border-pyxis-line hover:border-pyxis-accent/35"
      } ${className}`}
    >
      {children}
    </div>
  );
}
