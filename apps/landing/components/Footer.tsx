"use client";

import { useLanguage } from "@/lib/i18n/LanguageContext";
import { LanguageToggle } from "./ui/LanguageToggle";
import { PyxisCompass } from "./PyxisCompass";

export function Footer() {
  const { t } = useLanguage();
  const year = new Date().getFullYear();

  const links = [
    { href: "#labs", label: t.nav.labs },
    { href: "#ventures", label: t.nav.ventures },
    { href: "#team", label: t.nav.team },
  ];

  return (
    <footer className="px-6 pb-10">
      <div className="mx-auto max-w-6xl">
        <div className="hairline" />
        <div className="grid gap-10 py-12 sm:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <a href="#top" className="inline-flex items-center gap-2.5" aria-label="Pyxis, inicio">
              <PyxisCompass size={30} />
              <span className="font-display text-[13px] font-semibold tracking-[0.34em] text-pyxis-fg">
                PYXIS
              </span>
            </a>
            <p className="mt-4 text-sm text-pyxis-fg/50">{t.footer.location}</p>
          </div>

          <nav aria-label="Secciones" className="flex flex-col gap-2.5">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="w-fit text-sm text-pyxis-fg/65 transition-colors duration-300 hover:text-pyxis-accent-soft"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="flex flex-col items-start gap-2.5 sm:items-end">
            <a
              href={`mailto:${t.footer.email}`}
              className="w-fit text-sm text-pyxis-fg/65 transition-colors duration-300 hover:text-pyxis-accent-soft"
            >
              {t.footer.email}
            </a>
            <LanguageToggle />
          </div>
        </div>
        <div className="flex flex-col gap-2 border-t border-pyxis-line pt-6 text-xs text-pyxis-fg/60 sm:flex-row sm:items-center sm:justify-between">
          <span>
            © {year} {t.footer.copyright}
          </span>
          <span className="font-mono-label tracking-[0.18em]">{t.footer.tagline}</span>
        </div>
      </div>
    </footer>
  );
}
