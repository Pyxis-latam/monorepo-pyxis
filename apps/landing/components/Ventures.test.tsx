import { render, screen } from "@testing-library/react";
import { LanguageProvider } from "@/lib/i18n/LanguageContext";
import { Ventures } from "./Ventures";

function renderVentures() {
  return render(
    <LanguageProvider>
      <Ventures />
    </LanguageProvider>
  );
}

it("renders the Ventures section under the #ventures anchor introducing Hermes", () => {
  const { container } = renderVentures();
  expect(container.querySelector("#ventures")).toBeInTheDocument();
  expect(screen.getByText("Zero Man Wholesaler")).toBeInTheDocument();
});

it("renders the three pillars of the autonomous distributor", () => {
  renderVentures();
  expect(screen.getByRole("heading", { name: "Compra" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Venta" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Despacho" })).toBeInTheDocument();
});
