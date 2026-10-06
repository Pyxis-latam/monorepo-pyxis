import { dictionaries } from "./dictionary";

function shape(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(shape);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, v]) => [key, shape(v)])
    );
  }
  return typeof value;
}

it("has identical key structure, nesting, and array lengths between es and en", () => {
  expect(shape(dictionaries.es)).toEqual(shape(dictionaries.en));
});
