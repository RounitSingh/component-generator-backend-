import { db } from '../../config/db.js';
import { sessions, chatMessages, components, aiInteractions, conversationSessions, aiResponses } from '../../db/schema.js';
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

const messageSchema = z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().min(1, 'Content is required'),
    messageType: z.string().optional().default('text'),
    conversationId: z.string().optional(),
    metadata: z.any().optional(),
});

const componentSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    jsxCode: z.string().min(1, 'JSX code is required'),
    cssCode: z.string().optional().default(''),
    componentType: z.string().optional().default('component'),
    metadata: z.any().optional(),
});

const interactionSchema = z.object({
    prompt: z.string().min(1, 'Prompt is required'),
    response: z.string().min(1, 'Response is required'),
    interactionType: z.string().min(1, 'Interaction type is required'),
    targetElement: z.string().optional(),
    conversationId: z.string().optional(),
    relatedMessageId: z.number().optional(),
    metadata: z.any().optional(),
});

// Helper function to update session timestamp
const updateSessionTimestamp = async (sessionId) => {
    await db.update(sessions)
        .set({ updated_at: new Date() })
        .where(eq(sessions.id, sessionId));
};

// Helper function to verify session ownership
const verifySessionOwnership = async (sessionId, userId) => {
    console.log(`Verifying ownership: session ${sessionId}, user ${userId}`);
    const sessionResult = await db.select()
        .from(sessions)
        .where(and(
            eq(sessions.id, sessionId),
            eq(sessions.user_id, userId)
        ));

    console.log(`Session ownership check result:`, sessionResult);
    if (sessionResult.length === 0) {
        throw new Error('Session not found or access denied');
    }
    return sessionResult[0];
};

// Helper function to create or get conversation session
const getOrCreateConversationSession = async (sessionId, conversationId) => {
    // Try to find existing conversation session
    let conversationSession = await db.select()
        .from(conversationSessions)
        .where(and(
            eq(conversationSessions.session_id, sessionId),
            eq(conversationSessions.conversation_id, conversationId)
        ));

    if (conversationSession.length === 0) {
        // Create new conversation session
        const [newConversationSession] = await db.insert(conversationSessions).values({
            session_id: sessionId,
            conversation_id: conversationId,
            message_count: 0,
        }).returning();
        return newConversationSession;
    }

    return conversationSession[0];
};

// Helper function to update conversation session
const updateConversationSession = async (sessionId, conversationId) => {
    // First get the current conversation session
    const [currentSession] = await db.select()
        .from(conversationSessions)
        .where(and(
            eq(conversationSessions.session_id, sessionId),
            eq(conversationSessions.conversation_id, conversationId)
        ));

    if (currentSession) {
        await db.update(conversationSessions)
            .set({ 
                last_activity: new Date(),
                message_count: (currentSession.message_count || 0) + 1
            })
            .where(and(
                eq(conversationSessions.session_id, sessionId),
                eq(conversationSessions.conversation_id, conversationId)
            ));
    }
};

export const createSession = async (userId, sessionData) => {
    try {
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
    } catch (error) {
        if (error instanceof z.ZodError) {
            throw new Error(`Validation error: ${error.errors.map(e => e.message).join(', ')}`);
        }
        throw error;
    }
};

export const getUserSessions = async (userId) => {
    try {
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
    } catch (error) {
        throw new Error(`Failed to fetch user sessions: ${error.message}`);
    }
};

export const getSession = async (sessionId, userId) => {
    try {
        // Get session details
        const session = await verifySessionOwnership(sessionId, userId);

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
    } catch (error) {
        throw new Error(`Failed to fetch session: ${error.message}`);
    }
};

export const updateSession = async (sessionId, userId, updateData) => {
    try {
        const validatedData = updateSessionSchema.parse(updateData);
        await verifySessionOwnership(sessionId, userId);
        
        const [updatedSession] = await db.update(sessions)
            .set({
                ...validatedData,
                updated_at: new Date(),
            })
            .where(eq(sessions.id, sessionId))
            .returning();

        return {
            success: true,
            message: 'Session updated successfully',
            data: updatedSession,
        };
    } catch (error) {
        if (error instanceof z.ZodError) {
            throw new Error(`Validation error: ${error.errors.map(e => e.message).join(', ')}`);
        }
        throw new Error(`Failed to update session: ${error.message}`);
    }
};

export const deleteSession = async (sessionId, userId) => {
    try {
        await verifySessionOwnership(sessionId, userId);
        
        const result = await db.delete(sessions)
            .where(eq(sessions.id, sessionId));

        if (result.rowCount === 0) {
            throw new Error('Session not found');
        }

        return {
            success: true,
            message: 'Session deleted successfully',
        };
    } catch (error) {
        throw new Error(`Failed to delete session: ${error.message}`);
    }
};

export const addChatMessage = async (sessionId, userId, messageData) => {
    try {
        await verifySessionOwnership(sessionId, userId);
        const validatedData = messageSchema.parse(messageData);

        // Generate conversation ID if not provided
        const conversationId = validatedData.conversationId || `conv_${sessionId}_${Date.now()}`;
        
        // Get or create conversation session
        await getOrCreateConversationSession(sessionId, conversationId);

        // Get message order for this conversation
        const existingMessages = await db.select()
            .from(chatMessages)
            .where(eq(chatMessages.conversation_id, conversationId));
        const messageOrder = existingMessages.length;

        const [newMessage] = await db.insert(chatMessages).values({
            session_id: sessionId,
            role: validatedData.role,
            content: validatedData.content,
            message_type: validatedData.messageType,
            conversation_id: conversationId,
            message_order: messageOrder,
            metadata: validatedData.metadata || null,
        }).returning();

        // Update conversation session
        await updateConversationSession(sessionId, conversationId);

        // Update session timestamp
        await updateSessionTimestamp(sessionId);

        return {
            success: true,
            message: 'Message added successfully',
            data: newMessage,
        };
    } catch (error) {
        if (error instanceof z.ZodError) {
            throw new Error(`Validation error: ${error.errors.map(e => e.message).join(', ')}`);
        }
        throw new Error(`Failed to add message: ${error.message}`);
    }
};

export const saveComponent = async (sessionId, userId, componentData) => {
    try {
        await verifySessionOwnership(sessionId, userId);
        const validatedData = componentSchema.parse(componentData);

        // Set all existing components as not current
        await db.update(components)
            .set({ is_current: false })
            .where(eq(components.session_id, sessionId));

        // Create new component as current
        const [newComponent] = await db.insert(components).values({
            session_id: sessionId,
            name: validatedData.name,
            jsx_code: validatedData.jsxCode,
            css_code: validatedData.cssCode,
            component_type: validatedData.componentType,
            is_current: true,
            metadata: validatedData.metadata || null,
        }).returning();

        // Update session timestamp
        await updateSessionTimestamp(sessionId);

        return {
            success: true,
            message: 'Component saved successfully',
            data: newComponent,
        };
    } catch (error) {
        if (error instanceof z.ZodError) {
            throw new Error(`Validation error: ${error.errors.map(e => e.message).join(', ')}`);
        }
        throw new Error(`Failed to save component: ${error.message}`);
    }
};

export const saveAIInteraction = async (sessionId, userId, interactionData) => {
    try {
        console.log(`Saving AI interaction for session ${sessionId} and user ${userId}`);
        console.log('Interaction data:', interactionData);
        
        await verifySessionOwnership(sessionId, userId);
        console.log('Session ownership verified for interaction');
        
        const validatedData = interactionSchema.parse(interactionData);
        console.log('Interaction data validated:', validatedData);

        // Generate conversation ID if not provided
        const conversationId = validatedData.conversationId || `conv_${sessionId}_${Date.now()}`;

        const [newInteraction] = await db.insert(aiInteractions).values({
            session_id: sessionId,
            prompt: validatedData.prompt,
            response: validatedData.response,
            interaction_type: validatedData.interactionType,
            target_element: validatedData.targetElement || null,
            conversation_id: conversationId,
            related_message_id: validatedData.relatedMessageId || null,
            metadata: validatedData.metadata || null,
        }).returning();

        console.log('AI interaction saved successfully:', newInteraction);

        // Update session timestamp
        await updateSessionTimestamp(sessionId);

        return {
            success: true,
            message: 'AI interaction saved successfully',
            data: newInteraction,
        };
    } catch (error) {
        console.error('Error in saveAIInteraction:', error);
        if (error instanceof z.ZodError) {
            throw new Error(`Validation error: ${error.errors.map(e => e.message).join(', ')}`);
        }
        throw new Error(`Failed to save AI interaction: ${error.message}`);
    }
};

export const saveAIResponse = async (sessionId, userId, responseData) => {
    try {
        await verifySessionOwnership(sessionId, userId);
        
        const [newResponse] = await db.insert(aiResponses).values({
            session_id: sessionId,
            conversation_id: responseData.conversationId,
            user_message_id: responseData.userMessageId || null,
            prompt_text: responseData.promptText,
            response_text: responseData.responseText,
            model_name: responseData.modelName || 'gemini',
            response_time_ms: responseData.responseTimeMs || null,
            tokens_used: responseData.tokensUsed || null,
            metadata: responseData.metadata || null,
        }).returning();

        // Update session timestamp
        await updateSessionTimestamp(sessionId);

        return {
            success: true,
            message: 'AI response saved successfully',
            data: newResponse,
        };
    } catch (error) {
        throw new Error(`Failed to save AI response: ${error.message}`);
    }
};

export const getSessionStats = async (userId) => {
    try {
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
    } catch (error) {
        throw new Error(`Failed to fetch session stats: ${error.message}`);
    }
};

export const getSessionMessages = async (sessionId, userId) => {
    try {
        await verifySessionOwnership(sessionId, userId);
        const sessionMessages = await db.select()
            .from(chatMessages)
            .where(eq(chatMessages.session_id, sessionId))
            .orderBy(asc(chatMessages.created_at));
        
        return sessionMessages;
    } catch (error) {
        throw new Error(`Failed to fetch session messages: ${error.message}`);
    }
};

export const getSessionComponents = async (sessionId, userId) => {
    try {
        console.log(`Getting components for session ${sessionId} and user ${userId}`);
        await verifySessionOwnership(sessionId, userId);
        console.log('Session ownership verified, fetching components...');
        const sessionComponents = await db.select()
            .from(components)
            .where(eq(components.session_id, sessionId))
            .orderBy(asc(components.created_at));
        
        console.log(`Found ${sessionComponents.length} components for session ${sessionId}`);
        return sessionComponents;
    } catch (error) {
        console.error('Error in getSessionComponents:', error);
        throw new Error(`Failed to fetch session components: ${error.message}`);
    }
};

export const getSessionInteractions = async (sessionId, userId) => {
    try {
        await verifySessionOwnership(sessionId, userId);
        const sessionInteractions = await db.select()
            .from(aiInteractions)
            .where(eq(aiInteractions.session_id, sessionId))
            .orderBy(asc(aiInteractions.created_at));
        
        return sessionInteractions;
    } catch (error) {
        throw new Error(`Failed to fetch session interactions: ${error.message}`);
    }
};

export const getSessionAIResponses = async (sessionId, userId) => {
    try {
        await verifySessionOwnership(sessionId, userId);
        const sessionResponses = await db.select()
            .from(aiResponses)
            .where(eq(aiResponses.session_id, sessionId))
            .orderBy(asc(aiResponses.created_at));
        
        return sessionResponses;
    } catch (error) {
        throw new Error(`Failed to fetch session AI responses: ${error.message}`);
    }
};

export const getConversationSessions = async (sessionId, userId) => {
    try {
        await verifySessionOwnership(sessionId, userId);
        const sessionConversations = await db.select()
            .from(conversationSessions)
            .where(eq(conversationSessions.session_id, sessionId))
            .orderBy(desc(conversationSessions.last_activity));
        
        return sessionConversations;
    } catch (error) {
        throw new Error(`Failed to fetch conversation sessions: ${error.message}`);
    }
}; 