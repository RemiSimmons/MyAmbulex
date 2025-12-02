import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import PWAInstallationGuide from '@/components/PWAInstallationGuide';
import PWAInstallBanner from '@/components/PWAInstallBanner';
import { 
  Smartphone, 
  Download, 
  CheckCircle, 
  Star, 
  Zap, 
  Wifi, 
  Bell, 
  Home 
} from 'lucide-react';

export default function PWAInstallationDemo() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50 py-8">
      <div className="max-w-4xl mx-auto px-4 space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-600 rounded-full mb-4 shadow-lg">
            <Smartphone className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900">
            Install MyAmbulex App
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Get the full app experience with our Progressive Web App. 
            Follow our step-by-step guide to install MyAmbulex on your device.
          </p>
        </div>

        {/* Installation Banner Demo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Smart Installation Banner
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              This banner automatically appears when users visit MyAmbulex on a supported device:
            </p>
            <PWAInstallBanner />
          </CardContent>
        </Card>

        {/* Benefits Section */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" />
                App Benefits
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span>Faster loading times</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span>Works offline</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span>Push notifications</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span>Home screen shortcut</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span>Full-screen experience</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-green-600" />
                Device Support
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Badge variant="outline" className="mr-2 mb-2 border-green-200 text-green-700">
                iOS Safari
              </Badge>
              <Badge variant="outline" className="mr-2 mb-2 border-green-200 text-green-700">
                Android Chrome
              </Badge>
              <Badge variant="outline" className="mr-2 mb-2 border-green-200 text-green-700">
                Desktop Chrome
              </Badge>
              <Badge variant="outline" className="mr-2 mb-2 border-green-200 text-green-700">
                Desktop Edge
              </Badge>
              <p className="text-sm text-gray-600 mt-3">
                The installation process varies slightly by device and browser, 
                but our guide covers all major platforms.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Installation Guide */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="w-5 h-5" />
              Installation Guide
            </CardTitle>
            <p className="text-sm text-gray-600">
              Interactive slideshow with highlighted touchpoints
            </p>
          </CardHeader>
          <CardContent>
            <PWAInstallationGuide showInline={true} />
          </CardContent>
        </Card>

        {/* Alternative Access Methods */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="w-5 h-5" />
              Where to Find the Guide
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-white rounded-lg shadow-sm border border-gray-200">
                <Smartphone className="w-8 h-8 mx-auto mb-2 text-green-600" />
                <h3 className="font-medium">Installation Banner</h3>
                <p className="text-sm text-gray-600">
                  Appears automatically on first visit
                </p>
              </div>
              <div className="text-center p-4 bg-white rounded-lg shadow-sm border border-gray-200">
                <Home className="w-8 h-8 mx-auto mb-2 text-green-600" />
                <h3 className="font-medium">Home Page</h3>
                <p className="text-sm text-gray-600">
                  Accessible from main navigation
                </p>
              </div>
              <div className="text-center p-4 bg-white rounded-lg shadow-sm border border-gray-200">
                <Wifi className="w-8 h-8 mx-auto mb-2 text-green-600" />
                <h3 className="font-medium">Settings Page</h3>
                <p className="text-sm text-gray-600">
                  Under app preferences
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Try It Out Section */}
        <Card className="bg-gradient-to-r from-green-600 to-emerald-600 text-white border-0 shadow-xl">
          <CardContent className="text-center py-8">
            <h2 className="text-2xl font-bold mb-4">
              Ready to Install MyAmbulex?
            </h2>
            <p className="mb-6 opacity-90">
              Get started with the full app experience today
            </p>
            <PWAInstallationGuide 
              triggerButton={
                <Button size="lg" variant="secondary" className="bg-white text-green-600 hover:bg-gray-100 shadow-md">
                  <Download className="w-5 h-5 mr-2" />
                  View Installation Guide
                </Button>
              } 
            />
          </CardContent>
        </Card>

      </div>
    </div>
  );
}