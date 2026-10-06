import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(circle at 20% 10%, rgba(217,165,77,0.16), transparent 45%), radial-gradient(circle at 85% 30%, rgba(64,92,160,0.18), transparent 50%), #07080b",
          color: "#F2F1EE",
          padding: 80,
          textAlign: "center",
        }}
      >
        <svg width="140" height="140" viewBox="0 0 100 100" fill="none">
          <circle cx="50" cy="50" r="44" stroke="#D9A54D" strokeWidth="1.6" strokeOpacity="0.8" />
          <line x1="50" y1="6" x2="50" y2="13" stroke="#D9A54D" strokeWidth="1.6" />
          <line x1="94" y1="50" x2="87" y2="50" stroke="#D9A54D" strokeWidth="1.6" />
          <line x1="50" y1="94" x2="50" y2="87" stroke="#D9A54D" strokeWidth="1.6" />
          <line x1="6" y1="50" x2="13" y2="50" stroke="#D9A54D" strokeWidth="1.6" />
          <circle cx="50" cy="50" r="33" stroke="#D9A54D" strokeOpacity="0.25" strokeWidth="0.8" strokeDasharray="0.8 3.4" />
          <path d="M78 50 L50 54.5 L50 45.5 Z" fill="#D9A54D" fillOpacity="0.45" />
          <path d="M22 50 L50 54.5 L50 45.5 Z" fill="#D9A54D" fillOpacity="0.45" />
          <path d="M50 88 L56 50 L44 50 Z" fill="#F2F1EE" fillOpacity="0.26" />
          <path d="M50 8 L56 50 L44 50 Z" fill="#EAC57C" />
          <circle cx="50" cy="50" r="3.4" fill="#07080b" stroke="#D9A54D" strokeWidth="1.4" />
        </svg>
        <div
          style={{
            marginTop: 28,
            fontSize: 30,
            fontWeight: 700,
            letterSpacing: 14,
            color: "#F2F1EE",
          }}
        >
          PYXIS
        </div>
        <div
          style={{
            marginTop: 26,
            maxWidth: 900,
            fontSize: 40,
            fontWeight: 600,
            lineHeight: 1.15,
            color: "#F2F1EE",
          }}
        >
          Empresas que rinden más con las mismas personas. O con ninguna.
        </div>
        <div style={{ marginTop: 26, fontSize: 24, color: "#D9A54D" }}>
          Pyxis Labs · Pyxis Ventures · Santiago, Chile
        </div>
      </div>
    ),
    { ...size }
  );
}
