import { render, screen } from "@testing-library/react";
import { ParticleField } from "./ParticleField";

describe("ParticleField", () => {
  it("renders a canvas element", () => {
    render(<ParticleField />);
    expect(screen.getByTestId("particle-field")).toBeInTheDocument();
  });

  it("scales the canvas bitmap by devicePixelRatio so stars stay sharp on retina", () => {
    Object.defineProperty(window, "devicePixelRatio", { value: 2, configurable: true });
    Object.defineProperty(HTMLCanvasElement.prototype, "offsetWidth", {
      value: 300,
      configurable: true,
    });
    Object.defineProperty(HTMLCanvasElement.prototype, "offsetHeight", {
      value: 200,
      configurable: true,
    });

    render(<ParticleField />);
    const canvas = screen.getByTestId("particle-field") as HTMLCanvasElement;
    expect(canvas.width).toBe(600);
    expect(canvas.height).toBe(400);
  });

  it("follows the pointer only on devices with a fine pointer (mouse), not on touch", () => {
    const listeners: string[] = [];
    const addSpy = jest.spyOn(window, "addEventListener").mockImplementation((type) => {
      listeners.push(type as string);
    });

    window.matchMedia = jest.fn().mockImplementation((query: string) => ({
      matches: query.includes("pointer: fine"),
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    })) as unknown as typeof window.matchMedia;
    const { unmount } = render(<ParticleField />);
    expect(listeners).toContain("pointermove");
    unmount();

    listeners.length = 0;
    window.matchMedia = jest.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    })) as unknown as typeof window.matchMedia;
    render(<ParticleField />);
    expect(listeners).not.toContain("pointermove");
    addSpy.mockRestore();
  });

  it("does not schedule further frames when reduced motion is preferred", () => {
    const rafSpy = jest.spyOn(window, "requestAnimationFrame");
    window.matchMedia = jest.fn().mockImplementation((query: string) => ({
      matches: query.includes("reduce"),
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    })) as unknown as typeof window.matchMedia;

    render(<ParticleField />);
    expect(rafSpy).not.toHaveBeenCalled();
    rafSpy.mockRestore();
  });
});
