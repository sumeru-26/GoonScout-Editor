import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";

type DatabaseEnv = {
  DATABASE_URL?: string;
};

const { DATABASE_URL } = process.env as DatabaseEnv;

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

export const db = new Kysely({
  dialect: new PostgresDialect({
    pool: new Pool({
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    }),
  }),
});
