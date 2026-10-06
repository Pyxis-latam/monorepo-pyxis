import { render, screen } from "@testing-library/react";
import { PyxisCompass } from "./PyxisCompass";

describe("PyxisCompass", () => {
  it("is announced as the Pyxis mark", () => {
    render(<PyxisCompass />);
    expect(screen.getByRole("img", { name: /pyxis/i })).toBeInTheDocument();
  });

  it("thickens its strokes at small sizes so the mark survives in the header", () => {
    const { rerender } = render(<PyxisCompass size={28} />);
    expect(screen.getByRole("img")).toHaveAttribute("data-scale", "small");

    rerender(<PyxisCompass size={96} />);
    expect(screen.getByRole("img")).toHaveAttribute("data-scale", "large");
  });

  it("rotates the dial and settles the needle around the centre of the viewBox, never off-axis", () => {
    const { container } = render(<PyxisCompass size={96} />);
    const rotations = Array.from(container.querySelectorAll("animateTransform"));
    expect(rotations.length).toBeGreaterThanOrEqual(2);
    for (const el of rotations) {
      expect(el).toHaveAttribute("type", "rotate");
      const keyframes = (el.getAttribute("values") ?? `${el.getAttribute("from")};${el.getAttribute("to")}`)
        .split(";")
        .map((v) => v.trim());
      for (const frame of keyframes) {
        expect(frame).toMatch(/^-?[\d.]+ 50 50$/);
      }
    }
  });
});
