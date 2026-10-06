import { render, screen, act } from "@testing-library/react";
import { GlobeSection } from "./GlobeSection";

jest.mock("./GlobeExpansion", () => ({
  GlobeExpansion: () => <section id="expansion" data-testid="globe" />,
}));

type IOCallback = (entries: Array<{ isIntersecting: boolean }>) => void;

describe("GlobeSection", () => {
  let callbacks: IOCallback[];

  beforeEach(() => {
    callbacks = [];
    class IO {
      constructor(cb: IOCallback) {
        callbacks.push(cb);
      }
      observe = jest.fn();
      unobserve = jest.fn();
      disconnect = jest.fn();
    }
    Object.defineProperty(window, "IntersectionObserver", { writable: true, value: IO });
  });

  it("keeps the #expansion anchor and a full-height placeholder before the globe loads", () => {
    const { container } = render(<GlobeSection />);
    expect(container.querySelector("#expansion")).not.toBeNull();
    expect(screen.queryByTestId("globe")).not.toBeInTheDocument();
    expect(callbacks).toHaveLength(1);
  });

  it("loads the three.js globe only once the section approaches the viewport", async () => {
    render(<GlobeSection />);
    act(() => callbacks[0]([{ isIntersecting: true }]));
    expect(await screen.findByTestId("globe")).toBeInTheDocument();
  });
});
