import React, { useEffect, useState } from 'react';
import { useOnboarding } from '@/context/onboarding-context';
import { useAuth } from '@/hooks/use-auth';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'wouter';
import { 
  User, 
  CreditCard, 
  MapPin, 
  Bell, 
  FileText, 
  Phone, 
  CheckCircle,
  ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

type ProfileItem = {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  completed: boolean;
  path: string;
};

export const ProfileCompletion: React.FC = () => {
  const { user } = useAuth();
  const { onboardingState, completeProfile } = useOnboarding();
  const [progress, setProgress] = useState(0);
  const navigate = useNavigate();
  
  if (!user) return null;
  
  // Check completion status of profile items
  const profileItems: ProfileItem[] = [
    {
      id: 'personal-info',
      title: 'Personal Information',
      description: 'Complete your basic profile details',
      icon: <User className="h-5 w-5" />,
      completed: !!user.fullName && !!user.email && !!user.phone,
      path: '/profile/edit',
    },
    {
      id: 'payment-method',
      title: 'Payment Method',
      description: 'Add a payment method for rides',
      icon: <CreditCard className="h-5 w-5" />,
      completed: user.hasPaymentMethod || false,
      path: '/payments/methods',
    },
    {
      id: 'addresses',
      title: 'Saved Addresses',
      description: 'Add your frequently visited locations',
      icon: <MapPin className="h-5 w-5" />,
      completed: user.hasSavedAddresses || false,
      path: '/addresses',
    },
    {
      id: 'medical-info',
      title: 'Medical Information',
      description: 'Add any relevant medical details',
      icon: <FileText className="h-5 w-5" />,
      completed: false, // TODO: Add proper check
      path: '/profile/medical',
    },
    {
      id: 'emergency-contact',
      title: 'Emergency Contact',
      description: 'Add someone we can contact if needed',
      icon: <Phone className="h-5 w-5" />,
      completed: false, // TODO: Add proper check
      path: '/profile/emergency-contact',
    },
    {
      id: 'notification-preferences',
      title: 'Notification Preferences',
      description: 'Set how you want to be notified',
      icon: <Bell className="h-5 w-5" />,
      completed: false, // TODO: Add proper check
      path: '/settings/notifications',
    },
  ];
  
  // Calculate completion percentage
  useEffect(() => {
    const completedItems = profileItems.filter(item => item.completed).length;
    const completionPercentage = Math.round((completedItems / profileItems.length) * 100);
    setProgress(completionPercentage);
    
    // Mark profile as completed if all items are done
    if (completionPercentage === 100 && !onboardingState.hasCompletedProfile) {
      completeProfile();
    }
  }, [profileItems, completeProfile, onboardingState.hasCompletedProfile]);
  
  // Navigate to the next incomplete item
  const handleContinue = () => {
    const nextIncompleteItem = profileItems.find(item => !item.completed);
    if (nextIncompleteItem) {
      navigate(nextIncompleteItem.path);
    }
  };
  
  return (
    <Card className="w-full max-w-3xl mx-auto shadow-md">
      <CardHeader>
        <CardTitle className="text-xl flex items-center">
          <User className="mr-2 h-6 w-6 text-primary" />
          Complete Your Profile
        </CardTitle>
        <CardDescription>
          Enhance your experience by completing your profile. This helps us provide better service.
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="mb-6">
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium">Profile Completion</span>
            <span className="text-sm font-medium">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
        
        <div className="grid gap-4 md:grid-cols-2">
          {profileItems.map((item) => (
            <div 
              key={item.id}
              className={`
                p-4 rounded-lg border transition-all cursor-pointer
                ${item.completed ? 'bg-primary/5 border-primary/20' : 'hover:border-primary/30'}
              `}
              onClick={() => navigate(item.path)}
            >
              <div className="flex items-start">
                <div className={`rounded-full p-2 mr-3 ${item.completed ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                  {item.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">{item.title}</h3>
                    {item.completed ? (
                      <CheckCircle className="h-5 w-5 text-primary" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => navigate('/')}
        >
          Skip for Now
        </Button>
        
        <Button
          onClick={handleContinue}
          disabled={progress === 100}
        >
          {progress === 100 ? 'Profile Complete' : 'Continue Setup'}
        </Button>
      </CardFooter>
    </Card>
  );
};