import { Pool } from 'pg';

let pool: Pool | undefined;

function getPool(): Pool {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set. Please create a .env.local file in the project root and add your database connection string.');
    }

    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
      process.exit(-1);
    });
  }
  return pool;
}


export async function query<T>(text: string, params?: any[]): Promise<T[]> {
  const dbPool = getPool();
  const start = Date.now();
  const res = await dbPool.query(text, params);
  const duration = Date.now() - start;
  // console.log('executed query', { text, duration, rows: res.rowCount });
  return res.rows;
}
