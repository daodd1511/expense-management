import { config } from "dotenv";
import { serve } from "@hono/node-server";
import { createApp } from "./app";
import { getEnv } from "./config/env";

// Dev reads the single root .env (cwd is packages/api under `pnpm dev:api`).
// In containers the files don't exist and real env vars are injected; a
// missing file is a silent no-op.
config({ path: ["../../.env", ".env"], quiet: true });

serve({
  fetch: createApp().fetch,
  port: getEnv().port,
});
