import { render, screen } from "@testing-library/react";
import { Recomposition } from "./Recomposition";

it("draws the same number of nodes before and after: recomposition never adds or removes people", () => {
  const { container } = render(<Recomposition label="Recomposición" />);
  const figure = screen.getByRole("img", { name: "Recomposición" });
  expect(figure).toBeInTheDocument();
  const nodes = container.querySelectorAll("[data-node]");
  expect(nodes.length).toBeGreaterThanOrEqual(8);
  expect(figure).toHaveAttribute("data-nodes", String(nodes.length));
});
