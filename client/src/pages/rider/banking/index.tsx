import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import BankingInfoForm from "@/components/rider/banking-info-form";
import { RiderLayout } from "@/components/layouts/rider-layout";
import { Loader2 } from "lucide-react";

export default function RiderBankingPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  // Check if the user is authenticated
  useEffect(() => {
    if (user === null) {
      navigate("/auth");
    } else if (user.role !== "rider") {
      navigate(`/${user.role}/dashboard`);
    }
  }, [user, navigate]);

  // Fetch the user's profile data
  const { data: profile, isLoading } = useQuery({
    queryKey: ["/api/rider/profile"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/rider/profile");
      if (!res.ok) {
        throw new Error("Failed to fetch rider profile");
      }
      return res.json();
    },
    enabled: !!user && user.role === "rider",
  });

  // If loading, show a spinner
  if (isLoading || !user) {
    return (
      <RiderLayout>
        <div className="flex items-center justify-center h-[70vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </RiderLayout>
    );
  }

  // Extract banking info from the profile
  const bankingInfo = profile ? {
    accountHolderName: profile.accountHolderName,
    accountType: profile.accountType,
    bankName: profile.bankName,
    routingNumber: profile.routingNumber,
    accountNumber: profile.accountNumber,
    billingAddress: profile.billingAddress,
    billingCity: profile.billingCity,
    billingState: profile.billingState,
    billingZipCode: profile.billingZipCode,
    paymentPreference: profile.paymentPreference || "bank_account",
  } : undefined;

  return (
    <RiderLayout>
      <div className="container max-w-4xl mx-auto py-10 px-4">
        <h1 className="text-2xl font-bold mb-6">MyPayments</h1>
        <BankingInfoForm existingData={bankingInfo} />
      </div>
    </RiderLayout>
  );
}