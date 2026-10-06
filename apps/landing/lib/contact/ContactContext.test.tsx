import { render, screen, fireEvent } from "@testing-library/react";
import { ContactProvider, useContact } from "./ContactContext";

function Probe() {
  const { isOpen, openContact, closeContact } = useContact();
  return (
    <div>
      <span data-testid="state">{isOpen ? "open" : "closed"}</span>
      <button onClick={openContact}>open</button>
      <button onClick={closeContact}>close</button>
    </div>
  );
}

describe("ContactContext", () => {
  it("toggles the contact panel state inside the provider", () => {
    render(
      <ContactProvider>
        <Probe />
      </ContactProvider>
    );
    expect(screen.getByTestId("state")).toHaveTextContent("closed");
    fireEvent.click(screen.getByText("open"));
    expect(screen.getByTestId("state")).toHaveTextContent("open");
    fireEvent.click(screen.getByText("close"));
    expect(screen.getByTestId("state")).toHaveTextContent("closed");
  });

  it("is a safe no-op outside the provider so mailto links keep working", () => {
    render(<Probe />);
    expect(screen.getByTestId("state")).toHaveTextContent("closed");
    fireEvent.click(screen.getByText("open"));
    expect(screen.getByTestId("state")).toHaveTextContent("closed");
  });
});
