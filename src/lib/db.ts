
import { Pool } from 'pg';

// This ensures that in a development environment, where the module code is reloaded on each request,
// we don't end up with a new connection pool each time.
let pool: Pool;

if (process.env.NODE_ENV === 'production') {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false, // Required for some cloud database providers
    },
  });
} else {
  // In development, use a global variable to preserve the pool across hot reloads.
  // The type assertion is necessary because `global` is not typed with our custom properties.
  const globalWithPool = global as typeof globalThis & {
    _pool?: Pool;
  };

  if (!globalWithPool._pool) {
    globalWithPool._pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false, // Use SSL but allow self-signed certificates for local dev
      },
    });
  }
  pool = globalWithPool._pool;
}

export const db = pool;
