import { expect, test } from "bun:test";
import { formatUsdc, truncateAddress, formatInterval } from "./format";

test("formatUsdc", () => {
  expect(formatUsdc("1000000")).toBe("1");
  expect(formatUsdc("500000")).toBe("0.5");
  expect(formatUsdc("0")).toBe("0");
  expect(formatUsdc("1234567")).toBe("1.234567");
});

test("truncateAddress", () => {
  expect(truncateAddress("0x1234567890abcdef1234567890abcdef12345678")).toBe(
    "0x1234...5678",
  );
  expect(truncateAddress("0x1234")).toBe("0x1234");
});

test("formatInterval", () => {
  expect(formatInterval(60)).toBe("1m");
  expect(formatInterval(3600)).toBe("1h");
  expect(formatInterval(86400)).toBe("1d");
  expect(formatInterval(2592000)).toBe("monthly");
  expect(formatInterval(604800)).toBe("weekly");
});
