import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertTriangle, Mail, ArrowRight } from 'lucide-react';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

export default function EmailVerificationPage() {
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error' | 'expired'>('verifying');
  const [message, setMessage] = useState('');
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    verifyEmail();
  }, []);

  const verifyEmail = async () => {
    try {
      // Get token from URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');

      if (!token) {
        setStatus('error');
        setMessage('Verification token is missing from the URL.');
        return;
      }

      const response = await apiRequest('POST', '/api/auth/verify-email', { token });
      const data = await response.json();

      if (response.ok && data.success) {
        setStatus('success');
        setMessage(data.message || 'Your email has been successfully verified!');
        
        toast({
          title: "Email Verified",
          description: "Your email has been successfully verified. You can now access all features.",
        });

        // Redirect to dashboard after 3 seconds
        setTimeout(() => {
          setLocation('/dashboard');
        }, 3000);
      } else {
        setStatus(data.expired ? 'expired' : 'error');
        setMessage(data.message || 'Email verification failed. Please try again.');
      }
    } catch (error) {
      console.error('Email verification error:', error);
      setStatus('error');
      setMessage('An error occurred during verification. Please try again.');
    }
  };

  const resendVerification = async () => {
    try {
      setIsResending(true);
      
      const response = await apiRequest('POST', '/api/auth/resend-verification');
      const data = await response.json();

      if (response.ok && data.success) {
        toast({
          title: "Verification Email Sent",
          description: "A new verification email has been sent to your address.",
        });
        setMessage('A new verification email has been sent. Please check your inbox.');
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to resend verification email.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to resend verification email.",
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };

  const goToDashboard = () => {
    setLocation('/dashboard');
  };

  const goToLogin = () => {
    setLocation('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">MyAmbulex</h1>
          <h2 className="text-xl font-semibold text-gray-700">Email Verification</h2>
        </div>

        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              {status === 'verifying' && (
                <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full" />
              )}
              {status === 'success' && (
                <CheckCircle className="w-12 h-12 text-green-600" />
              )}
              {(status === 'error' || status === 'expired') && (
                <AlertTriangle className="w-12 h-12 text-red-600" />
              )}
            </div>
            
            <CardTitle>
              {status === 'verifying' && 'Verifying Your Email...'}
              {status === 'success' && 'Email Verified Successfully!'}
              {status === 'error' && 'Verification Failed'}
              {status === 'expired' && 'Verification Link Expired'}
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <Alert variant={status === 'success' ? 'default' : 'destructive'}>
              <Mail className="h-4 w-4" />
              <AlertDescription>{message}</AlertDescription>
            </Alert>

            {status === 'success' && (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 text-green-700">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">What's Next?</span>
                  </div>
                  <ul className="mt-2 text-sm text-green-600 space-y-1">
                    <li>• Access your full dashboard</li>
                    <li>• Start booking rides or accept ride requests</li>
                    <li>• Complete your profile setup</li>
                    <li>• Enjoy all MyAmbulex features</li>
                  </ul>
                </div>
                
                <Button className="w-full" onClick={goToDashboard}>
                  Go to Dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}

            {status === 'expired' && (
              <div className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-700">
                    Your verification link has expired. Click below to receive a new verification email.
                  </p>
                </div>
                
                <Button 
                  className="w-full" 
                  onClick={resendVerification}
                  disabled={isResending}
                >
                  {isResending ? 'Sending...' : 'Send New Verification Email'}
                </Button>
              </div>
            )}

            {status === 'error' && (
              <div className="space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-700">
                    If you continue to experience issues, please contact our support team for assistance.
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    variant="outline" 
                    onClick={resendVerification}
                    disabled={isResending}
                  >
                    {isResending ? 'Sending...' : 'Resend Email'}
                  </Button>
                  <Button onClick={goToLogin}>
                    Back to Login
                  </Button>
                </div>
              </div>
            )}

            {status === 'verifying' && (
              <div className="text-center">
                <p className="text-sm text-gray-600">
                  Please wait while we verify your email address...
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="text-center text-sm text-gray-600">
          <p>
            Need help?{' '}
            <a href="mailto:support@myambulex.com" className="text-blue-600 hover:text-blue-500">
              Contact Support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}