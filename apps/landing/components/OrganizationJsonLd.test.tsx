import { render } from "@testing-library/react";
import { OrganizationJsonLd } from "./OrganizationJsonLd";

it("emits schema.org Organization data for Pyxis with its founders", () => {
  const { container } = render(<OrganizationJsonLd />);
  const script = container.querySelector('script[type="application/ld+json"]');
  expect(script).not.toBeNull();
  const data = JSON.parse(script!.textContent ?? "{}");
  expect(data["@type"]).toBe("Organization");
  expect(data.name).toBe("Pyxis");
  expect(data.url).toBe("https://www.pyxis-latam.cl");
  expect(data.email).toBe("equipo@pyxis-latam.cl");
  expect(data.founder.map((f: { name: string }) => f.name)).toEqual([
    "Vicente Pareja",
    "Felipe Carvallo Lancellotti",
  ]);
});
