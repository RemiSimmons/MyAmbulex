import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Check, X, Tag } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface PromoCodeInputProps {
  rideAmount: number;
  onPromoCodeApplied?: (promoData: {
    promoCodeId: number;
    originalAmount: number;
    discountAmount: number;
    finalAmount: number;
    isFreeRide: boolean;
  }) => void;
  onPromoCodeRemoved?: () => void;
  disabled?: boolean;
}

interface ValidatedPromoCode {
  valid: boolean;
  promoCode: {
    id: number;
    code: string;
    description: string;
    discountType: string;
  };
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
  isFreeRide: boolean;
}

export function PromoCodeInput({ 
  rideAmount, 
  onPromoCodeApplied, 
  onPromoCodeRemoved,
  disabled = false 
}: PromoCodeInputProps) {
  const [promoCode, setPromoCode] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [validatedPromo, setValidatedPromo] = useState<ValidatedPromoCode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const validatePromoCode = async () => {
    if (!promoCode.trim()) {
      setError("Please enter a promo code");
      return;
    }

    if (rideAmount <= 0) {
      setError("Invalid ride amount");
      return;
    }

    setIsValidating(true);
    setError(null);

    try {
      const response = await apiRequest("POST", "/api/validate-promo-code", {
        code: promoCode.trim().toUpperCase(),
        rideAmount
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to validate promo code");
      }

      const promoData: ValidatedPromoCode = await response.json();
      setValidatedPromo(promoData);
      
      if (onPromoCodeApplied) {
        onPromoCodeApplied({
          promoCodeId: promoData.promoCode.id,
          originalAmount: promoData.originalAmount,
          discountAmount: promoData.discountAmount,
          finalAmount: promoData.finalAmount,
          isFreeRide: promoData.isFreeRide
        });
      }

      toast({
        title: "Promo Code Applied!",
        description: promoData.isFreeRide 
          ? "Your ride is now free!" 
          : `You saved $${promoData.discountAmount.toFixed(2)}`,
        variant: "default",
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to validate promo code";
      setError(errorMessage);
      toast({
        title: "Invalid Promo Code",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsValidating(false);
    }
  };

  const removePromoCode = () => {
    setPromoCode("");
    setValidatedPromo(null);
    setError(null);
    if (onPromoCodeRemoved) {
      onPromoCodeRemoved();
    }
    toast({
      title: "Promo Code Removed",
      description: "Original pricing restored",
      variant: "default",
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isValidating && !validatedPromo) {
      validatePromoCode();
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Tag className="h-5 w-5" />
          Promo Code
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!validatedPromo ? (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Enter promo code (e.g., FREERIDE2025)"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                onKeyPress={handleKeyPress}
                disabled={disabled || isValidating}
                className="flex-1"
              />
              <Button 
                onClick={validatePromoCode}
                disabled={disabled || isValidating || !promoCode.trim()}
                size="default"
              >
                {isValidating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Apply"
                )}
              </Button>
            </div>
            
            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600">
                <X className="h-4 w-4" />
                {error}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                <span className="font-medium text-green-800">
                  {validatedPromo.promoCode.code}
                </span>
                {validatedPromo.isFreeRide && (
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    FREE RIDE
                  </Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={removePromoCode}
                disabled={disabled}
                className="text-green-700 hover:text-green-800"
              >
                Remove
              </Button>
            </div>
            
            <div className="text-sm text-gray-600">
              <p>{validatedPromo.promoCode.description}</p>
            </div>
            
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Original Amount:</span>
                <span>${validatedPromo.originalAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-green-600">
                <span>Discount:</span>
                <span>-${validatedPromo.discountAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold border-t pt-1">
                <span>Final Amount:</span>
                <span>
                  {validatedPromo.isFreeRide ? (
                    <span className="text-green-600">FREE</span>
                  ) : (
                    `$${validatedPromo.finalAmount.toFixed(2)}`
                  )}
                </span>
              </div>
            </div>
          </div>
        )}
        
        <div className="text-xs text-gray-500 mt-2">
          💡 Try code <strong>FREERIDE2025</strong> for a free ride during beta testing
        </div>
      </CardContent>
    </Card>
  );
}