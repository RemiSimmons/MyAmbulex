import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { ChatProvider } from "@/context/chat-context";
import { ConversationList } from "@/components/chat/conversation-list";
import { ChatInterface } from "@/components/chat/chat-interface";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import Footer from "@/components/layout/footer";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function ChatPage() {
  const { user, isLoading: isLoadingAuth } = useAuth();
  const [_, setLocation] = useLocation();
  const [match, params] = useRoute<{ rideId?: string }>("/chat/:rideId?");
  const { toast } = useToast();
  const [rideId, setRideId] = useState<number | undefined>(undefined);
  
  // Set the rideId from URL params if available
  useEffect(() => {
    if (match && params.rideId) {
      setRideId(Number(params.rideId));
    } else {
      setRideId(undefined);
    }
  }, [match, params]);
  
  // Redirect to auth if not logged in
  useEffect(() => {
    if (!isLoadingAuth && !user) {
      toast({
        title: "Not authorized",
        description: "Please login to access chat",
        variant: "destructive",
      });
      setLocation("/auth");
    }
  }, [user, isLoadingAuth, setLocation, toast]);
  
  // If still loading auth status, show a loading indicator
  if (isLoadingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  // If user isn't authenticated yet, don't render anything (will redirect)
  if (!user) {
    return null;
  }
  
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">

      
      <main className="flex-grow">
        <div className="container mx-auto py-6">
          <h1 className="text-2xl font-bold mb-6">Messages</h1>
          
          <ChatProvider>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="md:col-span-1 border rounded-lg overflow-hidden h-[600px]">
                <ConversationList
                  onSelect={(id) => {
                    // Update URL when a conversation is selected
                    const conversation = id 
                      ? `/chat/${id}` 
                      : '/chat';
                    setLocation(conversation);
                  }}
                />
              </Card>
              
              <div className="md:col-span-2">
                <ChatInterface
                  rideId={rideId}
                  className="h-[600px]"
                  onBack={() => {
                    setLocation('/chat');
                  }}
                />
              </div>
            </div>
          </ChatProvider>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}