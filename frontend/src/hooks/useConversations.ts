// Hook for managing conversations

import { useState, useEffect, useCallback } from 'react';
import { conversationStorage, Conversation, Message } from '../services/storage';

export function useConversations() {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
    const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);

    // Load conversations on mount
    useEffect(() => {
        const loaded = conversationStorage.loadConversations();
        setConversations(loaded);

        // Set most recent as active if exists
        if (loaded.length > 0 && !activeConversationId) {
            setActiveConversationId(loaded[0].id);
            setActiveConversation(loaded[0]);
        }
    }, []);

    // Update active conversation when ID changes
    useEffect(() => {
        if (activeConversationId) {
            const conv = conversations.find(c => c.id === activeConversationId);
            setActiveConversation(conv || null);
        } else {
            setActiveConversation(null);
        }
    }, [activeConversationId, conversations]);

    // Create new conversation
    const createNewConversation = useCallback((language: string = 'English'): string => {
        const newConv: Conversation = {
            id: Date.now().toString(),
            title: 'New Chat',
            messages: [],
            createdAt: new Date(),
            updatedAt: new Date(),
            language
        };

        conversationStorage.saveConversation(newConv);
        setConversations(prev => [newConv, ...prev]);
        setActiveConversationId(newConv.id);

        return newConv.id;
    }, []);

    // Switch to a different conversation
    const switchConversation = useCallback((id: string) => {
        setActiveConversationId(id);
    }, []);

    // Update current conversation with new messages
    const updateCurrentConversation = useCallback((messages: Message[]) => {
        if (!activeConversationId) {
            // Create new conversation if none active
            const newId = createNewConversation();
            setActiveConversationId(newId);
        }

        const convId = activeConversationId || Date.now().toString();

        setConversations(prev => {
            const updated = prev.map(conv => {
                if (conv.id === convId) {
                    // Generate title from first user message if still "New Chat"
                    let title = conv.title;
                    if (title === 'New Chat' && messages.length > 0) {
                        const firstUserMsg = messages.find(m => m.type === 'user');
                        if (firstUserMsg) {
                            title = conversationStorage.generateTitle(firstUserMsg.content);
                        }
                    }

                    const updatedConv = {
                        ...conv,
                        messages,
                        title,
                        updatedAt: new Date()
                    };

                    conversationStorage.saveConversation(updatedConv);
                    return updatedConv;
                }
                return conv;
            });

            return updated;
        });
    }, [activeConversationId, createNewConversation]);

    // Delete a conversation
    const deleteConversation = useCallback((id: string) => {
        conversationStorage.deleteConversation(id);
        setConversations(prev => prev.filter(c => c.id !== id));

        // If deleted conversation was active, switch to another
        if (id === activeConversationId) {
            const remaining = conversations.filter(c => c.id !== id);
            if (remaining.length > 0) {
                setActiveConversationId(remaining[0].id);
            } else {
                setActiveConversationId(null);
            }
        }
    }, [activeConversationId, conversations]);

    // Search conversations
    const searchConversations = useCallback((query: string): Conversation[] => {
        if (!query.trim()) return conversations;
        return conversationStorage.searchConversations(query);
    }, [conversations]);

    // Clear all conversations
    const clearAllConversations = useCallback(() => {
        conversationStorage.clearAll();
        setConversations([]);
        setActiveConversationId(null);
        setActiveConversation(null);
    }, []);

    return {
        conversations,
        activeConversation,
        activeConversationId,
        createNewConversation,
        switchConversation,
        updateCurrentConversation,
        deleteConversation,
        searchConversations,
        clearAllConversations
    };
}
