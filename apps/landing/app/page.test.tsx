import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LanguageProvider } from "@/lib/i18n/LanguageContext";
import Home from "./page";

// The language choice persists in localStorage; keep tests independent.
beforeEach(() => window.localStorage.clear());

it("renders every section of the landing page", () => {
  render(
    <LanguageProvider>
      <Home />
    </LanguageProvider>
  );

  expect(screen.getAllByText("PYXIS").length).toBeGreaterThan(0);
  expect(screen.getByTestId("particle-field")).toBeInTheDocument();
  expect(screen.getByText("O con ninguna.")).toBeInTheDocument();
  expect(screen.getByRole("heading", { level: 3, name: "Pyxis Labs" })).toBeInTheDocument();
  expect(screen.getByText("más potente")).toBeInTheDocument();
  expect(screen.getByText("Zero Man Wholesaler")).toBeInTheDocument();
  expect(screen.getByText("Distribuidora B2B de 100 personas")).toBeInTheDocument();
  expect(screen.getByText("Vicente Pareja")).toBeInTheDocument();
});

it("switches the whole page to English when the language toggle is clicked", async () => {
  const user = userEvent.setup();
  render(
    <LanguageProvider>
      <Home />
    </LanguageProvider>
  );

  const toggles = screen.getAllByRole("button", { name: /toggle language/i });
  await user.click(toggles[0]);

  expect(screen.getByText("Or with none.")).toBeInTheDocument();
  expect(screen.getByText("more powerful")).toBeInTheDocument();
  expect(screen.getByText("Furniture and construction")).toBeInTheDocument();
});

it("wires every header nav link to a real section id on the page", () => {
  const { container } = render(
    <LanguageProvider>
      <Home />
    </LanguageProvider>
  );

  for (const href of ["#labs", "#ventures", "#team"]) {
    expect(container.querySelector(`a[href="${href}"]`)).not.toBeNull();
    expect(container.querySelector(href)).not.toBeNull();
  }
});

it("places the globe expansion map inside the Ventures narrative, after the Hermes intro", () => {
  const { container } = render(
    <LanguageProvider>
      <Home />
    </LanguageProvider>
  );
  const ventures = container.querySelector("#ventures");
  const globe = container.querySelector("#expansion");
  expect(ventures).not.toBeNull();
  expect(globe).not.toBeNull();
  expect(
    ventures!.compareDocumentPosition(globe!) & Node.DOCUMENT_POSITION_FOLLOWING
  ).toBeTruthy();
});

it("opens the contact panel when the header CTA is pressed instead of relying on mailto alone", () => {
  render(
    <LanguageProvider>
      <Home />
    </LanguageProvider>
  );
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  const ctas = screen.getAllByRole("link", { name: "Hablemos" });
  fireEvent.click(ctas[0]);
  expect(screen.getByRole("dialog")).toBeInTheDocument();
});
