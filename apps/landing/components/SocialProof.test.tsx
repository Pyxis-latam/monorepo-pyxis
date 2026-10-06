import { render, screen } from "@testing-library/react";
import { LanguageProvider } from "@/lib/i18n/LanguageContext";
import { SocialProof } from "./SocialProof";

it("renders a live status label followed by the qualitative proof line", () => {
  render(
    <LanguageProvider>
      <SocialProof />
    </LanguageProvider>
  );
  expect(screen.getByText("En operación")).toBeInTheDocument();
  expect(
    screen.getByText(
      "Pyxis Labs ya recompuso una distribuidora B2B de 100 personas. Hermes ya despacha insumos de oficina en Chile."
    )
  ).toBeInTheDocument();
});
