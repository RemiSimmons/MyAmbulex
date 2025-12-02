import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "./hooks/use-auth";
import { HelpProvider } from "./context/help-context";
import HomePage from "@/pages/home-page";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <HelpProvider>
          <div>
            <h1>Step by Step App Test</h1>
            <HomePage />
            <Toaster />
          </div>
        </HelpProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;