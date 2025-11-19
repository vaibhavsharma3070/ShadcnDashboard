import * as schema from "@shared/schema";

// Drivers
import pg from "pg";
const { Pool: PgPool } = pg;

import { Pool as NeonPool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

// Drizzle drivers
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL must be set.");

let db;

const isNeonServerless = url.includes("neon.tech") && !url.includes("pooler");

if (isNeonServerless) {
  neonConfig.webSocketConstructor = ws;

  const pool = new NeonPool({ connectionString: url });
  db = drizzleNeon({ client: pool, schema });

  console.log("Connected using Neon serverless driver");
} else {
  const pool = new PgPool({
    connectionString: url,
    ssl:
      url.includes("supabase") ||
      url.includes("render") ||
      url.includes("railway")
        ? { rejectUnauthorized: false }
        : false,
  });

  db = drizzlePg(pool, { schema });

  console.log("Connected using standard Postgres driver");
}

export { db };
