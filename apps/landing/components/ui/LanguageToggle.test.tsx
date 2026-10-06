import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LanguageProvider } from "@/lib/i18n/LanguageContext";
import { LanguageToggle } from "./LanguageToggle";

it("shows the target language and toggles on click", async () => {
  const user = userEvent.setup();
  render(
    <LanguageProvider>
      <LanguageToggle />
    </LanguageProvider>
  );

  const button = screen.getByRole("button", { name: /toggle language/i });
  expect(button).toHaveTextContent("EN");

  await user.click(button);
  expect(button).toHaveTextContent("ES");
});
