import { buttonClasses, type ButtonSize, type ButtonVariant } from "./buttonStyles";

export const SCHEDULE_URL = "https://cal.com/vicente-pareja/agenda-con-vicente";

/**
 * Primary call to action: a 30-minute call with the founder, booked on
 * Cal.com. Opens in a new tab so the landing stays put.
 */
export function ScheduleButton({
  label,
  variant = "solid",
  size = "md",
  className = "",
}: {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) {
  return (
    <a
      href={SCHEDULE_URL}
      target="_blank"
      rel="noopener noreferrer"
      data-variant={variant}
      className={buttonClasses(variant, size, className)}
    >
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
