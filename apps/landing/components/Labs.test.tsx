import { render, screen } from "@testing-library/react";
import { LanguageProvider } from "@/lib/i18n/LanguageContext";
import { Labs } from "./Labs";

function renderLabs() {
  return render(
    <LanguageProvider>
      <Labs />
    </LanguageProvider>
  );
}

it("renders the Labs section under the #labs anchor with its headline", () => {
  const { container } = renderLabs();
  expect(container.querySelector("#labs")).toBeInTheDocument();
  expect(screen.getByText("más potente")).toBeInTheDocument();
});

it("renders the four real stages of an engagement", () => {
  renderLabs();
  for (const stage of ["Auditoría", "Diagnóstico y plan", "Implementación", "Postventa"]) {
    expect(screen.getByRole("heading", { name: stage })).toBeInTheDocument();
  }
});

it("renders the anonymised case of the B2B office-supplies distributor", () => {
  renderLabs();
  expect(screen.getByText(/Distribuidora B2B de insumos de oficina/)).toBeInTheDocument();
  expect(screen.getAllByText(/ERP/).length).toBeGreaterThan(0);
  expect(screen.getByText(/departamento de marketing/i)).toBeInTheDocument();
});

it("renders the growth timeline by company size and vertical", () => {
  renderLabs();
  expect(screen.getByText("Distribuidora B2B de 100 personas")).toBeInTheDocument();
  expect(screen.getByText("Mobiliario y construcción")).toBeInTheDocument();
  expect(screen.getByTestId("labs-line")).toBeInTheDocument();
});
