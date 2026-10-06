import { render, screen } from "@testing-library/react";
import { HermesLoop } from "./HermesLoop";

it("draws the closed loop with its three stations and no person in the middle", () => {
  render(<HermesLoop label="Ciclo de Hermes" stations={["Compra", "Venta", "Despacho"]} />);
  expect(screen.getByRole("img", { name: "Ciclo de Hermes" })).toBeInTheDocument();
  expect(screen.getByText("Compra")).toBeInTheDocument();
  expect(screen.getByText("Venta")).toBeInTheDocument();
  expect(screen.getByText("Despacho")).toBeInTheDocument();
  expect(screen.getByTestId("hermes-pulse")).toBeInTheDocument();
});
