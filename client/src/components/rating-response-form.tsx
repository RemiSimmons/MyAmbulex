import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { Flag, CheckCircle } from "lucide-react";

// Define validation schema
const ratingResponseSchema = z.object({
  response: z.string()
    .min(1, "Response can't be empty")
    .max(1000, "Response too long (max 1000 characters)"),
  isPublic: z.boolean().default(true),
  isFlagged: z.boolean().default(false),
});

type RatingResponseFormValues = z.infer<typeof ratingResponseSchema>;

interface RatingResponseFormProps {
  ratingId: number;
  existingResponse?: {
    id: number;
    response: string;
    isPublic: boolean;
    isFlagged: boolean;
  };
  onSuccess?: () => void;
}

export function RatingResponseForm({ ratingId, existingResponse, onSuccess }: RatingResponseFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Initialize form with default values or existing response
  const form = useForm<RatingResponseFormValues>({
    resolver: zodResolver(ratingResponseSchema),
    defaultValues: {
      response: existingResponse?.response || "",
      isPublic: existingResponse?.isPublic ?? true,
      isFlagged: existingResponse?.isFlagged ?? false,
    },
  });
  
  // Mutation for sending response
  const mutation = useMutation({
    mutationFn: (values: RatingResponseFormValues) => {
      setIsSubmitting(true);
      return apiRequest("POST", `/api/ratings/${ratingId}/response`, values)
        .then(res => {
          if (!res.ok) {
            throw new Error("Failed to submit response");
          }
          return res.json();
        });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/ratings/${ratingId}/response`] });
      toast({
        title: existingResponse ? "Response updated" : "Response submitted",
        description: existingResponse 
          ? "Your response has been successfully updated" 
          : "Your response has been successfully submitted",
        variant: "default",
      });
      setIsSubmitting(false);
      if (onSuccess) onSuccess();
    },
    onError: (error) => {
      console.error("Error submitting response:", error);
      toast({
        title: "Error",
        description: "Failed to submit your response. Please try again.",
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  });
  
  // Form submission handler
  function onSubmit(values: RatingResponseFormValues) {
    mutation.mutate(values);
  }
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{existingResponse ? "Update Your Response" : "Respond to Review"}</CardTitle>
        <CardDescription>
          {existingResponse 
            ? "Edit your response to this review" 
            : "Share your perspective and respond professionally to this review"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="response"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Response</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Thank you for your feedback. We appreciate..." 
                      className="min-h-[120px] resize-y"
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Professional responses show you value customer feedback
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-between">
              <FormField
                control={form.control}
                name="isPublic"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-0.5">
                      <FormLabel>Make Public</FormLabel>
                      <FormDescription className="text-xs">
                        Show your response publicly alongside the review
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="isFlagged"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-0.5">
                      <FormLabel className="flex items-center gap-1">
                        <Flag className="h-4 w-4 text-red-500" />
                        Report Review 
                      </FormLabel>
                      <FormDescription className="text-xs">
                        Flag this review for administrative review
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </div>
            
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
              <Button
                type="submit"
                disabled={mutation.isPending || isSubmitting}
                className="w-full sm:w-auto"
              >
                {mutation.isPending || isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></span>
                    {existingResponse ? "Updating..." : "Submitting..."}
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    {existingResponse ? "Update Response" : "Submit Response"}
                  </span>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}