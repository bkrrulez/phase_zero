
import { Pool } from 'pg';

// This configuration will be used for all environments.
// It establishes a secure connection using SSL and allows for self-signed
// certificates, which is common in both local development and some cloud providers.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

export const db = pool;
