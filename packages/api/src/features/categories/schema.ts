import { z } from "zod";
import { langSchema } from "@wallet/shared";

export { categoryCreateSchema, categoryPatchSchema } from "@wallet/shared";

export const categoryListQuerySchema = z.object({
  locale: langSchema.optional(),
});
