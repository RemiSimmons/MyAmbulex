import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Car, 
  Search, 
  Edit, 
  Eye,
  CheckCircle,
  Clock,
  AlertTriangle,
  Star,
  DollarSign,
  MapPin,
  Phone,
  Mail,
  Shield,
  Ban,
  UserCheck,
  UserX
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface DriverDetails {
  id: number;
  licensePhotoFront?: string;
  licensePhotoBack?: string;
  insuranceDocumentUrl?: string;
  vehicleRegistrationUrl?: string;
  backgroundCheckDocumentUrl?: string;
  medicalCertificationUrl?: string;
  profilePictureUrl?: string;
  licenseVerified?: boolean;
  insuranceVerified?: boolean;
  vehicleVerified?: boolean;
  profileVerified?: boolean;
  medicalCertificationVerified?: boolean;
  backgroundCheckStatus?: 'pending' | 'approved' | 'rejected';
  documentsVerified?: boolean;
}

interface Driver {
  id: number;
  username: string;
  fullName: string;
  email: string;
  phone: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  accountStatus: 'active' | 'suspended' | 'blocked' | 'pending';
  verified: boolean;
  backgroundCheckStatus: 'pending' | 'approved' | 'rejected';
  documentsVerified: boolean;
  vehicleCount: number;
  totalRides: number;
  rating: number;
  earnings: number;
  onlineStatus: boolean;
  driverDetails: DriverDetails | null;
  createdAt: string;
}

interface DriversManagementProps {
  adminDrivers: Driver[] | undefined;
  driversLoading: boolean;
  onSelectDriver: (driver: Driver) => void;
  onShowDocumentReview: (driver: Driver) => void;
  onShowOverrideDialog: (driver: Driver) => void;
}

export function DriversManagement({ 
  adminDrivers, 
  driversLoading, 
  onSelectDriver, 
  onShowDocumentReview, 
  onShowOverrideDialog 
}: DriversManagementProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedVerification, setSelectedVerification] = useState<string>('all');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // User action mutation
  const userActionMutation = useMutation({
    mutationFn: async (data: { action: string; userId: number; reason?: string }) => {
      const response = await apiRequest('POST', '/api/admin/user-action', data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Action Completed",
        description: data.message || "Driver action has been completed successfully",
      });
      // Invalidate all relevant queries to ensure UI updates
      queryClient.invalidateQueries({ queryKey: ['/api/admin/drivers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      // Force a refetch after a short delay to ensure data is updated
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['/api/admin/drivers'] });
      }, 500);
    },
    onError: () => {
      toast({
        title: "Action Failed",
        description: "Failed to complete driver action",
        variant: "destructive",
      });
    }
  });

  // Filter drivers based on search and filters
  const filteredDrivers = adminDrivers?.filter(driver => {
    const matchesSearch = driver.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         driver.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         driver.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = selectedStatus === 'all' || driver.accountStatus === selectedStatus;
    const matchesVerification = selectedVerification === 'all' || 
                               (selectedVerification === 'verified' && driver.documentsVerified) ||
                               (selectedVerification === 'pending' && !driver.documentsVerified);
    
    return matchesSearch && matchesStatus && matchesVerification;
  }) || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'suspended': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'blocked': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (driversLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            Drivers Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Car className="h-5 w-5" />
          Drivers Management
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search drivers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 border rounded-md text-sm"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="suspended">Suspended</option>
                <option value="blocked">Blocked</option>
              </select>
              <select
                value={selectedVerification}
                onChange={(e) => setSelectedVerification(e.target.value)}
                className="px-3 py-2 border rounded-md text-sm"
              >
                <option value="all">All Verification</option>
                <option value="verified">Verified</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>

          {/* Drivers List */}
          <div className="space-y-2">
            {filteredDrivers.map((driver) => (
              <div
                key={driver.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">{driver.fullName}</h3>
                      {driver.documentsVerified ? (
                        <Badge className="text-xs bg-green-100 text-green-800 border-green-200">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Verified
                        </Badge>
                      ) : (
                        <Badge className={`text-xs ${getStatusColor(driver.accountStatus)}`}>
                          <Clock className="h-3 w-3 mr-1" />
                          {driver.accountStatus === 'pending' ? 'Pending' : driver.accountStatus}
                        </Badge>
                      )}
                      {driver.onlineStatus && (
                        <Badge className="text-xs bg-blue-100 text-blue-800 border-blue-200">
                          Online
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">@{driver.username}</p>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        <span>{driver.email}</span>
                        {driver.emailVerified && <CheckCircle className="h-3 w-3 text-green-500" />}
                      </div>
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        <span>{driver.phone}</span>
                        {driver.phoneVerified && <CheckCircle className="h-3 w-3 text-green-500" />}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 mt-2">
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 text-yellow-500" />
                        <span className="text-xs">{driver.rating.toFixed(1)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-blue-500" />
                        <span className="text-xs">{driver.totalRides} rides</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3 text-green-500" />
                        <span className="text-xs">${driver.earnings.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onShowDocumentReview(driver)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Review Documents
                  </Button>
                  
                  {driver.accountStatus === 'active' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => userActionMutation.mutate({
                        action: 'suspend',
                        userId: driver.id,
                        reason: 'Administrative action'
                      })}
                    >
                      <Ban className="h-4 w-4 mr-1" />
                      Suspend
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => userActionMutation.mutate({
                        action: 'activate',
                        userId: driver.id,
                        reason: 'Administrative action'
                      })}
                    >
                      <UserCheck className="h-4 w-4 mr-1" />
                      Activate
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onShowOverrideDialog(driver)}
                  >
                    <Shield className="h-4 w-4 mr-1" />
                    Override
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {filteredDrivers.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No drivers found matching your criteria.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}