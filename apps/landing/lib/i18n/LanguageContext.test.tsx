import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LanguageProvider, useLanguage } from "./LanguageContext";

function Probe() {
  const { lang, t, toggleLang } = useLanguage();
  return (
    <div>
      <span data-testid="lang">{lang}</span>
      <span data-testid="headline">{t.hero.headlineEmphasis}</span>
      <button onClick={toggleLang}>toggle</button>
    </div>
  );
}

describe("LanguageContext", () => {
  it("defaults to Spanish", () => {
    render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>
    );
    expect(screen.getByTestId("lang")).toHaveTextContent("es");
    expect(screen.getByTestId("headline")).toHaveTextContent("O con ninguna.");
  });

  it("toggles to English and back", async () => {
    const user = userEvent.setup();
    render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>
    );

    await user.click(screen.getByText("toggle"));
    expect(screen.getByTestId("lang")).toHaveTextContent("en");
    expect(screen.getByTestId("headline")).toHaveTextContent(
      "Or with none."
    );

    await user.click(screen.getByText("toggle"));
    expect(screen.getByTestId("lang")).toHaveTextContent("es");
  });
});

describe("LanguageContext persistence", () => {
  beforeEach(() => window.localStorage.clear());

  it("remembers the chosen language for the next visit", async () => {
    const user = userEvent.setup();
    const { unmount } = render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>
    );
    await user.click(screen.getByText("toggle"));
    expect(window.localStorage.getItem("pyxis-lang")).toBe("en");
    unmount();

    render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>
    );
    await waitFor(() => expect(screen.getByTestId("lang")).toHaveTextContent("en"));
  });

  it("ignores garbage in storage and stays in Spanish", async () => {
    window.localStorage.setItem("pyxis-lang", "klingon");
    render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>
    );
    await waitFor(() => expect(screen.getByTestId("lang")).toHaveTextContent("es"));
  });
});
