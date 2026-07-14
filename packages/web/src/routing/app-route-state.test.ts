import { describe, expect, it } from "vitest";
import { navigationAreaFromSection, sectionFromPath } from "./app-route-state";

describe("app route state", () => {
  it.each([
    ["/", "overview"],
    ["/reports", "overview"],
    ["/transactions", "activity"],
    ["/planning", "planning"],
    ["/budgets", "planning"],
    ["/subscriptions", "planning"],
    ["/position", "position"],
    ["/accounts", "position"],
    ["/loans/example", "position"],
    ["/settings/categories", "manage"],
  ])("maps %s to the %s navigation area", (pathname, expectedArea) => {
    expect(navigationAreaFromSection(sectionFromPath(pathname))).toBe(expectedArea);
  });
});
