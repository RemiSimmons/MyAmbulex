import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Ban, 
  Play, 
  User,
  Car,
  MapPin,
  Settings
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface User {
  id: number;
  username: string;
  fullName: string;
  email: string;
  role: 'rider' | 'driver' | 'admin';
  accountStatus: 'active' | 'suspended' | 'blocked' | 'pending';
}

interface Ride {
  id: number;
  referenceNumber: string;
  status: string;
  pickupAddress: string;
  dropoffAddress: string;
}

interface AdminOverrideDialogProps {
  isOpen: boolean;
  onClose: () => void;
  selectedUser: User | null;
  selectedRide: Ride | null;
  overrideAction: string;
  overrideReason: string;
  onActionChange: (action: string) => void;
  onReasonChange: (reason: string) => void;
}

export function AdminOverrideDialog({
  isOpen,
  onClose,
  selectedUser,
  selectedRide,
  overrideAction,
  overrideReason,
  onActionChange,
  onReasonChange
}: AdminOverrideDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Override action mutation
  const overrideMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/admin/override', data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Override Applied",
        description: data.message || "Administrative override has been applied successfully",
      });
      onClose();
      queryClient.invalidateQueries({ queryKey: ['/api/admin'] });
    },
    onError: () => {
      toast({
        title: "Override Failed",
        description: "Failed to apply administrative override",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideAction || !overrideReason) {
      toast({
        title: "Missing Information",
        description: "Please select an action and provide a reason",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    const overrideData = {
      action: overrideAction,
      reason: overrideReason,
      targetType: selectedUser ? 'user' : 'ride',
      targetId: selectedUser ? selectedUser.id : selectedRide?.id,
      details: {
        user: selectedUser,
        ride: selectedRide,
        timestamp: new Date().toISOString()
      }
    };

    overrideMutation.mutate(overrideData);
    setIsSubmitting(false);
  };

  const getUserActions = () => {
    if (!selectedUser) return [];
    
    const actions = [
      { value: 'verify_account', label: 'Verify Account', icon: CheckCircle },
      { value: 'suspend_account', label: 'Suspend Account', icon: Ban },
      { value: 'activate_account', label: 'Activate Account', icon: Play },
      { value: 'reset_password', label: 'Reset Password', icon: Settings },
      { value: 'verify_email', label: 'Verify Email', icon: CheckCircle },
      { value: 'verify_phone', label: 'Verify Phone', icon: CheckCircle }
    ];

    if (selectedUser.role === 'driver') {
      actions.push(
        { value: 'approve_documents', label: 'Approve All Documents', icon: CheckCircle },
        { value: 'reject_documents', label: 'Reject Documents', icon: Ban },
        { value: 'bypass_background_check', label: 'Bypass Background Check', icon: Shield }
      );
    }

    return actions;
  };

  const getRideActions = () => {
    if (!selectedRide) return [];
    
    return [
      { value: 'force_complete', label: 'Force Complete', icon: CheckCircle },
      { value: 'cancel_ride', label: 'Cancel Ride', icon: Ban },
      { value: 'assign_driver', label: 'Force Assign Driver', icon: Car },
      { value: 'adjust_price', label: 'Adjust Price', icon: Settings },
      { value: 'emergency_override', label: 'Emergency Override', icon: AlertTriangle }
    ];
  };

  const getActionIcon = (action: string) => {
    const allActions = [...getUserActions(), ...getRideActions()];
    const actionObj = allActions.find(a => a.value === action);
    return actionObj?.icon || Settings;
  };

  const target = selectedUser || selectedRide;
  const actions = selectedUser ? getUserActions() : getRideActions();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Administrative Override
          </DialogTitle>
        </DialogHeader>

        {target && (
          <div className="space-y-4">
            {/* Target Information */}
            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                {selectedUser ? (
                  <User className="h-4 w-4" />
                ) : (
                  <MapPin className="h-4 w-4" />
                )}
                <h3 className="font-medium">Target Information</h3>
              </div>
              {selectedUser && (
                <div className="space-y-1 text-sm">
                  <p><strong>Name:</strong> {selectedUser.fullName}</p>
                  <p><strong>Username:</strong> @{selectedUser.username}</p>
                  <p><strong>Email:</strong> {selectedUser.email}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline">{selectedUser.role}</Badge>
                    <Badge variant="outline">{selectedUser.accountStatus}</Badge>
                  </div>
                </div>
              )}
              {selectedRide && (
                <div className="space-y-1 text-sm">
                  <p><strong>Reference:</strong> {selectedRide.referenceNumber}</p>
                  <p><strong>Status:</strong> {selectedRide.status}</p>
                  <p><strong>Pickup:</strong> {selectedRide.pickupAddress}</p>
                  <p><strong>Dropoff:</strong> {selectedRide.dropoffAddress}</p>
                </div>
              )}
            </div>

            {/* Override Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="action">Override Action</Label>
                <Select value={overrideAction} onValueChange={onActionChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an action" />
                  </SelectTrigger>
                  <SelectContent>
                    {actions.map((action) => {
                      const Icon = action.icon;
                      return (
                        <SelectItem key={action.value} value={action.value}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            {action.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Reason for Override</Label>
                <Textarea
                  id="reason"
                  placeholder="Provide a detailed reason for this administrative override..."
                  value={overrideReason}
                  onChange={(e) => onReasonChange(e.target.value)}
                  rows={3}
                />
              </div>

              {overrideAction && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Warning:</strong> This action will override normal system behavior and may have significant consequences. 
                    All administrative actions are logged and audited.
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!overrideAction || !overrideReason || isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                      Applying Override...
                    </>
                  ) : (
                    <>
                      <Shield className="h-4 w-4 mr-2" />
                      Apply Override
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}