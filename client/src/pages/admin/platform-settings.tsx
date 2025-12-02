import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Settings, Save, Plus, Trash2, Edit, DollarSign, Percent } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PlatformSetting } from "@shared/schema";

interface SettingFormData {
  key: string;
  value: string;
  description?: string;
}

export default function PlatformSettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingSetting, setEditingSetting] = useState<PlatformSetting | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [formData, setFormData] = useState<SettingFormData>({
    key: "",
    value: "",
    description: ""
  });

  // Fetch platform settings
  const { data: settings = [], isLoading } = useQuery({
    queryKey: ["/api/admin/platform-settings"],
    queryFn: () => apiRequest("GET", "/api/admin/platform-settings")
  });

  // Add setting mutation
  const addSettingMutation = useMutation({
    mutationFn: (data: SettingFormData) => 
      apiRequest("POST", "/api/admin/platform-settings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/platform-settings"] });
      toast({
        title: "Setting Added",
        description: "Platform setting has been added successfully."
      });
      setIsAddDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add platform setting",
        variant: "destructive"
      });
    }
  });

  // Update setting mutation
  const updateSettingMutation = useMutation({
    mutationFn: ({ key, ...data }: SettingFormData) => 
      apiRequest("PUT", `/api/admin/platform-settings/${key}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/platform-settings"] });
      toast({
        title: "Setting Updated",
        description: "Platform setting has been updated successfully."
      });
      setIsEditDialogOpen(false);
      setEditingSetting(null);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update platform setting",
        variant: "destructive"
      });
    }
  });

  // Delete setting mutation
  const deleteSettingMutation = useMutation({
    mutationFn: (key: string) => 
      apiRequest("DELETE", `/api/admin/platform-settings/${key}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/platform-settings"] });
      toast({
        title: "Setting Deleted",
        description: "Platform setting has been deleted successfully."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete platform setting",
        variant: "destructive"
      });
    }
  });

  const resetForm = () => {
    setFormData({ key: "", value: "", description: "" });
  };

  const handleAddSetting = () => {
    if (!formData.key || !formData.value) {
      toast({
        title: "Validation Error",
        description: "Key and value are required",
        variant: "destructive"
      });
      return;
    }
    addSettingMutation.mutate(formData);
  };

  const handleUpdateSetting = () => {
    if (!formData.value) {
      toast({
        title: "Validation Error",
        description: "Value is required",
        variant: "destructive"
      });
      return;
    }
    updateSettingMutation.mutate(formData);
  };

  const handleEditClick = (setting: PlatformSetting) => {
    setEditingSetting(setting);
    setFormData({
      key: setting.key,
      value: setting.value,
      description: setting.description || ""
    });
    setIsEditDialogOpen(true);
  };

  const handleDeleteClick = (key: string) => {
    if (window.confirm(`Are you sure you want to delete the setting "${key}"?`)) {
      deleteSettingMutation.mutate(key);
    }
  };

  const getSettingIcon = (key: string) => {
    if (key.includes('fee') || key.includes('price')) return <DollarSign className="h-4 w-4" />;
    if (key.includes('percentage') || key.includes('rate')) return <Percent className="h-4 w-4" />;
    return <Settings className="h-4 w-4" />;
  };

  const getSettingDisplayValue = (setting: PlatformSetting) => {
    if (setting.key.includes('percentage')) {
      return `${setting.value}%`;
    }
    if (setting.key.includes('fee') || setting.key.includes('price')) {
      return `$${setting.value}`;
    }
    return setting.value;
  };

  // Initialize platform fee if it doesn't exist
  useEffect(() => {
    if (settings && settings.length >= 0) {
      const hasPlatformFee = settings.some((s: PlatformSetting) => s.key === 'platform_fee_percentage');
      if (!hasPlatformFee && settings.length === 0) {
        // Add default platform fee setting
        addSettingMutation.mutate({
          key: 'platform_fee_percentage',
          value: '5.0',
          description: 'Platform fee percentage taken from driver earnings'
        });
      }
    }
  }, [settings]);

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Platform Settings</h1>
          <p className="text-muted-foreground mt-2">
            Configure global platform parameters and system settings
          </p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Setting
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Platform Setting</DialogTitle>
              <DialogDescription>
                Create a new platform configuration setting.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="key">Setting Key</Label>
                <Input
                  id="key"
                  value={formData.key}
                  onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                  placeholder="e.g., platform_fee_percentage"
                />
              </div>
              <div>
                <Label htmlFor="value">Value</Label>
                <Input
                  id="value"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  placeholder="e.g., 5.0"
                />
              </div>
              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of this setting"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleAddSetting}
                  disabled={addSettingMutation.isPending}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Add Setting
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        {settings.map((setting: PlatformSetting) => (
          <Card key={setting.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {getSettingIcon(setting.key)}
                  <span className="text-lg font-semibold">{setting.key}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditClick(setting)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteClick(setting.key)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardTitle>
              {setting.description && (
                <CardDescription>{setting.description}</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {getSettingDisplayValue(setting)}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Last updated: {new Date(setting.updatedAt).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        ))}

        {settings.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Settings className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Settings Configured</h3>
              <p className="text-muted-foreground text-center mb-4">
                Start by adding platform configuration settings to control system behavior.
              </p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Setting
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Platform Setting</DialogTitle>
            <DialogDescription>
              Update the configuration for "{editingSetting?.key}".
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-key">Setting Key</Label>
              <Input
                id="edit-key"
                value={formData.key}
                disabled
                className="bg-muted"
              />
            </div>
            <div>
              <Label htmlFor="edit-value">Value</Label>
              <Input
                id="edit-value"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                placeholder="e.g., 5.0"
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description (Optional)</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of this setting"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsEditDialogOpen(false);
                  setEditingSetting(null);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleUpdateSetting}
                disabled={updateSettingMutation.isPending}
              >
                <Save className="h-4 w-4 mr-2" />
                Update Setting
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}