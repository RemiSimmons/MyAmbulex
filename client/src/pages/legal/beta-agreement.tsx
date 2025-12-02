import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, FileCheck, AlertTriangle } from 'lucide-react';
import { Link } from 'wouter';
import { useToast } from '@/hooks/use-toast';

export default function BetaAgreement() {
  const [agreed, setAgreed] = useState(false);
  const [signature, setSignature] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!agreed || !signature.trim()) {
      toast({
        title: 'Agreement Required',
        description: 'Please read and agree to the terms, and provide your electronic signature.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      // In a real implementation, this would save the agreement to the backend
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      toast({
        title: 'Agreement Signed',
        description: 'Thank you for agreeing to participate in our beta testing program.',
      });
      
      // Redirect to dashboard or next step
      window.location.href = '/';
      
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to submit agreement. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold flex items-center gap-3">
              <FileCheck className="w-8 h-8 text-blue-600" />
              Beta Testing Agreement
            </CardTitle>
            <CardDescription>
              Please read and agree to the following terms to participate in MyAmbulex beta testing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="prose prose-gray max-w-none mb-8">
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg mb-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="text-amber-800 font-medium mb-1">Beta Testing Notice</p>
                    <p className="text-amber-700 text-sm">
                      This is a beta version of MyAmbulex. Features may be incomplete, 
                      and the service is provided for testing purposes only.
                    </p>
                  </div>
                </div>
              </div>

              <section className="mb-6">
                <h2 className="text-xl font-semibold mb-3">1. Purpose and Scope</h2>
                <p>
                  This Agreement governs your participation in the beta testing program for 
                  MyAmbulex's medical transportation platform ("Service"). The beta testing 
                  period runs for approximately 2 weeks, subject to extension.
                </p>
              </section>

              <section className="mb-6">
                <h2 className="text-xl font-semibold mb-3">2. Beta Tester Responsibilities</h2>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Provide genuine feedback on platform functionality, usability, and performance</li>
                  <li>Test core features including ride booking, payment processing, and communication</li>
                  <li>Report bugs, issues, and suggestions through designated feedback channels</li>
                  <li>Participate in weekly check-ins and provide timely responses to surveys</li>
                  <li>Use the platform in good faith for legitimate medical transportation needs</li>
                </ul>
              </section>

              <section className="mb-6">
                <h2 className="text-xl font-semibold mb-3">3. Company Responsibilities</h2>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Provide access to the beta platform and technical support</li>
                  <li>Respond to critical issues within 24 hours during business days</li>
                  <li>Maintain platform uptime of 99%+ during testing period</li>
                  <li>Protect your personal information per our Privacy Policy</li>
                  <li>Provide emergency support for safety-related issues</li>
                </ul>
              </section>

              <section className="mb-6">
                <h2 className="text-xl font-semibold mb-3">4. Data Collection and Use</h2>
                <p>
                  We will collect usage data, feedback, and performance metrics to improve 
                  the Service. All data collection complies with applicable privacy laws and 
                  our Privacy Policy. Beta testing data may be used for product development 
                  and marketing purposes.
                </p>
              </section>

              <section className="mb-6">
                <h2 className="text-xl font-semibold mb-3">5. Confidentiality</h2>
                <p>
                  You agree to keep confidential all non-public information about the Service, 
                  including features, pricing, business strategies, and user data. You may not 
                  share screenshots, videos, or detailed descriptions of the beta platform 
                  without prior written consent.
                </p>
              </section>

              <section className="mb-6">
                <h2 className="text-xl font-semibold mb-3">6. Service Limitations</h2>
                <p className="font-semibold">
                  THE BETA SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. 
                  The service may be unavailable, unreliable, or contain errors. 
                  Company's liability is limited to the maximum extent permitted by law.
                </p>
              </section>

              <section className="mb-6">
                <h2 className="text-xl font-semibold mb-3">7. Safety and Emergency Procedures</h2>
                <ul className="list-disc pl-6 space-y-1">
                  <li>In medical emergencies, contact 911 immediately</li>
                  <li>Report safety concerns to our emergency hotline: 1-800-MYAMBULEX</li>
                  <li>Platform is not a substitute for emergency medical services</li>
                  <li>Users remain responsible for their medical fitness to travel</li>
                </ul>
              </section>

              <section className="mb-6">
                <h2 className="text-xl font-semibold mb-3">8. Termination</h2>
                <p>
                  Either party may terminate participation with 48 hours notice. Company may 
                  terminate immediately for violations of this Agreement. Termination does not 
                  release confidentiality obligations.
                </p>
              </section>

              <section className="mb-6">
                <h2 className="text-xl font-semibold mb-3">9. Contact Information</h2>
                <p>
                  Questions about this Agreement: <a href="mailto:beta@myambulex.com" className="text-blue-600 hover:underline">beta@myambulex.com</a><br />
                  Technical Support: <a href="mailto:support@myambulex.com" className="text-blue-600 hover:underline">support@myambulex.com</a><br />
                  Emergency Issues: 1-800-MYAMBULEX
                </p>
              </section>
            </div>

            <form onSubmit={handleSubmit} className="border-t pt-6">
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="agreement"
                    checked={agreed}
                    onCheckedChange={(checked) => setAgreed(checked as boolean)}
                  />
                  <Label htmlFor="agreement" className="text-sm leading-relaxed">
                    I have read and understand the Beta Testing Agreement above. I agree to 
                    participate in the beta testing program under these terms and conditions. 
                    I understand this is a test environment and agree to provide constructive 
                    feedback to help improve the platform.
                  </Label>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signature">Electronic Signature</Label>
                  <Input
                    id="signature"
                    type="text"
                    placeholder="Type your full name to sign electronically"
                    value={signature}
                    onChange={(e) => setSignature(e.target.value)}
                    className="max-w-md"
                  />
                  <p className="text-sm text-gray-600">
                    By typing your name above, you are providing an electronic signature 
                    that has the same legal effect as a handwritten signature.
                  </p>
                </div>

                <div className="flex gap-4">
                  <Button
                    type="submit"
                    disabled={!agreed || !signature.trim() || isSubmitting}
                    className="flex items-center gap-2"
                  >
                    <FileCheck className="w-4 h-4" />
                    {isSubmitting ? 'Submitting...' : 'Agree and Continue'}
                  </Button>
                  
                  <Link href="/">
                    <Button variant="outline">
                      Cancel
                    </Button>
                  </Link>
                </div>
              </div>
            </form>

            <div className="mt-8 p-4 bg-gray-100 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>Note:</strong> This agreement will be stored securely and you will 
                receive a copy via email. You may withdraw from beta testing at any time 
                by contacting <a href="mailto:beta@myambulex.com" className="text-blue-600 hover:underline">beta@myambulex.com</a>.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}