import { render, screen, fireEvent } from "@testing-library/react";
import { LanguageProvider } from "@/lib/i18n/LanguageContext";
import { Team } from "./Team";

function renderTeam() {
  return render(
    <LanguageProvider>
      <Team />
    </LanguageProvider>
  );
}

it("renders both founders with their full titles", () => {
  renderTeam();
  expect(screen.getByText("Vicente Pareja")).toBeInTheDocument();
  expect(
    screen.getByText("Chief Executive Officer (CEO)")
  ).toBeInTheDocument();
  expect(screen.getByText("Felipe Carvallo Lancellotti")).toBeInTheDocument();
  expect(
    screen.getByText("Chief Deployment Officer (CDO)")
  ).toBeInTheDocument();
});

it("keeps the profile card collapsed until the name is clicked", () => {
  renderTeam();
  expect(
    screen.queryByRole("link", { name: /LinkedIn/i })
  ).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: /Vicente Pareja/ }));

  const link = screen.getByRole("link", { name: /LinkedIn/i });
  expect(link).toHaveAttribute(
    "href",
    "https://www.linkedin.com/in/vicentepareja/"
  );
});

it("expands the correct card for Felipe", () => {
  renderTeam();
  fireEvent.click(
    screen.getByRole("button", { name: /Felipe Carvallo Lancellotti/ })
  );

  const link = screen.getByRole("link", { name: /LinkedIn/i });
  expect(link).toHaveAttribute(
    "href",
    "https://www.linkedin.com/in/felipe-carvallo-lancellotti-228615276/?locale=en"
  );
  // the bio panel is now visible (text unique to the bio)
  expect(
    screen.getByText(/Magíster en Innovación y Emprendimiento|Master's in Innovation & Entrepreneurship/)
  ).toBeInTheDocument();
});

it("shows one credential line per founder without needing to expand the card", () => {
  renderTeam();
  expect(screen.getByText(/200\+ personas/)).toBeInTheDocument();
  expect(screen.getByText(/Ingeniero Comercial UAI/)).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: /LinkedIn/i })).not.toBeInTheDocument();
});
