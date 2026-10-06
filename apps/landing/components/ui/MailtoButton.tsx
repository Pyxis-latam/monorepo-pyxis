"use client";

import type { MouseEvent } from "react";
import { useContact } from "@/lib/contact/ContactContext";
import { buttonClasses, type ButtonSize, type ButtonVariant } from "./buttonStyles";

type MailtoButtonProps = {
  email: string;
  label: string;
  subject?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
};

/**
 * Contact call to action. It is a real mailto: link, so middle-click,
 * copy-link and assistive tech keep working; a plain click opens the contact
 * panel instead, because mailto alone does nothing on machines without a
 * default mail client.
 */
export function MailtoButton({
  email,
  label,
  subject,
  variant = "solid",
  size = "md",
}: MailtoButtonProps) {
  const { available, openContact } = useContact();
  const href = subject
    ? `mailto:${email}?subject=${encodeURIComponent(subject)}`
    : `mailto:${email}`;

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!available) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    openContact();
  };

  return (
    <a href={href} onClick={handleClick} data-variant={variant} className={buttonClasses(variant, size)}>
      {label}
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className="transition-transform duration-300 group-hover:translate-x-0.5"
      >
        <path
          d="M5 12h14M13 6l6 6-6 6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </a>
  );
}
