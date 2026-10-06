import { render, screen } from "@testing-library/react";
import { LanguageProvider } from "@/lib/i18n/LanguageContext";
import { FinalCta } from "./FinalCta";

it("renders the closing statement, the calendar CTA and the email as fallback", () => {
  render(
    <LanguageProvider>
      <FinalCta />
    </LanguageProvider>
  );
  expect(screen.getByText("sin ser más grande")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /agenda 30 min con vicente/i })).toHaveAttribute(
    "href",
    expect.stringContaining("cal.com/vicente-pareja")
  );
  expect(screen.getByRole("link", { name: "equipo@pyxis-latam.cl" })).toHaveAttribute(
    "href",
    "mailto:equipo@pyxis-latam.cl"
  );
});
