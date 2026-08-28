type Env = Readonly<{
  port: number;
}>;

let cachedEnv: Env | null = null;

/** Returns process-level API configuration; database URLs are read lazily by the DB pools. */
export function getEnv(): Env {
  if (cachedEnv) {
    return cachedEnv;
  }

  cachedEnv = {
    port: Number(process.env.PORT ?? 3000),
  };

  return cachedEnv;
}
