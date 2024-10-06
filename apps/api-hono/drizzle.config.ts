
import { defineConfig } from "drizzle-kit"
export default defineConfig({
  dialect: "sqlite", // "postgresql" | "mysql"
  driver: "turso",
  dbCredentials: {
    url: process.env.TURSO_CONNECTION_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  },
  "out": "drizzle/migrations",
  "schema": "src/db/schema.ts"
})