import { describe, expect, it } from "vitest";
import { router } from "./router";

describe("router", () => {
  it("builds the route tree without route id/path invariants", () => {
    expect(router.routesByPath["/"]).toBeDefined();
    expect(router.routesByPath["/transactions"]).toBeDefined();
    expect(router.routesByPath["/reports"]).toBeDefined();
    expect(router.routesByPath["/loans"]).toBeDefined();
    expect(router.routesByPath["/loans/$loanId"]).toBeDefined();
  });
});
