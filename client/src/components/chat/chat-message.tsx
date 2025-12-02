import { useRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { ChatMessage as ChatMessageType } from "@/context/chat-context";
import { Loader2, CheckCircle2, Play, Pause, File, Image, FileAudio } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatMessageProps {
  message: ChatMessageType;
  isLast?: boolean;
}

export function ChatMessage({ message, isLast }: ChatMessageProps) {
  const { user } = useAuth();
  const isCurrentUser = user?.id === message.senderId;
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Format initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };
  
  // Fallback fullName if sender info not available
  const fullName = message.sender?.fullName || (isCurrentUser ? user?.fullName : 'Unknown');
  
  // Format the time
  const formattedTime = format(new Date(message.createdAt), 'h:mm a');
  
  // Format audio duration
  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };
  
  // Handle audio playback
  const toggleAudioPlayback = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    
    setIsPlaying(!isPlaying);
  };
  
  // Load audio metadata
  const handleAudioMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };
  
  // Update current time during playback
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };
  
  // Handle audio ended
  const handleAudioEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  };
  
  return (
    <div
      className={cn(
        "flex gap-2 mb-4",
        isCurrentUser ? "justify-end" : "justify-start"
      )}
    >
      {!isCurrentUser && (
        <Avatar className="h-8 w-8">
          <AvatarFallback>
            {getInitials(fullName || 'Unknown')}
          </AvatarFallback>
        </Avatar>
      )}
      
      <div className={cn("flex flex-col max-w-[80%]")}>
        <div className="flex items-center mb-1">
          {!isCurrentUser && (
            <span className="text-sm font-medium mr-2">{fullName}</span>
          )}
          
          <span className="text-xs text-muted-foreground">{formattedTime}</span>
          
          {message.isSystemMessage && (
            <Badge variant="outline" className="ml-2 text-xs">System</Badge>
          )}
        </div>
        
        <div
          className={cn(
            "rounded-lg px-3 py-2 text-sm",
            isCurrentUser 
              ? "bg-primary text-primary-foreground" 
              : "bg-muted"
          )}
        >
          {message.content}
          
          {/* If there's an attachment, render it based on type */}
          {message.attachmentUrl && (
            <div className="mt-2">
              {message.attachmentType?.startsWith('image/') ? (
                <div className="relative group">
                  <img 
                    src={message.attachmentUrl} 
                    alt="Attachment" 
                    className="max-w-full rounded-md max-h-60 object-contain cursor-pointer" 
                    onClick={() => window.open(message.attachmentUrl, '_blank')}
                  />
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <a 
                      href={message.attachmentUrl} 
                      download
                      className="bg-black/60 text-white p-1 rounded-full block"
                    >
                      <Image className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              ) : message.attachmentType?.startsWith('audio/') ? (
                <div className="flex flex-col gap-2 mt-2 bg-black/5 dark:bg-white/5 p-2 rounded-md">
                  <audio 
                    ref={audioRef}
                    src={message.attachmentUrl} 
                    className="hidden"
                    onLoadedMetadata={handleAudioMetadata}
                    onTimeUpdate={handleTimeUpdate}
                    onEnded={handleAudioEnded}
                  />
                  
                  <div className="flex items-center gap-3">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={toggleAudioPlayback}
                    >
                      {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                    
                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(duration)}</span>
                      </div>
                      
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary"
                          style={{ 
                            width: `${(currentTime / duration) * 100}%`,
                            transition: 'width 0.1s linear'
                          }}
                        />
                      </div>
                    </div>
                    
                    <a 
                      href={message.attachmentUrl} 
                      download
                      className="opacity-70 hover:opacity-100"
                    >
                      <FileAudio className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 mt-2 bg-black/5 dark:bg-white/5 p-2 rounded-md">
                  <File className="h-5 w-5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">Attachment</p>
                  </div>
                  <a 
                    href={message.attachmentUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary text-xs font-medium"
                  >
                    View
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Status indicators for sent messages */}
        {isCurrentUser && (
          <div className="flex justify-end mt-1">
            {message.pending ? (
              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
            ) : (
              <CheckCircle2 className="h-3 w-3 text-green-500" />
            )}
          </div>
        )}
      </div>
      
      {isCurrentUser && (
        <Avatar className="h-8 w-8">
          <AvatarFallback>
            {getInitials(user?.fullName || 'You')}
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}