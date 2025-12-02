import { useState, useEffect } from 'react';
import { X, ArrowDown, ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { QRInstallCode } from './QRInstallCode';

export function SimpleInstallGuide() {
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [deviceType, setDeviceType] = useState<'ios' | 'android' | 'desktop'>('ios');

  useEffect(() => {
    // Detect device type
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
      setDeviceType('ios');
    } else if (userAgent.includes('android')) {
      setDeviceType('android');
    } else {
      setDeviceType('desktop');
    }
  }, []);

  const showGuide = () => {
    setIsVisible(true);
    setCurrentStep(0);
  };

  const nextStep = () => {
    const maxSteps = deviceType === 'ios' ? 3 : deviceType === 'android' ? 3 : 2;
    if (currentStep < maxSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      setIsVisible(false);
      setCurrentStep(0);
    }
  };

  const iosSteps = [
    {
      title: "Step 1: Find the Share Button",
      description: "Look at the bottom of your Safari browser for the square with arrow",
      visual: (
        <div className="bg-gray-100 p-4 rounded-lg text-center">
          <div className="bg-blue-500 text-white px-3 py-1 rounded mb-2">Safari Bottom Bar</div>
          <div className="flex justify-center space-x-3">
            <div className="w-10 h-10 bg-gray-300 rounded flex items-center justify-center text-lg">←</div>
            <div className="w-10 h-10 bg-gray-300 rounded flex items-center justify-center text-lg">→</div>
            <div className="w-10 h-10 bg-red-500 text-white rounded flex items-center justify-center animate-pulse border-2 border-red-600">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="w-10 h-10 bg-gray-300 rounded flex items-center justify-center text-lg">📖</div>
            <div className="w-10 h-10 bg-gray-300 rounded flex items-center justify-center text-lg">⭐</div>
          </div>
          <ArrowUp className="w-6 h-6 text-red-500 mx-auto mt-2 animate-bounce" />
          <p className="text-sm font-bold text-red-500 mt-1">TAP THE SQUARE WITH ARROW</p>
        </div>
      )
    },
    {
      title: "Step 2: Find 'Add to Home Screen'",
      description: "Scroll down in the share menu until you see this option",
      visual: (
        <div className="bg-gray-100 p-4 rounded-lg">
          <div className="bg-white rounded-lg p-3 shadow-md">
            <div className="space-y-2">
              <div className="flex items-center space-x-3 p-2">
                <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center text-white text-xs">💬</div>
                <span className="text-sm">Messages</span>
              </div>
              <div className="flex items-center space-x-3 p-2">
                <div className="w-8 h-8 bg-green-500 rounded flex items-center justify-center text-white text-xs">📧</div>
                <span className="text-sm">Mail</span>
              </div>
              <div className="flex items-center space-x-3 p-2">
                <div className="w-8 h-8 bg-gray-400 rounded flex items-center justify-center text-white text-xs">📋</div>
                <span className="text-sm">Copy</span>
              </div>
              <div className="flex items-center space-x-3 p-2 bg-red-100 rounded animate-pulse border-2 border-red-500">
                <div className="w-8 h-8 bg-red-500 rounded flex items-center justify-center text-white">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/>
                  </svg>
                </div>
                <span className="text-sm font-bold">Add to Home Screen</span>
              </div>
            </div>
          </div>
          <ArrowUp className="w-6 h-6 text-red-500 mx-auto mt-2 animate-bounce" />
          <p className="text-sm font-bold text-red-500 text-center mt-1">TAP THIS OPTION</p>
        </div>
      )
    },
    {
      title: "Step 3: Tap 'Add'",
      description: "Confirm by tapping the Add button in the top right",
      visual: (
        <div className="bg-gray-100 p-4 rounded-lg">
          <div className="bg-white rounded-lg p-4 shadow-md">
            <div className="flex justify-between items-center mb-4">
              <button className="text-blue-500">Cancel</button>
              <button className="bg-red-500 text-white px-4 py-1 rounded animate-pulse font-bold">
                Add
              </button>
            </div>
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xs">MY</span>
              </div>
              <div>
                <p className="font-semibold">MyAmbulex</p>
                <p className="text-gray-500 text-sm">myambulex.com</p>
              </div>
            </div>
          </div>
          <ArrowUp className="w-6 h-6 text-red-500 mx-auto mt-2 animate-bounce" />
          <p className="text-sm font-bold text-red-500 text-center mt-1">TAP ADD</p>
        </div>
      )
    },
    {
      title: "Done! App Installed",
      description: "MyAmbulex is now on your home screen like a regular app!",
      visual: (
        <div className="bg-gradient-to-br from-green-100 to-blue-100 p-6 rounded-lg text-center">
          <div className="w-16 h-16 bg-purple-500 rounded-lg flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-lg">MY</span>
          </div>
          <p className="text-lg font-bold text-green-700">Success!</p>
          <p className="text-sm text-gray-700 mt-2">
            Find the MyAmbulex app on your home screen and tap it to open
          </p>
        </div>
      )
    }
  ];

  const androidSteps = [
    {
      title: "Step 1: Find the Menu",
      description: "Look for three dots in the top right of Chrome",
      visual: (
        <div className="bg-gray-100 p-4 rounded-lg text-center">
          <div className="bg-white p-3 rounded shadow-md">
            <div className="flex justify-between items-center">
              <span className="text-sm">myambulex.com</span>
              <div className="w-8 h-8 bg-red-500 rounded flex items-center justify-center text-white animate-pulse">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/>
                </svg>
              </div>
            </div>
          </div>
          <ArrowUp className="w-6 h-6 text-red-500 mx-auto mt-2 animate-bounce" />
          <p className="text-sm font-bold text-red-500 mt-1">TAP THE THREE DOTS</p>
        </div>
      )
    },
    {
      title: "Step 2: Find 'Add to Home screen'",
      description: "Look for this option in the menu",
      visual: (
        <div className="bg-gray-100 p-4 rounded-lg">
          <div className="bg-white rounded-lg p-3 shadow-md">
            <div className="space-y-2">
              <div className="p-2 text-sm flex items-center">
                <span className="w-6 h-6 mr-3">📄</span>
                New tab
              </div>
              <div className="p-2 text-sm flex items-center">
                <span className="w-6 h-6 mr-3">⭐</span>
                Bookmarks
              </div>
              <div className="p-2 text-sm flex items-center">
                <span className="w-6 h-6 mr-3">📚</span>
                History
              </div>
              <div className="p-2 bg-red-100 rounded animate-pulse border-2 border-red-500 flex items-center">
                <div className="w-6 h-6 mr-3 bg-red-500 rounded flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/>
                  </svg>
                </div>
                <span className="text-sm font-bold">Add to Home screen</span>
              </div>
              <div className="p-2 text-sm flex items-center">
                <span className="w-6 h-6 mr-3">⚙️</span>
                Settings
              </div>
            </div>
          </div>
          <ArrowUp className="w-6 h-6 text-red-500 mx-auto mt-2 animate-bounce" />
          <p className="text-sm font-bold text-red-500 text-center mt-1">TAP THIS OPTION</p>
        </div>
      )
    },
    {
      title: "Step 3: Confirm 'Add'",
      description: "Tap the Add button to install",
      visual: (
        <div className="bg-gray-100 p-4 rounded-lg">
          <div className="bg-white rounded-lg p-4 shadow-md">
            <p className="text-center font-semibold mb-4">Add to Home screen?</p>
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xs">MY</span>
              </div>
              <div>
                <p className="font-semibold">MyAmbulex</p>
              </div>
            </div>
            <div className="flex space-x-4 justify-end">
              <button className="px-4 py-2 text-gray-600">Cancel</button>
              <button className="px-4 py-2 bg-red-500 text-white rounded animate-pulse font-bold">
                Add
              </button>
            </div>
          </div>
          <ArrowUp className="w-6 h-6 text-red-500 mx-auto mt-2 animate-bounce" />
          <p className="text-sm font-bold text-red-500 text-center mt-1">TAP ADD</p>
        </div>
      )
    },
    {
      title: "Done! App Installed",
      description: "MyAmbulex is now on your home screen!",
      visual: (
        <div className="bg-gradient-to-br from-green-100 to-blue-100 p-6 rounded-lg text-center">
          <div className="w-16 h-16 bg-purple-500 rounded-lg flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-lg">MY</span>
          </div>
          <p className="text-lg font-bold text-green-700">Success!</p>
          <p className="text-sm text-gray-700 mt-2">
            Find the MyAmbulex app on your home screen
          </p>
        </div>
      )
    }
  ];

  const currentSteps = deviceType === 'ios' ? iosSteps : androidSteps;

  if (!isVisible) {
    return (
      <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 p-6 rounded-xl border-2 border-purple-200">
        <div className="text-center">
          <div className="w-20 h-20 bg-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">MY</span>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Get MyAmbulex App
          </h3>
          <p className="text-gray-600 mb-4">
            Install MyAmbulex on your phone for the best experience
          </p>
          <Button 
            onClick={showGuide}
            className="bg-purple-500 hover:bg-purple-600 text-white px-8 py-3 text-lg rounded-lg font-semibold mb-6"
          >
            Show Me How (30 seconds)
          </Button>
          
          {/* QR Code Section */}
          <QRInstallCode />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-bold">Install MyAmbulex</h3>
              <p className="text-sm text-gray-500">
                Step {currentStep + 1} of {currentSteps.length}
              </p>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setIsVisible(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="mb-6">
            <h4 className="font-semibold text-lg mb-2">
              {currentSteps[currentStep].title}
            </h4>
            <p className="text-gray-600 mb-4">
              {currentSteps[currentStep].description}
            </p>
            {currentSteps[currentStep].visual}
          </div>

          <div className="flex justify-between items-center">
            <div className="flex space-x-1">
              {currentSteps.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full ${
                    index <= currentStep ? 'bg-purple-500' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
            <Button 
              onClick={nextStep}
              className="bg-purple-500 hover:bg-purple-600 text-white px-6"
            >
              {currentStep === currentSteps.length - 1 ? 'Done' : 'Next'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}