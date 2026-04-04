import { expect, test } from "bun:test";

import { getPayload } from "./index";

test("health payload reports ok", () => {
  expect(getPayload("/health")).toEqual({ ok: true });
});

test("default payload includes the request path", () => {
  expect(getPayload("/links")).toEqual({
    name: "sublink-backend",
    ok: true,
    path: "/links"
  });
});
