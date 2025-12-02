import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  MapPin, 
  Search, 
  Eye,
  CheckCircle,
  Clock,
  AlertTriangle,
  DollarSign,
  Calendar,
  Navigation,
  User,
  Car,
  Ban,
  Play,
  X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface Ride {
  id: number;
  referenceNumber: string;
  riderId: number;
  driverId?: number;
  status: string;
  pickupAddress: string;
  dropoffAddress: string;
  scheduledTime: string;
  estimatedPrice: number;
  finalPrice?: number;
  createdAt: string;
  completedAt?: string;
}

interface RidesManagementProps {
  adminRides: Ride[] | undefined;
  ridesLoading: boolean;
  onSelectRide: (ride: Ride) => void;
  onShowOverrideDialog: (ride: Ride) => void;
}

export function RidesManagement({ 
  adminRides, 
  ridesLoading, 
  onSelectRide, 
  onShowOverrideDialog 
}: RidesManagementProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedDateRange, setSelectedDateRange] = useState<string>('all');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Ride action mutation
  const rideActionMutation = useMutation({
    mutationFn: async (data: { action: string; rideId: number; reason?: string }) => {
      const response = await apiRequest('POST', '/api/admin/ride-action', data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Action Completed",
        description: data.message || "Ride action has been completed successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/rides'] });
    },
    onError: () => {
      toast({
        title: "Action Failed",
        description: "Failed to complete ride action",
        variant: "destructive",
      });
    }
  });

  // Filter rides based on search and filters
  const filteredRides = adminRides?.filter(ride => {
    const matchesSearch = ride.referenceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ride.pickupAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ride.dropoffAddress.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = selectedStatus === 'all' || ride.status === selectedStatus;
    
    // Date filtering logic
    const rideDate = new Date(ride.scheduledTime);
    const today = new Date();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    let matchesDate = true;
    if (selectedDateRange === 'today') {
      matchesDate = rideDate.toDateString() === today.toDateString();
    } else if (selectedDateRange === 'yesterday') {
      matchesDate = rideDate.toDateString() === yesterday.toDateString();
    } else if (selectedDateRange === 'week') {
      matchesDate = rideDate >= weekAgo;
    }
    
    return matchesSearch && matchesStatus && matchesDate;
  }) || [];

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'requested': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      case 'pending': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  if (ridesLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Rides Management
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
          <MapPin className="h-5 w-5" />
          Rides Management
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search rides..."
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
                <option value="requested">Requested</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <select
                value={selectedDateRange}
                onChange={(e) => setSelectedDateRange(e.target.value)}
                className="px-3 py-2 border rounded-md text-sm"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="week">This Week</option>
              </select>
            </div>
          </div>

          {/* Rides List */}
          <div className="space-y-2">
            {filteredRides.map((ride) => (
              <div
                key={ride.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">{ride.referenceNumber}</h3>
                      <Badge className={`text-xs ${getStatusColor(ride.status)}`}>
                        {ride.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Navigation className="h-3 w-3 text-green-500" />
                        <span className="truncate max-w-md">{ride.pickupAddress}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3 text-red-500" />
                        <span className="truncate max-w-md">{ride.dropoffAddress}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(ride.scheduledTime)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        <span>{formatPrice(ride.finalPrice || ride.estimatedPrice)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span>Rider #{ride.riderId}</span>
                      </div>
                      {ride.driverId && (
                        <div className="flex items-center gap-1">
                          <Car className="h-3 w-3" />
                          <span>Driver #{ride.driverId}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onSelectRide(ride)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View Details
                  </Button>
                  
                  {ride.status === 'requested' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => rideActionMutation.mutate({
                        action: 'force_assign',
                        rideId: ride.id,
                        reason: 'Administrative intervention'
                      })}
                    >
                      <Play className="h-4 w-4 mr-1" />
                      Force Assign
                    </Button>
                  )}

                  {ride.status !== 'completed' && ride.status !== 'cancelled' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => rideActionMutation.mutate({
                        action: 'cancel',
                        rideId: ride.id,
                        reason: 'Administrative cancellation'
                      })}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onShowOverrideDialog(ride)}
                  >
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    Override
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {filteredRides.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No rides found matching your criteria.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}