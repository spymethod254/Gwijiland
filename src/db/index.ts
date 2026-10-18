import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required - set it in Vercel > Settings > Environment Variables");
}

const globalForDb = globalThis as typeof globalThis & {
  __gwijilandPool?: Pool;
};

export const pool =
  globalForDb.__gwijilandPool ??
  new Pool({
    connectionString: databaseUrl,
    // Supabase requires SSL. This is mandatory on Vercel.
    ssl: { rejectUnauthorized: false },
    // Serverless: keep it tiny, or Supabase will exhaust connections
    max: 1,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 5000,
  });

// Cache in ALL environments, not just dev
if (!globalForDb.__gwijilandPool) {
  globalForDb.__gwijilandPool = pool;
}

export const db = drizzle(pool);
