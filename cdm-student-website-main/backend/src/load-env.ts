// This module MUST be imported FIRST (before any other import) in the backend
// entry point. Because ES modules evaluate imports before the entry module's
// body runs, the .env file must be loaded here — as a side effect of an import
// — so that modules like auth.ts (which reads process.env.ADMIN_PIN at load
// time) see the correct values.
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const envFile = resolve(process.cwd(), ".env");
if (existsSync(envFile)) {
  process.loadEnvFile(envFile);
}
