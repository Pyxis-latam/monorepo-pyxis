import { render, screen, act, fireEvent } from "@testing-library/react";
import { LanguageProvider } from "@/lib/i18n/LanguageContext";
import { GlobeExpansion } from "./GlobeExpansion";

function renderGlobe() {
  return render(
    <LanguageProvider>
      <GlobeExpansion />
    </LanguageProvider>
  );
}

// The step indicator dots carry aria-current, outside the caption's exit/enter
// animation, so they reflect the state immediately.
const current = (name: string) =>
  screen.getByRole("button", { name }).getAttribute("aria-current");

describe("GlobeExpansion auto-advance", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("moves to the next country on its own every few seconds", () => {
    renderGlobe();
    expect(current("Chile")).toBe("true");
    act(() => {
      jest.advanceTimersByTime(6500);
    });
    expect(current("México")).toBe("true");
    act(() => {
      jest.advanceTimersByTime(6000);
    });
    expect(current("Brasil y Paraguay")).toBe("true");
  });

  it("stops advancing once the visitor takes control", () => {
    renderGlobe();
    fireEvent.click(screen.getByRole("button", { name: "Siguiente país" }));
    expect(current("México")).toBe("true");
    act(() => {
      jest.advanceTimersByTime(20000);
    });
    expect(current("México")).toBe("true");
  });
});
