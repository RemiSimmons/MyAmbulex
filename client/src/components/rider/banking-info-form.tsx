import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, CreditCard, Building } from "lucide-react";

// Define the form validation schema
const bankingFormSchema = z.object({
  accountHolderName: z.string().min(1, "Account holder name is required"),
  accountType: z.enum(["checking", "savings"], {
    required_error: "Please select an account type",
  }),
  bankName: z.string().min(1, "Bank name is required"),
  routingNumber: z.string()
    .min(9, "Routing number must be 9 digits")
    .max(9, "Routing number must be 9 digits")
    .regex(/^\d+$/, "Routing number must contain only digits"),
  accountNumber: z.string()
    .min(4, "Account number must be at least 4 digits")
    .max(17, "Account number cannot exceed 17 digits")
    .regex(/^\d+$/, "Account number must contain only digits"),
  billingAddress: z.string().min(1, "Billing address is required"),
  billingCity: z.string().min(1, "City is required"),
  billingState: z.string().min(1, "State is required"),
  billingZipCode: z.string()
    .min(5, "ZIP code must be at least 5 digits")
    .regex(/^\d{5}(-\d{4})?$/, "Enter a valid ZIP code (e.g., 12345 or 12345-6789)"),
  paymentPreference: z.enum(["bank_account", "credit_card", "paypal"], {
    required_error: "Please select a payment preference",
  }),
});

type BankingFormValues = z.infer<typeof bankingFormSchema>;

interface BankingInfoFormProps {
  existingData?: Partial<BankingFormValues>;
  onSuccess?: () => void;
}

export default function BankingInfoForm({ 
  existingData, 
  onSuccess 
}: BankingInfoFormProps) {
  const { toast } = useToast();
  const [showAccountInfo, setShowAccountInfo] = useState(
    existingData?.paymentPreference === "bank_account"
  );

  // Initialize the form
  const form = useForm<BankingFormValues>({
    resolver: zodResolver(bankingFormSchema),
    defaultValues: {
      accountHolderName: existingData?.accountHolderName || "",
      accountType: existingData?.accountType || "checking",
      bankName: existingData?.bankName || "",
      routingNumber: existingData?.routingNumber || "",
      accountNumber: existingData?.accountNumber || "",
      billingAddress: existingData?.billingAddress || "",
      billingCity: existingData?.billingCity || "",
      billingState: existingData?.billingState || "",
      billingZipCode: existingData?.billingZipCode || "",
      paymentPreference: existingData?.paymentPreference || "bank_account",
    },
  });

  // Handle payment preference change
  const handlePaymentPreferenceChange = (value: string) => {
    if (value === "bank_account") {
      setShowAccountInfo(true);
    } else {
      setShowAccountInfo(false);
    }
  };

  // Save banking information
  const saveBankingInfo = useMutation({
    mutationFn: async (data: BankingFormValues) => {
      const response = await apiRequest("POST", "/api/rider/banking-info", data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to save banking information");
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rider/profile"] });
      toast({
        title: "Banking information updated",
        description: "Your banking information has been saved successfully.",
      });
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    },
  });

  // Form submission handler
  const onSubmit = (data: BankingFormValues) => {
    saveBankingInfo.mutate(data);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Banking Information</CardTitle>
        <CardDescription>
          Update your banking information for ride payments and refunds.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="paymentPreference"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Payment Method</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={(value) => {
                        field.onChange(value);
                        handlePaymentPreferenceChange(value);
                      }}
                      defaultValue={field.value}
                      className="flex flex-col space-y-1"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="bank_account" id="bank_account" />
                        <Label htmlFor="bank_account" className="flex items-center">
                          <Building className="mr-2 h-4 w-4" /> Bank Account
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="credit_card" id="credit_card" />
                        <Label htmlFor="credit_card" className="flex items-center">
                          <CreditCard className="mr-2 h-4 w-4" /> Credit Card
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="paypal" id="paypal" />
                        <Label htmlFor="paypal">PayPal</Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Bank Account Information - shown only when bank_account is selected */}
            {showAccountInfo && (
              <>
                <div className="grid grid-cols-1 gap-6">
                  <FormField
                    control={form.control}
                    name="accountHolderName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account Holder Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Full name on account" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="bankName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bank Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Bank name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="accountType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account Type</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select account type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="checking">Checking</SelectItem>
                              <SelectItem value="savings">Savings</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="routingNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Routing Number</FormLabel>
                          <FormControl>
                            <Input placeholder="9-digit routing number" {...field} />
                          </FormControl>
                          <FormDescription>
                            The 9-digit number at the bottom of your check
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="accountNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account Number</FormLabel>
                          <FormControl>
                            <Input placeholder="Account number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Billing Address</h3>

                  <FormField
                    control={form.control}
                    name="billingAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Street Address</FormLabel>
                        <FormControl>
                          <Input placeholder="Street address" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="billingCity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input placeholder="City" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="billingState"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State</FormLabel>
                          <FormControl>
                            <Input placeholder="State" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="billingZipCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ZIP Code</FormLabel>
                          <FormControl>
                            <Input placeholder="ZIP code" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Note about other payment methods */}
            {!showAccountInfo && (
              <div className="rounded-md bg-blue-50 p-4 my-4">
                <div className="flex">
                  <div className="ml-3">
                    <p className="text-sm text-blue-700">
                      {form.getValues("paymentPreference") === "credit_card" 
                        ? "Credit card processing will be available soon. Please use bank account for now."
                        : "PayPal integration will be available soon. Please use bank account for now."}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <CardFooter className="px-0">
              <Button 
                type="submit" 
                disabled={saveBankingInfo.isPending}
                className="ml-auto"
              >
                {saveBankingInfo.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save Banking Information
              </Button>
            </CardFooter>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}