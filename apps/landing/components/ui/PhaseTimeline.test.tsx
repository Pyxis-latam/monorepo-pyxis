import { render, screen } from "@testing-library/react";
import { PhaseTimeline } from "./PhaseTimeline";

it("renders every phase and the animated line under the given test id", () => {
  render(
    <PhaseTimeline
      lineTestId="labs-line"
      phases={[
        { label: "Hoy", title: "Retail", body: "Piloto" },
        { label: "Después", title: "Construcción", body: "Siguiente" },
      ]}
    />
  );
  expect(screen.getByText("Hoy")).toBeInTheDocument();
  expect(screen.getByText("Construcción")).toBeInTheDocument();
  expect(screen.getByTestId("labs-line")).toBeInTheDocument();
});
