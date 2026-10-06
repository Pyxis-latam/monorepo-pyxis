import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

// Static, simplified version of the Pyxis compass mark for the favicon.
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#07080b",
          borderRadius: 7,
        }}
      >
        <svg width="26" height="26" viewBox="0 0 100 100" fill="none">
          <circle cx="50" cy="50" r="42" stroke="#D9A54D" strokeWidth="6" />
          <path d="M80 50 L50 56 L50 44 Z" fill="#D9A54D" fillOpacity="0.55" />
          <path d="M20 50 L50 56 L50 44 Z" fill="#D9A54D" fillOpacity="0.55" />
          <path d="M50 88 L57 50 L43 50 Z" fill="#F2F1EE" fillOpacity="0.4" />
          <path d="M50 10 L57 50 L43 50 Z" fill="#EAC57C" />
          <circle cx="50" cy="50" r="6" fill="#07080b" stroke="#D9A54D" strokeWidth="5" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
