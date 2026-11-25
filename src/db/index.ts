import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const g = globalThis as unknown as { __riskaPool?: Pool };
const pool = g.__riskaPool ?? new Pool({ connectionString: process.env.DATABASE_URL, max: 10 });
if (process.env.NODE_ENV !== "production") g.__riskaPool = pool;

export const db: NodePgDatabase<typeof schema> = drizzle(pool, { schema });
export { schema };
