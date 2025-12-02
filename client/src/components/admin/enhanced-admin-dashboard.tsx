import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Users, 
  Settings, 
  Zap,
  Lock,
  Unlock,
  FileCheck,
  UserCheck,
  AlertCircle,
  Activity,
  Database,
  Gauge,
  History,
  Eye,
  EyeOff,
  Car,
  CreditCard,
  Ban,
  CheckCircle,
  UserX,
  Key,
  Wrench,
  Emergency
} from 'lucide-react';
import { format } from 'date-fns';

interface AdminStats {
  totalUsers: number;
  totalDrivers: number;
  totalRiders: number;
  pendingVerifications: number;
  activeOverrides: number;
  criticalAlerts: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
}

interface OverrideAction {
  id: number;
  adminId: number;
  targetType: 'user' | 'driver' | 'ride' | 'system';
  targetId?: number;
  overrideType: string;
  reason: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  isActive: boolean;
  createdAt: string;
  expiresAt?: string;
  adminName: string;
}

interface DriverVerificationRequest {
  driverId: number;
  driverName: string;
  email: string;
  phone: string;
  applicationDate: string;
  documentStatus: string;
  backgroundCheckStatus: string;
  verificationStatus: string;
}

export function EnhancedAdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedDriver, setSelectedDriver] = useState<number | null>(null);
  const [overrideDialogOpen, setOverrideDialogOpen] = useState(false);
  const [verificationDialogOpen, setVerificationDialogOpen] = useState(false);
  const [emergencyDialogOpen, setEmergencyDialogOpen] = useState(false);
  
  // Override form state
  const [overrideType, setOverrideType] = useState('');
  const [targetType, setTargetType] = useState('driver');
  const [targetId, setTargetId] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [emergencyProtocol, setEmergencyProtocol] = useState('');
  
  // Verification form state
  const [bypassBackgroundCheck, setBypassBackgroundCheck] = useState(false);
  const [bypassEmailVerification, setBypassEmailVerification] = useState(false);
  const [bypassDocumentVerification, setBypassDocumentVerification] = useState(false);
  const [forceAccountActivation, setForceAccountActivation] = useState(false);
  const [grantAllPermissions, setGrantAllPermissions] = useState(false);
  const [verificationReason, setVerificationReason] = useState('');

  // Fetch admin statistics
  const { data: adminStats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ['/api/admin/stats'],
    refetchInterval: 30000
  });

  // Fetch pending driver verifications
  const { data: pendingVerifications, isLoading: verificationsLoading } = useQuery<DriverVerificationRequest[]>({
    queryKey: ['/api/admin/pending-verifications'],
    refetchInterval: 15000
  });

  // Fetch active overrides
  const { data: activeOverrides, isLoading: overridesLoading } = useQuery<OverrideAction[]>({
    queryKey: ['/api/admin/active-overrides'],
    refetchInterval: 10000
  });

  // Fetch override history
  const { data: overrideHistory, isLoading: historyLoading } = useQuery<OverrideAction[]>({
    queryKey: ['/api/admin/override-history'],
    refetchInterval: 60000
  });

  // Apply override mutation
  const applyOverrideMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/admin/apply-override', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Override Applied",
        description: "Administrative override has been applied successfully",
      });
      setOverrideDialogOpen(false);
      resetOverrideForm();
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

  // Driver verification bypass mutation
  const verificationBypassMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/admin/bypass-verification', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Verification Bypassed",
        description: "Driver verification has been bypassed successfully",
      });
      setVerificationDialogOpen(false);
      resetVerificationForm();
      queryClient.invalidateQueries({ queryKey: ['/api/admin'] });
    },
    onError: () => {
      toast({
        title: "Verification Bypass Failed",
        description: "Failed to bypass driver verification",
        variant: "destructive",
      });
    }
  });

  // Emergency protocol mutation
  const emergencyProtocolMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/admin/emergency-protocol', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Emergency Protocol Activated",
        description: "Emergency protocol has been activated successfully",
      });
      setEmergencyDialogOpen(false);
      setEmergencyProtocol('');
      queryClient.invalidateQueries({ queryKey: ['/api/admin'] });
    },
    onError: () => {
      toast({
        title: "Emergency Protocol Failed",
        description: "Failed to activate emergency protocol",
        variant: "destructive",
      });
    }
  });

  const handleApplyOverride = () => {
    if (!overrideType || !overrideReason) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    applyOverrideMutation.mutate({
      targetType,
      targetId: targetId ? parseInt(targetId) : undefined,
      overrideType,
      overrideValue: { enabled: true },
      reason: overrideReason,
    });
  };

  const handleVerificationBypass = () => {
    if (!selectedDriver || !verificationReason) {
      toast({
        title: "Validation Error",
        description: "Please select a driver and provide a reason",
        variant: "destructive",
      });
      return;
    }

    verificationBypassMutation.mutate({
      driverId: selectedDriver,
      bypassBackgroundCheck,
      bypassEmailVerification,
      bypassDocumentVerification,
      forceAccountActivation,
      grantAllPermissions,
      reason: verificationReason,
    });
  };

  const handleEmergencyProtocol = () => {
    if (!emergencyProtocol) {
      toast({
        title: "Validation Error",
        description: "Please select an emergency protocol",
        variant: "destructive",
      });
      return;
    }

    emergencyProtocolMutation.mutate({
      protocolType: emergencyProtocol,
      reason: "Emergency protocol activation",
    });
  };

  const resetOverrideForm = () => {
    setOverrideType('');
    setTargetType('driver');
    setTargetId('');
    setOverrideReason('');
  };

  const resetVerificationForm = () => {
    setSelectedDriver(null);
    setBypassBackgroundCheck(false);
    setBypassEmailVerification(false);
    setBypassDocumentVerification(false);
    setForceAccountActivation(false);
    setGrantAllPermissions(false);
    setVerificationReason('');
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-6">
          <CardContent className="text-center">
            <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">You need admin privileges to access this dashboard.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Enhanced Admin Dashboard</h1>
            <p className="text-muted-foreground">Comprehensive system control with manual override capabilities</p>
          </div>
          <div className="flex items-center space-x-4">
            <Badge variant={adminStats?.systemHealth === 'healthy' ? 'default' : 'destructive'}>
              <Activity className="h-3 w-3 mr-1" />
              System {adminStats?.systemHealth || 'Unknown'}
            </Badge>
            <Dialog open={emergencyDialogOpen} onOpenChange={setEmergencyDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Emergency className="h-4 w-4 mr-2" />
                  Emergency
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center text-red-600">
                    <AlertTriangle className="h-5 w-5 mr-2" />
                    Emergency Protocol Activation
                  </DialogTitle>
                  <DialogDescription>
                    Select emergency protocol to activate. This action will be logged and all admins will be notified.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="emergency-protocol">Emergency Protocol</Label>
                    <Select value={emergencyProtocol} onValueChange={setEmergencyProtocol}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select emergency protocol" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="system_maintenance_mode">System Maintenance Mode</SelectItem>
                        <SelectItem value="unlock_all_drivers">Unlock All Drivers</SelectItem>
                        <SelectItem value="emergency_driver_assignment">Emergency Driver Assignment</SelectItem>
                        <SelectItem value="force_ride_completion">Force Ride Completion</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setEmergencyDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={handleEmergencyProtocol}
                    disabled={emergencyProtocolMutation.isPending}
                  >
                    {emergencyProtocolMutation.isPending ? "Activating..." : "Activate Protocol"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                  <p className="text-2xl font-bold">{adminStats?.totalUsers || 0}</p>
                </div>
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pending Verifications</p>
                  <p className="text-2xl font-bold">{adminStats?.pendingVerifications || 0}</p>
                </div>
                <FileCheck className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Overrides</p>
                  <p className="text-2xl font-bold">{adminStats?.activeOverrides || 0}</p>
                </div>
                <Shield className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Critical Alerts</p>
                  <p className="text-2xl font-bold">{adminStats?.criticalAlerts || 0}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Dashboard Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="verifications">Verifications</TabsTrigger>
            <TabsTrigger value="overrides">Overrides</TabsTrigger>
            <TabsTrigger value="system">System Control</TabsTrigger>
            <TabsTrigger value="audit">Audit Trail</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>Frequently used administrative actions</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Dialog open={verificationDialogOpen} onOpenChange={setVerificationDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="h-20 flex flex-col">
                          <UserCheck className="h-6 w-6 mb-2" />
                          Bypass Verification
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Driver Verification Bypass</DialogTitle>
                          <DialogDescription>
                            Manually bypass verification requirements for a driver. This action will be logged.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="driver-select">Select Driver</Label>
                            <Select value={selectedDriver?.toString() || ''} onValueChange={(value) => setSelectedDriver(parseInt(value))}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a driver" />
                              </SelectTrigger>
                              <SelectContent>
                                {pendingVerifications?.map((driver) => (
                                  <SelectItem key={driver.driverId} value={driver.driverId.toString()}>
                                    {driver.driverName} - {driver.email}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="space-y-3">
                            <Label>Verification Bypasses</Label>
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <Switch checked={bypassBackgroundCheck} onCheckedChange={setBypassBackgroundCheck} />
                                <Label>Bypass Background Check</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Switch checked={bypassEmailVerification} onCheckedChange={setBypassEmailVerification} />
                                <Label>Bypass Email Verification</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Switch checked={bypassDocumentVerification} onCheckedChange={setBypassDocumentVerification} />
                                <Label>Bypass Document Verification</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Switch checked={forceAccountActivation} onCheckedChange={setForceAccountActivation} />
                                <Label>Force Account Activation</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Switch checked={grantAllPermissions} onCheckedChange={setGrantAllPermissions} />
                                <Label>Grant All Permissions</Label>
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <Label htmlFor="verification-reason">Reason for Bypass</Label>
                            <Textarea
                              id="verification-reason"
                              placeholder="Explain why this verification bypass is necessary..."
                              value={verificationReason}
                              onChange={(e) => setVerificationReason(e.target.value)}
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setVerificationDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button 
                            onClick={handleVerificationBypass}
                            disabled={verificationBypassMutation.isPending}
                          >
                            {verificationBypassMutation.isPending ? "Processing..." : "Apply Bypass"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    
                    <Dialog open={overrideDialogOpen} onOpenChange={setOverrideDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="h-20 flex flex-col">
                          <Shield className="h-6 w-6 mb-2" />
                          System Override
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Apply System Override</DialogTitle>
                          <DialogDescription>
                            Apply manual override to bypass automated system rules.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="target-type">Target Type</Label>
                            <Select value={targetType} onValueChange={setTargetType}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="user">User</SelectItem>
                                <SelectItem value="driver">Driver</SelectItem>
                                <SelectItem value="ride">Ride</SelectItem>
                                <SelectItem value="system">System</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <Label htmlFor="target-id">Target ID (optional)</Label>
                            <Input
                              id="target-id"
                              placeholder="Enter target ID"
                              value={targetId}
                              onChange={(e) => setTargetId(e.target.value)}
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor="override-type">Override Type</Label>
                            <Select value={overrideType} onValueChange={setOverrideType}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select override type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="verification_bypass">Verification Bypass</SelectItem>
                                <SelectItem value="permission_grant">Permission Grant</SelectItem>
                                <SelectItem value="status_override">Status Override</SelectItem>
                                <SelectItem value="system_config">System Config</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <Label htmlFor="override-reason">Reason</Label>
                            <Textarea
                              id="override-reason"
                              placeholder="Explain why this override is necessary..."
                              value={overrideReason}
                              onChange={(e) => setOverrideReason(e.target.value)}
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setOverrideDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button 
                            onClick={handleApplyOverride}
                            disabled={applyOverrideMutation.isPending}
                          >
                            {applyOverrideMutation.isPending ? "Applying..." : "Apply Override"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>System Health</CardTitle>
                  <CardDescription>Current system status and alerts</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span>Overall Health</span>
                      <Badge className={getHealthColor(adminStats?.systemHealth || 'unknown')}>
                        {adminStats?.systemHealth || 'Unknown'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Active Overrides</span>
                      <Badge variant="secondary">{adminStats?.activeOverrides || 0}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Pending Verifications</span>
                      <Badge variant="outline">{adminStats?.pendingVerifications || 0}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Verifications Tab */}
          <TabsContent value="verifications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Pending Driver Verifications</CardTitle>
                <CardDescription>Drivers awaiting manual verification approval</CardDescription>
              </CardHeader>
              <CardContent>
                {verificationsLoading ? (
                  <div className="text-center py-8">Loading verifications...</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Driver</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Application Date</TableHead>
                        <TableHead>Document Status</TableHead>
                        <TableHead>Background Check</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingVerifications?.map((verification) => (
                        <TableRow key={verification.driverId}>
                          <TableCell className="font-medium">{verification.driverName}</TableCell>
                          <TableCell>{verification.email}</TableCell>
                          <TableCell>{format(new Date(verification.applicationDate), 'MMM dd, yyyy')}</TableCell>
                          <TableCell>
                            <Badge variant={verification.documentStatus === 'approved' ? 'default' : 'secondary'}>
                              {verification.documentStatus}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={verification.backgroundCheckStatus === 'approved' ? 'default' : 'secondary'}>
                              {verification.backgroundCheckStatus}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button size="sm" variant="outline">
                                <Eye className="h-4 w-4 mr-1" />
                                Review
                              </Button>
                              <Button 
                                size="sm" 
                                onClick={() => {
                                  setSelectedDriver(verification.driverId);
                                  setVerificationDialogOpen(true);
                                }}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Overrides Tab */}
          <TabsContent value="overrides" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Active Overrides</CardTitle>
                <CardDescription>Currently active administrative overrides</CardDescription>
              </CardHeader>
              <CardContent>
                {overridesLoading ? (
                  <div className="text-center py-8">Loading overrides...</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Target</TableHead>
                        <TableHead>Admin</TableHead>
                        <TableHead>Severity</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Expires</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeOverrides?.map((override) => (
                        <TableRow key={override.id}>
                          <TableCell className="font-medium">{override.overrideType}</TableCell>
                          <TableCell>{override.targetType}{override.targetId ? ` #${override.targetId}` : ''}</TableCell>
                          <TableCell>{override.adminName}</TableCell>
                          <TableCell>
                            <Badge className={getSeverityColor(override.severity)}>
                              {override.severity}
                            </Badge>
                          </TableCell>
                          <TableCell>{format(new Date(override.createdAt), 'MMM dd, HH:mm')}</TableCell>
                          <TableCell>
                            {override.expiresAt ? format(new Date(override.expiresAt), 'MMM dd, HH:mm') : 'Never'}
                          </TableCell>
                          <TableCell>
                            <Button size="sm" variant="outline">
                              <XCircle className="h-4 w-4 mr-1" />
                              Deactivate
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* System Control Tab */}
          <TabsContent value="system" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>System Configuration</CardTitle>
                  <CardDescription>Override system-wide settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Button variant="outline" className="h-16 flex flex-col">
                      <Database className="h-5 w-5 mb-1" />
                      Database Settings
                    </Button>
                    <Button variant="outline" className="h-16 flex flex-col">
                      <Gauge className="h-5 w-5 mb-1" />
                      Performance Tuning
                    </Button>
                    <Button variant="outline" className="h-16 flex flex-col">
                      <Settings className="h-5 w-5 mb-1" />
                      Feature Flags
                    </Button>
                    <Button variant="outline" className="h-16 flex flex-col">
                      <Wrench className="h-5 w-5 mb-1" />
                      Maintenance Mode
                    </Button>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Emergency Controls</CardTitle>
                  <CardDescription>Critical system emergency actions</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-3">
                    <Button variant="destructive" className="h-12">
                      <Ban className="h-4 w-4 mr-2" />
                      Suspend All Rides
                    </Button>
                    <Button variant="destructive" className="h-12">
                      <UserX className="h-4 w-4 mr-2" />
                      Suspend All Drivers
                    </Button>
                    <Button variant="destructive" className="h-12">
                      <Lock className="h-4 w-4 mr-2" />
                      System Lockdown
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Audit Trail Tab */}
          <TabsContent value="audit" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Override History</CardTitle>
                <CardDescription>Complete audit trail of all administrative actions</CardDescription>
              </CardHeader>
              <CardContent>
                {historyLoading ? (
                  <div className="text-center py-8">Loading audit trail...</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Action</TableHead>
                        <TableHead>Admin</TableHead>
                        <TableHead>Target</TableHead>
                        <TableHead>Severity</TableHead>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {overrideHistory?.map((action) => (
                        <TableRow key={action.id}>
                          <TableCell className="font-medium">{action.overrideType}</TableCell>
                          <TableCell>{action.adminName}</TableCell>
                          <TableCell>{action.targetType}{action.targetId ? ` #${action.targetId}` : ''}</TableCell>
                          <TableCell>
                            <Badge className={getSeverityColor(action.severity)}>
                              {action.severity}
                            </Badge>
                          </TableCell>
                          <TableCell>{format(new Date(action.createdAt), 'MMM dd, yyyy HH:mm:ss')}</TableCell>
                          <TableCell>
                            <Badge variant={action.isActive ? 'default' : 'secondary'}>
                              {action.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default EnhancedAdminDashboard;