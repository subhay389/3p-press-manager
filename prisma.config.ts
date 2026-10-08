import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// The CLI (migrate, seed, studio) uses Neon's DIRECT connection.
// The app itself connects via the pooled DATABASE_URL in src/lib/db.ts.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DIRECT_URL"),
  },
});
