"use client";

import { useLanguage } from "@/lib/i18n/LanguageContext";

export function LanguageToggle() {
  const { lang, toggleLang } = useLanguage();
  const target = lang === "es" ? "EN" : "ES";

  return (
    <button
      type="button"
      onClick={toggleLang}
      aria-label={`Toggle language: ${target}`}
      className="font-mono-label rounded-full border border-transparent px-2.5 py-1 text-[11px] tracking-[0.2em] text-pyxis-fg/60 transition-colors duration-300 hover:border-pyxis-line hover:text-pyxis-accent-soft"
    >
      {target}
    </button>
  );
}
