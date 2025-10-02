import { pgTable, text, integer, timestamp, boolean, jsonb, uuid, uniqueIndex, index } from 'drizzle-orm/pg-core';

// USERS
export const users = pgTable("users", {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    email: text("email").unique().notNull(),
    passwordHash: text("password_hash").notNull(),
    isVerified: boolean("is_verified").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  }, (table) => ({
    emailIdx: uniqueIndex("users_email_idx").on(table.email),
    nameIdx: index("users_name_idx").on(table.name),
    verifiedIdx: index("users_verified_idx").on(table.isVerified),
  }));

// SESSIONS

export const sessions = pgTable("sessions", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id),
    refreshToken: text("refresh_token").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    deviceInfo: text("device_info"),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  }, (table) => ({
    userIdx: index("sessions_user_id_idx").on(table.userId),
    activeIdx: index("sessions_active_idx").on(table.userId, table.isActive),
    expiryIdx: index("sessions_expiry_idx").on(table.expiresAt),
  }));

// CONVERSATIONS
  export const conversations = pgTable("conversations", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id),
    title: text("title"),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  }, (table) => ({
    userIdx: index("conversations_user_id_idx").on(table.userId),
    activeIdx: index("conversations_active_idx").on(table.userId, table.isActive),
    createdIdx: index("conversations_created_at_idx").on(table.createdAt),
  }));


// COMPONENTS
export const messages = pgTable("messages", {
    id: uuid("id").defaultRandom().primaryKey(),
    conversationId: uuid("conversation_id").notNull().references(() => conversations.id),
    role: text("role").notNull(), // 'user' | 'ai'
    type: text("type").notNull(), // 'text' | 'jsx' | 'page'
    data: jsonb("data").notNull(),
    version: integer("version").default(1).notNull(),
    isEdited: boolean("is_edited").default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  }, (table) => ({
    convoIdx: index("messages_conversation_id_idx").on(table.conversationId),
    convoTimeIdx: index("messages_convo_created_idx").on(table.conversationId, table.createdAt),
    roleIdx: index("messages_role_idx").on(table.role),
    typeIdx: index("messages_type_idx").on(table.type),
    jsonbPathIdx: index("messages_data_idx").using("gin", table.data), // fast JSON search
  }));
  
  // COMPONENTS (artifacts associated to a conversation or specific message)
  export const components = pgTable("components", {
    id: uuid("id").defaultRandom().primaryKey(),
    conversationId: uuid("conversation_id").notNull().references(() => conversations.id),
    messageId: uuid("message_id").references(() => messages.id),
    type: text("type").notNull(),
    data: jsonb("data").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  }, (table) => ({
    convoIdx: index("components_conversation_id_idx").on(table.conversationId),
    convoTimeIdx: index("components_convo_created_idx").on(table.conversationId, table.createdAt),
    typeIdx: index("components_type_idx").on(table.type),
    jsonbPathIdx: index("components_data_idx").using("gin", table.data),
  }));
  
  // SNAPSHOTS (immutable capture of a component's render data)
  export const snapshots = pgTable("snapshots", {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerId: uuid("owner_id").notNull().references(() => users.id),
    conversationId: uuid("conversation_id").notNull().references(() => conversations.id),
    componentId: uuid("component_id").notNull().references(() => components.id),
    data: jsonb("data").notNull(), // { jsx: string, css: string, meta?: {} }
    createdAt: timestamp("created_at").defaultNow().notNull(),
  }, (table) => ({
    ownerIdx: index("snapshots_owner_id_idx").on(table.ownerId),
    convoIdx: index("snapshots_conversation_id_idx").on(table.conversationId),
    componentIdx: index("snapshots_component_id_idx").on(table.componentId),
    createdIdx: index("snapshots_created_at_idx").on(table.createdAt),
  }));

  // SHARE LINKS (public, unlisted links to snapshots)
  export const shareLinks = pgTable("share_links", {
    id: uuid("id").defaultRandom().primaryKey(),
    snapshotId: uuid("snapshot_id").notNull().references(() => snapshots.id),
    slug: text("slug").notNull(), // unguessable token
    expiresAt: timestamp("expires_at"),
    revokedAt: timestamp("revoked_at"),
    viewCount: integer("view_count").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  }, (table) => ({
    slugUniqueIdx: uniqueIndex("share_links_slug_idx").on(table.slug),
    snapshotIdx: index("share_links_snapshot_id_idx").on(table.snapshotId),
    expiresIdx: index("share_links_expires_at_idx").on(table.expiresAt),
    revokedIdx: index("share_links_revoked_at_idx").on(table.revokedAt),
  }));
  
  // QUOTAS
  export const quotas = pgTable("quotas", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id),
    dailyLimit: integer("daily_limit").notNull(),
    usedToday: integer("used_today").default(0).notNull(),
    resetAt: timestamp("reset_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  }, (table) => ({
    userIdx: uniqueIndex("quotas_user_id_idx").on(table.userId),
    resetIdx: index("quotas_reset_at_idx").on(table.resetAt),
    }));

 