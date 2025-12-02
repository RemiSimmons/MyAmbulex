import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Mail, MessageSquare, Users, Send, TestTube } from 'lucide-react';

interface BetaInvitation {
  fullName: string;
  email?: string;
  phone?: string;
  inviteMethod: 'email' | 'sms' | 'both';
  role: 'rider' | 'driver';
  notes?: string;
}

export default function BetaInvitations() {
  const { toast } = useToast();
  const [invitation, setInvitation] = useState<BetaInvitation>({
    fullName: '',
    email: '',
    phone: '',
    inviteMethod: 'email',
    role: 'rider',
    notes: ''
  });
  const [batchInvitations, setBatchInvitations] = useState('');
  const [loading, setLoading] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testPhone, setTestPhone] = useState('');

  const handleSingleInvitation = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/beta-invitations/send-invitation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invitation)
      });

      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Invitation Sent!",
          description: `Beta invitation sent to ${invitation.fullName} via ${invitation.inviteMethod}`,
        });
        // Reset form
        setInvitation({
          fullName: '',
          email: '',
          phone: '',
          inviteMethod: 'email',
          role: 'rider',
          notes: ''
        });
      } else {
        throw new Error(result.error || 'Failed to send invitation');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to send invitation',
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBatchInvitations = async () => {
    setLoading(true);
    try {
      // Parse batch invitations (CSV format: name,email,phone,method,role,notes)
      const lines = batchInvitations.trim().split('\n');
      const invitations = lines.map(line => {
        const [fullName, email, phone, inviteMethod, role, notes] = line.split(',').map(s => s.trim());
        return {
          fullName,
          email: email || undefined,
          phone: phone || undefined,
          inviteMethod: (inviteMethod as 'email' | 'sms' | 'both') || 'email',
          role: (role as 'rider' | 'driver') || 'rider',
          notes: notes || undefined
        };
      });

      const response = await fetch('/api/admin/beta-invitations/send-batch-invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitations })
      });

      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Batch Invitations Sent!",
          description: `Successfully sent ${result.successful} out of ${invitations.length} invitations`,
        });
        setBatchInvitations('');
      } else {
        throw new Error(result.error || 'Failed to send batch invitations');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to send batch invitations',
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const testEmailConfig = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/beta-invitations/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testEmail })
      });

      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Email Test Successful!",
          description: `Test email sent to ${testEmail}`,
        });
      } else {
        throw new Error(result.error || 'Email test failed');
      }
    } catch (error) {
      toast({
        title: "Email Test Failed",
        description: error instanceof Error ? error.message : 'Email configuration test failed',
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const testSMSConfig = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/beta-invitations/test-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testPhone })
      });

      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "SMS Test Successful!",
          description: `Test SMS sent to ${testPhone}`,
        });
      } else {
        throw new Error(result.error || 'SMS test failed');
      }
    } catch (error) {
      toast({
        title: "SMS Test Failed",
        description: error instanceof Error ? error.message : 'SMS configuration test failed',
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Users className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Beta Testing Invitations</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Single Invitation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Send Single Invitation
            </CardTitle>
            <CardDescription>
              Send a beta testing invitation to an individual participant
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={invitation.fullName}
                onChange={(e) => setInvitation({ ...invitation, fullName: e.target.value })}
                placeholder="John Doe"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={invitation.role} onValueChange={(value: 'rider' | 'driver') => setInvitation({ ...invitation, role: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rider">Rider</SelectItem>
                  <SelectItem value="driver">Driver</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Invitation Method</Label>
              <RadioGroup 
                value={invitation.inviteMethod} 
                onValueChange={(value: 'email' | 'sms' | 'both') => setInvitation({ ...invitation, inviteMethod: value })}
                className="flex flex-row gap-6"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="email" id="email" />
                  <Label htmlFor="email">Email (Recommended)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="sms" id="sms" disabled />
                  <Label htmlFor="sms" className="text-gray-400">SMS (Configuration Required)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="both" id="both" disabled />
                  <Label htmlFor="both" className="text-gray-400">Both (SMS Configuration Required)</Label>
                </div>
              </RadioGroup>
              <p className="text-sm text-gray-600">
                SMS functionality requires additional Twilio phone number configuration. Email invitations are fully operational.
              </p>
            </div>

            {(invitation.inviteMethod === 'email' || invitation.inviteMethod === 'both') && (
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={invitation.email}
                  onChange={(e) => setInvitation({ ...invitation, email: e.target.value })}
                  placeholder="john@example.com"
                />
              </div>
            )}

            {(invitation.inviteMethod === 'sms' || invitation.inviteMethod === 'both') && (
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={invitation.phone}
                  onChange={(e) => setInvitation({ ...invitation, phone: e.target.value })}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={invitation.notes}
                onChange={(e) => setInvitation({ ...invitation, notes: e.target.value })}
                placeholder="Additional notes about this participant..."
                rows={3}
              />
            </div>

            <Button 
              onClick={handleSingleInvitation} 
              disabled={loading || !invitation.fullName}
              className="w-full"
            >
              <Send className="h-4 w-4 mr-2" />
              Send Invitation
            </Button>
          </CardContent>
        </Card>

        {/* Batch Invitations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Batch Invitations
            </CardTitle>
            <CardDescription>
              Send multiple invitations at once using CSV format
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="batchData">CSV Data</Label>
              <Textarea
                id="batchData"
                value={batchInvitations}
                onChange={(e) => setBatchInvitations(e.target.value)}
                placeholder="John Doe,john@example.com,+15551234567,email,rider,Notes&#10;Jane Smith,jane@example.com,,email,driver,Test driver"
                rows={8}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Format: Name,Email,Phone,Method(email/sms/both),Role(rider/driver),Notes
              </p>
            </div>

            <Button 
              onClick={handleBatchInvitations} 
              disabled={loading || !batchInvitations.trim()}
              className="w-full"
            >
              <Users className="h-4 w-4 mr-2" />
              Send Batch Invitations
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Configuration Testing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            Test Configuration
          </CardTitle>
          <CardDescription>
            Test your email and SMS configuration before sending invitations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <Label htmlFor="testEmail">Test Email</Label>
              <div className="flex gap-2">
                <Input
                  id="testEmail"
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="test@example.com"
                />
                <Button 
                  onClick={testEmailConfig} 
                  disabled={loading || !testEmail}
                  variant="outline"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Test
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <Label>SMS Configuration</Label>
              <div className="p-3 bg-gray-50 rounded-md">
                <p className="text-sm text-gray-600">
                  SMS functionality requires additional Twilio phone number configuration and is disabled for beta testing. 
                  Email invitations provide complete coverage for beta participant recruitment.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}