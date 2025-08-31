import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import * as schema from '../db/schema.js';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Optimized pool settings for production
  max: isProduction ? 20 : 10, // Maximum number of clients in the pool
  min: isProduction ? 5 : 2,  // Minimum number of clients in the pool
  idle: 30000, // How long a client is allowed to remain idle before being closed
  acquire: 60000, // Maximum time to acquire a client from the pool
  // SSL configuration for production
  ...(isProduction && {
    ssl: {
      rejectUnauthorized: false,
    },
  }),
});

// Create Drizzle instance with optimized settings
const db = drizzle(pool, { 
  schema,
  // Enable query logging in development
  logger: !isProduction,
});

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
