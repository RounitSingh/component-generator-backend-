import { db } from '../../config/db.js';
import { sessions, chatMessages, components, aiInteractions } from '../../db/schema.js';
import { eq, and, desc, asc } from 'drizzle-orm';
import { z } from 'zod';

// Validation schemas
const createSessionSchema = z.object({
    title: z.string().min(1, 'Title is required').max(255, 'Title too long'),
    description: z.string().optional(),
});

const updateSessionSchema = z.object({
    title: z.string().min(1, 'Title is required').max(255, 'Title too long').optional(),
    description: z.string().optional(),
});

export const createSession = async (userId, sessionData) => {
    const validatedData = createSessionSchema.parse(sessionData);
    const [newSession] = await db.insert(sessions).values({
        user_id: userId,
        title: validatedData.title,
        description: validatedData.description || '',
    }).returning();
    return {
        success: true,
        message: 'Session created successfully',
        data: newSession,
    };
};

export const getUserSessions = async (userId) => {
    const userSessions = await db.select({
        id: sessions.id,
        title: sessions.title,
        description: sessions.description,
        is_active: sessions.is_active,
        created_at: sessions.created_at,
        updated_at: sessions.updated_at,
        message_count: chatMessages.id,
        component_count: components.id,
    })
        .from(sessions)
        .leftJoin(chatMessages, eq(sessions.id, chatMessages.session_id))
        .leftJoin(components, eq(sessions.id, components.session_id))
        .where(eq(sessions.user_id, userId))
        .orderBy(desc(sessions.updated_at));

    // Group and count messages and components
    const sessionMap = new Map();
    userSessions.forEach(row => {
        if (!sessionMap.has(row.id)) {
            sessionMap.set(row.id, {
                id: row.id,
                title: row.title,
                description: row.description,
                is_active: row.is_active,
                created_at: row.created_at,
                updated_at: row.updated_at,
                message_count: 0,
                component_count: 0,
            });
        }
        if (row.message_count) sessionMap.get(row.id).message_count++;
        if (row.component_count) sessionMap.get(row.id).component_count++;
    });

    return {
        success: true,
        data: Array.from(sessionMap.values()),
    };
};

export const getSession = async (sessionId, userId) => {
    // Get session details
    const sessionResult = await db.select()
        .from(sessions)
        .where(and(
            eq(sessions.id, sessionId),
            eq(sessions.user_id, userId)
        ));

    if (sessionResult.length === 0) {
        throw new Error('Session not found');
    }

    const session = sessionResult[0];

    // Get chat messages
    const messages = await db.select()
        .from(chatMessages)
        .where(eq(chatMessages.session_id, sessionId))
        .orderBy(asc(chatMessages.created_at));

    // Get current component
    const currentComponent = await db.select()
        .from(components)
        .where(and(
            eq(components.session_id, sessionId),
            eq(components.is_current, true)
        ));

    // Get AI interactions
    const interactions = await db.select()
        .from(aiInteractions)
        .where(eq(aiInteractions.session_id, sessionId))
        .orderBy(desc(aiInteractions.created_at));

    return {
        success: true,
        data: {
            session,
            messages,
            currentComponent: currentComponent[0] || null,
            interactions,
        },
    };
};

export const updateSession = async (sessionId, userId, updateData) => {
    const validatedData = updateSessionSchema.parse(updateData);
    const [updatedSession] = await db.update(sessions)
        .set({
            ...validatedData,
            updated_at: new Date(),
        })
        .where(and(
            eq(sessions.id, sessionId),
            eq(sessions.user_id, userId)
        ))
        .returning();

    if (!updatedSession) {
        throw new Error('Session not found');
    }

    return {
        success: true,
        message: 'Session updated successfully',
        data: updatedSession,
    };
};

export const deleteSession = async (sessionId, userId) => {
    const result = await db.delete(sessions)
        .where(and(
            eq(sessions.id, sessionId),
            eq(sessions.user_id, userId)
        ));

    if (result.rowCount === 0) {
        throw new Error('Session not found');
    }

    return {
        success: true,
        message: 'Session deleted successfully',
    };
};

export const addChatMessage = async (sessionId, userId, messageData) => {
    // Verify session belongs to user
    const sessionResult = await db.select()
        .from(sessions)
        .where(and(
            eq(sessions.id, sessionId),
            eq(sessions.user_id, userId)
        ));

    if (sessionResult.length === 0) {
        throw new Error('Session not found');
    }

    const [newMessage] = await db.insert(chatMessages).values({
        session_id: sessionId,
        role: messageData.role, // 'user' or 'assistant'
        content: messageData.content,
        message_type: messageData.messageType || 'text',
        metadata: messageData.metadata || null,
    }).returning();

    // Update session timestamp
    await db.update(sessions)
        .set({ updated_at: new Date() })
        .where(eq(sessions.id, sessionId));

    return {
        success: true,
        message: 'Message added successfully',
        data: newMessage,
    };
};

export const saveComponent = async (sessionId, userId, componentData) => {
    // Verify session belongs to user
    const sessionResult = await db.select()
        .from(sessions)
        .where(and(
            eq(sessions.id, sessionId),
            eq(sessions.user_id, userId)
        ));

    if (sessionResult.length === 0) {
        throw new Error('Session not found');
    }

    // Set all existing components as not current
    await db.update(components)
        .set({ is_current: false })
        .where(eq(components.session_id, sessionId));

    // Create new component as current
    const [newComponent] = await db.insert(components).values({
        session_id: sessionId,
        name: componentData.name,
        jsx_code: componentData.jsxCode,
        css_code: componentData.cssCode,
        component_type: componentData.componentType || 'component',
        is_current: true,
        metadata: componentData.metadata || null,
    }).returning();

    // Update session timestamp
    await db.update(sessions)
        .set({ updated_at: new Date() })
        .where(eq(sessions.id, sessionId));

    return {
        success: true,
        message: 'Component saved successfully',
        data: newComponent,
    };
};

export const saveAIInteraction = async (sessionId, userId, interactionData) => {
    // Verify session belongs to user
    const sessionResult = await db.select()
        .from(sessions)
        .where(and(
            eq(sessions.id, sessionId),
            eq(sessions.user_id, userId)
        ));

    if (sessionResult.length === 0) {
        throw new Error('Session not found');
    }

    const [newInteraction] = await db.insert(aiInteractions).values({
        session_id: sessionId,
        prompt: interactionData.prompt,
        response: interactionData.response,
        interaction_type: interactionData.interactionType,
        target_element: interactionData.targetElement || null,
        metadata: interactionData.metadata || null,
    }).returning();

    return {
        success: true,
        message: 'AI interaction saved successfully',
        data: newInteraction,
    };
};

export const getSessionStats = async (userId) => {
    const stats = await db.select({
        total_sessions: sessions.id,
        total_messages: chatMessages.id,
        total_components: components.id,
        total_interactions: aiInteractions.id,
    })
        .from(sessions)
        .leftJoin(chatMessages, eq(sessions.id, chatMessages.session_id))
        .leftJoin(components, eq(sessions.id, components.session_id))
        .leftJoin(aiInteractions, eq(sessions.id, aiInteractions.session_id))
        .where(eq(sessions.user_id, userId));

    // Count totals
    const totals = {
        sessions: new Set(),
        messages: 0,
        components: 0,
        interactions: 0,
    };

    stats.forEach(row => {
        if (row.total_sessions) totals.sessions.add(row.total_sessions);
        if (row.total_messages) totals.messages++;
        if (row.total_components) totals.components++;
        if (row.total_interactions) totals.interactions++;
    });

    return {
        success: true,
        data: {
            total_sessions: totals.sessions.size,
            total_messages: totals.messages,
            total_components: totals.components,
            total_interactions: totals.interactions,
        },
    };
};

export const getSessionMessages = async (sessionId, userId) => {
  // Ensure the session belongs to the user
  const session = await db.select().from(sessions).where(and(eq(sessions.id, sessionId), eq(sessions.user_id, userId)));
  if (!session.length) throw new Error('Session not found');
  // Fetch messages
  return await db.select().from(chatMessages).where(eq(chatMessages.session_id, sessionId)).orderBy(asc(chatMessages.created_at));
};

export const getSessionComponents = async (sessionId, userId) => {
  // Ensure the session belongs to the user
  const session = await db.select().from(sessions).where(and(eq(sessions.id, sessionId), eq(sessions.user_id, userId)));
  if (!session.length) throw new Error('Session not found');
  // Fetch components
  return await db.select().from(components).where(eq(components.session_id, sessionId)).orderBy(asc(components.created_at));
};

export const getSessionInteractions = async (sessionId, userId) => {
  // Ensure the session belongs to the user
  const session = await db.select().from(sessions).where(and(eq(sessions.id, sessionId), eq(sessions.user_id, userId)));
  if (!session.length) throw new Error('Session not found');
  // Fetch interactions
  return await db.select().from(aiInteractions).where(eq(aiInteractions.session_id, sessionId)).orderBy(asc(aiInteractions.created_at));
}; 