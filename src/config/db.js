import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import * as schema from '../db/schema.js';

dotenv.config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
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
