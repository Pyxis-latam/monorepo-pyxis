import { render, screen } from "@testing-library/react";
import { MailtoButton } from "./MailtoButton";

describe("MailtoButton", () => {
  it("renders a plain mailto link without a subject", () => {
    render(<MailtoButton email="equipo@pyxis-latam.cl" label="Hablemos" />);
    expect(screen.getByRole("link", { name: "Hablemos" })).toHaveAttribute(
      "href",
      "mailto:equipo@pyxis-latam.cl"
    );
  });

  it("encodes the subject when provided", () => {
    render(
      <MailtoButton
        email="equipo@pyxis-latam.cl"
        label="Hablemos"
        subject="Hola Pyxis"
      />
    );
    expect(screen.getByRole("link", { name: "Hablemos" })).toHaveAttribute(
      "href",
      "mailto:equipo@pyxis-latam.cl?subject=Hola%20Pyxis"
    );
  });

  it("is filled by default and outlined when asked", () => {
    const { rerender } = render(
      <MailtoButton email="a@b.c" label="Hablemos" />
    );
    expect(screen.getByRole("link")).toHaveAttribute("data-variant", "solid");

    rerender(<MailtoButton email="a@b.c" label="Hablemos" variant="outline" />);
    expect(screen.getByRole("link")).toHaveAttribute("data-variant", "outline");
  });

  it("carries a decorative arrow that screen readers skip", () => {
    render(<MailtoButton email="a@b.c" label="Hablemos" />);
    const icon = screen.getByRole("link").querySelector("svg");
    expect(icon).not.toBeNull();
    expect(icon).toHaveAttribute("aria-hidden", "true");
  });
});
