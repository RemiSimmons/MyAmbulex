import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Paperclip, Send, Mic, MicOff, X, MessageSquareText } from "lucide-react";
import { useChat } from "@/context/chat-context";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function ChatInput() {
  const { sendMessage, sendTypingIndicator } = useChat();
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [presetMessages, setPresetMessages] = useState<string[]>([
    "I'll be there in 5 minutes",
    "I've arrived at the pickup location",
    "Traffic is heavy, I may be a few minutes late",
    "Please call me when you're ready",
    "Is there a specific entrance I should use?"
  ]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Set up debounced typing indicator
  useEffect(() => {
    let typingTimeout: NodeJS.Timeout;
    
    if (message.trim()) {
      sendTypingIndicator(true);
      typingTimeout = setTimeout(() => {
        sendTypingIndicator(false);
      }, 2000);
    }
    
    return () => {
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
    };
  }, [message, sendTypingIndicator]);
  
  // Clean up recording resources on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);
  
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await uploadAndSendAudio(audioBlob);
        
        // Stop all tracks to release the microphone
        stream.getTracks().forEach(track => track.stop());
        
        // Reset recording state
        setIsRecording(false);
        setRecordingTime(0);
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }
      };
      
      // Start recording
      mediaRecorder.start();
      setIsRecording(true);
      
      // Set up timer to track recording duration
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          // Auto-stop after 2 minutes
          if (prev >= 120) {
            stopRecording();
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
      
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: 'Microphone Access Error',
        description: 'Please allow microphone access to record messages.',
        variant: 'destructive'
      });
    }
  };
  
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };
  
  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };
  
  const uploadAndSendAudio = async (audioBlob: Blob) => {
    try {
      setIsSubmitting(true);
      
      // Create a file from the blob
      const audioFile = new File([audioBlob], `voice-message-${Date.now()}.webm`, { 
        type: 'audio/webm'
      });
      
      // Upload the audio file
      const formData = new FormData();
      formData.append('file', audioFile);
      
      const response = await fetch('/api/chat/upload-attachment', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload voice message');
      }
      
      const data = await response.json();
      
      // Send the message with the audio attachment
      await sendMessage("🎤 Voice Message", data.url, audioFile.type);
      
      toast({
        description: "Voice message sent",
      });
      
    } catch (error) {
      console.error('Error uploading voice message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send voice message. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleSendMessage = async () => {
    if (!message.trim() && !attachment) return;
    
    try {
      setIsSubmitting(true);
      
      let attachmentUrl: string | undefined;
      let attachmentType: string | undefined;
      
      if (attachment) {
        // Upload the file
        const formData = new FormData();
        formData.append('file', attachment);
        
        const response = await fetch('/api/chat/upload-attachment', {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          throw new Error('Failed to upload attachment');
        }
        
        const data = await response.json();
        attachmentUrl = data.url;
        attachmentType = attachment.type;
      }
      
      await sendMessage(message, attachmentUrl, attachmentType);
      setMessage("");
      setAttachment(null);
    } catch (error) {
      console.error("Failed to send message:", error);
      toast({
        title: "Failed to send message",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Send message on Enter (but not with Shift+Enter)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  return (
    <div className="p-3 border-t flex flex-col gap-2">
      {attachment && (
        <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
          <span className="text-sm truncate flex-1">
            {attachment.name}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setAttachment(null)}
          >
            Remove
          </Button>
        </div>
      )}
      
      {isRecording && (
        <div className="flex items-center justify-between p-2 bg-red-100 dark:bg-red-900/30 rounded-md">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 bg-red-600 rounded-full animate-pulse" />
            <span className="text-sm font-medium">Recording... {formatRecordingTime(recordingTime)}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={stopRecording}
            className="text-red-600 dark:text-red-400"
          >
            Stop
          </Button>
        </div>
      )}
      
      <Popover>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              className="resize-none min-h-[80px]"
              disabled={isSubmitting || isRecording}
            />
            
            <div className="absolute bottom-2 right-2 flex space-x-1">
              <PopoverTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className={cn(
                    "opacity-70 hover:opacity-100 transition",
                    (isSubmitting || isRecording) && "pointer-events-none opacity-50"
                  )}
                  disabled={isSubmitting || isRecording}
                >
                  <MessageSquareText className="h-5 w-5" />
                </Button>
              </PopoverTrigger>
              
              <Button
                size="icon"
                variant="ghost"
                className={cn(
                  "opacity-70 hover:opacity-100 transition",
                  (isSubmitting || isRecording) && "pointer-events-none opacity-50"
                )}
                onClick={() => fileInputRef.current?.click()}
                disabled={isSubmitting || isRecording}
              >
                <Paperclip className="h-5 w-5" />
              </Button>
              
              <Button
                size="icon"
                variant={isRecording ? "destructive" : "ghost"}
                className={cn(
                  "opacity-70 hover:opacity-100 transition",
                  isSubmitting && "pointer-events-none opacity-50"
                )}
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isSubmitting}
              >
                {isRecording ? (
                  <MicOff className="h-5 w-5" />
                ) : (
                  <Mic className="h-5 w-5" />
                )}
              </Button>
            </div>
            
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*,audio/*,video/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setAttachment(file);
                }
              }}
            />
          </div>
          
          <Button
            className="self-end"
            onClick={handleSendMessage}
            disabled={((!message.trim() && !attachment) || isSubmitting) || isRecording}
          >
            <Send className="h-5 w-5 mr-1.5" />
            Send
          </Button>
        </div>
        
        <PopoverContent className="w-72 p-0" align="end" alignOffset={-40}>
          <div className="p-2 font-medium text-sm border-b">Quick Replies</div>
          <div className="max-h-80 overflow-y-auto">
            {presetMessages.map((preset, index) => (
              <div 
                key={index}
                className="p-2 text-sm hover:bg-muted cursor-pointer flex justify-between"
                onClick={() => {
                  setMessage(preset);
                }}
              >
                <span className="truncate pr-2">{preset}</span>
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}