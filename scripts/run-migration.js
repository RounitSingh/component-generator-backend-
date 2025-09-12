import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

const db = drizzle(pool);

async function runMigration() {
  try {
    // console.log('🚀 Running performance migrations...\n');
    
    // Migration 1: Authentication indexes
    // console.log('📝 Migration 1: Authentication Performance Indexes');
    const authMigrationPath = join(process.cwd(), 'drizzle', '0003_add_performance_indexes.sql');
    const authMigrationSQL = readFileSync(authMigrationPath, 'utf8');
    
    const authStatements = authMigrationSQL.split('--> statement-breakpoint').map(stmt => stmt.trim()).filter(stmt => stmt);
    
    for (const statement of authStatements) {
      if (statement) {
        // console.log(`📝 Executing: ${statement.substring(0, 50)}...`);
        await db.execute(statement);
      }
    }
    
    // console.log('✅ Authentication indexes completed!\n');
    
    // Migration 2: Chat and Component indexes
    // console.log('📝 Migration 2: Chat & Component Performance Indexes');
    const chatMigrationPath = join(process.cwd(), 'drizzle', '0004_add_chat_component_indexes.sql');
    const chatMigrationSQL = readFileSync(chatMigrationPath, 'utf8');
    
    const chatStatements = chatMigrationSQL.split('--> statement-breakpoint').map(stmt => stmt.trim()).filter(stmt => stmt);
    
    for (const statement of chatStatements) {
      if (statement) {
        // console.log(`📝 Executing: ${statement.substring(0, 50)}...`);
        await db.execute(statement);
      }
    }
    
    // console.log('✅ Chat & Component indexes completed!\n');
    
    // console.log('🎉 All Performance Migrations Completed Successfully!');
    // console.log('\n📊 Database Indexes Summary:');
    // console.log('🔐 Authentication:');
    // console.log('   - users.email (for login/signup)');
    // console.log('   - user_tokens.user_id, type (for token operations)');
    // console.log('   - user_tokens.token (for token validation)');
    // console.log('   - user_tokens.expires_at, is_revoked (for cleanup)');
    // console.log('   - sessions.user_id (for session queries)');
    // console.log('   - sessions.user_id, is_active (for active sessions)');
    // console.log('\n💬 Chat & Components:');
    // console.log('   - chat_messages.session_id (for message queries)');
    // console.log('   - chat_messages.conversation_id (for grouping)');
    // console.log('   - chat_messages.session_id, message_order (for ordering)');
    // console.log('   - chat_messages.role (for user/assistant filtering)');
    // console.log('   - components.session_id (for component queries)');
    // console.log('   - components.session_id, is_current (for current components)');
    // console.log('   - components.component_type (for type filtering)');
    // console.log('   - ai_interactions.session_id (for AI interaction queries)');
    // console.log('   - ai_responses.session_id (for AI response queries)');
    // console.log('   - conversation_sessions.session_id (for conversation queries)');
    
  } catch (error) {
    // console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
