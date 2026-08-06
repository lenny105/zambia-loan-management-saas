import { randomUUID } from "node:crypto";

type Context = Record<string, string | number | boolean | null | undefined>;
export function logError(operation: string, error: unknown, context: Context = {}) {
  const correlationId = randomUUID();
  console.error(JSON.stringify({ level: "error", operation, correlationId, context,
    error: error instanceof Error ? { name: error.name, message: error.message } : { name: "UnknownError" },
    at: new Date().toISOString() }));
  return correlationId;
}
