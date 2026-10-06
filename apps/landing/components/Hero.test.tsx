import { render, screen } from "@testing-library/react";
import { LanguageProvider } from "@/lib/i18n/LanguageContext";
import { Hero } from "./Hero";

function renderHero() {
  return render(
    <LanguageProvider>
      <Hero />
    </LanguageProvider>
  );
}

it("renders the Spanish headline with the closing phrase accented", () => {
  renderHero();
  expect(screen.getByText("O con ninguna.")).toBeInTheDocument();
});

it("leads with the calendar CTA naming the founder", () => {
  renderHero();
  expect(screen.getByRole("link", { name: /agenda 30 min con vicente/i })).toHaveAttribute(
    "href",
    expect.stringContaining("cal.com/vicente-pareja")
  );
});

it("names both divisions above the headline instead of repeating the wordmark", () => {
  renderHero();
  expect(screen.getByText("Labs y Ventures")).toBeInTheDocument();
  expect(screen.queryByText("PYXIS")).not.toBeInTheDocument();
});

it("offers a scroll cue that points to the first section", () => {
  renderHero();
  expect(screen.getByRole("link", { name: /bajar/i })).toHaveAttribute("href", "#divisions");
});
