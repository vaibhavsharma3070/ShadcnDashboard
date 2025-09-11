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
  insertClientSchema, 
  insertClientPaymentSchema,
  type Client, 
  type ClientPayment,
  type Item,
  type Vendor,
  type InsertClientPayment
} from "@shared/schema";
import { z } from "zod";
import { 
  ArrowLeft,
  Edit,
  Trash2,
  Phone,
  Mail,
  User,
  ShoppingCart,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  Eye,
  Calendar,
  TrendingUp,
  Watch,
  CreditCard,
  Receipt,
  Star
} from "lucide-react";

const clientFormSchema = insertClientSchema.extend({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(1, "Phone is required"),
  email: z.string().email("Valid email is required")
});

const paymentFormSchema = insertClientPaymentSchema.extend({
  amount: z.string().min(1, "Amount is required"),
  itemId: z.string().min(1, "Item is required")
});

type ClientFormData = z.infer<typeof clientFormSchema>;
type PaymentFormData = z.infer<typeof paymentFormSchema>;

type ClientWithPurchases = Client & {
  purchases: Array<{
    item: Item & { vendor: Vendor };
    payments: ClientPayment[];
    totalPaid: number;
    remainingBalance: { min: number; max: number };
  }>;
};

type PaymentWithItem = ClientPayment & { 
  item: Item & { vendor: Vendor };
};

function formatCurrency(amount: number | string) {
  const num = typeof amount === 'string' ? parseFloat(amount) || 0 : amount;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(num);
}

function formatCurrencyRange(min: number, max: number) {
  if (min === max) {
    return formatCurrency(min);
  }
  return `${formatCurrency(min)} - ${formatCurrency(max)}`;
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

export default function ClientDetails() {
  const params = useParams<{ clientId: string }>();
  const clientId = params.clientId;
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: client, isLoading: clientLoading } = useQuery<ClientWithPurchases>({
    queryKey: ['/api/clients', clientId],
    enabled: !!clientId,
  });

  const { data: payments } = useQuery({
    queryKey: ['/api/payments'],
    select: (payments: Array<ClientPayment & { item: Item & { vendor: Vendor }, client: Client }>) => {
      return payments.filter(payment => payment.clientId === clientId);
    },
  });

  const { data: items } = useQuery<Array<Item & { vendor: Vendor }>>({
    queryKey: ['/api/items'],
  });

  const updateClientMutation = useMutation({
    mutationFn: async (data: ClientFormData) => {
      return await apiRequest('PUT', `/api/clients/${clientId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId] });
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/metrics'] });
      setIsEditModalOpen(false);
      toast({
        title: "Success",
        description: "Client updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update client",
        variant: "destructive",
      });
    },
  });

  const createPaymentMutation = useMutation({
    mutationFn: async (data: PaymentFormData) => {
      return await apiRequest('POST', '/api/payments', {
        ...data,
        clientId,
        paidAt: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/payments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/metrics'] });
      setIsPaymentModalOpen(false);
      paymentForm.reset();
      toast({
        title: "Success",
        description: "Payment recorded successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to record payment",
        variant: "destructive",
      });
    },
  });

  const deleteClientMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('DELETE', `/api/clients/${clientId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/metrics'] });
      toast({
        title: "Success",
        description: "Client deleted successfully",
      });
      // Redirect to clients page
      window.location.href = '/clients';
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete client",
        variant: "destructive",
      });
    },
  });

  const editForm = useForm<ClientFormData>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      name: client?.name || "",
      phone: client?.phone || "",
      email: client?.email || "",
      billingAddr: client?.billingAddr || ""
    },
  });

  const paymentForm = useForm<PaymentFormData>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      amount: "",
      itemId: ""
    },
  });

  const resetEditForm = () => {
    editForm.reset({
      name: client?.name || "",
      phone: client?.phone || "",
      email: client?.email || "",
      billingAddr: client?.billingAddr || ""
    });
  };

  const onEditSubmit = (data: ClientFormData) => {
    updateClientMutation.mutate(data);
  };

  const onPaymentSubmit = (data: PaymentFormData) => {
    createPaymentMutation.mutate(data);
  };

  const handleDeleteClient = () => {
    if (confirm(`Are you sure you want to delete "${client?.name}"? This action cannot be undone.`)) {
      deleteClientMutation.mutate();
    }
  };

  if (clientLoading) {
    return (
      <MainLayout title="Client Details" subtitle="Loading client information...">
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

  if (!client) {
    return (
      <MainLayout title="Client Not Found" subtitle="The requested client could not be found">
        <Card>
          <CardContent className="p-12 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Client Not Found</h3>
            <p className="text-muted-foreground mb-4">
              The client you're looking for doesn't exist or has been deleted.
            </p>
            <Link href="/clients">
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Clients
              </Button>
            </Link>
          </CardContent>
        </Card>
      </MainLayout>
    );
  }

  // Calculate client statistics
  const clientPayments = payments || [];
  
  // Group payments by item to calculate purchase statistics
  const itemPayments = clientPayments.reduce((acc, payment) => {
    const itemId = payment.itemId;
    if (!acc[itemId]) {
      acc[itemId] = {
        item: payment.item,
        payments: [],
        totalPaid: 0
      };
    }
    acc[itemId].payments.push(payment);
    acc[itemId].totalPaid += Number(payment.amount || 0);
    return acc;
  }, {} as Record<string, { item: Item & { vendor: Vendor }, payments: ClientPayment[], totalPaid: number }>);

  const purchases = Object.values(itemPayments).map(purchase => {
    const minPrice = Number(purchase.item.minSalesPrice || 0);
    const maxPrice = Number(purchase.item.maxSalesPrice || minPrice);
    return {
      ...purchase,
      remainingBalance: {
        min: Math.max(minPrice - purchase.totalPaid, 0),
        max: Math.max(maxPrice - purchase.totalPaid, 0)
      }
    };
  });

  const activePurchases = purchases.filter(p => p.remainingBalance.max > 0);
  const completedPurchases = purchases.filter(p => p.remainingBalance.max <= 0);
  const totalSpent = clientPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const outstandingBalance = {
    min: purchases.reduce((sum, purchase) => sum + purchase.remainingBalance.min, 0),
    max: purchases.reduce((sum, purchase) => sum + purchase.remainingBalance.max, 0)
  };

  // Get available items for new payments (items that aren't fully paid)
  const availableItems = items?.filter(item => {
    const itemPurchase = purchases.find(p => p.item.itemId === item.itemId);
    return !itemPurchase || itemPurchase.remainingBalance.max > 0;
  }) || [];

  return (
    <MainLayout title={client.name || "Client Details"} subtitle="Client information and purchase history">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Link href="/clients">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Clients
            </Button>
          </Link>
          
          <div className="flex space-x-2">
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" onClick={resetEditForm}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Client
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Edit Client</DialogTitle>
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
                            <Input placeholder="Client name" {...field} />
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

                    <div className="flex justify-end space-x-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={updateClientMutation.isPending}>
                        {updateClientMutation.isPending ? "Updating..." : "Update Client"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>

            <Button variant="destructive" onClick={handleDeleteClient} disabled={deleteClientMutation.isPending}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Client
            </Button>
          </div>
        </div>

        {/* Client Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Client Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Name</Label>
                  <p className="text-lg font-semibold">{client.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <p>{client.email}</p>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Phone</Label>
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <p>{client.phone}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Customer Since</Label>
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <p>{formatDate(client.createdAt ? client.createdAt.toString() : new Date().toISOString())}</p>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Customer Status</Label>
                  <div className="flex items-center space-x-2">
                    {completedPurchases.length > 0 ? (
                      <Badge variant="default">
                        <Star className="w-3 h-3 mr-1" />
                        Repeat Customer
                      </Badge>
                    ) : (
                      <Badge variant="outline">
                        New Customer
                      </Badge>
                    )}
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
              <CardTitle className="text-sm font-medium">Total Purchases</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{purchases.length}</div>
              <p className="text-xs text-muted-foreground">
                {activePurchases.length} active • {completedPurchases.length} completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalSpent)}</div>
              <p className="text-xs text-muted-foreground">
                Payments made
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Outstanding Balance</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrencyRange(outstandingBalance.min, outstandingBalance.max)}</div>
              <p className="text-xs text-muted-foreground">
                Remaining to pay
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{clientPayments.length}</div>
              <p className="text-xs text-muted-foreground">
                Payment transactions
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="purchases" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="purchases">Purchases ({purchases.length})</TabsTrigger>
            <TabsTrigger value="payments">Payments ({clientPayments.length})</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="purchases" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Purchase History</h3>
              <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Record Payment
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Record Client Payment</DialogTitle>
                  </DialogHeader>
                  <Form {...paymentForm}>
                    <form onSubmit={paymentForm.handleSubmit(onPaymentSubmit)} className="space-y-4">
                      <FormField
                        control={paymentForm.control}
                        name="itemId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Item</FormLabel>
                            <FormControl>
                              <select {...field} className="w-full p-2 border rounded">
                                <option value="">Select an item</option>
                                {availableItems.map((item) => {
                                  const purchase = purchases.find(p => p.item.itemId === item.itemId);
                                  const remaining = purchase 
                                    ? purchase.remainingBalance 
                                    : { 
                                        min: Number(item.minSalesPrice || 0), 
                                        max: Number(item.maxSalesPrice || item.minSalesPrice || 0) 
                                      };
                                  return (
                                    <option key={item.itemId} value={item.itemId}>
                                      {item.title} - {formatCurrencyRange(remaining.min, remaining.max)} remaining
                                    </option>
                                  );
                                })}
                              </select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={paymentForm.control}
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
                        <Button type="button" variant="outline" onClick={() => setIsPaymentModalOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={createPaymentMutation.isPending}>
                          {createPaymentMutation.isPending ? "Recording..." : "Record Payment"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            {purchases.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No purchases yet</h3>
                  <p className="text-muted-foreground mb-4">
                    This client hasn't made any purchases yet.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {purchases.map((purchase) => (
                  <Card key={purchase.item.itemId} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                            {getItemIcon(purchase.item.brand || "")}
                          </div>
                          <div>
                            <h4 className="font-semibold">{purchase.item.title}</h4>
                            <p className="text-sm text-muted-foreground">
                              {purchase.item.brand} {purchase.item.model}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <p className="font-medium">
                              {purchase.item.minSalesPrice && purchase.item.maxSalesPrice 
                                ? `${formatCurrency(purchase.item.minSalesPrice)} - ${formatCurrency(purchase.item.maxSalesPrice)}`
                                : formatCurrency(purchase.item.maxSalesPrice || purchase.item.minSalesPrice || 0)}
                            </p>
                            <p className="text-sm text-muted-foreground">Total Price</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{formatCurrency(purchase.totalPaid)}</p>
                            <p className="text-sm text-muted-foreground">Paid</p>
                          </div>
                          <div className="text-right">
                            <p className={`font-medium ${purchase.remainingBalance.max > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                              {formatCurrencyRange(purchase.remainingBalance.min, purchase.remainingBalance.max)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {purchase.remainingBalance.max > 0 ? 'Remaining' : 'Paid in Full'}
                            </p>
                          </div>
                          <div className="text-right">
                            {purchase.remainingBalance.max > 0 ? (
                              <Badge variant="outline">
                                <Clock className="w-3 h-3 mr-1" />
                                Partial
                              </Badge>
                            ) : (
                              <Badge variant="default">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Complete
                              </Badge>
                            )}
                          </div>
                          <div className="flex space-x-2">
                            <Link href={`/item/${purchase.item.itemId}`}>
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

          <TabsContent value="payments" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Payment History</h3>
            </div>

            {clientPayments.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No payments yet</h3>
                  <p className="text-muted-foreground mb-4">
                    This client hasn't made any payments yet.
                  </p>
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
                    {clientPayments.map((payment) => (
                      <TableRow key={payment.paymentId}>
                        <TableCell>{formatDateTime(payment.paidAt.toString())}</TableCell>
                        <TableCell>{payment.item.title}</TableCell>
                        <TableCell>{formatCurrency(payment.amount)}</TableCell>
                        <TableCell>
                          <Badge variant="default">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Processed
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
            <h3 className="text-lg font-semibold">Purchase Analytics</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Purchase Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Active Purchases</span>
                      <span className="text-sm font-medium">{activePurchases.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Completed Purchases</span>
                      <span className="text-sm font-medium">{completedPurchases.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Total Payments</span>
                      <span className="text-sm font-medium">{clientPayments.length}</span>
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
                      <span className="text-sm">Total Spent</span>
                      <span className="text-sm font-medium">{formatCurrency(totalSpent)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Outstanding Balance</span>
                      <span className="text-sm font-medium text-amber-600">{formatCurrencyRange(outstandingBalance.min, outstandingBalance.max)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Average Payment</span>
                      <span className="text-sm font-medium">
                        {clientPayments.length > 0 ? formatCurrency(totalSpent / clientPayments.length) : formatCurrency(0)}
                      </span>
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