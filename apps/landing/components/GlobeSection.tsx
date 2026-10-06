"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

// three.js and the 4K night texture only download once this section is near.
const GlobeExpansion = dynamic(
  () => import("./GlobeExpansion").then((m) => m.GlobeExpansion),
  { ssr: false }
);

/**
 * Placeholder that keeps the #expansion anchor and the section's height, and
 * swaps in the real WebGL globe when the visitor scrolls within ~800px of it.
 */
export function GlobeSection() {
  const ref = useRef<HTMLElement>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || near) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: "800px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [near]);

  if (near) return <GlobeExpansion />;

  return (
    <section
      id="expansion"
      ref={ref}
      aria-busy="true"
      className="relative h-screen w-full overflow-hidden bg-pyxis-bg"
    />
  );
}
