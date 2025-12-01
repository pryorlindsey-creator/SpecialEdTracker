import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Optimized connection pool configuration
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Maximum number of connections in the pool
  max: 10,
  // Close idle connections after 30 seconds
  idleTimeoutMillis: 30000,
  // Return an error after 10 seconds if connection cannot be established
  connectionTimeoutMillis: 10000,
});

// Handle pool errors to prevent unhandled rejections
pool.on('error', (err) => {
  console.error('Unexpected error on idle database client', err);
});

export const db = drizzle({ client: pool, schema });