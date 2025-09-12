import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertVendorSchema, type Vendor, type Item } from "@shared/schema";
import { z } from "zod";
import { 
  Users, 
  Plus, 
  Search, 
  Eye, 
  Edit, 
  Trash2, 
  Phone,
  Mail,
  User,
  Package,
  DollarSign,
  TrendingUp,
  Star,
  CheckCircle,
  Clock,
  AlertCircle,
  MoreVertical,
  Building2
} from "lucide-react";

const vendorFormSchema = insertVendorSchema.extend({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(1, "Phone is required"),
  email: z.string().email("Valid email is required")
});

type VendorFormData = z.infer<typeof vendorFormSchema>;

interface VendorWithStats extends Vendor {
  totalItems: number;
  activeItems: number;
  soldItems: number;
  totalValue: {
    min: number;
    max: number;
  };
  pendingPayouts: {
    min: number;
    max: number;
  };
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount || 0);
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function formatNumber(amount: number) {
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)}K`;
  }
  return amount.toString();
}

function formatCurrencyAbbreviated(amount: number) {
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}K`;
  }
  return formatCurrency(amount);
}

function formatCurrencyRange(min: number, max: number) {
  if (min === max) {
    return formatCurrency(min);
  }
  return `${formatCurrency(min)} - ${formatCurrency(max)}`;
}

function formatCurrencyRangeAbbreviated(min: number, max: number) {
  if (min === max) {
    return formatCurrencyAbbreviated(min);
  }
  return `${formatCurrencyAbbreviated(min)} - ${formatCurrencyAbbreviated(max)}`;
}

export default function Vendors() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: vendors, isLoading: vendorsLoading } = useQuery<VendorWithStats[]>({
    queryKey: ['/api/vendors'],
    select: (vendors: Vendor[]) => {
      return vendors.map(vendor => ({
        ...vendor,
        totalItems: 0,
        activeItems: 0,
        soldItems: 0,
        totalValue: { min: 0, max: 0 },
        pendingPayouts: { min: 0, max: 0 }
      }));
    }
  });

  const { data: items } = useQuery<Array<Item & { vendor: Vendor }>>({
    queryKey: ['/api/items'],
  });

  const createVendorMutation = useMutation({
    mutationFn: async (data: VendorFormData) => {
      return await apiRequest('POST', '/api/vendors', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vendors'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/metrics'] });
      setIsCreateModalOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Vendor created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create vendor",
        variant: "destructive",
      });
    },
  });

  const deleteVendorMutation = useMutation({
    mutationFn: async (vendorId: string) => {
      return await apiRequest(`/api/vendors/${vendorId}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vendors'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/metrics'] });
      toast({
        title: "Success",
        description: "Vendor deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete vendor",
        variant: "destructive",
      });
    },
  });

  const form = useForm<VendorFormData>({
    resolver: zodResolver(vendorFormSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      taxId: "",
      bankAccountNumber: "",
      bankName: "",
      accountType: undefined
    },
  });

  const onSubmit = (data: VendorFormData) => {
    createVendorMutation.mutate(data);
  };

  const handleDeleteVendor = (vendorId: string, vendorName: string) => {
    if (confirm(`Are you sure you want to delete "${vendorName}"? This action cannot be undone.`)) {
      deleteVendorMutation.mutate(vendorId);
    }
  };

  // Calculate vendor statistics
  const vendorsWithStats = vendors?.map(vendor => {
    const vendorItems = items?.filter(item => item.vendorId === vendor.vendorId) || [];
    const activeItems = vendorItems.filter(item => item.status === 'in-store' || item.status === 'reserved').length;
    const soldItems = vendorItems.filter(item => item.status === 'sold').length;
    const totalValue = vendorItems.reduce((acc, item) => ({
      min: acc.min + Number(item.minSalesPrice || 0),
      max: acc.max + Number(item.maxSalesPrice || 0)
    }), { min: 0, max: 0 });
    
    const soldVendorItems = vendorItems.filter(item => item.status === 'sold');
    const pendingPayouts = soldVendorItems.reduce((acc, item) => ({
      min: acc.min + Number(item.minCost || 0),
      max: acc.max + Number(item.maxCost || 0)
    }), { min: 0, max: 0 });

    return {
      ...vendor,
      totalItems: vendorItems.length,
      activeItems,
      soldItems,
      totalValue,
      pendingPayouts
    };
  }) || [];

  // Filter vendors based on search term
  const filteredVendors = vendorsWithStats.filter(vendor =>
    vendor.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendor.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendor.phone?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate overall metrics
  const totalVendors = vendors?.length || 0;
  const activeVendors = vendorsWithStats.filter(v => v.activeItems > 0).length;
  const totalItems = vendorsWithStats.reduce((sum, v) => sum + v.totalItems, 0);
  const totalValueRange = vendorsWithStats.reduce((acc, v) => ({
    min: acc.min + v.totalValue.min,
    max: acc.max + v.totalValue.max
  }), { min: 0, max: 0 });
  
  const totalPendingPayoutsRange = vendorsWithStats.reduce((acc, v) => ({
    min: acc.min + v.pendingPayouts.min,
    max: acc.max + v.pendingPayouts.max
  }), { min: 0, max: 0 });

  // Calculate active vendors with active listings stats
  const vendorsWithActiveItems = vendorsWithStats.filter(v => v.activeItems > 0);
  const activeItemsList = items?.filter(item => 
    item.status === 'in-store' || item.status === 'reserved'
  ) || [];
  
  const activeVendorsStats = {
    qtyVendors: vendorsWithActiveItems.length,
    costRange: activeItemsList.reduce((acc, item) => ({
      min: acc.min + Number(item.minCost || 0),
      max: acc.max + Number(item.maxCost || item.minCost || 0)
    }), { min: 0, max: 0 }),
    marketValueRange: activeItemsList.reduce((acc, item) => ({
      min: acc.min + Number(item.minSalesPrice || 0),
      max: acc.max + Number(item.maxSalesPrice || item.minSalesPrice || 0)
    }), { min: 0, max: 0 })
  };

  // Calculate Luxette vendor active listings data
  const luxetteVendor = vendorsWithStats.find(v => v.name?.toLowerCase().includes('luxette'));
  const luxetteActiveItems = items?.filter(item => 
    item.vendor.name?.toLowerCase().includes('luxette') && 
    (item.status === 'in-store' || item.status === 'reserved')
  ) || [];
  
  const luxetteStats = {
    qtyItems: luxetteActiveItems.length,
    totalCost: luxetteActiveItems.reduce((sum, item) => sum + Number(item.minCost || 0), 0),
    valueRange: luxetteActiveItems.reduce((acc, item) => ({
      min: acc.min + Number(item.minSalesPrice || 0),
      max: acc.max + Number(item.maxSalesPrice || 0)
    }), { min: 0, max: 0 })
  };

  return (
    <MainLayout title="Vendors" subtitle="Manage vendor relationships and consignment agreements">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Vendors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{activeVendorsStats.qtyVendors} Vendors</div>
            <div className="text-sm font-medium text-muted-foreground mb-1">
              Cost: {formatCurrencyRangeAbbreviated(activeVendorsStats.costRange.min, activeVendorsStats.costRange.max)}
            </div>
            <p className="text-xs text-muted-foreground">
              Value: {formatCurrencyRangeAbbreviated(activeVendorsStats.marketValueRange.min, activeVendorsStats.marketValueRange.max)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Luxette Active Listings</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{luxetteStats.qtyItems} Items</div>
            <div className="text-sm font-medium text-muted-foreground mb-1">
              Cost: {formatCurrencyAbbreviated(luxetteStats.totalCost)}
            </div>
            <p className="text-xs text-muted-foreground">
              Value: {formatCurrencyRangeAbbreviated(luxetteStats.valueRange.min, luxetteStats.valueRange.max)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItems}</div>
            <p className="text-xs text-muted-foreground">
              Consigned items
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{formatCurrencyRangeAbbreviated(totalValueRange.min, totalValueRange.max)}</div>
            <p className="text-xs text-muted-foreground">
              Valor combinado del inventario
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pagos Pendientes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{formatCurrencyRangeAbbreviated(totalPendingPayoutsRange.min, totalPendingPayoutsRange.max)}</div>
            <p className="text-xs text-muted-foreground">
              Esperando pago
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar consignadores por nombre, email o teléfono..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button className="hidden sm:flex" data-testid="button-add-vendor">
              <Plus className="h-4 w-4 mr-2" />
              Agregar Consignador
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Agregar Nuevo Consignador</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre</FormLabel>
                      <FormControl>
                        <Input placeholder="Nombre del consignador" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teléfono</FormLabel>
                      <FormControl>
                        <Input placeholder="Phone number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="Email address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="taxId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tax ID</FormLabel>
                      <FormControl>
                        <Input placeholder="Tax identification number" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bankAccountNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bank Account Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Account number" {...field} value={field.value || ""} data-testid="input-bank-account-number" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bankName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bank Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Bank name" {...field} value={field.value || ""} data-testid="input-bank-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="accountType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} data-testid="select-account-type">
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select account type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Ahorros">Ahorros</SelectItem>
                          <SelectItem value="Corriente">Corriente</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createVendorMutation.isPending}>
                    {createVendorMutation.isPending ? "Adding..." : "Add Vendor"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Vendors List */}
      <div className="space-y-4">
        {vendorsLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Skeleton className="w-12 h-12 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-8 w-24" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : filteredVendors.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {searchTerm ? "No vendors found" : "No vendors yet"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm 
                  ? "Try adjusting your search terms" 
                  : "Start by adding your first vendor to the system"
                }
              </p>
              {!searchTerm && (
                <Button onClick={() => setIsCreateModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Vendor
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredVendors.map((vendor) => (
            <Card key={vendor.vendorId} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 md:p-6">
                <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
                  {/* Mobile: Header row with name and actions */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                        <User className="h-6 w-6 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-lg truncate">{vendor.name}</h3>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 text-sm text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <Mail className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{vendor.email}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Phone className="h-3 w-3 flex-shrink-0" />
                            <span>{vendor.phone}</span>
                          </div>
                          {vendor.bankName && (
                            <div className="flex items-center space-x-1">
                              <Building2 className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">{vendor.bankName}</span>
                              {vendor.accountType && (
                                <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                                  {vendor.accountType}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Mobile actions dropdown */}
                    <div className="md:hidden">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" data-testid="button-vendor-actions">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/vendor/${vendor.vendorId}`} className="flex items-center w-full">
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/vendor/${vendor.vendorId}`} className="flex items-center w-full">
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Vendor
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteVendor(vendor.vendorId, vendor.name || "Vendor")}
                            disabled={deleteVendorMutation.isPending}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Stats section - responsive grid */}
                  <div className="grid grid-cols-2 gap-4 md:flex md:items-center md:space-x-8 md:gap-0">
                    <div className="text-center md:text-right">
                      <div className="text-sm font-medium">
                        {vendor.totalItems} items
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {vendor.activeItems} active • {vendor.soldItems} sold
                      </div>
                    </div>

                    <div className="text-center md:text-right">
                      <div className="text-sm font-medium">
                        {formatCurrencyRange(vendor.totalValue.min, vendor.totalValue.max)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Total value
                      </div>
                    </div>

                    {(vendor.pendingPayouts.min > 0 || vendor.pendingPayouts.max > 0) && (
                      <div className="text-center md:text-right col-span-2 md:col-span-1">
                        <div className="text-sm font-medium text-amber-600">
                          {formatCurrencyRange(vendor.pendingPayouts.min, vendor.pendingPayouts.max)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Pending payout
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Desktop actions */}
                  <div className="hidden md:flex space-x-2">
                    <Link href={`/vendor/${vendor.vendorId}`}>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Link href={`/vendor/${vendor.vendorId}`}>
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleDeleteVendor(vendor.vendorId, vendor.name || "Vendor")}
                      disabled={deleteVendorMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Additional Info */}
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-4">
                      <span className="text-muted-foreground">
                        Tax ID: {vendor.taxId}
                      </span>
                      <span className="text-muted-foreground">
                        Joined: {formatDate(vendor.createdAt.toString())}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {vendor.activeItems > 0 && (
                        <Badge variant="default">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Active
                        </Badge>
                      )}
                      {(vendor.pendingPayouts.min > 0 || vendor.pendingPayouts.max > 0) && (
                        <Badge variant="outline">
                          <Clock className="w-3 h-3 mr-1" />
                          Payout Due
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Mobile Floating Action Button */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogTrigger asChild>
          <Button 
            className="md:hidden fixed bottom-20 right-4 z-40 h-14 w-14 rounded-full shadow-lg"
            size="sm"
            data-testid="fab-add-vendor"
          >
            <Plus className="h-6 w-6" />
          </Button>
        </DialogTrigger>
      </Dialog>
    </MainLayout>
  );
}
