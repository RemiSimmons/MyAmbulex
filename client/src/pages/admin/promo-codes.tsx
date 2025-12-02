import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Copy, Users, Calendar, DollarSign } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { apiRequest } from '@/lib/queryClient';

interface PromoCode {
  id: number;
  code: string;
  description: string;
  discountType: 'fixed_amount' | 'percentage' | 'set_price';
  discountValue: number;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  isActive: boolean;
  applicableRoles: string[];
  minimumAmount: number;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

interface PromoCodeFormData {
  code: string;
  description: string;
  discountType: 'fixed_amount' | 'percentage' | 'set_price';
  discountValue: number;
  maxUses: number | null;
  expiresAt: string;
  isActive: boolean;
  applicableRoles: string[];
  minimumAmount: number;
}

export default function AdminPromoCodes() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingPromoCode, setEditingPromoCode] = useState<PromoCode | null>(null);
  const [formData, setFormData] = useState<PromoCodeFormData>({
    code: '',
    description: '',
    discountType: 'fixed_amount',
    discountValue: 0,
    maxUses: null,
    expiresAt: '',
    isActive: true,
    applicableRoles: ['rider', 'driver'],
    minimumAmount: 0,
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch promo codes
  const { data: promoCodes = [], isLoading } = useQuery<PromoCode[]>({
    queryKey: ['/api/admin/promo-codes'],
  });

  // Create promo code mutation
  const createPromoCode = useMutation({
    mutationFn: async (data: PromoCodeFormData) => {
      return await apiRequest('/api/admin/promo-codes', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Promo code created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/promo-codes'] });
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create promo code",
        variant: "destructive",
      });
    },
  });

  // Update promo code mutation
  const updatePromoCode = useMutation({
    mutationFn: async (data: { id: number; updates: Partial<PromoCodeFormData> }) => {
      return await apiRequest(`/api/admin/promo-codes/${data.id}`, {
        method: 'PUT',
        body: JSON.stringify(data.updates),
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Promo code updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/promo-codes'] });
      setEditingPromoCode(null);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update promo code",
        variant: "destructive",
      });
    },
  });

  // Delete promo code mutation
  const deletePromoCode = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/admin/promo-codes/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Promo code deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/promo-codes'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete promo code",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      code: '',
      description: '',
      discountType: 'fixed_amount',
      discountValue: 0,
      maxUses: null,
      expiresAt: '',
      isActive: true,
      applicableRoles: ['rider', 'driver'],
      minimumAmount: 0,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPromoCode) {
      updatePromoCode.mutate({ id: editingPromoCode.id, updates: formData });
    } else {
      createPromoCode.mutate(formData);
    }
  };

  const handleEdit = (promoCode: PromoCode) => {
    setEditingPromoCode(promoCode);
    setFormData({
      code: promoCode.code,
      description: promoCode.description,
      discountType: promoCode.discountType,
      discountValue: promoCode.discountValue,
      maxUses: promoCode.maxUses,
      expiresAt: promoCode.expiresAt ? new Date(promoCode.expiresAt).toISOString().split('T')[0] : '',
      isActive: promoCode.isActive,
      applicableRoles: promoCode.applicableRoles,
      minimumAmount: promoCode.minimumAmount,
    });
    setIsCreateDialogOpen(true);
  };

  const copyPromoCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: "Copied",
      description: `Promo code "${code}" copied to clipboard`,
    });
  };

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, code: result }));
  };

  const formatDiscountValue = (promoCode: PromoCode) => {
    switch (promoCode.discountType) {
      case 'fixed_amount':
        return `$${promoCode.discountValue.toFixed(2)}`;
      case 'percentage':
        return `${promoCode.discountValue}%`;
      case 'set_price':
        return `Set to $${promoCode.discountValue.toFixed(2)}`;
      default:
        return promoCode.discountValue.toString();
    }
  };

  const getDiscountBadgeColor = (discountType: string) => {
    switch (discountType) {
      case 'fixed_amount':
        return 'bg-green-100 text-green-800';
      case 'percentage':
        return 'bg-blue-100 text-blue-800';
      case 'set_price':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Promo Code Management</h1>
          <p className="text-gray-600">Create and manage discount codes for your platform</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setEditingPromoCode(null); }}>
              <Plus className="w-4 h-4 mr-2" />
              Create Promo Code
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingPromoCode ? 'Edit Promo Code' : 'Create New Promo Code'}
              </DialogTitle>
              <DialogDescription>
                {editingPromoCode ? 'Update the promo code details' : 'Create a new discount code for your platform'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="code">Promo Code</Label>
                  <div className="flex gap-2">
                    <Input
                      id="code"
                      value={formData.code}
                      onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                      placeholder="DISCOUNT2024"
                      required
                    />
                    <Button type="button" variant="outline" onClick={generateRandomCode}>
                      Generate
                    </Button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="discountType">Discount Type</Label>
                  <Select value={formData.discountType} onValueChange={(value: any) => setFormData(prev => ({ ...prev, discountType: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed_amount">Fixed Amount ($)</SelectItem>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                      <SelectItem value="set_price">Set Price ($)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe what this promo code offers..."
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="discountValue">
                    Discount Value {formData.discountType === 'percentage' ? '(%)' : '($)'}
                  </Label>
                  <Input
                    id="discountValue"
                    type="number"
                    step="0.01"
                    value={formData.discountValue}
                    onChange={(e) => setFormData(prev => ({ ...prev, discountValue: parseFloat(e.target.value) || 0 }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="minimumAmount">Minimum Order Amount ($)</Label>
                  <Input
                    id="minimumAmount"
                    type="number"
                    step="0.01"
                    value={formData.minimumAmount}
                    onChange={(e) => setFormData(prev => ({ ...prev, minimumAmount: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="maxUses">Maximum Uses (optional)</Label>
                  <Input
                    id="maxUses"
                    type="number"
                    value={formData.maxUses || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, maxUses: e.target.value ? parseInt(e.target.value) : null }))}
                    placeholder="Unlimited"
                  />
                </div>
                <div>
                  <Label htmlFor="expiresAt">Expiration Date (optional)</Label>
                  <Input
                    id="expiresAt"
                    type="date"
                    value={formData.expiresAt}
                    onChange={(e) => setFormData(prev => ({ ...prev, expiresAt: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label>Applicable Roles</Label>
                <div className="flex gap-4 mt-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.applicableRoles.includes('rider')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData(prev => ({ ...prev, applicableRoles: [...prev.applicableRoles, 'rider'] }));
                        } else {
                          setFormData(prev => ({ ...prev, applicableRoles: prev.applicableRoles.filter(r => r !== 'rider') }));
                        }
                      }}
                      className="mr-2"
                    />
                    Riders
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.applicableRoles.includes('driver')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData(prev => ({ ...prev, applicableRoles: [...prev.applicableRoles, 'driver'] }));
                        } else {
                          setFormData(prev => ({ ...prev, applicableRoles: prev.applicableRoles.filter(r => r !== 'driver') }));
                        }
                      }}
                      className="mr-2"
                    />
                    Drivers
                  </label>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                />
                <Label htmlFor="isActive">Active</Label>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createPromoCode.isPending || updatePromoCode.isPending}>
                  {editingPromoCode ? 'Update' : 'Create'} Promo Code
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {promoCodes.map((promoCode) => (
          <Card key={promoCode.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-mono">{promoCode.code}</CardTitle>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyPromoCode(promoCode.code)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(promoCode)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deletePromoCode.mutate(promoCode.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={getDiscountBadgeColor(promoCode.discountType)}>
                  {formatDiscountValue(promoCode)}
                </Badge>
                <Badge variant={promoCode.isActive ? "default" : "secondary"}>
                  {promoCode.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="mb-3">{promoCode.description}</CardDescription>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>Used {promoCode.usedCount} times</span>
                  {promoCode.maxUses && (
                    <span className="text-gray-500">/ {promoCode.maxUses} max</span>
                  )}
                </div>
                
                {promoCode.expiresAt && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>Expires {new Date(promoCode.expiresAt).toLocaleDateString()}</span>
                  </div>
                )}
                
                {promoCode.minimumAmount > 0 && (
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    <span>Min. ${promoCode.minimumAmount.toFixed(2)}</span>
                  </div>
                )}
                
                <div className="flex flex-wrap gap-1 mt-2">
                  {promoCode.applicableRoles.map((role) => (
                    <Badge key={role} variant="outline" className="text-xs">
                      {role}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {promoCodes.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <p className="text-gray-500 mb-4">No promo codes created yet</p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Promo Code
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}