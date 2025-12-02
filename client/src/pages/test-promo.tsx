import { useState } from "react";
import { PromoCodeInput } from "@/components/promo-code-input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TestPromoPage() {
  const [rideAmount] = useState(25.50); // Test ride amount
  const [appliedPromo, setAppliedPromo] = useState<any>(null);

  const handlePromoApplied = (promoData: any) => {
    setAppliedPromo(promoData);
    console.log("Promo applied:", promoData);
  };

  const handlePromoRemoved = () => {
    setAppliedPromo(null);
    console.log("Promo removed");
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Promo Code Testing</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium mb-2">Test Ride Details</h3>
              <p>Base Amount: ${rideAmount.toFixed(2)}</p>
            </div>

            <PromoCodeInput 
              rideAmount={rideAmount}
              onPromoCodeApplied={handlePromoApplied}
              onPromoCodeRemoved={handlePromoRemoved}
            />

            {appliedPromo && (
              <Card className="border-green-200 bg-green-50">
                <CardHeader>
                  <CardTitle className="text-green-800">Applied Promo Code</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <p><strong>Promo Code ID:</strong> {appliedPromo.promoCodeId}</p>
                    <p><strong>Original Amount:</strong> ${appliedPromo.originalAmount.toFixed(2)}</p>
                    <p><strong>Discount Amount:</strong> ${appliedPromo.discountAmount.toFixed(2)}</p>
                    <p><strong>Final Amount:</strong> ${appliedPromo.finalAmount.toFixed(2)}</p>
                    <p><strong>Is Free Ride:</strong> {appliedPromo.isFreeRide ? "Yes" : "No"}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="text-sm text-gray-600 space-y-2">
              <h4 className="font-medium">Available Test Codes:</h4>
              <ul className="list-disc list-inside space-y-1">
                <li><code>FREERIDE2025</code> - 100% discount (Free ride)</li>
                <li><code>FREERIDE</code> - 100% discount (Free ride)</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}