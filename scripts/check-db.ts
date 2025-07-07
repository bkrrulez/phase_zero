
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkConnection() {
  console.log('Attempting to connect to the database...');

  const dbUrl = process.env.DATABASE_URL;

  if (!dbUrl) {
    console.error('\x1b[31m%s\x1b[0m', '❌ Error: DATABASE_URL environment variable is not set.');
    console.log('Please make sure your .env.local file exists and contains the DATABASE_URL.');
    process.exit(1);
  }

  console.log('Found DATABASE_URL. Creating a new connection pool...');
  
  const pool = new Pool({
    connectionString: dbUrl,
    // Add a connection timeout to prevent hanging
    connectionTimeoutMillis: 5000, 
  });

  let client;
  try {
    client = await pool.connect();
    console.log('\x1b[32m%s\x1b[0m', '✅ Successfully connected to the database!');

    console.log('Running a simple query (SELECT NOW())...');
    const res = await client.query('SELECT NOW()');
    console.log('Query successful. Current database time:', res.rows[0].now);
    console.log('\x1b[32m%s\x1b[0m', '✅ Database connection test passed!');

  } catch (err: any) {
    console.error('\x1b[31m%s\x1b[0m', '❌ Database connection failed.');
    console.error('Error details:');
    if (err.code) {
        console.error(`  - Code: ${err.code}`);
    }
    if(err.message) {
        console.error(`  - Message: ${err.message}`);
    }
    console.log('\n🔍 Troubleshooting steps:');
    console.log('  1. Verify that your PostgreSQL server is running.');
    console.log('  2. Double-check the DATABASE_URL in your .env.local file.');
    console.log('     - Is the username correct?');
    console.log('     - Is the password correct?');
    console.log('     - Is the port correct (usually 5432)?');
    console.log('     - Is the database name (`timetool_db`) correct?');
    console.log('  3. Ensure your database allows connections from your application.');

  } finally {
    if (client) {
      client.release();
      console.log('Connection released.');
    }
    await pool.end();
    console.log('Connection pool closed.');
  }
}

checkConnection();
