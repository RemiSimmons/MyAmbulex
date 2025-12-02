import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
// WebSocket removed - using polling system instead
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

// CHAT FUNCTIONALITY DISABLED TO PREVENT POTENTIAL CHARGING LOOPS
const CHAT_DISABLED = true;

// Chat message type
export interface ChatMessage {
  id: number;
  conversationId: number;
  senderId: number;
  content: string;
  createdAt: Date;
  attachmentUrl?: string | null;
  attachmentType?: string | null;
  isSystemMessage?: boolean;
  // Client-side only props
  pending?: boolean;
  sender?: {
    id: number;
    username: string;
    fullName: string;
    role: string;
    avatar?: string;
  };
}

// Chat participant type
export interface ChatParticipant {
  id: number;
  conversationId: number;
  userId: number;
  joinedAt: Date;
  lastReadAt?: Date | null;
}

// Chat conversation type
export interface ChatConversation {
  id: number;
  rideId: number;
  createdAt: Date;
  updatedAt: Date;
  // Client-side only props
  ride?: any;
  otherParticipants?: any[];
  unreadCount?: number;
}

// WebSocket message types
interface WebSocketChatMessage {
  type: 'chat_message';
  messageId: number;
  conversationId: number;
  senderId: number;
  content: string;
  timestamp: Date;
  attachmentUrl?: string;
  attachmentType?: string;
  isSystemMessage?: boolean;
}

interface WebSocketTypingIndicator {
  type: 'typing_indicator';
  conversationId: number;
  userId: number;
  isTyping: boolean;
  timestamp: Date;
}

interface WebSocketReadReceipt {
  type: 'read_receipt';
  conversationId: number;
  userId: number;
  lastReadMessageId: number;
  timestamp: Date;
}

// Chat context type
interface ChatContextType {
  activeConversationId: number | null;
  setActiveConversationId: (id: number | null) => void;
  conversations: ChatConversation[];
  messages: ChatMessage[];
  isLoadingMessages: boolean;
  isTyping: { [userId: number]: boolean };
  sendMessage: (content: string, attachmentUrl?: string, attachmentType?: string) => Promise<void>;
  loadMoreMessages: () => Promise<void>;
  markMessagesAsRead: (messageId: number) => Promise<void>;
  sendTypingIndicator: (isTyping: boolean) => void;
  createConversation: (rideId: number) => Promise<ChatConversation | undefined>;
}

// Create the context
const ChatContext = createContext<ChatContextType | undefined>(undefined);

// Chat provider component
export const ChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  // WebSocket functionality replaced with polling system
  const { toast } = useToast();
  
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [isTyping, setIsTyping] = useState<{ [userId: number]: boolean }>({});
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);

  // If chat is disabled, return minimal functionality
  if (CHAT_DISABLED) {
    console.log('🚫 Chat functionality is disabled to prevent potential charging loops');
    const disabledValue: ChatContextType = {
      activeConversationId: null,
      setActiveConversationId: () => console.log('Chat disabled'),
      conversations: [],
      messages: [],
      isLoadingMessages: false,
      isTyping: {},
      sendMessage: async () => {
        toast({
          title: "Chat Disabled",
          description: "Messaging is temporarily disabled to prevent potential charges",
          variant: "destructive",
        });
      },
      loadMoreMessages: async () => {},
      markMessagesAsRead: async () => {},
      sendTypingIndicator: () => {},
      createConversation: async () => {
        toast({
          title: "Chat Disabled",
          description: "Messaging is temporarily disabled to prevent potential charges",
          variant: "destructive",
        });
        return undefined;
      },
    };
    return <ChatContext.Provider value={disabledValue}>{children}</ChatContext.Provider>;
  }

  // Query to fetch conversations
  const { data: conversations = [] } = useQuery<ChatConversation[]>({
    queryKey: ['/api/chat/conversations'],
    queryFn: async () => {
      if (!user) return [];
      const res = await apiRequest('GET', '/api/chat/conversations');
      return await res.json();
    },
    enabled: !!user,
  });
  
  // Query to fetch messages for active conversation
  const { 
    data: messages = [], 
    isLoading: isLoadingMessages,
    refetch: refetchMessages 
  } = useQuery<ChatMessage[]>({
    queryKey: ['/api/chat/conversations', activeConversationId, 'messages'],
    queryFn: async () => {
      if (!activeConversationId) return [];
      const res = await apiRequest('GET', `/api/chat/conversations/${activeConversationId}/messages`);
      const data = await res.json();
      return data;
    },
    enabled: !!activeConversationId && !!user,
  });

  // Mutation to mark messages as read
  const markAsReadMutation = useMutation({
    mutationFn: async ({ 
      conversationId, 
      messageId 
    }: { 
      conversationId: number; 
      messageId: number;
    }) => {
      const res = await apiRequest('POST', `/api/chat/conversations/${conversationId}/read`, {
        messageId,
      });
      return await res.json();
    },
    onSuccess: () => {
      // Invalidate conversations to update unread count
      queryClient.invalidateQueries({
        queryKey: ['/api/chat/conversations']
      });
    },
  });

  // Mutation to create a new conversation
  const createConversationMutation = useMutation({
    mutationFn: async (rideId: number) => {
      const res = await apiRequest('POST', '/api/chat/conversations', { rideId });
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['/api/chat/conversations']
      });
      
      // If the conversation already existed (409 status with conversation data)
      if (data.conversation) {
        setActiveConversationId(data.conversation.id);
        return data.conversation;
      }
      
      // If we created a new conversation
      setActiveConversationId(data.id);
      return data;
    },
    onError: (error) => {
      toast({
        title: "Failed to create conversation",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  });

  // Mutation to send a message
  const sendMessageMutation = useMutation({
    mutationFn: async ({ 
      conversationId, 
      content, 
      attachmentUrl, 
      attachmentType 
    }: {
      conversationId: number;
      content: string;
      attachmentUrl?: string;
      attachmentType?: string;
    }) => {
      const res = await apiRequest('POST', `/api/chat/conversations/${conversationId}/messages`, {
        content,
        attachmentUrl,
        attachmentType,
      });
      return await res.json();
    },
    onSuccess: (data) => {
      // Optimistic update is already handled when we add pending message
      // Filter out the pending message once confirmed
      setLocalMessages((prev) => 
        prev.filter(msg => !(msg.pending && msg.content === data.content))
      );
      
      // Add the confirmed message
      setLocalMessages((prev) => [...prev, {
        ...data,
        createdAt: new Date(data.createdAt),
      }]);
    },
    onError: (error, variables) => {
      // Remove the pending message
      setLocalMessages((prev) => 
        prev.filter(msg => !(msg.pending && msg.content === variables.content))
      );
      
      toast({
        title: "Failed to send message",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  });

  // Function to send typing indicator (simplified for polling system)
  const sendTypingIndicator = useCallback((isTypingNow: boolean) => {
    if (!activeConversationId || !user) return;
    
    // In polling mode, we just update local typing state
    // Real-time typing indicators disabled in favor of polling system
    setIsTyping((prev) => ({
      ...prev,
      [user.id]: isTypingNow,
    }));
  }, [activeConversationId, user]);

  // Function to mark messages as read
  const markMessagesAsRead = useCallback(async (messageId: number) => {
    if (!activeConversationId || !user) return;
    
    await markAsReadMutation.mutateAsync({
      conversationId: activeConversationId,
      messageId,
    });
  }, [activeConversationId, user, markAsReadMutation]);

  // Function to create a new conversation
  const createConversation = useCallback(async (rideId: number) => {
    try {
      const result = await createConversationMutation.mutateAsync(rideId);
      return result;
    } catch (error) {
      console.error("Failed to create conversation:", error);
      return undefined;
    }
  }, [createConversationMutation]);

  // Function to send a message
  const sendMessage = useCallback(async (
    content: string, 
    attachmentUrl?: string, 
    attachmentType?: string
  ) => {
    if (!activeConversationId || !user) {
      toast({
        title: "Cannot send message",
        description: "No active conversation or user not logged in",
        variant: "destructive",
      });
      return;
    }
    
    // Optimistically add the message to our local state
    const pendingMessage: ChatMessage = {
      id: Date.now(), // Temporary ID
      conversationId: activeConversationId,
      senderId: user.id,
      content,
      createdAt: new Date(),
      attachmentUrl: attachmentUrl || null,
      attachmentType: attachmentType || null,
      pending: true,
      sender: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        // User doesn't have avatar in the shared schema yet, we'll fix this in future update
        avatar: undefined,
      },
    };
    
    setLocalMessages((prev) => [...prev, pendingMessage]);
    
    // Send typing indicator (false) to indicate we've stopped typing
    sendTypingIndicator(false);
    
    // Actually send the message
    await sendMessageMutation.mutateAsync({
      conversationId: activeConversationId,
      content,
      attachmentUrl,
      attachmentType,
    });
  }, [activeConversationId, user, sendMessageMutation, sendTypingIndicator, toast]);

  // Function to load more messages (pagination)
  const loadMoreMessages = useCallback(async () => {
    // For now just refetch the current messages
    // In the future, implement pagination with the "before" parameter
    await refetchMessages();
  }, [refetchMessages]);

  // Keep local messages in sync with fetched messages
  useEffect(() => {
    // Only update if we have real messages from the server 
    if (messages && messages.length > 0) {
      setLocalMessages((prev) => {
        // Filter out any pending messages that have been confirmed
        const pendingMessages = prev.filter(
          (lm) => lm.pending && !messages.some((m) => m.id === lm.id)
        );
        
        // Create new array with server messages + pending
        const newMessages = [...messages, ...pendingMessages];
        
        // Only update if truly different to prevent infinite loops
        const prevIds = prev.map(m => m.id).sort().join(',');
        const newIds = newMessages.map(m => m.id).sort().join(',');
        
        if (prevIds !== newIds) {
          return newMessages;
        }
        return prev;
      });
    }
  }, [messages]);

  // Handle incoming messages via polling (WebSocket disabled)
  useEffect(() => {
    if (!user || !activeConversationId) return;
    
    // In polling mode, we rely on React Query's automatic refetching
    // This effect is simplified to prevent infinite loops
    const handleChatMessage = (data: WebSocketChatMessage) => {
      // Only process if it's not from the current user
      if (data.senderId !== user.id) {
        // Update messages if this is for the active conversation
        if (data.conversationId === activeConversationId) {
          setLocalMessages((prev) => {
            // Check if message already exists to prevent duplicates
            const exists = prev.some(m => m.id === data.messageId);
            if (exists) return prev;
            
            return [...prev, {
              id: data.messageId,
              conversationId: data.conversationId,
              senderId: data.senderId,
              content: data.content,
              createdAt: new Date(data.timestamp),
              attachmentUrl: data.attachmentUrl,
              attachmentType: data.attachmentType,
              isSystemMessage: data.isSystemMessage,
            }];
          });
          
          // Mark as read automatically if we're in this conversation
          markMessagesAsRead(data.messageId);
        } else {
          // Update unread count for this conversation
          queryClient.invalidateQueries({
            queryKey: ['/api/chat/conversations']
          });
        }
        
        // Show a toast notification
        const conversation = conversations.find(c => c.id === data.conversationId);
        if (conversation) {
          const sender = conversation.otherParticipants?.[0];
          if (sender) {
            toast({
              title: `New message from ${sender.fullName}`,
              description: data.content.length > 30 
                ? data.content.substring(0, 30) + '...' 
                : data.content,
              duration: 5000,
            });
          }
        }
      }
    };
    
    const handleTypingIndicator = (data: WebSocketTypingIndicator) => {
      // Only process if it's not from the current user and for the active conversation
      if (data.userId !== user.id && data.conversationId === activeConversationId) {
        setIsTyping((prev) => ({
          ...prev,
          [data.userId]: data.isTyping,
        }));
        
        // Auto-clear typing indicator after 5 seconds if still set to true
        if (data.isTyping) {
          setTimeout(() => {
            setIsTyping((prev) => ({
              ...prev,
              [data.userId]: false,
            }));
          }, 5000);
        }
      }
    };
    
    // Polling system handles message updates automatically
    // WebSocket handlers disabled in favor of React Query polling
    
    // No cleanup needed for polling system
    return () => {};
  }, [user, activeConversationId, conversations, markMessagesAsRead, queryClient, toast]);

  // Context value
  const value: ChatContextType = {
    activeConversationId,
    setActiveConversationId,
    conversations,
    messages: localMessages,
    isLoadingMessages,
    isTyping,
    sendMessage,
    loadMoreMessages,
    markMessagesAsRead,
    sendTypingIndicator,
    createConversation,
  };
  
  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

// Custom hook to use the chat context
export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};