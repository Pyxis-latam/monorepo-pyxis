import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Home-screen icon: the compass rose on the tinted black, no transparency.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "radial-gradient(circle at 50% 40%, #1a1710 0%, #07080b 65%)",
        }}
      >
        <svg width="132" height="132" viewBox="0 0 100 100" fill="none">
          <circle cx="50" cy="50" r="44" stroke="#D9A54D" strokeWidth="2.2" strokeOpacity="0.85" />
          <line x1="50" y1="6" x2="50" y2="12" stroke="#D9A54D" strokeWidth="2.2" strokeLinecap="round" />
          <line x1="94" y1="50" x2="88" y2="50" stroke="#D9A54D" strokeWidth="2.2" strokeLinecap="round" />
          <line x1="50" y1="94" x2="50" y2="88" stroke="#D9A54D" strokeWidth="2.2" strokeLinecap="round" />
          <line x1="6" y1="50" x2="12" y2="50" stroke="#D9A54D" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M78 50 L50 54.5 L50 45.5 Z" fill="#D9A54D" fillOpacity="0.5" />
          <path d="M22 50 L50 54.5 L50 45.5 Z" fill="#D9A54D" fillOpacity="0.5" />
          <path d="M50 88 L56 50 L44 50 Z" fill="#F2F1EE" fillOpacity="0.3" />
          <path d="M50 8 L56 50 L44 50 Z" fill="#EAC57C" />
          <circle cx="50" cy="50" r="3.6" fill="#07080b" stroke="#D9A54D" strokeWidth="2" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
