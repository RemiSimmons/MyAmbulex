import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, AlertCircle } from "lucide-react";

export default function BetaTestSignup() {
  const [location] = useLocation();
  const [betaCode, setBetaCode] = useState<string | null>(null);
  const [userAgent, setUserAgent] = useState<string>("");
  const [currentUrl, setCurrentUrl] = useState<string>("");

  useEffect(() => {
    // Parse beta code from URL
    const params = new URLSearchParams(location.split("?")[1]);
    const code = params.get("beta");
    setBetaCode(code);
    
    // Get browser info
    setUserAgent(navigator.userAgent);
    setCurrentUrl(window.location.href);
    
    console.log("Beta Test Page - URL Parameters:", {
      fullUrl: window.location.href,
      betaCode: code,
      location: location,
      params: Object.fromEntries(params.entries())
    });
  }, [location]);

  const testRegistration = async () => {
    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'betatest123',
          password: 'testpass123',
          fullName: 'Beta Test User',
          email: 'betatest@example.com',
          phone: '5555551234',
          role: 'rider',
          betaInviteCode: betaCode
        })
      });
      
      const result = await response.json();
      console.log('Registration test result:', result);
      
      if (response.ok) {
        alert('Registration test successful!');
      } else {
        alert(`Registration test failed: ${result.message}`);
      }
    } catch (error) {
      console.error('Registration test error:', error);
      alert(`Registration test error: ${error}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Beta Signup Flow Test</CardTitle>
          <CardDescription>
            Testing the beta invitation signup process
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Current URL</Label>
            <Input value={currentUrl} readOnly className="text-xs" />
          </div>
          
          <div className="space-y-2">
            <Label>Beta Code from URL</Label>
            <div className="flex items-center gap-2">
              <Input value={betaCode || "Not detected"} readOnly />
              {betaCode ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-500" />
              )}
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Browser</Label>
            <Input value={userAgent.slice(0, 50) + "..."} readOnly className="text-xs" />
          </div>
          
          {betaCode && (
            <div className="bg-green-50 border border-green-200 rounded-md p-3">
              <p className="text-sm text-green-800 font-medium">
                ✅ Beta code detected successfully!
              </p>
              <p className="text-xs text-green-600">
                Code: {betaCode}
              </p>
            </div>
          )}
          
          {!betaCode && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-800 font-medium">
                ❌ No beta code detected
              </p>
              <p className="text-xs text-red-600">
                Expected URL format: /beta-test-signup?beta=XXXX
              </p>
            </div>
          )}
          
          <Button 
            onClick={testRegistration} 
            className="w-full"
            disabled={!betaCode}
          >
            Test Registration Flow
          </Button>
          
          <div className="text-xs text-gray-500 space-y-1">
            <p><strong>Debug Info:</strong></p>
            <p>Location: {location}</p>
            <p>Has beta param: {betaCode ? 'Yes' : 'No'}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}