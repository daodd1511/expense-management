import "dotenv/config";
import { serve } from "@hono/node-server";
import { createApp } from "./app";
import { getEnv } from "./config/env";

serve({
  fetch: createApp().fetch,
  port: getEnv().port,
});
