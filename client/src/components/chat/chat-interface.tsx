import { useEffect, useRef, useState } from "react";
import { useChat } from "@/context/chat-context";
import { ChatMessage } from "./chat-message";
import { ChatInput } from "./chat-input";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { Separator } from "@/components/ui/separator";

interface ChatInterfaceProps {
  rideId?: number;
  onBack?: () => void;
  title?: string;
  className?: string;
}

export function ChatInterface({ 
  rideId, 
  onBack, 
  title,
  className 
}: ChatInterfaceProps) {
  const { 
    activeConversationId, 
    setActiveConversationId, 
    messages, 
    isLoadingMessages, 
    isTyping, 
    conversations, 
    createConversation,
    markMessagesAsRead 
  } = useChat();
  
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isFetching, setIsFetching] = useState(false);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // When we load the component, set the active conversation based on rideId
  useEffect(() => {
    const initChat = async () => {
      if (!rideId || !user) return;
      
      try {
        setIsFetching(true);
        
        // Check if we already have a conversation for this ride
        const existingConversation = conversations.find(c => c.rideId === rideId);
        
        if (existingConversation) {
          setActiveConversationId(existingConversation.id);
        } else {
          // Create a new conversation for this ride
          await createConversation(rideId);
        }
      } catch (error) {
        console.error("Failed to initialize chat:", error);
      } finally {
        setIsFetching(false);
      }
    };
    
    initChat();
    
    return () => {
      // Clean up on unmount
      setActiveConversationId(null);
    };
  }, [rideId, user, conversations, setActiveConversationId, createConversation]);
  
  // Mark the last message as read when the component is shown
  useEffect(() => {
    if (messages.length > 0 && activeConversationId) {
      const lastMessage = messages[messages.length - 1];
      markMessagesAsRead(lastMessage.id);
    }
  }, [messages, activeConversationId, markMessagesAsRead]);
  
  // Determine if anyone is typing
  const typingUsers = Object.entries(isTyping)
    .filter(([_, isTyping]) => isTyping)
    .map(([userId]) => parseInt(userId));
  
  // Extract the conversation details if active
  const activeConversation = activeConversationId 
    ? conversations.find(c => c.id === activeConversationId) 
    : null;
  
  // Extract the other participant info
  const otherParticipant = activeConversation?.otherParticipants?.[0];
  
  return (
    <Card className={className}>
      <CardHeader className="p-4 border-b">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            {onBack && (
              <Button variant="ghost" size="icon" onClick={onBack}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            <div>
              <h3 className="text-lg font-semibold">
                {title || (otherParticipant ? otherParticipant.fullName : 'Chat')}
              </h3>
              
              {activeConversation?.ride && (
                <p className="text-sm text-muted-foreground">
                  Ride #{activeConversation.ride.id}
                </p>
              )}
            </div>
          </div>
          
          {activeConversation?.ride && (
            <Badge variant="outline" className="ml-auto">
              {activeConversation.ride.status}
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="p-0 flex flex-col h-[500px]">
        {isFetching || isLoadingMessages ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !activeConversationId ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-muted-foreground text-center">
              {rideId ? 'Creating conversation...' : 'Select a conversation to start chatting'}
            </p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center p-4">
              <h3 className="font-medium text-lg mb-2">No messages yet</h3>
              <p className="text-muted-foreground">
                Start the conversation by sending a message below.
              </p>
            </div>
          </div>
        ) : (
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((message, i) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  isLast={i === messages.length - 1}
                />
              ))}
              
              {typingUsers.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="flex gap-1 items-center">
                    <span className="h-2 w-2 rounded-full bg-muted-foreground animate-pulse"></span>
                    <span className="h-2 w-2 rounded-full bg-muted-foreground animate-pulse delay-100"></span>
                    <span className="h-2 w-2 rounded-full bg-muted-foreground animate-pulse delay-200"></span>
                  </div>
                  <span>
                    {otherParticipant 
                      ? `${otherParticipant.fullName} is typing...` 
                      : 'Someone is typing...'}
                  </span>
                </div>
              )}
              
              {/* Invisible element to scroll to */}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        )}
        
        {activeConversationId && (
          <ChatInput />
        )}
      </CardContent>
    </Card>
  );
}