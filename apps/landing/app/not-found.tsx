"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { PageBackdrop } from "@/components/PageBackdrop";
import { PyxisCompass } from "@/components/PyxisCompass";

export default function NotFound() {
  const { t } = useLanguage();

  return (
    <>
      <PageBackdrop />
      <main className="relative flex min-h-[100dvh] items-center justify-center px-6 py-24">
        <div className="mx-auto max-w-xl text-center">
          <PyxisCompass size={88} className="mx-auto" />
          <p className="font-mono-label mt-8 text-[11px] uppercase tracking-[0.3em] text-pyxis-accent">
            404
          </p>
          <h1 className="font-display mt-4 text-4xl font-semibold leading-[1.05] tracking-[-0.03em] text-pyxis-fg sm:text-5xl">
            {t.notFound.title}
          </h1>
          <p className="mx-auto mt-5 max-w-md leading-relaxed text-pyxis-fg/65">{t.notFound.body}</p>
          <Link
            href="/"
            className="group mt-10 inline-flex items-center gap-2 rounded-full border border-pyxis-accent/35 px-6 py-3 text-sm font-medium text-pyxis-fg/90 transition-colors hover:border-pyxis-accent hover:bg-pyxis-accent/10 hover:text-pyxis-accent-soft"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              className="transition-transform duration-300 group-hover:-translate-x-0.5"
            >
              <path d="M19 12H5M11 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {t.notFound.cta}
          </Link>
        </div>
      </main>
    </>
  );
}
