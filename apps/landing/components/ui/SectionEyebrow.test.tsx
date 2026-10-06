import { render, screen } from "@testing-library/react";
import { SectionEyebrow } from "./SectionEyebrow";

it("renders its label text", () => {
  render(<SectionEyebrow>01 — El problema</SectionEyebrow>);
  expect(screen.getByText("01 — El problema")).toBeInTheDocument();
});
