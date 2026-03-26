import { sql } from "drizzle-orm";

import { requireDb } from "@/lib/db";

async function main() {
  const db = requireDb();
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);
}

main()
  .then(() => {
    // eslint-disable-next-line no-console
    console.log("pgcrypto ensured.");
    process.exit(0);
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  });

