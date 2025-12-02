import React from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { FallbackModeIndicator } from "@/components/fallback-mode-indicator";
import Header from "@/components/layout/header";
import PWAInstallBanner from "@/components/PWAInstallBanner";
import PWAInstallationGuide from "@/components/PWAInstallationGuide";
import { PWAMobileHeader, PWAQuickActions, PWAOfflineIndicator } from "@/components/PWAMobileOptimizations";
import { registerServiceWorker } from "@/utils/pwaUtils";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home-page";
import WelcomePage from "@/pages/welcome-page";
import AuthPage from "@/pages/auth-page";
import ResetPasswordPage from "@/pages/reset-password";
import RoleSelectionPage from "@/pages/role-selection-page";
import BetaTestSignup from "@/pages/beta-test-signup";
import LoginTestPage from "@/pages/login-test";
import GoogleMapsTest from "@/pages/google-maps-test";
import GoogleMapsDiagnostic from "@/pages/google-maps-diagnostic";
import AuthTest from "@/pages/auth-test";
import RealTimeTestPage from "@/pages/real-time-test";
import TestPromoPage from "@/pages/test-promo";
import LandingPage from "@/pages/landing";
import PWAInstallationDemo from "@/pages/pwa-installation-demo";
const TestDocumentComponents = React.lazy(() => import("@/pages/test-document-components"));
const TestPhase2Components = React.lazy(() => import("@/pages/test-phase2-components"));
const TestPhase3Components = React.lazy(() => import("@/pages/test-phase3-components"));
const Phase3IntegrationDemo = React.lazy(() => import("@/pages/phase3-integration-demo"));
import DocumentsDownloadPage from "@/pages/legal/documents-download";
import LegalIndexPage from "@/pages/legal/index";
import TermsOfServicePage from "@/pages/legal/terms-of-service";
import PrivacyPolicyPage from "@/pages/legal/privacy-policy";
import DriverAgreementPage from "@/pages/legal/driver-agreement";
import LegalAgreementsPage from "@/pages/legal/agreements";
import RiderDashboard from "@/pages/rider/dashboard";
import BookRide from "@/pages/rider/book-ride";
import Payment from "@/pages/rider/payment";
import PaymentSuccess from "@/pages/rider/payment-success";
import PaymentSetupPage from "@/pages/rider/payment-setup";
import PaymentPage from "@/pages/payment";
import SavedAddresses from "@/pages/rider/addresses";
import NewSavedAddress from "@/pages/rider/addresses/new";
import EditSavedAddress from "@/pages/rider/addresses/edit";
import SavedLocations from "@/pages/rider/saved-locations";
import RiderBanking from "@/pages/rider/banking/index.tsx";
import RecurringAppointments from "@/pages/rider/recurring-appointments";
import NewRecurringAppointment from "@/pages/rider/recurring-appointments/new";
import EditRecurringAppointment from "@/pages/rider/recurring-appointments/edit";
import RiderOnboardingDashboard from "@/pages/rider/onboarding-dashboard";
import AccountSettings from "@/pages/rider/account-settings";
import DriverAccountSettings from "@/pages/driver/account-settings";
import GetSupport from "@/pages/rider/get-support";
import RideTrackingPage from "@/pages/rider/ride-tracking";
import RideDetailsPage from "@/pages/rider/ride-details";
import DriverDashboard from "@/pages/driver/dashboard";
import ComprehensiveDriverDashboard from "@/components/driver/comprehensive-dashboard";
import DriverBid from "@/pages/driver/bid";
import DriverPayouts from "@/pages/driver/payouts";
import DriverRideDetailsPage from "@/pages/driver/ride-details";
import DriverRegistration from "@/pages/driver/register-fixed";
import DriverOnboarding from "@/pages/driver/onboarding";
import AddVehicle from "@/pages/driver/add-vehicle";
import DriverAvailability from "@/pages/driver/availability";
import EditAvailabilitySchedule from "@/pages/driver/availability/edit";
import EditBlockedTime from "@/pages/driver/availability/blocked-time-edit";
import DriverRideFilters from "@/pages/driver/ride-filters";
import NewRideFilter from "@/pages/driver/ride-filters/new";
import EditRideFilter from "@/pages/driver/ride-filters/edit";

import AdminDashboard from "@/pages/admin/dashboard";
import BetaInvitations from "@/pages/admin/BetaInvitations";
import AdminPromoCodes from "@/pages/admin/promo-codes";
import PlatformSettingsPage from "@/pages/admin/platform-settings";
import AlertsPage from "@/pages/alerts";
import ChatPage from "@/pages/chat-page";
import SettingsPage from "@/pages/settings";
import ProfilePage from "@/pages/profile";
import HelpCenterPage from "@/pages/help-center";
import { ProtectedRoute } from "./lib/protected-route";
import { AuthProvider } from "./hooks/use-auth";
// Using simplified polling instead of complex WebSocket systems
import { SessionProvider } from "./context/session-context";
import { HelpProvider } from "./context/help-context";
import { OnboardingProvider } from "./context/onboarding-context";
import { RiderProvider } from "./context/rider-context";
import { PollingProvider } from "./context/polling-context";
import { HelpSystem } from "./components/help/help-system";
//import { useSessionExpired } from "@/components/session-expired-dialog";
import { GuidedTour } from "./components/onboarding/guided-tour";
import { OnboardingModal } from "./components/onboarding/onboarding-modal";
import { FirstRideAssistance } from "./components/onboarding/first-ride-assistance";
import { ProfileCompletion } from "./components/onboarding/profile-completion";
import { FeatureTooltips } from "./components/onboarding/feature-tooltips";
import { useEffect, useState } from "react";
import { useAuth } from "./hooks/use-auth";
import { useOnboarding } from "./context/onboarding-context";
import { useLocation } from "wouter";
// Removed usePollingNotifications - using single polling system in PollingProvider
import { loadGoogleMapsApi as loadGoogleMapsAPI } from "./lib/google-maps-singleton";

const PaymentDemo = React.lazy(() => import("./pages/payment-demo"));
const HelpCenter = React.lazy(() => import("./pages/help-center"));
const WebSocketInfrastructureTest = React.lazy(() => import("./pages/websocket-infrastructure-test"));
const EmailVerification = React.lazy(() => import("./pages/email-verification"));
const ResetPassword = React.lazy(() => import("./pages/reset-password"));

// Wrapper component to handle onboarding components conditionally
const OnboardingComponents = () => {
  // We're disabling all onboarding components for logged-in users per user request
  // This includes the guided tour, onboarding modals, and feature tooltips

  return null;
};

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/beta" component={LandingPage} />
      <Route path="/welcome" component={WelcomePage} />
      <Route path="/auth/welcome" component={WelcomePage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/register" component={AuthPage} />
      <Route path="/reset-password" component={ResetPasswordPage} />
      <Route path="/select-role" component={RoleSelectionPage} />
      <Route path="/beta-test-signup" component={BetaTestSignup} />
      <Route path="/login-test" component={LoginTestPage} />
      <Route path="/auth-test" component={AuthTest} />
      <Route path="/gmaps-test" component={GoogleMapsTest} />
      <Route path="/gmaps-diagnostic" component={GoogleMapsDiagnostic} />
      <Route path="/real-time-test" component={RealTimeTestPage} />
      <Route path="/legal" component={LegalIndexPage} />
      <Route path="/legal/agreements" component={LegalAgreementsPage} />
      <Route path="/legal/terms-of-service" component={TermsOfServicePage} />
      <Route path="/legal/privacy-policy" component={PrivacyPolicyPage} />
      <Route path="/legal/driver-agreement" component={DriverAgreementPage} />
      <Route path="/legal/download" component={DocumentsDownloadPage} />
      <Route path="/install-app" component={PWAInstallationDemo} />

      {/* Rider Routes */}
      <ProtectedRoute path="/rider/dashboard" component={RiderDashboard} />
      <ProtectedRoute path="/rider/book-ride" component={BookRide} />
      <ProtectedRoute path="/rider/payment/:rideId" component={Payment} />
      <ProtectedRoute path="/payment" component={PaymentPage} />
      <ProtectedRoute path="/rider/payment-setup" component={PaymentSetupPage} />
      <ProtectedRoute path="/rider/payment-success/:rideId?" component={PaymentSuccess} />
      <ProtectedRoute path="/rider/ride-tracking/:rideId" component={RideTrackingPage} />
      <ProtectedRoute path="/rider/ride/:rideId" component={RideDetailsPage} />
      <ProtectedRoute path="/rider/addresses" component={SavedAddresses} />
      <ProtectedRoute path="/rider/addresses/new" component={NewSavedAddress} />
      <ProtectedRoute path="/rider/addresses/edit/:id" component={EditSavedAddress} />
      <ProtectedRoute path="/rider/saved-locations" component={SavedLocations} />
      <ProtectedRoute path="/rider/banking" component={RiderBanking} />
      <ProtectedRoute path="/rider/recurring-appointments" component={RecurringAppointments} />
      <ProtectedRoute path="/rider/recurring-appointments/new" component={NewRecurringAppointment} />
      <ProtectedRoute path="/rider/recurring-appointments/edit/:id" component={EditRecurringAppointment} />
      <ProtectedRoute path="/rider/onboarding-dashboard" component={RiderOnboardingDashboard} />
      <ProtectedRoute path="/rider/account-settings" component={AccountSettings} />
      <ProtectedRoute path="/rider/get-support" component={GetSupport} />

      {/* Driver Routes */}
      <ProtectedRoute path="/driver/dashboard" component={DriverDashboard} />
      <ProtectedRoute path="/driver/comprehensive" component={ComprehensiveDriverDashboard} />
      <ProtectedRoute path="/driver/bid/:id" component={DriverBid} />
      <ProtectedRoute path="/driver/rides/:id" component={DriverRideDetailsPage} />
      <Route path="/driver/register" component={DriverRegistration} />
      <ProtectedRoute path="/driver/onboarding" component={DriverOnboarding} />
      <ProtectedRoute path="/driver/add-vehicle" component={AddVehicle} />
      <ProtectedRoute path="/driver/availability" component={DriverAvailability} />
      <ProtectedRoute path="/driver/availability/edit/:id" component={EditAvailabilitySchedule} />
      <ProtectedRoute path="/driver/availability/blocked-time/edit/:id" component={EditBlockedTime} />
      <ProtectedRoute path="/driver/ride-filters" component={DriverRideFilters} />
      <ProtectedRoute path="/driver/ride-filters/new" component={NewRideFilter} />
      <ProtectedRoute path="/driver/ride-filters/:id/edit" component={EditRideFilter} />
      <ProtectedRoute path="/driver/account" component={DriverAccountSettings} />
      <ProtectedRoute path="/driver/payouts" component={DriverPayouts} />
      <ProtectedRoute path="/driver/documents" component={() => React.lazy(() => import("@/pages/driver/document-status"))} />
      <ProtectedRoute path="/driver/stripe-onboarding/success" component={() => React.lazy(() => import("@/pages/driver/stripe-onboarding-success"))} />
      <ProtectedRoute path="/driver/stripe-onboarding/refresh" component={() => React.lazy(() => import("@/pages/driver/stripe-onboarding-refresh"))} />

      {/* Legal Routes */}
      <Route path="/legal/terms-of-service" component={() => React.lazy(() => import("@/pages/legal/terms-of-service"))} />
      <Route path="/legal/privacy-policy" component={() => React.lazy(() => import("@/pages/legal/privacy-policy"))} />
      <Route path="/legal/beta-agreement" component={() => React.lazy(() => import("@/pages/legal/beta-agreement"))} />

      {/* Admin Routes */}
      <ProtectedRoute path="/admin" component={AdminDashboard} />
      <ProtectedRoute path="/admin/dashboard" component={AdminDashboard} />
      <ProtectedRoute path="/admin/beta-invitations" component={BetaInvitations} />
      <ProtectedRoute path="/admin/promo-codes" component={AdminPromoCodes} />
      <ProtectedRoute path="/admin/platform-settings" component={PlatformSettingsPage} />

      {/* Chat Routes */}
      <ProtectedRoute path="/chat" component={ChatPage} />
      <ProtectedRoute path="/chat/:rideId" component={ChatPage} />

      {/* User Settings and Profile */}
      <ProtectedRoute path="/settings" component={SettingsPage} />
      <ProtectedRoute path="/profile" component={ProfilePage} />
      <ProtectedRoute path="/rider/profile" component={ProfilePage} />
      <ProtectedRoute path="/driver/profile" component={ProfilePage} />

      {/* Help Center */}
      <Route path="/help" component={HelpCenterPage} />

      {/* Alerts */}
      <ProtectedRoute path="/alerts" component={AlertsPage} />

      {/* Payment Demo */}
      <Route path="/payment-demo" component={PaymentDemo} />
      
      {/* Test Pages */}
      <ProtectedRoute path="/test-promo" component={TestPromoPage} />
      <Route path="/test-documents">
        <React.Suspense fallback={<div>Loading...</div>}>
          <TestDocumentComponents />
        </React.Suspense>
      </Route>
      <Route path="/test-phase2">
        <React.Suspense fallback={<div>Loading...</div>}>
          <TestPhase2Components />
        </React.Suspense>
      </Route>
      <Route path="/test-phase3">
        <React.Suspense fallback={<div>Loading...</div>}>
          <TestPhase3Components />
        </React.Suspense>
      </Route>
      <Route path="/phase3-integration">
        <React.Suspense fallback={<div>Loading...</div>}>
          <Phase3IntegrationDemo />
        </React.Suspense>
      </Route>
      <Route path="/websocket-infrastructure-test">
        <React.Suspense fallback={<div>Loading...</div>}>
          <WebSocketInfrastructureTest />
        </React.Suspense>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const { user, isLoading, error } = useAuth();
  const { showOnboarding } = useOnboarding();
  const [, setLocation] = useLocation();

  // Simplified polling - removed complex WebSocket systems

  // Handle authentication errors and redirects
  useEffect(() => {
    const currentPath = window.location.pathname;
    const publicPaths = ['/', '/beta', '/welcome', '/auth/welcome', '/auth', '/reset-password', '/login-test', '/auth-test', '/gmaps-test', '/gmaps-diagnostic', '/help', '/payment-demo', '/websocket-infrastructure-test', '/test-phase2', '/test-documents'];
    const isPublicPath = publicPaths.includes(currentPath) || currentPath.startsWith('/driver/register');

    console.log('Authentication check:', {
      user: !!user,
      isLoading,
      currentPath,
      isPublicPath,
      error: !!error
    });

    // If we have no user (401 response) and we're not loading and not on a public page
    if (user === null && !isLoading && !isPublicPath) {
      console.log('User not authenticated, redirecting to auth page');
      setLocation('/auth');
    }
  }, [user, isLoading, error, setLocation]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <PWAMobileHeader />
      <PWAOfflineIndicator />
      <PWAInstallBanner />
      <Header />
      <Router />
      <OnboardingComponents />
      <HelpSystem />
      <FallbackModeIndicator />
      <Toaster />
    </>
  );
}



function App() {
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false);
  const [performanceMetrics, setPerformanceMetrics] = useState({
    appLoadTime: 0,
    mapsLoadTime: 0
  });

  // Initialize PWA features
  useEffect(() => {
    registerServiceWorker();
  }, []);

  // Performance monitoring
  useEffect(() => {
    const startTime = performance.now();

    const loadGoogleMaps = async () => {
      try {
        const mapsStartTime = performance.now();
        await loadGoogleMapsAPI();
        const mapsEndTime = performance.now();

        setIsGoogleMapsLoaded(true);
        setPerformanceMetrics(prev => ({
          ...prev,
          mapsLoadTime: mapsEndTime - mapsStartTime,
          appLoadTime: performance.now() - startTime
        }));

        // Log performance metrics in development
        if (process.env.NODE_ENV === 'development') {
          console.log('Performance Metrics:', {
            appLoadTime: `${(performance.now() - startTime).toFixed(2)}ms`,
            mapsLoadTime: `${(mapsEndTime - mapsStartTime).toFixed(2)}ms`
          });
        }
      } catch (error) {
        console.error('Failed to load Google Maps:', error);
      }
    };

    loadGoogleMaps();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PollingProvider>
          <SessionProvider>
            <OnboardingProvider>
              <HelpProvider>
                <RiderProvider>
                  <AppContent />
                </RiderProvider>
              </HelpProvider>
            </OnboardingProvider>
          </SessionProvider>
        </PollingProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;