import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Award, Calendar, Star, Shield, Truck } from "lucide-react";

// Type definitions for achievements
type Achievement = {
  id: number;
  driverId: number;
  achievementType: string;
  title: string;
  description: string;
  rewardPoints: number;
  iconUrl?: string;
  dateAwarded: string;
  isActive: boolean;
};

type AchievementCategory = {
  title: string;
  icon: React.ReactNode;
  filter: (a: Achievement) => boolean;
};

// Component for displaying driver achievements
export function DriverAchievements({ driverId }: { driverId?: number }) {
  const { user } = useAuth();
  const effectiveDrivingId = driverId || (user?.role === 'driver' ? user?.id : undefined);
  const [activeTab, setActiveTab] = useState<string>("all");
  
  // Categories for filtering achievements
  const categories: AchievementCategory[] = [
    {
      title: "All",
      icon: <Award className="h-4 w-4" />,
      filter: () => true
    },
    {
      title: "Rating",
      icon: <Star className="h-4 w-4" />,
      filter: (a) => a.achievementType.includes("rating")
    },
    {
      title: "Milestones",
      icon: <Calendar className="h-4 w-4" />,
      filter: (a) => a.achievementType.includes("ride_count") || a.achievementType.includes("milestone")
    },
    {
      title: "Safety",
      icon: <Shield className="h-4 w-4" />,
      filter: (a) => a.achievementType.includes("safety")
    },
    {
      title: "Service",
      icon: <Truck className="h-4 w-4" />,
      filter: (a) => a.achievementType.includes("service")
    }
  ];
  
  // Query for fetching driver achievements
  const { data: achievements, isLoading, error } = useQuery({
    queryKey: [`/api/drivers/${effectiveDrivingId}/achievements`],
    queryFn: getQueryFn(),
    enabled: !!effectiveDrivingId
  });
  
  // Function to render achievement cards
  const renderAchievements = (achievements: Achievement[]) => {
    if (achievements.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <Award className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-800">No achievements yet</h3>
          <p className="text-gray-500 max-w-xs">
            Continue providing great service to earn achievements and rewards
          </p>
        </div>
      );
    }
    
    return (
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {achievements.map((achievement) => (
          <Card key={achievement.id} className="overflow-hidden">
            <div className="h-2 bg-primary" />
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  {achievement.iconUrl ? (
                    <img src={achievement.iconUrl} alt="" className="h-6 w-6" />
                  ) : (
                    <Award className="h-6 w-6 text-primary" />
                  )}
                  <CardTitle className="text-base">{achievement.title}</CardTitle>
                </div>
                <Badge variant="outline" className="font-normal">
                  {achievement.rewardPoints} pts
                </Badge>
              </div>
              <CardDescription className="text-sm">
                {achievement.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-xs text-gray-500 flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Awarded: {new Date(achievement.dateAwarded).toLocaleDateString()}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };
  
  // Handle loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-10 w-20" />
          ))}
        </div>
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      </div>
    );
  }
  
  // Handle error state
  if (error || !achievements) {
    return (
      <div className="text-center py-10">
        <p className="text-red-500">
          Error loading achievements. Please try again later.
        </p>
      </div>
    );
  }
  
  // If no driver ID available
  if (!effectiveDrivingId) {
    return (
      <div className="text-center py-10">
        <p>No driver selected. Please provide a driver ID or login as a driver.</p>
      </div>
    );
  }
  
  return (
    <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Achievements & Recognitions</h2>
        <div className="flex items-center">
          <span className="mr-2 text-sm font-medium">Total Points: </span>
          <Badge variant="secondary" className="font-semibold">
            {achievements.reduce((total, a) => total + a.rewardPoints, 0)}
          </Badge>
        </div>
      </div>
      
      <TabsList className="grid w-full grid-cols-5">
        {categories.map((category) => (
          <TabsTrigger key={category.title.toLowerCase()} value={category.title.toLowerCase()} className="flex gap-1 items-center">
            {category.icon}
            <span className="hidden sm:inline">{category.title}</span>
          </TabsTrigger>
        ))}
      </TabsList>
      
      {categories.map((category) => (
        <TabsContent key={category.title.toLowerCase()} value={category.title.toLowerCase()}>
          {renderAchievements(achievements.filter(category.filter))}
        </TabsContent>
      ))}
    </Tabs>
  );
}