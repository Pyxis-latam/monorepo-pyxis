import { render, screen } from "@testing-library/react";
import { ScheduleButton } from "./ScheduleButton";

describe("ScheduleButton", () => {
  it("links to the founder's calendar in a new tab", () => {
    render(<ScheduleButton label="Agenda 30 min con Vicente" />);
    const link = screen.getByRole("link", { name: "Agenda 30 min con Vicente" });
    expect(link).toHaveAttribute("href", "https://cal.com/vicente-pareja/agenda-con-vicente");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });

  it("is filled by default and outlined when asked", () => {
    const { rerender } = render(<ScheduleButton label="Agenda" />);
    expect(screen.getByRole("link")).toHaveAttribute("data-variant", "solid");
    rerender(<ScheduleButton label="Agenda" variant="outline" />);
    expect(screen.getByRole("link")).toHaveAttribute("data-variant", "outline");
  });
});
