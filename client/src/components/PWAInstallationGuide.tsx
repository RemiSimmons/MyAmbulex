import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, X, Smartphone, Download, Home, Zap } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

// PWA Installation Screenshots
const PWAStep1 = "/MyAmbulexPWA1_1755218548138.jpeg";
const PWAStep2 = "/MyAmbulexPWA2_1755218548140.jpeg";
const PWAStep3 = "/MyAmbulexPWA3_1755218548140.jpeg";
const PWAStep4 = "/MyAmbulexPWA4_1755218548140.jpeg";

interface InstallationStep {
  id: number;
  title: string;
  description: string;
  image: string;
  touchpoint: {
    x: number; // Percentage from left
    y: number; // Percentage from top
    label: string;
  };
  platform?: 'iOS' | 'Android' | 'Both';
}

const installationSteps: InstallationStep[] = [
  {
    id: 1,
    title: "Open MyAmbulex in Browser",
    description: "Visit the MyAmbulex website in Safari (iOS) or Chrome (Android)",
    image: PWAStep1,
    touchpoint: { x: 50, y: 8, label: "Web Address" },
    platform: 'Both'
  },
  {
    id: 2,
    title: "Find the Install Option",
    description: "Look for the share button (iOS) or install prompt (Android)",
    image: PWAStep2,
    touchpoint: { x: 88, y: 12, label: "Share/Install" },
    platform: 'Both'
  },
  {
    id: 3,
    title: "Add to Home Screen",
    description: "Select 'Add to Home Screen' from the available options",
    image: PWAStep3,
    touchpoint: { x: 50, y: 65, label: "Add to Home Screen" },
    platform: 'Both'
  },
  {
    id: 4,
    title: "Open the Installed App",
    description: "Tap the MyAmbulex icon on your home screen to launch the app",
    image: PWAStep4,
    touchpoint: { x: 50, y: 85, label: "MyAmbulex App" },
    platform: 'Both'
  }
];

interface PWAInstallationGuideProps {
  triggerButton?: React.ReactNode;
  showInline?: boolean;
}

export default function PWAInstallationGuide({ 
  triggerButton, 
  showInline = false 
}: PWAInstallationGuideProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [showTouchpoints, setShowTouchpoints] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const nextStep = () => {
    setCurrentStep((prev) => (prev + 1) % installationSteps.length);
  };

  const prevStep = () => {
    setCurrentStep((prev) => (prev - 1 + installationSteps.length) % installationSteps.length);
  };

  const goToStep = (stepIndex: number) => {
    setCurrentStep(stepIndex);
  };

  const currentStepData = installationSteps[currentStep];

  const SlideShowContent = () => (
    <div className="w-full max-w-4xl mx-auto">
      {/* Progress Indicator */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex space-x-2">
          {installationSteps.map((_, index) => (
            <button
              key={index}
              onClick={() => goToStep(index)}
              className={`w-3 h-3 rounded-full transition-colors ${
                index === currentStep 
                  ? 'bg-blue-600' 
                  : index < currentStep 
                    ? 'bg-green-500' 
                    : 'bg-gray-300'
              }`}
              aria-label={`Go to step ${index + 1}`}
            />
          ))}
        </div>
        <Badge variant="outline" className="ml-4">
          Step {currentStep + 1} of {installationSteps.length}
        </Badge>
      </div>

      {/* Main Content */}
      <Card className="relative overflow-hidden">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            {currentStep === 0 && <Smartphone className="w-5 h-5" />}
            {currentStep === 1 && <Download className="w-5 h-5" />}
            {currentStep === 2 && <Home className="w-5 h-5" />}
            {currentStep === 3 && <Zap className="w-5 h-5" />}
            {currentStepData.title}
          </CardTitle>
          <p className="text-muted-foreground">
            {currentStepData.description}
          </p>
          {currentStepData.platform && currentStepData.platform !== 'Both' && (
            <Badge variant="secondary" className="w-fit mx-auto">
              {currentStepData.platform}
            </Badge>
          )}
        </CardHeader>
        
        <CardContent>
          {/* Screenshot with Touchpoint */}
          <div className="relative mx-auto bg-white rounded-lg shadow-lg overflow-hidden" style={{ maxWidth: '320px', minHeight: '480px' }}>
            {!imageError ? (
              <img 
                src={currentStepData.image} 
                alt={currentStepData.title}
                className="w-full h-auto object-contain"
                onError={(e) => {
                  console.error('Image failed to load:', currentStepData.image);
                  setImageError(true);
                }}
                onLoad={() => {
                  console.log('Image loaded successfully:', currentStepData.image);
                  setImageError(false);
                }}
              />
            ) : (
              <div className="w-full h-96 flex items-center justify-center bg-gray-100 text-gray-500">
                <div className="text-center">
                  <Smartphone className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Screenshot loading...</p>
                  <p className="text-xs opacity-75">{currentStepData.title}</p>
                </div>
              </div>
            )}
            
            {/* Animated Touchpoint Indicator */}
            {showTouchpoints && currentStepData.touchpoint && (
              <div 
                className="absolute z-10"
                style={{
                  left: `${currentStepData.touchpoint.x}%`,
                  top: `${currentStepData.touchpoint.y}%`,
                  transform: 'translate(-50%, -50%)'
                }}
              >
                <div className="relative flex items-center justify-center">
                  {/* Outer pulsing ring */}
                  <div className="absolute w-16 h-16 bg-red-400 rounded-full animate-ping opacity-40"></div>
                  {/* Middle ring */}
                  <div className="absolute w-10 h-10 bg-red-500 rounded-full animate-pulse opacity-70"></div>
                  {/* Inner dot */}
                  <div className="relative w-4 h-4 bg-red-600 rounded-full shadow-lg border-2 border-white"></div>
                  
                  {/* Label with pointer */}
                  <div className="absolute top-8 left-1/2 transform -translate-x-1/2 z-20">
                    <div className="bg-gray-900 text-white text-xs font-medium px-3 py-1.5 rounded-lg shadow-xl whitespace-nowrap">
                      {currentStepData.touchpoint.label}
                      {/* Arrow pointing up */}
                      <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between mt-6">
            <Button 
              variant="outline" 
              onClick={prevStep}
              disabled={currentStep === 0}
              className="flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>

            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowTouchpoints(!showTouchpoints)}
                className="text-sm"
              >
                {showTouchpoints ? 'Hide' : 'Show'} Highlights
              </Button>
            </div>

            <Button 
              onClick={nextStep}
              disabled={currentStep === installationSteps.length - 1}
              className="flex items-center gap-2"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Completion Message */}
          {currentStep === installationSteps.length - 1 && (
            <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 text-green-800">
                <Zap className="w-5 h-5" />
                <span className="font-medium">Installation Complete!</span>
              </div>
              <p className="text-green-700 text-sm mt-1">
                MyAmbulex is now installed on your device. Enjoy the full app experience!
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  if (showInline) {
    return <SlideShowContent />;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {triggerButton || (
          <Button variant="outline" className="flex items-center gap-2">
            <Smartphone className="w-4 h-4" />
            How to Install App
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Install MyAmbulex as an App
          </DialogTitle>
          <DialogDescription>
            Follow these simple steps to install MyAmbulex on your device for the best experience.
          </DialogDescription>
        </DialogHeader>
        <SlideShowContent />
      </DialogContent>
    </Dialog>
  );
}

// Export individual components for flexibility
export { PWAInstallationGuide };

// Compact version for banners/notifications
export function PWAInstallBanner() {
  return (
    <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Smartphone className="w-5 h-5 text-blue-600 mr-2" />
          <div>
            <p className="text-sm font-medium text-blue-800">
              Install MyAmbulex for the best experience
            </p>
            <p className="text-xs text-blue-600">
              Get faster access and offline capabilities
            </p>
          </div>
        </div>
        <PWAInstallationGuide 
          triggerButton={
            <Button size="sm" variant="outline" className="text-blue-600 border-blue-600">
              Learn How
            </Button>
          } 
        />
      </div>
    </div>
  );
}