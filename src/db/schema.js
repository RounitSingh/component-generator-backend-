import { pgTable, serial, varchar, text, integer, timestamp, boolean, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable('users', {
    id: serial('id').primaryKey(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    password: varchar('password', { length: 255 }).notNull(),
    name: varchar('name', { length: 255 }),
    is_verified: boolean('is_verified').default(false),
    created_at: timestamp('created_at').defaultNow(),
    updated_at: timestamp('updated_at').defaultNow(),
});

export const sessions = pgTable('sessions', {
    id: serial('id').primaryKey(),
    user_id: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    is_active: boolean('is_active').default(true),
    created_at: timestamp('created_at').defaultNow(),
    updated_at: timestamp('updated_at').defaultNow(),
});

export const chatMessages = pgTable('chat_messages', {
    id: serial('id').primaryKey(),
    session_id: integer('session_id').references(() => sessions.id, { onDelete: 'cascade' }).notNull(),
    role: varchar('role', { length: 20 }).notNull(), // 'user' or 'assistant'
    content: text('content').notNull(),
    message_type: varchar('message_type', { length: 500 }).default('text'), // 'text', 'image', 'code'
    conversation_id: varchar('conversation_id', { length: 255 }), // To group related messages
    message_order: integer('message_order').default(0), // Order within conversation
    metadata: jsonb('metadata'), // For storing additional data like image URLs, code snippets, etc.
    created_at: timestamp('created_at').defaultNow(),
});

export const components = pgTable('components', {
    id: serial('id').primaryKey(),
    session_id: integer('session_id').references(() => sessions.id, { onDelete: 'cascade' }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    jsx_code: text('jsx_code').notNull(),
    css_code: text('css_code').notNull(),
    component_type: varchar('component_type', { length: 50 }).default('component'), // 'component', 'page'
    is_current: boolean('is_current').default(true), // Only one component per session can be current
    metadata: jsonb('metadata'), // For storing component properties, styles, etc.
    created_at: timestamp('created_at').defaultNow(),
    updated_at: timestamp('updated_at').defaultNow(),
});

export const aiInteractions = pgTable('ai_interactions', {
    id: serial('id').primaryKey(),
    session_id: integer('session_id').references(() => sessions.id, { onDelete: 'cascade' }).notNull(),
    prompt: text('prompt').notNull(),
    response: text('response').notNull(),
    interaction_type: varchar('interaction_type', { length: 50 }).notNull(), // 'component_generation', 'refinement', 'property_edit'
    target_element: varchar('target_element', { length: 255 }), // For targeted modifications
    conversation_id: varchar('conversation_id', { length: 255 }), // To link with chat messages
    related_message_id: integer('related_message_id').references(() => chatMessages.id), // Link to specific chat message
    metadata: jsonb('metadata'), // For storing additional context
    created_at: timestamp('created_at').defaultNow(),
});

export const userTokens = pgTable('user_tokens', {
    id: serial('id').primaryKey(),
    user_id: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    token: varchar('token', { length: 500 }).notNull(),
    type: varchar('type', { length: 20 }).notNull(), // 'access', 'refresh', 'reset'
    expires_at: timestamp('expires_at').notNull(),
    is_revoked: boolean('is_revoked').default(false),
    created_at: timestamp('created_at').defaultNow(),
});

export const conversationSessions = pgTable('conversation_sessions', {
    id: serial('id').primaryKey(),
    session_id: integer('session_id').references(() => sessions.id, { onDelete: 'cascade' }).notNull(),
    conversation_id: varchar('conversation_id', { length: 255 }).notNull(),
    started_at: timestamp('started_at').defaultNow(),
    last_activity: timestamp('last_activity').defaultNow(),
    message_count: integer('message_count').default(0),
    metadata: jsonb('metadata'),
});

export const aiResponses = pgTable('ai_responses', {
    id: serial('id').primaryKey(),
    session_id: integer('session_id').references(() => sessions.id, { onDelete: 'cascade' }).notNull(),
    conversation_id: varchar('conversation_id', { length: 255 }).notNull(),
    user_message_id: integer('user_message_id').references(() => chatMessages.id),
    prompt_text: text('prompt_text').notNull(),
    response_text: text('response_text').notNull(),
    model_name: varchar('model_name', { length: 100 }).default('gemini'),
    response_time_ms: integer('response_time_ms'),
    tokens_used: integer('tokens_used'),
    metadata: jsonb('metadata'),
    created_at: timestamp('created_at').defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
    sessions: many(sessions),
    tokens: many(userTokens),
}));

export const sessionsRelations = relations(sessions, ({ one, many }) => ({
    user: one(users, {
        fields: [sessions.user_id],
        references: [users.id],
    }),
    chatMessages: many(chatMessages),
    components: many(components),
    aiInteractions: many(aiInteractions),
    conversationSessions: many(conversationSessions),
    aiResponses: many(aiResponses),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
    session: one(sessions, {
        fields: [chatMessages.session_id],
        references: [sessions.id],
    }),
}));

export const componentsRelations = relations(components, ({ one }) => ({
    session: one(sessions, {
        fields: [components.session_id],
        references: [sessions.id],
    }),
}));

export const aiInteractionsRelations = relations(aiInteractions, ({ one }) => ({
    session: one(sessions, {
        fields: [aiInteractions.session_id],
        references: [sessions.id],
    }),
    relatedMessage: one(chatMessages, {
        fields: [aiInteractions.related_message_id],
        references: [chatMessages.id],
    }),
}));

export const userTokensRelations = relations(userTokens, ({ one }) => ({
    user: one(users, {
        fields: [userTokens.user_id],
        references: [users.id],
    }),
}));

export const conversationSessionsRelations = relations(conversationSessions, ({ one }) => ({
    session: one(sessions, {
        fields: [conversationSessions.session_id],
        references: [sessions.id],
    }),
}));

export const aiResponsesRelations = relations(aiResponses, ({ one }) => ({
    session: one(sessions, {
        fields: [aiResponses.session_id],
        references: [sessions.id],
    }),
    userMessage: one(chatMessages, {
        fields: [aiResponses.user_message_id],
        references: [chatMessages.id],
    }),
})); 