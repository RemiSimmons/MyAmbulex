import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { MapPin, Home, Navigation, Trash2, Plus, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { SavedAddress } from "@shared/schema";

export default function SavedAddressesPage() {
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const [addressToDelete, setAddressToDelete] = useState<number | null>(null);
  
  const { data: addresses, isLoading } = useQuery<SavedAddress[]>({
    queryKey: ["/api/saved-addresses"],
  });
  
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/saved-addresses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-addresses"] });
      toast({
        title: "Address deleted",
        description: "The address has been successfully deleted",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete address",
        variant: "destructive",
      });
    },
  });
  
  const defaultMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("PUT", `/api/saved-addresses/${id}`, { isDefault: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-addresses"] });
      toast({
        title: "Default address updated",
        description: "Your default address has been updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update default address",
        variant: "destructive",
      });
    },
  });
  
  const confirmDelete = () => {
    if (addressToDelete) {
      deleteMutation.mutate(addressToDelete);
      setAddressToDelete(null);
    }
  };
  
  const handleSetDefault = (id: number) => {
    defaultMutation.mutate(id);
  };
  
  const getAddressTypeIcon = (addressType: string) => {
    switch (addressType) {
      case "home":
        return <Home className="w-4 h-4 mr-1" />;
      case "work":
        return <MapPin className="w-4 h-4 mr-1" />;
      default:
        return <Navigation className="w-4 h-4 mr-1" />;
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Saved Addresses</h1>
          <p className="text-muted-foreground">Manage your frequently used addresses</p>
        </div>
        <Button onClick={() => navigate("/rider/addresses/new")}>
          <Plus className="w-4 h-4 mr-2" /> Add New Address
        </Button>
      </div>
      
      {addresses && addresses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {addresses.map((address) => (
            <Card key={address.id} className="h-full flex flex-col">
              <CardHeader className="pb-3 flex flex-row justify-between items-start">
                <div>
                  <CardTitle className="flex items-center">
                    {getAddressTypeIcon(address.addressType)}
                    {address.name || address.addressType.charAt(0).toUpperCase() + address.addressType.slice(1)}
                  </CardTitle>
                  <CardDescription>
                    {address.isDefault && (
                      <Badge variant="outline" className="mt-1">Default</Badge>
                    )}
                  </CardDescription>
                </div>
                <div className="flex space-x-1">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => navigate(`/rider/addresses/edit/${address.id}`)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setAddressToDelete(address.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete this address. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setAddressToDelete(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardHeader>
              <CardContent className="flex-grow pb-2">
                <p className="text-sm">{address.address}</p>
                <p className="text-sm">
                  {address.city}, {address.state} {address.zipCode}
                </p>
                {address.notes && (
                  <p className="text-sm text-muted-foreground mt-2">
                    <span className="font-semibold">Notes:</span> {address.notes}
                  </p>
                )}
              </CardContent>
              <CardFooter className="pt-2">
                {!address.isDefault && (
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={() => handleSetDefault(address.id)}
                  >
                    Set as Default
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-8 text-center">
          <div className="mb-4">
            <MapPin className="w-12 h-12 mx-auto text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No Saved Addresses</h3>
          <p className="text-muted-foreground mb-4">
            You don't have any saved addresses yet. Save addresses to make booking rides easier.
          </p>
          <Button onClick={() => navigate("/rider/addresses/new")}>
            <Plus className="w-4 h-4 mr-2" /> Add New Address
          </Button>
        </Card>
      )}
    </div>
  );
}