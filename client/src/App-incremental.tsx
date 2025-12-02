import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "./hooks/use-auth";
import { HelpProvider } from "./context/help-context";
import { SessionProvider } from "./context/session-context";
import { PollingProvider } from "./context/polling-context";
import { OnboardingProvider } from "./context/onboarding-context";
import { RiderProvider } from "./context/rider-context";
import HomePage from "@/pages/home-page";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PollingProvider>
          <SessionProvider>
            <OnboardingProvider>
              <RiderProvider>
                <HelpProvider>
                  <div>
                    <h1>Incremental Test - Adding RiderProvider (FINAL)</h1>
                    <HomePage />
                    <Toaster />
                  </div>
                </HelpProvider>
              </RiderProvider>
            </OnboardingProvider>
          </SessionProvider>
        </PollingProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;