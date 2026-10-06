import { render, screen, fireEvent, act } from "@testing-library/react";
import { LanguageProvider } from "@/lib/i18n/LanguageContext";
import { Header } from "./Header";

function renderHeader() {
  return render(
    <LanguageProvider>
      <Header />
    </LanguageProvider>
  );
}

describe("Header", () => {
  it("renders nav items in Spanish by default", () => {
    renderHeader();
    expect(screen.getByText("Pyxis Labs")).toBeInTheDocument();
    expect(screen.getByText("Pyxis Ventures")).toBeInTheDocument();
  });

  it("shows a solid background and compresses after scrolling", () => {
    renderHeader();
    const header = screen.getByTestId("header");
    expect(header.className).toContain("bg-transparent");
    expect(header).toHaveAttribute("data-scrolled", "false");

    Object.defineProperty(window, "scrollY", { value: 100, writable: true });
    fireEvent.scroll(window);

    expect(header.className).toContain("backdrop-blur-md");
    expect(header).toHaveAttribute("data-scrolled", "true");
  });

  it("includes a mailto CTA", () => {
    renderHeader();
    const cta = screen.getByText("Hablemos");
    expect(cta.closest("a")).toHaveAttribute(
      "href",
      expect.stringContaining("mailto:equipo@pyxis-latam.cl")
    );
  });
});

describe("Header active section", () => {
  it("marks the nav link of the section currently on screen", () => {
    type Entry = { isIntersecting: boolean; target: Element; intersectionRatio: number };
    let callback: ((entries: Entry[]) => void) | undefined;
    class IO {
      constructor(cb: (entries: Entry[]) => void) {
        callback = cb;
      }
      observe = jest.fn();
      unobserve = jest.fn();
      disconnect = jest.fn();
    }
    Object.defineProperty(window, "IntersectionObserver", { writable: true, value: IO });

    const ventures = document.createElement("section");
    ventures.id = "ventures";
    document.body.appendChild(ventures);

    renderHeader();
    const link = screen.getByText("Pyxis Ventures");
    expect(link).not.toHaveAttribute("aria-current");

    act(() => callback?.([{ isIntersecting: true, target: ventures, intersectionRatio: 0.6 }]));
    expect(link).toHaveAttribute("aria-current", "true");
    ventures.remove();
  });
});
