import { useChat, ChatConversation } from "@/context/chat-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { MessageSquare } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ConversationListProps {
  onSelect?: (conversationId: number) => void;
  className?: string;
}

export function ConversationList({ onSelect, className }: ConversationListProps) {
  const { conversations, activeConversationId, setActiveConversationId } = useChat();
  
  // Format initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };
  
  const handleSelectConversation = (id: number) => {
    setActiveConversationId(id);
    onSelect?.(id);
  };
  
  if (conversations.length === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center p-6", className)}>
        <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-1">No conversations yet</h3>
        <p className="text-sm text-muted-foreground text-center">
          When you start a ride, you'll be able to chat with your driver here.
        </p>
      </div>
    );
  }
  
  return (
    <ScrollArea className={cn("h-full", className)}>
      <div className="space-y-1 p-2">
        {conversations.map((conversation) => (
          <ConversationItem
            key={conversation.id}
            conversation={conversation}
            isActive={conversation.id === activeConversationId}
            onClick={() => handleSelectConversation(conversation.id)}
          />
        ))}
      </div>
    </ScrollArea>
  );
}

interface ConversationItemProps {
  conversation: ChatConversation;
  isActive: boolean;
  onClick: () => void;
}

function ConversationItem({ conversation, isActive, onClick }: ConversationItemProps) {
  // Get the other participant from the conversation
  const otherParticipant = conversation.otherParticipants?.[0];
  
  // Format the date
  const formattedDate = format(new Date(conversation.updatedAt), 'MMM d');
  
  return (
    <Button
      variant={isActive ? "secondary" : "ghost"}
      className={cn(
        "w-full justify-start p-3 h-auto",
        isActive && "bg-secondary"
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-3 w-full">
        <Avatar className="h-10 w-10 mt-0.5">
          {otherParticipant?.avatar ? (
            <AvatarImage src={otherParticipant.avatar} alt={otherParticipant.fullName} />
          ) : null}
          <AvatarFallback>
            {otherParticipant 
              ? getInitials(otherParticipant.fullName)
              : 'NA'}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex flex-col items-start flex-1 min-w-0">
          <div className="flex items-center justify-between w-full mb-1">
            <span className="font-medium truncate">
              {otherParticipant?.fullName || 'Unknown'}
            </span>
            <span className="text-xs text-muted-foreground flex-shrink-0">
              {formattedDate}
            </span>
          </div>
          
          <div className="flex items-center justify-between w-full">
            <span className="text-sm text-muted-foreground truncate">
              {conversation.ride?.status 
                ? `Ride: ${conversation.ride.status}` 
                : 'Loading...'}
            </span>
            
            {conversation.unreadCount ? (
              <Badge variant="default" className="ml-auto">
                {conversation.unreadCount}
              </Badge>
            ) : null}
          </div>
        </div>
      </div>
    </Button>
  );
}

// Helper function to get initials
function getInitials(name: string) {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
}