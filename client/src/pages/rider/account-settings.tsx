import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  User, 
  Mail, 
  Phone, 
  Lock, 
  Trash2, 
  AlertTriangle,
  ArrowLeft,
  Save
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

export default function AccountSettings() {
  const { toast } = useToast();
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  
  const { data: user } = useQuery({
    queryKey: ['/api/user'],
    queryFn: () => fetch('/api/user').then(res => res.json()),
  });

  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    username: user?.username || '',
  });

  // Update form data when user data loads
  React.useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
        username: user.username || '',
      });
    }
  }, [user]);

  const handleSaveChanges = async () => {
    try {
      await apiRequest('/api/user/profile', {
        method: 'PUT',
        body: formData
      });
      toast({
        title: 'Success',
        description: 'Your account settings have been updated.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update account settings. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE') {
      toast({
        title: 'Confirmation Required',
        description: 'Please type "DELETE" to confirm account deletion.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await apiRequest('/api/user/delete-account', {
        method: 'DELETE'
      });
      toast({
        title: 'Account Deleted',
        description: 'Your account has been permanently deleted.',
      });
      // Redirect to home page after deletion
      window.location.href = '/';
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete account. Please contact support.',
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      <Helmet>
        <title>MyAmbulex | Account Settings</title>
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
          <h1 className="text-3xl font-bold mb-4">Account Settings</h1>
          <p className="text-gray-600">
            Manage your account information and preferences.
          </p>
        </div>

        <div className="space-y-6">
          {/* Profile Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="username">Username</Label>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-400" />
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                    placeholder="Choose a unique username"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Username changes help personalize your account
                </p>
              </div>
              
              <div>
                <Label htmlFor="email">Email Address</Label>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
              </div>

              <Button onClick={handleSaveChanges} className="w-full">
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </CardContent>
          </Card>

          {/* Password Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Password & Security
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Change your password or update security settings.
              </p>
              <Link href="/forgot-password">
                <Button variant="outline">
                  Change Password
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                Danger Zone
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium text-red-600 mb-2">Delete Account</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Permanently delete your MyAmbulex account and all associated data. 
                  This action cannot be undone.
                </p>
                
                {!showDeleteWarning ? (
                  <Button 
                    variant="destructive" 
                    onClick={() => setShowDeleteWarning(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Account
                  </Button>
                ) : (
                  <div className="space-y-4">
                    <Alert className="border-red-200 bg-red-50">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Warning:</strong> This will permanently delete your account, 
                        including all rides, payment history, and personal information. 
                        This action cannot be undone.
                      </AlertDescription>
                    </Alert>
                    
                    <div>
                      <Label htmlFor="deleteConfirm">
                        Type "DELETE" to confirm account deletion:
                      </Label>
                      <Input
                        id="deleteConfirm"
                        value={deleteConfirmation}
                        onChange={(e) => setDeleteConfirmation(e.target.value)}
                        placeholder="Type DELETE here"
                        className="mt-2"
                      />
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        variant="destructive" 
                        onClick={handleDeleteAccount}
                        disabled={deleteConfirmation !== 'DELETE'}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Permanently Delete Account
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setShowDeleteWarning(false);
                          setDeleteConfirmation('');
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}