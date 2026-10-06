import robots from "./robots";
import sitemap from "./sitemap";

it("allows crawling and points to the sitemap on the production domain", () => {
  const r = robots();
  expect(r.rules).toEqual({ userAgent: "*", allow: "/" });
  expect(r.sitemap).toBe("https://www.pyxis-latam.cl/sitemap.xml");
});

it("lists the single landing URL in the sitemap", () => {
  const s = sitemap();
  expect(s).toHaveLength(1);
  expect(s[0].url).toBe("https://www.pyxis-latam.cl");
});
