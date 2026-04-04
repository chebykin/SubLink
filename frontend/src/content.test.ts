import { expect, test } from "bun:test";

import { heroSubtitle, heroTitle } from "./content";

test("frontend branding content stays in place", () => {
  expect(heroTitle).toBe("Sublink");
  expect(heroSubtitle).toContain("Vue + Vite");
});
