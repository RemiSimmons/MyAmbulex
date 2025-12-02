import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div>
        <h1>Minimal App Test - No HomePage</h1>
        <p>Testing without HomePage component</p>
        <Toaster />
      </div>
    </QueryClientProvider>
  );
}

export default App;