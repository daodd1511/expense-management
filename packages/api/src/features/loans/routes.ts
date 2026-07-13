import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import type { AuthEnv } from "../../middleware/auth";
import { jsonError } from "../../lib/response";
import * as controller from "./controller";
import {
  closeLoanSchema,
  disbursedLoanCreateSchema,
  loanDisbursementPatchSchema,
  loanListQuerySchema,
  loanMetadataPatchSchema,
  loanRepaymentCreateSchema,
  loanRepaymentPatchSchema,
  openingLoanCreateSchema,
  personCreateSchema,
  personPatchSchema,
} from "./schema";

function validateJson<T extends z.ZodType>(schema: T) {
  return zValidator("json", schema, (result, c) => {
    if (!result.success) {
      return jsonError(c, 400, "Invalid request body", z.flattenError(result.error));
    }
  });
}

function validateQuery<T extends z.ZodType>(schema: T) {
  return zValidator("query", schema, (result, c) => {
    if (!result.success) {
      return jsonError(c, 400, "Invalid request query", z.flattenError(result.error));
    }
  });
}

export const peopleRouter = new Hono<AuthEnv>();

peopleRouter.get("/", controller.listPeople);
peopleRouter.post("/", validateJson(personCreateSchema), async (c) => {
  const data = await controller.createPerson(c.get("userId"), c.req.valid("json"));
  return c.json({ data }, 201);
});
peopleRouter.patch("/:id", validateJson(personPatchSchema), async (c) => {
  const data = await controller.updatePerson(
    c.get("userId"),
    c.req.param("id"),
    c.req.valid("json"),
  );
  return c.json({ data });
});
peopleRouter.delete("/:id", controller.deletePerson);

export const loansRouter = new Hono<AuthEnv>();

loansRouter.get("/", validateQuery(loanListQuerySchema), (c) =>
  controller.listLoanSummaries(c, c.req.valid("query")),
);
loansRouter.get("/people-summary", validateQuery(loanListQuerySchema), (c) =>
  controller.listPersonSummaries(c, c.req.valid("query")),
);
loansRouter.post(
  "/disbursed",
  validateQuery(loanListQuerySchema),
  validateJson(disbursedLoanCreateSchema),
  async (c) => {
    const data = await controller.createDisbursedLoan(
      c.get("userId"),
      c.req.valid("json"),
      c.req.valid("query").today,
    );
    return c.json({ data }, 201);
  },
);
loansRouter.post(
  "/opening",
  validateQuery(loanListQuerySchema),
  validateJson(openingLoanCreateSchema),
  async (c) => {
    const data = await controller.createOpeningLoan(
      c.get("userId"),
      c.req.valid("json"),
      c.req.valid("query").today,
    );
    return c.json({ data }, 201);
  },
);
loansRouter.get("/:id", validateQuery(loanListQuerySchema), (c) =>
  controller.getLoanDetail(c, c.req.valid("query")),
);
loansRouter.patch(
  "/:id",
  validateQuery(loanListQuerySchema),
  validateJson(loanMetadataPatchSchema),
  async (c) => {
    const data = await controller.updateLoanMetadata(
      c.get("userId"),
      c.req.param("id"),
      c.req.valid("json"),
      c.req.valid("query").today,
    );
    return c.json({ data });
  },
);
loansRouter.patch(
  "/:id/disbursement",
  validateQuery(loanListQuerySchema),
  validateJson(loanDisbursementPatchSchema),
  async (c) => {
    const data = await controller.updateLoanDisbursement(
      c.get("userId"),
      c.req.param("id"),
      c.req.valid("json"),
      c.req.valid("query").today,
    );
    return c.json({ data });
  },
);
loansRouter.delete("/:id", controller.deleteLoan);
loansRouter.post(
  "/:id/repayments",
  validateQuery(loanListQuerySchema),
  validateJson(loanRepaymentCreateSchema),
  async (c) => {
    const data = await controller.createLoanRepayment(
      c.get("userId"),
      c.req.param("id"),
      c.req.valid("json"),
      c.req.valid("query").today,
    );
    return c.json({ data }, 201);
  },
);
loansRouter.patch(
  "/:id/repayments/:eventId",
  validateQuery(loanListQuerySchema),
  validateJson(loanRepaymentPatchSchema),
  async (c) => {
    const data = await controller.updateLoanRepayment(
      c.get("userId"),
      c.req.param("id"),
      c.req.param("eventId"),
      c.req.valid("json"),
      c.req.valid("query").today,
    );
    return c.json({ data });
  },
);
loansRouter.delete("/:id/repayments/:eventId", controller.deleteLoanRepayment);
loansRouter.post(
  "/:id/close",
  validateQuery(loanListQuerySchema),
  validateJson(closeLoanSchema),
  async (c) => {
    const data = await controller.closeLoan(
      c.get("userId"),
      c.req.param("id"),
      c.req.valid("json"),
      c.req.valid("query").today,
    );
    return c.json({ data });
  },
);
loansRouter.post("/:id/reopen", validateQuery(loanListQuerySchema), (c) =>
  controller.reopenLoan(c, c.req.valid("query")),
);
