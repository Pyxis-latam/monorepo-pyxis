export function SectionEyebrow({ children }: { children: string }) {
  return (
    <p className="flex items-center gap-3 font-mono-label text-[11px] uppercase tracking-[0.2em] text-pyxis-accent">
      <span aria-hidden="true" className="h-px w-7 bg-pyxis-accent/70" />
      {children}
    </p>
  );
}
