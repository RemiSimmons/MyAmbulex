import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  HelpCircle, 
  Mail, 
  Phone, 
  MessageSquare, 
  Send,
  ArrowLeft,
  Clock,
  CheckCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

export default function GetSupport() {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    category: '',
    subject: '',
    message: '',
    priority: 'normal'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await apiRequest('/api/support/ticket', {
        method: 'POST',
        body: formData
      });
      
      toast({
        title: 'Support Request Submitted',
        description: 'We have received your request and will respond within 24 hours.',
      });
      
      // Reset form
      setFormData({
        category: '',
        subject: '',
        message: '',
        priority: 'normal'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to submit support request. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>MyAmbulex | Get Support</title>
      </Helmet>
      
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <Link href="/rider/dashboard">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
          <h1 className="text-3xl font-bold mb-4">Get Support</h1>
          <p className="text-gray-600">
            Need help? We're here to assist you with any questions or issues.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Contact Methods */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Contact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">Emergency Support</p>
                    <p className="text-sm text-gray-600">(404) 301-0535</p>
                    <p className="text-xs text-gray-500">24/7 Available</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">Email Support</p>
                    <p className="text-sm text-gray-600">support@myambulex.com</p>
                    <p className="text-xs text-gray-500">Response within 24hrs</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Response Times</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-orange-500" />
                  <span className="text-sm">Urgent: Within 2 hours</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-500" />
                  <span className="text-sm">Normal: Within 24 hours</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Low: Within 3 days</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Support Form */}
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Submit Support Request
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label htmlFor="category">Category</Label>
                      <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ride-booking">Ride Booking</SelectItem>
                          <SelectItem value="payment">Payment Issues</SelectItem>
                          <SelectItem value="driver-feedback">Driver Feedback</SelectItem>
                          <SelectItem value="account">Account Management</SelectItem>
                          <SelectItem value="technical">Technical Issues</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="priority">Priority</Label>
                      <Select value={formData.priority} onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                      id="subject"
                      value={formData.subject}
                      onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                      placeholder="Brief description of your issue"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="message">Message</Label>
                    <Textarea
                      id="message"
                      value={formData.message}
                      onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                      placeholder="Please provide detailed information about your issue or question..."
                      rows={6}
                      required
                    />
                  </div>

                  <Alert>
                    <HelpCircle className="h-4 w-4" />
                    <AlertDescription>
                      For urgent ride-related issues during active transportation, 
                      please call our emergency line at (404) 301-0535.
                    </AlertDescription>
                  </Alert>

                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    <Send className="h-4 w-4 mr-2" />
                    {isSubmitting ? 'Submitting...' : 'Submit Support Request'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* FAQ Section */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Frequently Asked Questions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">How do I cancel a ride?</h4>
              <p className="text-sm text-gray-600">
                You can cancel a ride from your dashboard before the driver arrives. 
                Cancellation fees may apply based on timing.
              </p>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">What if my driver is late?</h4>
              <p className="text-sm text-gray-600">
                Track your driver's location in real-time. If they're running more than 
                15 minutes late, you'll receive automatic compensation.
              </p>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">How do I update my payment method?</h4>
              <p className="text-sm text-gray-600">
                Go to your account settings and select "Payment Methods" to add, 
                remove, or update your payment information.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}