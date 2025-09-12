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
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertClientSchema, type Client, type ClientPayment, type Item, type Vendor } from "@shared/schema";
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
  ShoppingCart,
  DollarSign,
  TrendingUp,
  Star,
  CheckCircle,
  Clock,
  AlertCircle,
  CreditCard,
  Receipt,
  MoreVertical
} from "lucide-react";

const clientFormSchema = insertClientSchema.extend({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(1, "Phone is required"),
  email: z.string().email("Valid email is required")
});

type ClientFormData = z.infer<typeof clientFormSchema>;

interface ClientWithStats extends Client {
  totalPurchases: number;
  activePurchases: number;
  completedPurchases: number;
  totalSpent: number;
  outstandingBalance: {
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

function formatCurrencyRange(min: number, max: number) {
  if (min === max) {
    return formatCurrency(min);
  }
  return `${formatCurrency(min)} - ${formatCurrency(max)}`;
}

export default function Clients() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: clients, isLoading: clientsLoading } = useQuery<ClientWithStats[]>({
    queryKey: ['/api/clients'],
    select: (clients: Client[]) => {
      return clients.map(client => ({
        ...client,
        totalPurchases: 0,
        activePurchases: 0,
        completedPurchases: 0,
        totalSpent: 0,
        outstandingBalance: { min: 0, max: 0 }
      }));
    }
  });

  const { data: payments } = useQuery<Array<ClientPayment & { item: Item & { vendor: Vendor }, client: Client }>>({
    queryKey: ['/api/payments'],
  });

  const createClientMutation = useMutation({
    mutationFn: async (data: ClientFormData) => {
      return await apiRequest('POST', '/api/clients', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/metrics'] });
      setIsCreateModalOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Client created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create client",
        variant: "destructive",
      });
    },
  });

  const deleteClientMutation = useMutation({
    mutationFn: async (clientId: string) => {
      return await apiRequest('DELETE', `/api/clients/${clientId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/metrics'] });
      toast({
        title: "Success",
        description: "Client deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete client",
        variant: "destructive",
      });
    },
  });

  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      billingAddr: "",
      idNumber: ""
    },
  });

  const onSubmit = (data: ClientFormData) => {
    createClientMutation.mutate(data);
  };

  const handleDeleteClient = (clientId: string, clientName: string) => {
    if (confirm(`Are you sure you want to delete "${clientName}"? This action cannot be undone.`)) {
      deleteClientMutation.mutate(clientId);
    }
  };

  // Calculate client statistics
  const clientsWithStats = clients?.map(client => {
    const clientPayments = payments?.filter(payment => payment.clientId === client.clientId) || [];
    
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

    const purchases = Object.values(itemPayments);
    const activePurchases = purchases.filter(p => p.totalPaid < Number(p.item.maxSalesPrice || 0)).length;
    const completedPurchases = purchases.filter(p => p.totalPaid >= Number(p.item.maxSalesPrice || 0)).length;
    const totalSpent = clientPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    const outstandingBalance = purchases.reduce((acc, purchase) => {
      const minRemaining = Math.max(0, Number(purchase.item.minSalesPrice || 0) - purchase.totalPaid);
      const maxRemaining = Math.max(0, Number(purchase.item.maxSalesPrice || 0) - purchase.totalPaid);
      return {
        min: acc.min + minRemaining,
        max: acc.max + maxRemaining
      };
    }, { min: 0, max: 0 });

    return {
      ...client,
      totalPurchases: purchases.length,
      activePurchases,
      completedPurchases,
      totalSpent,
      outstandingBalance
    };
  }) || [];

  // Filter clients based on search term
  const filteredClients = clientsWithStats.filter(client =>
    client.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate overall metrics
  const totalClients = clients?.length || 0;
  const activeClients = clientsWithStats.filter(c => c.activePurchases > 0).length;
  const totalPurchases = clientsWithStats.reduce((sum, c) => sum + c.totalPurchases, 0);
  const totalRevenue = clientsWithStats.reduce((sum, c) => sum + c.totalSpent, 0);
  const totalOutstandingRange = clientsWithStats.reduce((acc, c) => ({
    min: acc.min + c.outstandingBalance.min,
    max: acc.max + c.outstandingBalance.max
  }), { min: 0, max: 0 });

  return (
    <MainLayout title="Clients" subtitle="Manage client relationships and purchase history">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalClients}</div>
            <p className="text-xs text-muted-foreground">
              Registered clients
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeClients}</div>
            <p className="text-xs text-muted-foreground">
              With ongoing purchases
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Purchases</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPurchases}</div>
            <p className="text-xs text-muted-foreground">
              Items purchased
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              Payments received
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding Balance</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrencyRange(totalOutstandingRange.min, totalOutstandingRange.max)}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting payment
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search clients by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button className="hidden sm:flex" data-testid="button-add-client">
              <Plus className="h-4 w-4 mr-2" />
              Add Client
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Client</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
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
                  control={form.control}
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
                  name="idNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ID Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Client ID number" {...field} value={field.value || ""} data-testid="input-client-id-number" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="billingAddr"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Billing Address</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Billing address" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createClientMutation.isPending}>
                    {createClientMutation.isPending ? "Adding..." : "Add Client"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Clients List */}
      <div className="space-y-4">
        {clientsLoading ? (
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
        ) : filteredClients.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {searchTerm ? "No clients found" : "No clients yet"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm 
                  ? "Try adjusting your search terms" 
                  : "Start by adding your first client to the system"
                }
              </p>
              {!searchTerm && (
                <Button onClick={() => setIsCreateModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Client
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredClients.map((client) => (
            <Card key={client.clientId} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 md:p-6">
                <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
                  {/* Mobile: Header row with name and actions */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                        <User className="h-6 w-6 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-lg truncate">{client.name}</h3>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 text-sm text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <Mail className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{client.email}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Phone className="h-3 w-3 flex-shrink-0" />
                            <span>{client.phone}</span>
                          </div>
                          {client.idNumber && (
                            <div className="flex items-center space-x-1">
                              <CreditCard className="h-3 w-3 flex-shrink-0" />
                              <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded">
                                ID: {client.idNumber}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Mobile actions dropdown */}
                    <div className="md:hidden">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" data-testid="button-client-actions">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/client/${client.clientId}`} className="flex items-center w-full">
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/client/${client.clientId}`} className="flex items-center w-full">
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Client
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteClient(client.clientId, client.name || "Client")}
                            disabled={deleteClientMutation.isPending}
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
                        {client.totalPurchases} purchases
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {client.activePurchases} active • {client.completedPurchases} completed
                      </div>
                    </div>

                    <div className="text-center md:text-right">
                      <div className="text-sm font-medium">
                        {formatCurrency(client.totalSpent)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Total spent
                      </div>
                    </div>

                    {(client.outstandingBalance.min > 0 || client.outstandingBalance.max > 0) && (
                      <div className="text-center md:text-right col-span-2 md:col-span-1">
                        <div className="text-sm font-medium text-amber-600">
                          {formatCurrencyRange(client.outstandingBalance.min, client.outstandingBalance.max)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Outstanding
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Desktop actions */}
                  <div className="hidden md:flex space-x-2">
                    <Link href={`/client/${client.clientId}`}>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Link href={`/client/${client.clientId}`}>
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleDeleteClient(client.clientId, client.name || "Client")}
                      disabled={deleteClientMutation.isPending}
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
                        Customer since: {formatDate(client.createdAt.toString())}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {client.activePurchases > 0 && (
                        <Badge variant="default">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Active
                        </Badge>
                      )}
                      {(client.outstandingBalance.min > 0 || client.outstandingBalance.max > 0) && (
                        <Badge variant="outline">
                          <Clock className="w-3 h-3 mr-1" />
                          Outstanding Balance
                        </Badge>
                      )}
                      {client.completedPurchases > 0 && (
                        <Badge variant="secondary">
                          <Star className="w-3 h-3 mr-1" />
                          Repeat Customer
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
            data-testid="fab-add-client"
          >
            <Plus className="h-6 w-6" />
          </Button>
        </DialogTrigger>
      </Dialog>
    </MainLayout>
  );
}
