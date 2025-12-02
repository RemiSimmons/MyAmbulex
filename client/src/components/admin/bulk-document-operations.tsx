import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { apiRequest } from '@/lib/queryClient';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  FileText,
  User,
  Calendar,
  Download,
  RefreshCw
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface DocumentItem {
  id: number;
  userId: number;
  userName: string;
  userEmail: string;
  documentType: string;
  documentTitle: string;
  uploadedAt: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  rejectionReason?: string;
  expirationDate?: string;
  fileUrl: string;
}

interface BulkAction {
  action: 'approve' | 'reject';
  reason?: string;
}

const DOCUMENT_TYPE_LABELS = {
  drivers_license: "Driver's License",
  vehicle_registration: "Vehicle Registration", 
  insurance_card: "Insurance Card",
  background_check: "Background Check",
  drug_test: "Drug Test Results",
  mvr_record: "MVR Record",
  first_aid_certification: "First Aid Certification",
  cpr_certification: "CPR Certification"
};

export function BulkDocumentOperations() {
  const [selectedDocuments, setSelectedDocuments] = useState<number[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [bulkAction, setBulkAction] = useState<BulkAction | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch documents requiring review
  const { data: documents = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/admin/documents/pending-review'],
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Bulk update mutation
  const bulkUpdateMutation = useMutation({
    mutationFn: async (data: { documentIds: number[], action: string, reason?: string }) => {
      return apiRequest('/api/admin/documents/bulk-update', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    onSuccess: (data) => {
      toast({
        title: 'Bulk Operation Complete',
        description: `Successfully ${bulkAction?.action}d ${selectedDocuments.length} document${selectedDocuments.length === 1 ? '' : 's'}`,
      });
      setSelectedDocuments([]);
      setShowBulkDialog(false);
      setBulkAction(null);
      setRejectionReason('');
      queryClient.invalidateQueries({ queryKey: ['/api/admin/documents/pending-review'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/documents/expiration-summary'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Bulk Operation Failed',
        description: error.message || 'Operation failed',
        variant: 'destructive'
      });
    }
  });

  // Filter documents
  const filteredDocuments = documents.filter((doc: DocumentItem) => {
    const statusMatch = filterStatus === 'all' || doc.status === filterStatus;
    const typeMatch = filterType === 'all' || doc.documentType === filterType;
    return statusMatch && typeMatch;
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const selectableIds = filteredDocuments
        .filter((doc: DocumentItem) => doc.status === 'pending')
        .map((doc: DocumentItem) => doc.id);
      setSelectedDocuments(selectableIds);
    } else {
      setSelectedDocuments([]);
    }
  };

  const handleSelectDocument = (documentId: number, checked: boolean) => {
    if (checked) {
      setSelectedDocuments(prev => [...prev, documentId]);
    } else {
      setSelectedDocuments(prev => prev.filter(id => id !== documentId));
    }
  };

  const handleBulkAction = (action: 'approve' | 'reject') => {
    if (selectedDocuments.length === 0) {
      toast({
        title: 'No Documents Selected',
        description: 'Please select documents to perform bulk actions.',
        variant: 'destructive'
      });
      return;
    }

    setBulkAction({ action });
    setShowBulkDialog(true);
  };

  const confirmBulkAction = () => {
    if (!bulkAction) return;

    const data = {
      documentIds: selectedDocuments,
      action: bulkAction.action,
      ...(bulkAction.action === 'reject' && rejectionReason && { reason: rejectionReason })
    };

    bulkUpdateMutation.mutate(data);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'rejected': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'expired': return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      default: return <Clock className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800', 
      expired: 'bg-orange-100 text-orange-800',
      pending: 'bg-yellow-100 text-yellow-800'
    };

    return (
      <Badge className={variants[status as keyof typeof variants] || variants.pending}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const pendingCount = filteredDocuments.filter((doc: DocumentItem) => doc.status === 'pending').length;
  const selectedCount = selectedDocuments.length;

  return (
    <div className="space-y-6">
      {/* Header with stats */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                Bulk Document Operations
              </CardTitle>
              <p className="text-muted-foreground mt-1">
                Manage multiple documents efficiently with bulk actions
              </p>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline" className="text-yellow-700">
                {pendingCount} Pending Review
              </Badge>
              {selectedCount > 0 && (
                <Badge className="bg-blue-100 text-blue-800">
                  {selectedCount} Selected
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Filters and bulk actions */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Filters */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Filter:</span>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {Object.entries(DOCUMENT_TYPE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>

            {/* Bulk actions */}
            {selectedCount > 0 && (
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-sm text-muted-foreground">
                  {selectedCount} selected:
                </span>
                <Button
                  size="sm"
                  onClick={() => handleBulkAction('approve')}
                  disabled={bulkUpdateMutation.isPending}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleBulkAction('reject')}
                  disabled={bulkUpdateMutation.isPending}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Documents table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Loading documents...</p>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="p-8 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No Documents Found</h3>
              <p className="text-muted-foreground">
                {filterStatus !== 'all' || filterType !== 'all'
                  ? 'Try adjusting your filters'
                  : 'No documents require review at this time'
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="p-3 text-left">
                      <Checkbox
                        checked={
                          pendingCount > 0 && 
                          selectedDocuments.length === filteredDocuments.filter((doc: DocumentItem) => doc.status === 'pending').length
                        }
                        onCheckedChange={handleSelectAll}
                        disabled={pendingCount === 0}
                      />
                    </th>
                    <th className="p-3 text-left font-medium">Driver</th>
                    <th className="p-3 text-left font-medium">Document</th>
                    <th className="p-3 text-left font-medium">Status</th>
                    <th className="p-3 text-left font-medium">Uploaded</th>
                    <th className="p-3 text-left font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDocuments.map((doc: DocumentItem) => (
                    <tr key={doc.id} className="border-b hover:bg-muted/30">
                      <td className="p-3">
                        <Checkbox
                          checked={selectedDocuments.includes(doc.id)}
                          onCheckedChange={(checked) => handleSelectDocument(doc.id, checked as boolean)}
                          disabled={doc.status !== 'pending'}
                        />
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{doc.userName}</p>
                            <p className="text-sm text-muted-foreground">{doc.userEmail}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <div>
                          <p className="font-medium">{doc.documentTitle}</p>
                          <p className="text-sm text-muted-foreground">ID: {doc.id}</p>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(doc.status)}
                          {getStatusBadge(doc.status)}
                        </div>
                        {doc.rejectionReason && (
                          <p className="text-xs text-red-600 mt-1">
                            {doc.rejectionReason}
                          </p>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {new Date(doc.uploadedAt).toLocaleDateString()}
                        </div>
                        {doc.expirationDate && (
                          <div className="flex items-center gap-1 text-xs text-orange-600">
                            <AlertTriangle className="h-3 w-3" />
                            Expires {new Date(doc.expirationDate).toLocaleDateString()}
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(doc.fileUrl, '_blank')}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk action confirmation dialog */}
      <AlertDialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Confirm Bulk {bulkAction?.action === 'approve' ? 'Approval' : 'Rejection'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              You are about to {bulkAction?.action} {selectedCount} document{selectedCount === 1 ? '' : 's'}.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {bulkAction?.action === 'reject' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Rejection Reason (Optional)</label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Provide a reason for rejection..."
                className="w-full p-2 border rounded-md text-sm"
                rows={3}
              />
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBulkAction}
              className={bulkAction?.action === 'reject' ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              {bulkUpdateMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                `${bulkAction?.action === 'approve' ? 'Approve' : 'Reject'} ${selectedCount} Document${selectedCount === 1 ? '' : 's'}`
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}