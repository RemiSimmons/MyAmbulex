import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "./hooks/use-auth";
import { HelpProvider } from "./context/help-context";
import { SessionProvider } from "./context/session-context";
import { PollingProvider } from "./context/polling-context";
import { OnboardingProvider } from "./context/onboarding-context";  
import { RiderProvider } from "./context/rider-context";

// Import only the most basic components first
import HomePage from "@/pages/home-page";
import AuthPage from "@/pages/auth-page";
import NotFound from "@/pages/not-found";
import React from "react";

// Test the lazy-loaded components that might be problematic
const PaymentDemo = React.lazy(() => import("./pages/payment-demo"));
const HelpCenter = React.lazy(() => import("./pages/help-center"));
const WebSocketInfrastructureTest = React.lazy(() => import("./pages/websocket-infrastructure-test"));
const EmailVerification = React.lazy(() => import("./pages/email-verification"));

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

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
                    <h1>Simplified App Test - Basic Routing</h1>
                    <Router />
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