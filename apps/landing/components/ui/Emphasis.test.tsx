import { render, screen } from "@testing-library/react";
import { Emphasis } from "./Emphasis";

it("renders its emphasized text", () => {
  render(<Emphasis>cero personas</Emphasis>);
  expect(screen.getByText("cero personas")).toBeInTheDocument();
});
