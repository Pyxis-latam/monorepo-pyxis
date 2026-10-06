"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { dictionaries, type Lang, type Dictionary } from "./dictionary";

type LanguageContextValue = {
  lang: Lang;
  t: Dictionary;
  toggleLang: () => void;
};

const STORAGE_KEY = "pyxis-lang";

const LanguageContext = createContext<LanguageContextValue | undefined>(
  undefined
);

function isLang(value: unknown): value is Lang {
  return value === "es" || value === "en";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("es");

  // Restore the visitor's last choice after hydration (never during render,
  // so server and first client render always agree on Spanish).
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      // Restoring a persisted choice is the one legitimate post-hydration setState here.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (isLang(stored)) setLang(stored);
    } catch {
      // storage unavailable: stay in Spanish
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const toggleLang = useCallback(() => {
    setLang((prev) => {
      const next = prev === "es" ? "en" : "es";
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // storage unavailable: the choice just lasts this visit
      }
      return next;
    });
  }, []);

  return (
    <LanguageContext.Provider value={{ lang, t: dictionaries[lang], toggleLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
