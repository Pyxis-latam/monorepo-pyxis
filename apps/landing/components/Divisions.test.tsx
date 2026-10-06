import { render, screen } from "@testing-library/react";
import { LanguageProvider } from "@/lib/i18n/LanguageContext";
import { Divisions } from "./Divisions";

it("renders both divisions with links to their own sections", () => {
  const { container } = render(
    <LanguageProvider>
      <Divisions />
    </LanguageProvider>
  );
  expect(container.querySelector("#divisions")).toBeInTheDocument();
  expect(screen.getByRole("heading", { level: 3, name: "Pyxis Labs" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { level: 3, name: "Pyxis Ventures" })).toBeInTheDocument();
  expect(container.querySelector('a[href="#labs"]')).not.toBeNull();
  expect(container.querySelector('a[href="#ventures"]')).not.toBeNull();
});
