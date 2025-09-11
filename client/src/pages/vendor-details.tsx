import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  insertVendorSchema, 
  insertVendorPayoutSchema,
  type Vendor, 
  type Item, 
  type VendorPayout,
  type InsertVendorPayout
} from "@shared/schema";
import { z } from "zod";
import { 
  ArrowLeft,
  Edit,
  Trash2,
  Phone,
  Mail,
  User,
  Package,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  Eye,
  Calendar,
  TrendingUp,
  Watch,
  Banknote,
  CreditCard,
  Receipt
} from "lucide-react";

const vendorFormSchema = insertVendorSchema.extend({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(1, "Phone is required"),
  email: z.string().email("Valid email is required")
});

const payoutFormSchema = insertVendorPayoutSchema.extend({
  amount: z.string().min(1, "Amount is required"),
  itemId: z.string().min(1, "Item is required")
});

type VendorFormData = z.infer<typeof vendorFormSchema>;
type PayoutFormData = z.infer<typeof payoutFormSchema>;

type VendorWithItems = Vendor & {
  items: Array<Item>;
};

type PayoutWithItem = VendorPayout & { 
  item: Item;
};

function formatCurrency(amount: number | string) {
  const num = typeof amount === 'string' ? parseFloat(amount) || 0 : amount;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(num);
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function formatDateTime(dateString: string) {
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatCurrencyRange(min: number, max: number) {
  if (min === max) {
    return formatCurrency(min);
  }
  return `${formatCurrency(min)} - ${formatCurrency(max)}`;
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'in-store':
      return <Badge variant="default">In Store</Badge>;
    case 'reserved':
      return <Badge variant="secondary">Reserved</Badge>;
    case 'sold':
      return <Badge variant="outline">Sold</Badge>;
    case 'returned':
      return <Badge variant="destructive">Returned</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function getItemIcon(brand: string) {
  return <Watch className="h-4 w-4" />;
}

export default function VendorDetails() {
  const params = useParams<{ vendorId: string }>();
  const vendorId = params.vendorId;
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: vendor, isLoading: vendorLoading } = useQuery<VendorWithItems>({
    queryKey: ['/api/vendors', vendorId],
    enabled: !!vendorId,
  });

  const { data: items } = useQuery<Array<Item & { vendor: Vendor }>>({
    queryKey: ['/api/items'],
  });

  const { data: payouts } = useQuery<Array<PayoutWithItem>>({
    queryKey: ['/api/payouts'],
    select: (payouts: Array<VendorPayout & { item: Item, vendor: Vendor }>) => {
      return payouts.filter(payout => payout.vendorId === vendorId);
    },
  });

  const updateVendorMutation = useMutation({
    mutationFn: async (data: VendorFormData) => {
      return await apiRequest('PUT', `/api/vendors/${vendorId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vendors', vendorId] });
      queryClient.invalidateQueries({ queryKey: ['/api/vendors'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/metrics'] });
      setIsEditModalOpen(false);
      toast({
        title: "Success",
        description: "Vendor updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update vendor",
        variant: "destructive",
      });
    },
  });

  const createPayoutMutation = useMutation({
    mutationFn: async (data: PayoutFormData) => {
      return await apiRequest('POST', '/api/payouts', {
        ...data,
        vendorId,
        amount: parseFloat(data.amount)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/payouts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/vendors', vendorId] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/metrics'] });
      setIsPayoutModalOpen(false);
      payoutForm.reset();
      toast({
        title: "Success",
        description: "Payout recorded successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to record payout",
        variant: "destructive",
      });
    },
  });

  const deleteVendorMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('DELETE', `/api/vendors/${vendorId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vendors'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/metrics'] });
      toast({
        title: "Success",
        description: "Vendor deleted successfully",
      });
      // Redirect to vendors page
      window.location.href = '/vendors';
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete vendor",
        variant: "destructive",
      });
    },
  });

  const editForm = useForm<VendorFormData>({
    resolver: zodResolver(vendorFormSchema),
    defaultValues: {
      name: vendor?.name || "",
      phone: vendor?.phone || "",
      email: vendor?.email || "",
      taxId: vendor?.taxId || ""
    },
  });

  const payoutForm = useForm<PayoutFormData>({
    resolver: zodResolver(payoutFormSchema),
    defaultValues: {
      amount: "",
      itemId: ""
    },
  });

  const resetEditForm = () => {
    editForm.reset({
      name: vendor?.name || "",
      phone: vendor?.phone || "",
      email: vendor?.email || "",
      taxId: vendor?.taxId || ""
    });
  };

  const onEditSubmit = (data: VendorFormData) => {
    updateVendorMutation.mutate(data);
  };

  const onPayoutSubmit = (data: PayoutFormData) => {
    createPayoutMutation.mutate(data);
  };

  const handleDeleteVendor = () => {
    if (confirm(`Are you sure you want to delete "${vendor?.name}"? This action cannot be undone.`)) {
      deleteVendorMutation.mutate();
    }
  };

  if (vendorLoading) {
    return (
      <MainLayout title="Vendor Details" subtitle="Loading vendor information...">
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-4 w-20 mb-2" />
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!vendor) {
    return (
      <MainLayout title="Vendor Not Found" subtitle="The requested vendor could not be found">
        <Card>
          <CardContent className="p-12 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Vendor Not Found</h3>
            <p className="text-muted-foreground mb-4">
              The vendor you're looking for doesn't exist or has been deleted.
            </p>
            <Link href="/vendors">
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Vendors
              </Button>
            </Link>
          </CardContent>
        </Card>
      </MainLayout>
    );
  }

  // Get vendor items
  const vendorItems = items?.filter(item => item.vendorId === vendorId) || [];
  const activeItems = vendorItems.filter(item => item.status === 'in-store' || item.status === 'reserved');
  const soldItems = vendorItems.filter(item => item.status === 'sold');
  const returnedItems = vendorItems.filter(item => item.status === 'returned');

  // Calculate financial metrics
  const totalValueRange = vendorItems.reduce((acc, item) => ({
    min: acc.min + Number(item.minSalesPrice || 0),
    max: acc.max + Number(item.maxSalesPrice || 0)
  }), { min: 0, max: 0 });
  
  const totalPayouts = payouts?.reduce((sum, payout) => sum + Number(payout.amount || 0), 0) || 0;
  
  const pendingPayoutsRange = soldItems.reduce((acc, item) => ({
    min: acc.min + Number(item.minCost || 0),
    max: acc.max + Number(item.maxCost || 0)
  }), { min: 0, max: 0 });
  
  const pendingPayoutsAdjusted = {
    min: Math.max(0, pendingPayoutsRange.min - totalPayouts),
    max: Math.max(0, pendingPayoutsRange.max - totalPayouts)
  };
  
  const totalRevenueRange = soldItems.reduce((acc, item) => ({
    min: acc.min + Number(item.minSalesPrice || 0),
    max: acc.max + Number(item.maxSalesPrice || 0)
  }), { min: 0, max: 0 });
  
  // Calculate single values for analytics
  const totalRevenue = totalRevenueRange.max; // Use max value for revenue display
  const pendingPayouts = pendingPayoutsAdjusted.max; // Use max value for pending payouts

  return (
    <MainLayout title={vendor.name || "Vendor Details"} subtitle="Vendor information and consignment details">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Link href="/vendors">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Vendors
            </Button>
          </Link>
          
          <div className="flex space-x-2">
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" onClick={resetEditForm}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Vendor
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Edit Vendor</DialogTitle>
                </DialogHeader>
                <Form {...editForm}>
                  <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                    <FormField
                      control={editForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Vendor name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={editForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input placeholder="Phone number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={editForm.control}
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
                      control={editForm.control}
                      name="taxId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tax ID</FormLabel>
                          <FormControl>
                            <Input placeholder="Tax identification number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end space-x-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={updateVendorMutation.isPending}>
                        {updateVendorMutation.isPending ? "Updating..." : "Update Vendor"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>

            <Button variant="destructive" onClick={handleDeleteVendor} disabled={deleteVendorMutation.isPending}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Vendor
            </Button>
          </div>
        </div>

        {/* Vendor Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Vendor Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Name</Label>
                  <p className="text-lg font-semibold">{vendor.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <p>{vendor.email}</p>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Phone</Label>
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <p>{vendor.phone}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Tax ID</Label>
                  <p className="text-lg font-semibold">{vendor.taxId}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Member Since</Label>
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <p>{formatDate(vendor.createdAt)}</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Items</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{vendorItems.length}</div>
              <p className="text-xs text-muted-foreground">
                {activeItems.length} active • {soldItems.length} sold
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Value</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrencyRange(totalValueRange.min, totalValueRange.max)}</div>
              <p className="text-xs text-muted-foreground">
                Combined inventory value
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Payouts</CardTitle>
              <Banknote className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalPayouts)}</div>
              <p className="text-xs text-muted-foreground">
                Payments made
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Payouts</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrencyRange(pendingPayoutsAdjusted.min, pendingPayoutsAdjusted.max)}</div>
              <p className="text-xs text-muted-foreground">
                Awaiting payment
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="items" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="items">Items ({vendorItems.length})</TabsTrigger>
            <TabsTrigger value="payouts">Payouts ({payouts?.length || 0})</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="items" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Consigned Items</h3>
              <Link href="/inventory">
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </Link>
            </div>

            {vendorItems.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No items yet</h3>
                  <p className="text-muted-foreground mb-4">
                    This vendor hasn't consigned any items yet.
                  </p>
                  <Link href="/inventory">
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Item
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {vendorItems.map((item) => (
                  <Card key={item.itemId} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                            {getItemIcon(item.brand || "")}
                          </div>
                          <div>
                            <h4 className="font-semibold">{item.title}</h4>
                            <p className="text-sm text-muted-foreground">
                              {item.brand} {item.model}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <p className="font-medium">
                              {item.minSalesPrice && item.maxSalesPrice 
                                ? `${formatCurrency(item.minSalesPrice)} - ${formatCurrency(item.maxSalesPrice)}`
                                : formatCurrency(item.maxSalesPrice || item.minSalesPrice || 0)}
                            </p>
                            <p className="text-sm text-muted-foreground">Sales Price</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">
                              {item.minCost && item.maxCost 
                                ? `${formatCurrency(item.minCost)} - ${formatCurrency(item.maxCost)}`
                                : formatCurrency(item.maxCost || item.minCost || 0)}
                            </p>
                            <p className="text-sm text-muted-foreground">Cost Range</p>
                          </div>
                          <div className="text-right">
                            {getStatusBadge(item.status || "")}
                          </div>
                          <div className="flex space-x-2">
                            <Link href={`/item/${item.itemId}`}>
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="payouts" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Payout History</h3>
              {(pendingPayoutsAdjusted.min > 0 || pendingPayoutsAdjusted.max > 0) && (
                <Dialog open={isPayoutModalOpen} onOpenChange={setIsPayoutModalOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Record Payout
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Record Vendor Payout</DialogTitle>
                    </DialogHeader>
                    <Form {...payoutForm}>
                      <form onSubmit={payoutForm.handleSubmit(onPayoutSubmit)} className="space-y-4">
                        <FormField
                          control={payoutForm.control}
                          name="itemId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Item</FormLabel>
                              <FormControl>
                                <select {...field} className="w-full p-2 border rounded">
                                  <option value="">Select an item</option>
                                  {soldItems.map((item) => (
                                    <option key={item.itemId} value={item.itemId}>
                                      {item.title} - {formatCurrency(item.maxCost || 0)}
                                    </option>
                                  ))}
                                </select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={payoutForm.control}
                          name="amount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Amount</FormLabel>
                              <FormControl>
                                <Input type="number" step="0.01" placeholder="0.00" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="flex justify-end space-x-2 pt-4">
                          <Button type="button" variant="outline" onClick={() => setIsPayoutModalOpen(false)}>
                            Cancel
                          </Button>
                          <Button type="submit" disabled={createPayoutMutation.isPending}>
                            {createPayoutMutation.isPending ? "Recording..." : "Record Payout"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              )}
            </div>

            {!payouts || payouts.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No payouts yet</h3>
                  <p className="text-muted-foreground mb-4">
                    {(pendingPayoutsAdjusted.min > 0 || pendingPayoutsAdjusted.max > 0) 
                      ? "There are pending payouts to be processed."
                      : "No payouts have been made to this vendor yet."
                    }
                  </p>
                  {(pendingPayoutsAdjusted.min > 0 || pendingPayoutsAdjusted.max > 0) && (
                    <p className="text-sm text-amber-600 mb-4">
                      Pending: {formatCurrencyRange(pendingPayoutsAdjusted.min, pendingPayoutsAdjusted.max)}
                    </p>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payouts.map((payout) => (
                      <TableRow key={payout.payoutId}>
                        <TableCell>{formatDateTime(payout.createdAt)}</TableCell>
                        <TableCell>{payout.item.title}</TableCell>
                        <TableCell>{formatCurrency(payout.amount)}</TableCell>
                        <TableCell>
                          <Badge variant="default">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Paid
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <h3 className="text-lg font-semibold">Performance Analytics</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Item Status Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Active Items</span>
                      <span className="text-sm font-medium">{activeItems.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Sold Items</span>
                      <span className="text-sm font-medium">{soldItems.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Returned Items</span>
                      <span className="text-sm font-medium">{returnedItems.length}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Financial Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Total Revenue</span>
                      <span className="text-sm font-medium">{formatCurrency(totalRevenue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Payouts Made</span>
                      <span className="text-sm font-medium">{formatCurrency(totalPayouts)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Pending Payouts</span>
                      <span className="text-sm font-medium text-amber-600">{formatCurrency(pendingPayouts)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}