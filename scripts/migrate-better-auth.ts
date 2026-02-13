import { getMigrations } from "better-auth/db";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const run = async () => {
  const { auth } = await import("../src/lib/auth");
  const migrations = await getMigrations(auth.options);
  const sql = await migrations.compileMigrations();

  if (!sql.trim()) {
    console.log("No migrations needed.");
    return;
  }

  console.log("Applying Better Auth migrations...");
  await migrations.runMigrations();
  console.log("Migrations complete.");
};

run().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
