import { render, screen } from "@testing-library/react";
import { MotionConfig } from "framer-motion";
import { RevealOnScroll } from "./RevealOnScroll";

describe("RevealOnScroll", () => {
  it("renders its children", () => {
    render(
      <RevealOnScroll>
        <p>Hello</p>
      </RevealOnScroll>
    );
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("still renders its children when reduced motion is preferred", () => {
    render(
      <MotionConfig reducedMotion="always">
        <RevealOnScroll>
          <p>Reduced</p>
        </RevealOnScroll>
      </MotionConfig>
    );
    expect(screen.getByText("Reduced")).toBeInTheDocument();
  });
});
