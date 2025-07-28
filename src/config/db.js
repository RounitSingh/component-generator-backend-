import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import * as schema from '../db/schema.js';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ...(isProduction && {
    ssl: {
      rejectUnauthorized: false,
    },
  }),
});
// Create Drizzle instance
const db = drizzle(pool, { schema });

// Test database connection
const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log("✅ Database Connected Successfully!");
    client.release();
  } catch (err) {
    console.error("❌ Database Connection Failed!", err);
    process.exit(1);
  }
};

testConnection();

export { db, pool };
export default db;
