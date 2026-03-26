import type { Config } from "drizzle-kit";
import dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  // Allow tooling to fail fast with a clear error.
  // eslint-disable-next-line no-console
  console.warn("DATABASE_URL is missing. Set it in .env before running db:push/db:seed.");
}

const config: Config = {
  schema: "./db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString ?? "",
  },
};

export default config;

