"use client";

import { ParticleField } from "./ParticleField";

/**
 * Fixed backdrop behind the whole page: three drifting nebula clouds and the
 * starfield. Sits below every section so the sky continues past the hero.
 */
export function PageBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="nebula nebula-a" />
      <div className="nebula nebula-b" />
      <div className="nebula nebula-c" />
      <ParticleField />
    </div>
  );
}
