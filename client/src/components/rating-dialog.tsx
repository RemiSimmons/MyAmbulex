import { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Ride, User } from "@shared/schema";
import { 
  Star, 
  StarHalf, 
  ThumbsUp,
  Timer,
  Car,
  Sparkles,
  MessageSquare,
  Headphones,
  Heart,
  ShieldCheck,
  MoveHorizontal 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface RatingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ride?: Ride;
  rateUser?: User;
  fromUser?: User;
  onRatingComplete?: () => void;
  onSubmit?: (rating: number, comment: string) => void;
}

interface RatingCategory {
  name: string;
  label: string;
  value: number;
  icon?: React.ReactNode;
  description?: string;
}

interface AttributeTag {
  id: string;
  label: string;
  icon?: React.ReactNode;
  selected: boolean;
}

export default function RatingDialog({
  open,
  onOpenChange,
  ride,
  rateUser,
  fromUser,
  onRatingComplete,
  onSubmit
}: RatingDialogProps) {
  const { toast } = useToast();
  const [overallRating, setOverallRating] = useState<number>(0);
  const [comment, setComment] = useState<string>("");
  const [isAnonymous, setIsAnonymous] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [detailedFeedback, setDetailedFeedback] = useState<string>("");
  const [recommendationScore, setRecommendationScore] = useState<number>(0);
  const [activeTab, setActiveTab] = useState("basic");
  
  // Check if we're in simple mode (websocket triggered) or detailed mode (with ride and user objects)
  const isSimpleMode = !!onSubmit;
  
  // Determine if rating a driver or rider (in simple mode, always assume driver)
  const isRatingDriver = isSimpleMode ? true : rateUser?.role === "driver";
  
  // Define rating categories based on who we're rating
  const [categories, setCategories] = useState<RatingCategory[]>(
    isRatingDriver 
      ? [
        { name: "punctuality", label: "Punctuality", value: 0, icon: <Timer className="h-4 w-4" />, description: "Was the driver on time for pickup?" },
        { name: "driving", label: "Driving", value: 0, icon: <Car className="h-4 w-4" />, description: "How would you rate the driver's driving skills?" },
        { name: "cleanliness", label: "Vehicle Cleanliness", value: 0, icon: <Sparkles className="h-4 w-4" />, description: "Was the vehicle clean and well-maintained?" },
        { name: "helpfulness", label: "Helpfulness", value: 0, icon: <Heart className="h-4 w-4" />, description: "How helpful was the driver during your trip?" }
      ]
      : [
        { name: "punctuality", label: "Punctuality", value: 0, icon: <Timer className="h-4 w-4" />, description: "Was the rider ready on time?" },
        { name: "communication", label: "Communication", value: 0, icon: <MessageSquare className="h-4 w-4" />, description: "How well did the rider communicate?" },
        { name: "courtesy", label: "Courtesy", value: 0, icon: <Headphones className="h-4 w-4" />, description: "Was the rider respectful and courteous?" },
        { name: "cooperation", label: "Cooperation", value: 0, icon: <MoveHorizontal className="h-4 w-4" />, description: "Did the rider follow instructions and cooperate?" }
      ]
  );
  
  // Define attribute tags for highlighting strengths
  const [attributeTags, setAttributeTags] = useState<AttributeTag[]>(
    isRatingDriver
      ? [
        { id: "professional", label: "Professional", selected: false, icon: <ShieldCheck className="h-4 w-4" /> },
        { id: "punctual", label: "Punctual", selected: false, icon: <Timer className="h-4 w-4" /> },
        { id: "courteous", label: "Courteous", selected: false, icon: <ThumbsUp className="h-4 w-4" /> },
        { id: "skilled", label: "Skilled Driver", selected: false, icon: <Car className="h-4 w-4" /> },
        { id: "helpful", label: "Helpful", selected: false, icon: <Heart className="h-4 w-4" /> },
        { id: "clean", label: "Clean Vehicle", selected: false, icon: <Sparkles className="h-4 w-4" /> },
      ]
      : [
        { id: "punctual", label: "Punctual", selected: false, icon: <Timer className="h-4 w-4" /> },
        { id: "communicative", label: "Communicative", selected: false, icon: <MessageSquare className="h-4 w-4" /> },
        { id: "respectful", label: "Respectful", selected: false, icon: <ThumbsUp className="h-4 w-4" /> },
        { id: "friendly", label: "Friendly", selected: false, icon: <Heart className="h-4 w-4" /> },
        { id: "cooperative", label: "Cooperative", selected: false, icon: <MoveHorizontal className="h-4 w-4" /> },
        { id: "prepared", label: "Well-Prepared", selected: false, icon: <ShieldCheck className="h-4 w-4" /> },
      ]
  );
  
  // Define improvement areas for constructive feedback
  const [improvementAreas, setImprovementAreas] = useState<AttributeTag[]>(
    isRatingDriver
      ? [
        { id: "timeliness", label: "Be on time", selected: false, icon: <Timer className="h-4 w-4" /> },
        { id: "communication", label: "Improve communication", selected: false, icon: <MessageSquare className="h-4 w-4" /> },
        { id: "vehicle", label: "Vehicle maintenance", selected: false, icon: <Car className="h-4 w-4" /> },
        { id: "navigation", label: "Better navigation", selected: false, icon: <MoveHorizontal className="h-4 w-4" /> },
        { id: "assistance", label: "More assistance", selected: false, icon: <Heart className="h-4 w-4" /> },
      ]
      : [
        { id: "timeliness", label: "Be ready on time", selected: false, icon: <Timer className="h-4 w-4" /> },
        { id: "communication", label: "Communicate better", selected: false, icon: <MessageSquare className="h-4 w-4" /> },
        { id: "courtesy", label: "Be more courteous", selected: false, icon: <ThumbsUp className="h-4 w-4" /> },
        { id: "cooperation", label: "Follow instructions", selected: false, icon: <MoveHorizontal className="h-4 w-4" /> },
        { id: "preparation", label: "Be better prepared", selected: false, icon: <ShieldCheck className="h-4 w-4" /> },
      ]
  );
  
  // Update category rating
  const updateCategoryRating = (index: number, value: number) => {
    const updatedCategories = [...categories];
    updatedCategories[index].value = value;
    setCategories(updatedCategories);
  };
  
  // Calculate overall rating from categories
  const calculateOverallRating = () => {
    const totalRatings = categories.reduce((sum, category) => sum + category.value, 0);
    const avgRating = totalRatings / categories.length;
    return avgRating > 0 ? Math.round(avgRating) : overallRating;
  };
  
  // Toggle attribute tag selection
  const toggleAttributeTag = (id: string) => {
    setAttributeTags(
      attributeTags.map(tag => 
        tag.id === id ? { ...tag, selected: !tag.selected } : tag
      )
    );
  };
  
  // Toggle improvement area selection
  const toggleImprovementArea = (id: string) => {
    setImprovementAreas(
      improvementAreas.map(area => 
        area.id === id ? { ...area, selected: !area.selected } : area
      )
    );
  };
  
  // Handle form submission
  const handleSubmit = async () => {
    if (overallRating === 0) {
      toast({
        title: "Rating Required",
        description: "Please provide at least an overall rating.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Convert categories to an object for storage
      const categoriesObject = categories.reduce((obj, cat) => {
        if (cat.value > 0) {
          obj[cat.name] = cat.value;
        }
        return obj;
      }, {} as Record<string, number>);
      
      // Get selected attribute tags
      const selectedAttributes = attributeTags
        .filter(tag => tag.selected)
        .map(tag => tag.id);
      
      // Get selected improvement areas
      const selectedImprovements = improvementAreas
        .filter(area => area.selected)
        .map(area => area.id);
      
      // Check if we're in simple mode (just call the onSubmit handler)
      if (isSimpleMode && onSubmit) {
        await onSubmit(overallRating, comment);
        
        // Show success message
        toast({
          title: "Rating Submitted",
          description: "Thank you for rating your driver!",
        });
        
        // Reset form and close dialog
        setOverallRating(0);
        setComment("");
        setDetailedFeedback("");
        setRecommendationScore(0);
        setIsAnonymous(false);
        setCategories(categories.map(cat => ({ ...cat, value: 0 })));
        setAttributeTags(attributeTags.map(tag => ({ ...tag, selected: false })));
        setImprovementAreas(improvementAreas.map(area => ({ ...area, selected: false })));
        setActiveTab("basic");
        onOpenChange(false);
        
        return;
      }
      
      // Otherwise, we're in detailed mode with ride and user objects
      // Prepare rating data
      const ratingData = {
        rideId: ride!.id,
        fromUserId: fromUser!.id,
        toUserId: rateUser!.id,
        rating: overallRating,
        comment: comment.trim() || undefined,
        detailedFeedback: detailedFeedback.trim() || undefined,
        recommendationScore: recommendationScore > 0 ? recommendationScore : undefined,
        categories: categoriesObject,
        attributeTags: selectedAttributes.length > 0 ? selectedAttributes : undefined,
        improvementAreas: selectedImprovements.length > 0 ? selectedImprovements : undefined,
        anonymous: isAnonymous
      };
      
      // Submit rating
      await apiRequest("POST", "/api/ratings", ratingData);
      
      // Show success message
      toast({
        title: "Rating Submitted",
        description: `Thank you for rating your ${isRatingDriver ? "driver" : "rider"}!`,
      });
      
      // Reset form
      setOverallRating(0);
      setComment("");
      setDetailedFeedback("");
      setRecommendationScore(0);
      setIsAnonymous(false);
      setCategories(categories.map(cat => ({ ...cat, value: 0 })));
      setAttributeTags(attributeTags.map(tag => ({ ...tag, selected: false })));
      setImprovementAreas(improvementAreas.map(area => ({ ...area, selected: false })));
      setActiveTab("basic");
      
      // Close dialog
      onOpenChange(false);
      
      // Call completion callback if provided
      if (onRatingComplete) {
        onRatingComplete();
      }
      
      // Invalidate any queries that might depend on this rating
      if (rateUser) {
        queryClient.invalidateQueries({ queryKey: ["/api/users", rateUser.id] });
      }
      if (ride) {
        queryClient.invalidateQueries({ queryKey: ["/api/rides", ride.id] });
        queryClient.invalidateQueries({ queryKey: ["/api/ratings", ride.id] });
      }
      // Also invalidate any achievement queries if we're rating a driver
      if (rateUser?.role === "driver") {
        queryClient.invalidateQueries({ queryKey: [`/api/drivers/${rateUser.id}/achievements`] });
      }
    } catch (error) {
      console.error("Error submitting rating:", error);
      toast({
        title: "Rating Failed",
        description: "There was an error submitting your rating. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Render star rating buttons
  const renderStars = (currentRating: number, onClick: (rating: number) => void) => {
    return (
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map(rating => (
          <button
            key={rating}
            type="button"
            className="focus:outline-none p-1"
            onClick={() => onClick(rating)}
          >
            <Star
              className={`h-8 w-8 ${
                rating <= currentRating 
                  ? "text-yellow-400 fill-yellow-400" 
                  : "text-gray-300"
              }`}
            />
          </button>
        ))}
      </div>
    );
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            Rate Your {isRatingDriver ? "Driver" : "Rider"}
          </DialogTitle>
          <DialogDescription>
            {isSimpleMode 
              ? "Share your experience with this driver to help improve our service."
              : `Share your experience with ${isAnonymous ? "this" : rateUser?.fullName} to help improve our service.`
            }
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Basic Rating</TabsTrigger>
            <TabsTrigger value="detailed">Detailed Feedback</TabsTrigger>
            <TabsTrigger value="attributes">Attributes</TabsTrigger>
          </TabsList>
          
          <TabsContent value="basic" className="py-4 space-y-6">
            {/* Overall Rating */}
            <div className="space-y-2">
              <Label className="text-base">Overall Rating</Label>
              <div className="flex justify-center">
                {renderStars(overallRating, setOverallRating)}
              </div>
            </div>
            
            {/* Category Ratings */}
            <div className="space-y-4">
              <Label className="text-base">Rate Specific Categories</Label>
              {categories.map((category, index) => (
                <div key={category.name} className="space-y-1">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1.5">
                      {category.icon}
                      <Label className="text-sm">{category.label}</Label>
                    </div>
                    <div className="text-sm text-gray-500">
                      {category.value > 0 ? `${category.value} stars` : "Not rated"}
                    </div>
                  </div>
                  <div className="flex justify-start">
                    {renderStars(category.value, (value) => updateCategoryRating(index, value))}
                  </div>
                  {category.description && (
                    <p className="text-xs text-gray-500 mt-1">{category.description}</p>
                  )}
                </div>
              ))}
            </div>
            
            {/* Comments */}
            <div className="space-y-2">
              <Label htmlFor="comment">Comments (Optional)</Label>
              <Textarea
                id="comment"
                placeholder={`Share more details about your experience with this ${isRatingDriver ? "driver" : "rider"}...`}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="resize-none"
                rows={4}
              />
            </div>
          </TabsContent>
          
          <TabsContent value="detailed" className="py-4 space-y-6">
            {/* Recommendation Score */}
            <div className="space-y-2">
              <Label className="text-base">How likely are you to recommend this {isRatingDriver ? "driver" : "rider"}?</Label>
              <div className="py-4">
                <Slider
                  value={[recommendationScore]}
                  min={0}
                  max={10}
                  step={1}
                  onValueChange={(value) => setRecommendationScore(value[0])}
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Not likely</span>
                  <span>Neutral</span>
                  <span>Very likely</span>
                </div>
                <div className="text-center mt-2 font-medium">
                  {recommendationScore} / 10
                </div>
              </div>
            </div>
            
            {/* Detailed Feedback */}
            <div className="space-y-2">
              <Label htmlFor="detailed-feedback">Detailed Feedback</Label>
              <Textarea
                id="detailed-feedback"
                placeholder="Please provide more specific details about your experience..."
                value={detailedFeedback}
                onChange={(e) => setDetailedFeedback(e.target.value)}
                className="resize-none"
                rows={6}
              />
              <p className="text-xs text-gray-500">
                Your detailed feedback helps us improve our service and provide better training to our {isRatingDriver ? "drivers" : "riders"}.
              </p>
            </div>
          </TabsContent>
          
          <TabsContent value="attributes" className="py-4 space-y-6">
            {/* Positive Attributes */}
            <div className="space-y-3">
              <Label className="text-base">What did you like?</Label>
              <p className="text-sm text-gray-500">Select all that apply</p>
              <div className="flex flex-wrap gap-2">
                {attributeTags.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleAttributeTag(tag.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors
                    ${tag.selected 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted hover:bg-muted/80 text-foreground'}`}
                  >
                    {tag.icon}
                    {tag.label}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Areas for Improvement */}
            <div className="space-y-3">
              <Label className="text-base">Areas for improvement</Label>
              <p className="text-sm text-gray-500">Select all that apply</p>
              <div className="flex flex-wrap gap-2">
                {improvementAreas.map((area) => (
                  <button
                    key={area.id}
                    type="button"
                    onClick={() => toggleImprovementArea(area.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors
                    ${area.selected 
                      ? 'bg-orange-100 text-orange-700 border border-orange-300' 
                      : 'bg-muted hover:bg-muted/80 text-foreground'}`}
                  >
                    {area.icon}
                    {area.label}
                  </button>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        {/* Anonymous Option - Always visible */}
        <div className="flex items-center space-x-2 pt-2">
          <Checkbox 
            id="anonymous" 
            checked={isAnonymous}
            onCheckedChange={(checked) => setIsAnonymous(checked === true)}
          />
          <Label htmlFor="anonymous" className="text-sm font-normal">
            Submit rating anonymously
          </Label>
        </div>
        
        <DialogFooter className="flex-col sm:flex-row-reverse sm:justify-between gap-2 pt-4">
          <Button 
            onClick={handleSubmit}
            disabled={isSubmitting || overallRating === 0}
            className="w-full sm:w-auto"
          >
            {isSubmitting ? "Submitting..." : "Submit Rating"}
          </Button>
          
          <DialogClose asChild>
            <Button 
              variant="outline" 
              className="w-full sm:w-auto"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}