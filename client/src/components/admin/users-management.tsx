import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Search, 
  Edit, 
  Trash2,
  Mail,
  Phone,
  Shield,
  Ban,
  CheckCircle,
  Clock,
  AlertTriangle,
  UserCheck,
  UserX
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface User {
  id: number;
  username: string;
  fullName: string;
  email: string;
  phone: string;
  role: 'rider' | 'driver' | 'admin';
  emailVerified: boolean;
  phoneVerified: boolean;
  accountStatus: 'active' | 'suspended' | 'blocked' | 'pending';
  createdAt: string;
  lastLogin?: string;
}

interface UsersManagementProps {
  adminUsers: User[] | undefined;
  usersLoading: boolean;
  onSelectUser: (user: User) => void;
  onShowOverrideDialog: (user: User) => void;
}

export function UsersManagement({ 
  adminUsers, 
  usersLoading, 
  onSelectUser, 
  onShowOverrideDialog 
}: UsersManagementProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
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
        description: data.message || "User action has been completed successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
    onError: () => {
      toast({
        title: "Action Failed",
        description: "Failed to complete user action",
        variant: "destructive",
      });
    }
  });

  // Filter users based on search and filters
  const filteredUsers = adminUsers?.filter(user => {
    const matchesSearch = user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = selectedRole === 'all' || user.role === selectedRole;
    const matchesStatus = selectedStatus === 'all' || user.accountStatus === selectedStatus;
    
    return matchesSearch && matchesRole && matchesStatus;
  }) || [];

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'driver': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'rider': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'suspended': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'blocked': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (usersLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Users Management
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
          <Users className="h-5 w-5" />
          Users Management
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="px-3 py-2 border rounded-md text-sm"
              >
                <option value="all">All Roles</option>
                <option value="admin">Admin</option>
                <option value="driver">Driver</option>
                <option value="rider">Rider</option>
              </select>
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
            </div>
          </div>

          {/* Users List */}
          <div className="space-y-2">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">{user.fullName}</h3>
                      <Badge className={`text-xs ${getRoleColor(user.role)}`}>
                        {user.role}
                      </Badge>
                      <Badge className={`text-xs ${getStatusColor(user.accountStatus)}`}>
                        {user.accountStatus}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">@{user.username}</p>
                    <div className="flex items-center gap-4 mt-1">
                      <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        <span className="text-xs text-muted-foreground">{user.email}</span>
                        {user.emailVerified && <CheckCircle className="h-3 w-3 text-green-500" />}
                      </div>
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        <span className="text-xs text-muted-foreground">{user.phone}</span>
                        {user.phoneVerified && <CheckCircle className="h-3 w-3 text-green-500" />}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onSelectUser(user)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  
                  {user.accountStatus === 'active' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => userActionMutation.mutate({
                        action: 'suspend',
                        userId: user.id,
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
                        userId: user.id,
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
                    onClick={() => onShowOverrideDialog(user)}
                  >
                    <Shield className="h-4 w-4 mr-1" />
                    Override
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No users found matching your criteria.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}