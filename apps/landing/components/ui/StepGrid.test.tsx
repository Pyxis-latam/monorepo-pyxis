import { render, screen } from "@testing-library/react";
import { StepGrid } from "./StepGrid";

it("renders one column per step with number, title and body", () => {
  render(
    <StepGrid
      steps={[
        { number: "01", title: "Uno", body: "Primero" },
        { number: "02", title: "Dos", body: "Segundo" },
      ]}
    />
  );
  expect(screen.getByText("01")).toBeInTheDocument();
  expect(screen.getByText("Uno")).toBeInTheDocument();
  expect(screen.getByText("Segundo")).toBeInTheDocument();
  expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(2);
});

it("draws no decorative ghost numeral behind the titles", () => {
  const { container } = render(
    <StepGrid steps={[{ number: "01", title: "Uno", body: "Primero" }]} />
  );
  expect(container.querySelector("[data-number]")).toBeNull();
});
