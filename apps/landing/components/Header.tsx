"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useActiveSection } from "@/lib/useActiveSection";
import { LanguageToggle } from "./ui/LanguageToggle";
import { MailtoButton } from "./ui/MailtoButton";
import { PyxisCompass } from "./PyxisCompass";

const SECTION_IDS = ["labs", "ventures", "team"] as const;

export function Header() {
  const { t } = useLanguage();
  const [scrolled, setScrolled] = useState(false);
  const active = useActiveSection(SECTION_IDS);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 24);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navItems = [
    { href: "#labs", label: t.nav.labs },
    { href: "#ventures", label: t.nav.ventures },
    { href: "#team", label: t.nav.team },
  ];

  return (
    <header
      data-testid="header"
      data-scrolled={scrolled ? "true" : "false"}
      className={`fixed inset-x-0 top-0 z-50 border-b transition-[background-color,border-color,backdrop-filter] duration-500 ${
        scrolled
          ? "border-pyxis-line bg-pyxis-bg/75 backdrop-blur-md"
          : "border-transparent bg-transparent"
      }`}
    >
      <div
        className={`mx-auto flex max-w-6xl items-center justify-between px-6 transition-[padding] duration-500 ${
          scrolled ? "py-3" : "py-5"
        }`}
      >
        <a href="#top" className="group flex items-center gap-2.5" aria-label="Pyxis, inicio">
          <PyxisCompass size={30} className="transition-transform duration-500 group-hover:rotate-[30deg]" />
          <span className="font-display text-[13px] font-semibold tracking-[0.34em] text-pyxis-fg">
            PYXIS
          </span>
        </a>

        <nav className="hidden items-center gap-9 md:flex" aria-label="Secciones">
          {navItems.map((item) => {
            const isActive = active !== null && item.href === `#${active}`;
            return (
              <a
                key={item.href}
                href={item.href}
                aria-current={isActive ? "true" : undefined}
                className={`relative py-1 text-[13.5px] transition-colors duration-300 after:absolute after:-bottom-0.5 after:left-0 after:h-px after:w-full after:origin-left after:bg-pyxis-accent after:transition-transform after:duration-300 hover:text-pyxis-fg hover:after:scale-x-100 ${
                  isActive ? "text-pyxis-fg after:scale-x-100" : "text-pyxis-fg/70 after:scale-x-0"
                }`}
              >
                {item.label}
              </a>
            );
          })}
        </nav>

        <div className="flex items-center gap-5">
          <LanguageToggle />
          <MailtoButton email={t.footer.email} label={t.cta.talk} variant="outline" size="sm" />
        </div>
      </div>
    </header>
  );
}
