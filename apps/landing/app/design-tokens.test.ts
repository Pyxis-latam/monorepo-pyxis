import { readFileSync } from "fs";
import path from "path";

describe("design tokens", () => {
  const css = readFileSync(path.join(__dirname, "globals.css"), "utf-8");

  it("defines the Pyxis color palette (tinted near-black, not pure black)", () => {
    expect(css).toContain("--color-pyxis-bg: #07080b");
    expect(css).toContain("--color-pyxis-fg: #f2f1ee");
    expect(css).toContain("--color-pyxis-accent: #d9a54d");
    expect(css).toContain("--color-pyxis-accent-soft: #eac57c");
    expect(css).toContain("--color-pyxis-panel: #0e1016");
    expect(css).toContain("--color-pyxis-line:");
  });

  it("registers the three type roles: display sans, serif accent and mono labels", () => {
    expect(css).toContain("--font-display: var(--font-display)");
    expect(css).toContain("--font-serif-accent: var(--font-serif-accent)");
    expect(css).toContain("--font-mono-label: var(--font-mono-label)");
  });

  it("keeps the reduced-motion rule, smooth scrolling and anchor offset", () => {
    expect(css).toContain("prefers-reduced-motion");
    expect(css).toContain("scroll-behavior: smooth");
    expect(css).toContain("scroll-padding-top");
  });
});
