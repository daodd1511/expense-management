import { describe, expect, it } from "vitest";
import { router } from "./router";

describe("router", () => {
  it("builds the route tree without route id/path invariants", () => {
    expect(router.routesByPath["/"]).toBeDefined();
    expect(router.routesByPath["/transactions"]).toBeDefined();
    expect(router.routesByPath["/reports"]).toBeDefined();
    expect(router.routesByPath["/planning"]).toBeDefined();
    expect(router.routesByPath["/position"]).toBeDefined();
    expect(router.routesByPath["/loans"]).toBeDefined();
    expect(router.routesByPath["/loans/$loanId"]).toBeDefined();
    expect(router.routesByPath["/auth/sign-in"]).toBeDefined();
    expect(router.routesByPath["/auth/sign-up"]).toBeDefined();
    expect(router.routesByPath["/auth/forgot-password"]).toBeUndefined();
    expect(router.routesByPath["/auth/reset-password"]).toBeUndefined();
  });
});
