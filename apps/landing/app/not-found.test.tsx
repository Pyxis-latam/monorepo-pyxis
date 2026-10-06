import { render, screen } from "@testing-library/react";
import { LanguageProvider } from "@/lib/i18n/LanguageContext";
import NotFound from "./not-found";

it("renders a branded 404 with a way back home", () => {
  render(
    <LanguageProvider>
      <NotFound />
    </LanguageProvider>
  );
  expect(screen.getByRole("img", { name: /pyxis/i })).toBeInTheDocument();
  expect(screen.getByText("404")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /volver al inicio/i })).toHaveAttribute("href", "/");
});
