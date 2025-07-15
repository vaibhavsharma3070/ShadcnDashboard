import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertItemSchema, insertClientPaymentSchema, insertItemExpenseSchema, type Item, type Vendor, type Client, type ClientPayment, type ItemExpense } from "@shared/schema";
import { StatusUpdateDropdown } from "@/components/status-update-dropdown";
import { z } from "zod";
import { 
  ArrowLeft,
  Edit,
  Trash2,
  User,
  Package,
  Calendar,
  DollarSign,
  CreditCard,
  Receipt,
  Plus,
  Eye,
  AlertCircle,
  CheckCircle,
  Watch,
  Gem,
  Crown,
  History,
  Target,
  TrendingUp,
  Minus
} from "lucide-react";

type ItemWithVendor = Item & { vendor: Vendor };
type PaymentWithClient = ClientPayment & { client: Client };
type ExpenseWithItem = ItemExpense & { item: Item };

const itemFormSchema = insertItemSchema.extend({
  vendorId: z.string().min(1, "Vendor is required"),
  title: z.string().min(1, "Title is required"),
  brand: z.string().min(1, "Brand is required"),
  model: z.string().min(1, "Model is required"),
  agreedVendorPayout: z.string().min(1, "Vendor payout is required"),
  listPrice: z.string().min(1, "List price is required"),
  acquisitionDate: z.string().min(1, "Acquisition date is required")
});

const paymentFormSchema = insertClientPaymentSchema.extend({
  clientId: z.string().min(1, "Client is required"),
  amount: z.string().min(1, "Amount is required"),
  paymentMethod: z.string().min(1, "Payment method is required"),
  paidAt: z.string().min(1, "Payment date is required")
});

const expenseFormSchema = insertItemExpenseSchema.extend({
  expenseType: z.string().min(1, "Expense type is required"),
  amount: z.string().min(1, "Amount is required"),
  incurredAt: z.string().min(1, "Expense date is required")
});

type ItemFormData = z.infer<typeof itemFormSchema>;
type PaymentFormData = z.infer<typeof paymentFormSchema>;
type ExpenseFormData = z.infer<typeof expenseFormSchema>;

function formatCurrency(amount: number | string) {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(numAmount || 0);
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
  const statusConfig = {
    'in-store': { label: 'In Store', className: 'status-in-store', icon: Package },
    'reserved': { label: 'Reserved', className: 'status-reserved', icon: AlertCircle },
    'sold': { label: 'Sold', className: 'status-sold', icon: CheckCircle },
    'returned': { label: 'Returned', className: 'status-returned', icon: AlertCircle }
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig['in-store'];
  const IconComponent = config.icon;
  
  return (
    <Badge variant="outline" className={`status-badge ${config.className}`}>
      <IconComponent className="w-3 h-3 mr-1" />
      {config.label}
    </Badge>
  );
}

function getItemIcon(brand: string) {
  const brandIcons = {
    'Rolex': Watch,
    'Omega': Watch,
    'Patek Philippe': Watch,
    'Hermès': Gem,
    'Cartier': Crown,
    'Louis Vuitton': Gem,
    'Chanel': Gem,
    'Gucci': Gem,
    'Prada': Gem,
    'Bulgari': Gem,
  };
  
  return brandIcons[brand as keyof typeof brandIcons] || Watch;
}

export default function ItemDetails() {
  const params = useParams();
  const [, navigate] = useLocation();
  const itemId = params.id;
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: item, isLoading: itemLoading } = useQuery<ItemWithVendor>({
    queryKey: ['/api/items', itemId],
    enabled: !!itemId,
  });

  const { data: vendors, isLoading: vendorsLoading } = useQuery<Vendor[]>({
    queryKey: ['/api/vendors'],
  });

  const { data: clients, isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: ['/api/clients'],
  });

  const { data: payments, isLoading: paymentsLoading } = useQuery<PaymentWithClient[]>({
    queryKey: ['/api/payments/item', itemId],
    enabled: !!itemId,
  });

  const { data: expenses, isLoading: expensesLoading } = useQuery<ItemExpense[]>({
    queryKey: ['/api/expenses/item', itemId],
    enabled: !!itemId,
  });

  const updateItemMutation = useMutation({
    mutationFn: async (data: ItemFormData) => {
      return await apiRequest('PUT', `/api/items/${itemId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/items', itemId] });
      queryClient.invalidateQueries({ queryKey: ['/api/items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/metrics'] });
      setIsEditModalOpen(false);
      toast({
        title: "Success",
        description: "Item updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update item",
        variant: "destructive",
      });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('DELETE', `/api/items/${itemId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/metrics'] });
      toast({
        title: "Success",
        description: "Item deleted successfully",
      });
      navigate('/inventory');
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete item",
        variant: "destructive",
      });
    },
  });

  const createPaymentMutation = useMutation({
    mutationFn: async (data: PaymentFormData) => {
      const payload = {
        ...data,
        itemId: itemId!,
        amount: data.amount,
        paidAt: new Date(data.paidAt).toISOString()
      };
      return await apiRequest('POST', '/api/payments', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/payments/item', itemId] });
      queryClient.invalidateQueries({ queryKey: ['/api/items', itemId] });
      queryClient.invalidateQueries({ queryKey: ['/api/items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/metrics'] });
      setIsPaymentModalOpen(false);
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

  const createExpenseMutation = useMutation({
    mutationFn: async (data: ExpenseFormData) => {
      const payload = {
        ...data,
        itemId: itemId!,
        amount: data.amount,
        incurredAt: new Date(data.incurredAt).toISOString()
      };
      return await apiRequest('POST', '/api/expenses', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/expenses/item', itemId] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/metrics'] });
      setIsExpenseModalOpen(false);
      toast({
        title: "Success",
        description: "Expense recorded successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to record expense",
        variant: "destructive",
      });
    },
  });

  const editForm = useForm<ItemFormData>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: {
      vendorId: "",
      title: "",
      brand: "",
      model: "",
      serialNo: "",
      condition: "",
      agreedVendorPayout: "",
      listPrice: "",
      acquisitionDate: "",
      status: "in-store"
    },
  });

  const paymentForm = useForm<PaymentFormData>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      clientId: "",
      amount: "",
      paymentMethod: "",
      paidAt: new Date().toISOString().split('T')[0]
    },
  });

  const expenseForm = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      expenseType: "",
      amount: "",
      incurredAt: new Date().toISOString().split('T')[0],
      notes: ""
    },
  });

  // Update form when item data loads (only once when modal opens)
  const resetEditForm = () => {
    if (item) {
      editForm.reset({
        vendorId: item.vendorId,
        title: item.title || "",
        brand: item.brand || "",
        model: item.model || "",
        serialNo: item.serialNo || "",
        condition: item.condition || "",
        agreedVendorPayout: item.agreedVendorPayout || "",
        listPrice: item.listPrice || "",
        acquisitionDate: item.acquisitionDate || "",
        status: item.status
      });
    }
  };

  const onEditSubmit = (data: ItemFormData) => {
    updateItemMutation.mutate(data);
  };

  const onPaymentSubmit = (data: PaymentFormData) => {
    createPaymentMutation.mutate(data);
  };

  const onExpenseSubmit = (data: ExpenseFormData) => {
    createExpenseMutation.mutate(data);
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
      deleteItemMutation.mutate();
    }
  };

  // Calculate totals
  const totalPayments = payments?.reduce((sum, payment) => sum + Number(payment.amount), 0) || 0;
  const totalExpenses = expenses?.reduce((sum, expense) => sum + Number(expense.amount), 0) || 0;
  const remainingBalance = Number(item?.listPrice || 0) - totalPayments;
  const estimatedProfit = totalPayments - Number(item?.agreedVendorPayout || 0) - totalExpenses;

  if (itemLoading) {
    return (
      <MainLayout title="Item Details" subtitle="Loading item information...">
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-96" />
            <Skeleton className="h-96" />
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!item) {
    return (
      <MainLayout title="Item Details" subtitle="Item not found">
        <div className="text-center py-16">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Item Not Found</h3>
          <p className="text-muted-foreground mb-4">The item you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/inventory')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Inventory
          </Button>
        </div>
      </MainLayout>
    );
  }

  const IconComponent = getItemIcon(item.brand || "");

  return (
    <MainLayout title="Item Details" subtitle={item.title || "Item Information"}>
      {/* Header Actions */}
      <div className="flex items-center justify-between mb-6">
        <Button variant="outline" onClick={() => navigate('/inventory')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Inventory
        </Button>
        
        <div className="flex space-x-2">
          <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" onClick={resetEditForm}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Edit Item</DialogTitle>
              </DialogHeader>
              <Form {...editForm}>
                <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={editForm.control}
                      name="vendorId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vendor</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select vendor" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {vendors?.map((vendor) => (
                                <SelectItem key={vendor.vendorId} value={vendor.vendorId}>
                                  {vendor.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={editForm.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title</FormLabel>
                          <FormControl>
                            <Input placeholder="Item title" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={editForm.control}
                      name="brand"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Brand</FormLabel>
                          <FormControl>
                            <Input placeholder="Brand name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={editForm.control}
                      name="model"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Model</FormLabel>
                          <FormControl>
                            <Input placeholder="Model number/name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={editForm.control}
                      name="serialNo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Serial Number</FormLabel>
                          <FormControl>
                            <Input placeholder="Serial number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={editForm.control}
                      name="condition"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Condition</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select condition" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="New">New</SelectItem>
                              <SelectItem value="Excellent">Excellent</SelectItem>
                              <SelectItem value="Very Good">Very Good</SelectItem>
                              <SelectItem value="Good">Good</SelectItem>
                              <SelectItem value="Fair">Fair</SelectItem>
                              <SelectItem value="Poor">Poor</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={editForm.control}
                      name="agreedVendorPayout"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vendor Payout ($)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" placeholder="0.00" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={editForm.control}
                      name="listPrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>List Price ($)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" placeholder="0.00" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={editForm.control}
                      name="acquisitionDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Acquisition Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={editForm.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="in-store">In Store</SelectItem>
                              <SelectItem value="reserved">Reserved</SelectItem>
                              <SelectItem value="sold">Sold</SelectItem>
                              <SelectItem value="returned">Returned</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={updateItemMutation.isPending}>
                      {updateItemMutation.isPending ? "Updating..." : "Update Item"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          <Button variant="destructive" onClick={handleDelete} disabled={deleteItemMutation.isPending}>
            <Trash2 className="h-4 w-4 mr-2" />
            {deleteItemMutation.isPending ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </div>

      {/* Item Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Main Item Info */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                <IconComponent className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <CardTitle className="text-2xl">{item.title}</CardTitle>
                  <StatusUpdateDropdown 
                    itemId={item.itemId} 
                    currentStatus={item.status}
                  />
                </div>
                <p className="text-muted-foreground">
                  {item.brand} • {item.model}
                  {item.serialNo && ` • S/N: ${item.serialNo}`}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Vendor</span>
                </div>
                <div className="pl-6">
                  <p className="font-medium">{item.vendor.name}</p>
                  <p className="text-sm text-muted-foreground">{item.vendor.email}</p>
                  <p className="text-sm text-muted-foreground">{item.vendor.phone}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Item Details</span>
                </div>
                <div className="pl-6 space-y-2">
                  {item.condition && (
                    <p className="text-sm">
                      <span className="font-medium">Condition:</span> {item.condition}
                    </p>
                  )}
                  <p className="text-sm">
                    <span className="font-medium">Acquired:</span> {formatDate(item.acquisitionDate || item.createdAt)}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Listed:</span> {formatDate(item.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Financial Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Financial Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">List Price</span>
                <span className="font-bold">{formatCurrency(item.listPrice || 0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Vendor Payout</span>
                <span className="text-red-600">{formatCurrency(item.agreedVendorPayout || 0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Total Payments</span>
                <span className="text-green-600">{formatCurrency(totalPayments)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Total Expenses</span>
                <span className="text-red-600">{formatCurrency(totalExpenses)}</span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Remaining Balance</span>
                <span className={remainingBalance > 0 ? "text-amber-600" : "text-green-600"}>
                  {formatCurrency(remainingBalance)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Estimated Profit</span>
                <span className={estimatedProfit >= 0 ? "text-green-600" : "text-red-600"}>
                  {formatCurrency(estimatedProfit)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payments and Expenses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment History */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Payment History</CardTitle>
              <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Payment
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Record Payment</DialogTitle>
                  </DialogHeader>
                  <Form {...paymentForm}>
                    <form onSubmit={paymentForm.handleSubmit(onPaymentSubmit)} className="space-y-4">
                      <FormField
                        control={paymentForm.control}
                        name="clientId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Client</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select client" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {clients?.map((client) => (
                                  <SelectItem key={client.clientId} value={client.clientId}>
                                    {client.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={paymentForm.control}
                        name="amount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Amount ($)</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" placeholder="0.00" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={paymentForm.control}
                        name="paymentMethod"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Payment Method</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select method" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Cash">Cash</SelectItem>
                                <SelectItem value="Credit Card">Credit Card</SelectItem>
                                <SelectItem value="Debit Card">Debit Card</SelectItem>
                                <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                                <SelectItem value="Check">Check</SelectItem>
                                <SelectItem value="PayPal">PayPal</SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={paymentForm.control}
                        name="paidAt"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Payment Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
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
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {paymentsLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center space-x-4 p-3 border border-border rounded-lg">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))
              ) : payments && payments.length > 0 ? (
                payments.map((payment) => (
                  <div key={payment.paymentId} className="flex items-center space-x-4 p-3 border border-border rounded-lg">
                    <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                      <CreditCard className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{payment.client.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {payment.paymentMethod} • {formatDateTime(payment.paidAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">{formatCurrency(payment.amount)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No payments recorded yet</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Expense History */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Expense History</CardTitle>
              <Dialog open={isExpenseModalOpen} onOpenChange={setIsExpenseModalOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Expense
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Record Expense</DialogTitle>
                  </DialogHeader>
                  <Form {...expenseForm}>
                    <form onSubmit={expenseForm.handleSubmit(onExpenseSubmit)} className="space-y-4">
                      <FormField
                        control={expenseForm.control}
                        name="expenseType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Expense Type</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Authentication">Authentication</SelectItem>
                                <SelectItem value="Cleaning">Cleaning</SelectItem>
                                <SelectItem value="Repair">Repair</SelectItem>
                                <SelectItem value="Photography">Photography</SelectItem>
                                <SelectItem value="Shipping">Shipping</SelectItem>
                                <SelectItem value="Insurance">Insurance</SelectItem>
                                <SelectItem value="Storage">Storage</SelectItem>
                                <SelectItem value="Marketing">Marketing</SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={expenseForm.control}
                        name="amount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Amount ($)</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" placeholder="0.00" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={expenseForm.control}
                        name="incurredAt"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Expense Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={expenseForm.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Notes (Optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="Additional notes..." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex justify-end space-x-2 pt-4">
                        <Button type="button" variant="outline" onClick={() => setIsExpenseModalOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={createExpenseMutation.isPending}>
                          {createExpenseMutation.isPending ? "Recording..." : "Record Expense"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {expensesLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center space-x-4 p-3 border border-border rounded-lg">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))
              ) : expenses && expenses.length > 0 ? (
                expenses.map((expense) => (
                  <div key={expense.expenseId} className="flex items-center space-x-4 p-3 border border-border rounded-lg">
                    <div className="w-10 h-10 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
                      <Receipt className="h-5 w-5 text-red-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{expense.expenseType}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDateTime(expense.incurredAt)}
                      </p>
                      {expense.notes && (
                        <p className="text-sm text-muted-foreground italic">{expense.notes}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-red-600">{formatCurrency(expense.amount)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No expenses recorded yet</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}