"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useContact } from "@/lib/contact/ContactContext";
import { PyxisCompass } from "./PyxisCompass";
import { ScheduleButton } from "./ui/ScheduleButton";

/**
 * Contact panel opened by every "Hablemos" button. A bare mailto: link does
 * nothing visible on machines without a default mail client, so the panel
 * shows the address itself and offers three ways to use it: copy it, open a
 * Gmail compose window (works in any browser), or hand it to the mail app.
 */
export function ContactDialog() {
  const { t } = useLanguage();
  const { isOpen, closeContact } = useContact();
  const shouldReduceMotion = useReducedMotion();
  const [copied, setCopied] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  const email = t.footer.email;
  const subject = t.contact.subject;
  const gmailHref = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}&su=${encodeURIComponent(subject)}`;

  const close = useCallback(() => {
    setCopied(false);
    closeContact();
  }, [closeContact]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, close]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
    } catch {
      // Clipboard blocked: the address is still on screen to select by hand.
      setCopied(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center"
          initial={shouldReduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={shouldReduceMotion ? undefined : { opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          {/* Backdrop: click outside closes; the labelled close button below is the accessible control */}
          <div
            aria-hidden="true"
            onClick={close}
            className="absolute inset-0 bg-pyxis-bg/70 backdrop-blur-sm"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="contact-title"
            className="relative w-full max-w-md overflow-hidden rounded-[22px] border border-pyxis-accent/30 bg-pyxis-panel p-7 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.9),0_0_0_1px_rgba(217,165,77,0.08)] sm:p-8"
            initial={shouldReduceMotion ? false : { opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={shouldReduceMotion ? undefined : { opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-16 -top-16 opacity-[0.08]"
            >
              <PyxisCompass size={260} />
            </div>

            <div className="relative">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-mono-label text-[11px] uppercase tracking-[0.2em] text-pyxis-accent">
                    {t.contact.eyebrow}
                  </p>
                  <h2
                    id="contact-title"
                    className="font-display mt-2 text-2xl font-semibold tracking-[-0.02em] text-pyxis-fg"
                  >
                    {t.contact.title}
                  </h2>
                </div>
                <button
                  ref={closeRef}
                  type="button"
                  onClick={close}
                  aria-label={t.contact.close}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-pyxis-line text-pyxis-fg/70 transition-colors hover:border-pyxis-accent/50 hover:text-pyxis-accent-soft"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </button>
              </div>

              <p className="mt-3 text-sm leading-relaxed text-pyxis-fg/65">{t.contact.body}</p>

              <div className="mt-6 flex items-center justify-between gap-3 rounded-2xl border border-pyxis-line bg-pyxis-bg/60 px-4 py-3">
                <span className="font-mono-label min-w-0 truncate text-sm text-pyxis-fg" title={email}>
                  {email}
                </span>
                <button
                  type="button"
                  onClick={copy}
                  className="shrink-0 rounded-full border border-pyxis-accent/40 px-3 py-1.5 text-xs font-medium text-pyxis-accent-soft transition-colors hover:bg-pyxis-accent/10"
                >
                  {copied ? t.contact.copied : t.contact.copy}
                </button>
              </div>

              <div className="mt-5 flex flex-col gap-3">
                <ScheduleButton label={t.contact.schedule} className="w-full justify-center" />
                <a
                  href={gmailHref}
                  target="_blank"
                  rel="noreferrer"
                  className="group inline-flex w-full items-center justify-center gap-2 rounded-full border border-pyxis-accent/35 px-5 py-3 text-sm font-medium text-pyxis-fg/90 transition-colors hover:border-pyxis-accent hover:bg-pyxis-accent/10 hover:text-pyxis-accent-soft"
                >
                  {t.contact.gmail}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">
                    <path d="M7 17L17 7M9 7h8v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </a>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
