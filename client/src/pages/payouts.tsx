import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Calendar, 
  Search, 
  Filter,
  SortAsc,
  SortDesc,
  CreditCard,
  Clock,
  CheckCircle,
  XCircle,
  User,
  Package,
  Eye,
  Watch,
  Gem,
  Crown,
  Building,
  Wallet,
  Send,
  ArrowUp,
  ArrowDown,
  Target,
  Activity,
  BarChart3,
  Banknote,
  HandCoins
} from "lucide-react";

// Payout form schema
const payoutFormSchema = z.object({
  amount: z.string().min(1, "Amount is required"),
  bankAccount: z.string().min(1, "Bank account is required"),
  transferId: z.string().min(1, "Transfer ID is required"),
  notes: z.string().optional(),
});

type PayoutFormData = z.infer<typeof payoutFormSchema>;

interface PayoutMetrics {
  totalPayoutsPaid: number;
  totalPayoutsAmount: number;
  pendingPayouts: number;
  upcomingPayouts: number;
  averagePayoutAmount: number;
  monthlyPayoutTrend: number;
}

interface RecentPayout {
  payoutId: string;
  amount: number;
  paidAt: string;
  item: {
    itemId: string;
    title: string;
    brand: string;
    model: string;
    listPrice: number;
    salePrice: number;
  };
  vendor: {
    vendorId: string;
    name: string;
    email: string;
    phone: string;
  };
}

interface UpcomingPayout {
  itemId: string;
  title: string;
  brand: string;
  model: string;
  listPrice: number;
  salePrice: number;
  vendorPayoutAmount: number;
  totalPaid: number;
  remainingBalance: number;
  paymentProgress: number;
  isFullyPaid: boolean;
  fullyPaidAt?: string;
  firstPaymentDate?: string;
  lastPaymentDate?: string;
  vendor: {
    vendorId: string;
    name: string;
    email: string;
    phone: string;
  };
}

function formatCurrency(amount: number | string) {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
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

function getStatusBadge(status: string) {
  switch (status) {
    case 'ready':
      return <Badge variant="secondary" className="bg-green-100 text-green-800">Ready for Payout</Badge>;
    case 'pending':
      return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
    case 'paid':
      return <Badge variant="default" className="bg-blue-100 text-blue-800">Paid</Badge>;
    case 'partial':
      return <Badge variant="outline" className="bg-gray-100 text-gray-800">Partial Payment</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function getItemIcon(brand: string) {
  switch (brand?.toLowerCase()) {
    case 'rolex':
    case 'omega':
    case 'cartier':
    case 'patek philippe':
      return <Watch className="h-4 w-4 text-blue-500" />;
    case 'louis vuitton':
    case 'chanel':
    case 'hermès':
    case 'gucci':
      return <Gem className="h-4 w-4 text-purple-500" />;
    default:
      return <Crown className="h-4 w-4 text-yellow-500" />;
  }
}

export default function Payouts() {
  const [recentSearchTerm, setRecentSearchTerm] = useState("");
  const [upcomingSearchTerm, setUpcomingSearchTerm] = useState("");
  const [upcomingStatusFilter, setUpcomingStatusFilter] = useState("all");
  const [recentSortBy, setRecentSortBy] = useState("date");
  const [recentSortOrder, setRecentSortOrder] = useState<"asc" | "desc">("desc");
  const [upcomingSortBy, setUpcomingSortBy] = useState("progress");
  const [upcomingSortOrder, setUpcomingSortOrder] = useState<"asc" | "desc">("desc");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Payout modal state
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [selectedPayout, setSelectedPayout] = useState<UpcomingPayout | null>(null);

  // Payout form
  const payoutForm = useForm<PayoutFormData>({
    resolver: zodResolver(payoutFormSchema),
    defaultValues: {
      amount: "",
      bankAccount: "",
      transferId: "",
      notes: "",
    },
  });

  const { data: payoutMetrics, isLoading: metricsLoading } = useQuery<PayoutMetrics>({
    queryKey: ['/api/payouts/metrics'],
    queryFn: async () => {
      const response = await fetch('/api/payouts/metrics');
      if (!response.ok) throw new Error('Failed to fetch payout metrics');
      return response.json();
    }
  });

  const { data: recentPayouts, isLoading: recentLoading } = useQuery<RecentPayout[]>({
    queryKey: ['/api/payouts/recent'],
    queryFn: async () => {
      const response = await fetch('/api/payouts/recent');
      if (!response.ok) throw new Error('Failed to fetch recent payouts');
      return response.json();
    }
  });

  const { data: upcomingPayouts, isLoading: upcomingLoading } = useQuery<UpcomingPayout[]>({
    queryKey: ['/api/payouts/upcoming'],
    queryFn: async () => {
      const response = await fetch('/api/payouts/upcoming');
      if (!response.ok) throw new Error('Failed to fetch upcoming payouts');
      return response.json();
    }
  });

  const createPayoutMutation = useMutation({
    mutationFn: async (formData: PayoutFormData & { payout: UpcomingPayout }) => {
      const payoutData = {
        vendorId: formData.payout.vendor.vendorId,
        itemId: formData.payout.itemId,
        amount: parseFloat(formData.amount),
        paidAt: new Date().toISOString(),
        bankAccount: formData.bankAccount,
        transferId: formData.transferId,
        notes: formData.notes || `Payout for ${formData.payout.brand} ${formData.payout.model}`,
      };
      return await apiRequest('POST', '/api/payouts', payoutData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/payouts/upcoming'] });
      queryClient.invalidateQueries({ queryKey: ['/api/payouts/recent'] });
      queryClient.invalidateQueries({ queryKey: ['/api/payouts/metrics'] });
      setIsPayoutModalOpen(false);
      setSelectedPayout(null);
      payoutForm.reset();
      toast({
        title: "Success",
        description: "Payout processed successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to process payout",
        variant: "destructive",
      });
    },
  });

  const openPayoutModal = (payout: UpcomingPayout) => {
    setSelectedPayout(payout);
    payoutForm.setValue('amount', payout.vendorPayoutAmount.toString());
    setIsPayoutModalOpen(true);
  };

  const onPayoutSubmit = (data: PayoutFormData) => {
    if (selectedPayout) {
      createPayoutMutation.mutate({
        ...data,
        payout: selectedPayout,
      });
    }
  };

  // Filter and sort recent payouts
  const filteredRecentPayouts = useMemo(() => {
    if (!recentPayouts) return [];
    
    let filtered = recentPayouts.filter(payout => {
      const searchLower = recentSearchTerm.toLowerCase();
      return (
        payout.item.title.toLowerCase().includes(searchLower) ||
        payout.item.brand.toLowerCase().includes(searchLower) ||
        payout.vendor.name.toLowerCase().includes(searchLower)
      );
    });

    // Sort
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (recentSortBy) {
        case 'date':
          aValue = new Date(a.paidAt);
          bValue = new Date(b.paidAt);
          break;
        case 'amount':
          aValue = a.amount;
          bValue = b.amount;
          break;
        case 'vendor':
          aValue = a.vendor.name;
          bValue = b.vendor.name;
          break;
        default:
          aValue = new Date(a.paidAt);
          bValue = new Date(b.paidAt);
      }

      if (recentSortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [recentPayouts, recentSearchTerm, recentSortBy, recentSortOrder]);

  // Filter and sort upcoming payouts
  const filteredUpcomingPayouts = useMemo(() => {
    if (!upcomingPayouts) return [];
    
    let filtered = upcomingPayouts.filter(payout => {
      const searchLower = upcomingSearchTerm.toLowerCase();
      const matchesSearch = (
        payout.title.toLowerCase().includes(searchLower) ||
        payout.brand.toLowerCase().includes(searchLower) ||
        payout.vendor.name.toLowerCase().includes(searchLower)
      );

      const matchesFilter = upcomingStatusFilter === 'all' || 
        (upcomingStatusFilter === 'ready' && payout.isFullyPaid) ||
        (upcomingStatusFilter === 'partial' && !payout.isFullyPaid);

      return matchesSearch && matchesFilter;
    });

    // Sort
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (upcomingSortBy) {
        case 'progress':
          aValue = a.paymentProgress;
          bValue = b.paymentProgress;
          break;
        case 'amount':
          aValue = a.vendorPayoutAmount;
          bValue = b.vendorPayoutAmount;
          break;
        case 'vendor':
          aValue = a.vendor.name;
          bValue = b.vendor.name;
          break;
        case 'item':
          aValue = a.title;
          bValue = b.title;
          break;
        default:
          aValue = a.paymentProgress;
          bValue = b.paymentProgress;
      }

      if (upcomingSortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [upcomingPayouts, upcomingSearchTerm, upcomingStatusFilter, upcomingSortBy, upcomingSortOrder]);

  return (
    <MainLayout 
      title="Payouts" 
      subtitle="Manage vendor payouts and track payment obligations"
    >
      <div className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Payouts</CardTitle>
              <HandCoins className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{payoutMetrics?.totalPayoutsPaid || 0}</div>
              <p className="text-xs text-muted-foreground">
                {payoutMetrics?.monthlyPayoutTrend >= 0 ? '+' : ''}{payoutMetrics?.monthlyPayoutTrend || 0}% from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(payoutMetrics?.totalPayoutsAmount || 0)}</div>
              <p className="text-xs text-muted-foreground">
                Total paid to vendors
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ready for Payout</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{payoutMetrics?.pendingPayouts || 0}</div>
              <p className="text-xs text-muted-foreground">
                Items fully paid
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming Payouts</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{payoutMetrics?.upcomingPayouts || 0}</div>
              <p className="text-xs text-muted-foreground">
                Items in progress
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Payout</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(payoutMetrics?.averagePayoutAmount || 0)}</div>
              <p className="text-xs text-muted-foreground">
                Per vendor payout
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Trend</CardTitle>
              {payoutMetrics?.monthlyPayoutTrend >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${
                payoutMetrics?.monthlyPayoutTrend >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {payoutMetrics?.monthlyPayoutTrend >= 0 ? '+' : ''}{payoutMetrics?.monthlyPayoutTrend || 0}%
              </div>
              <p className="text-xs text-muted-foreground">
                vs last month
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Payouts Tables */}
        <Tabs defaultValue="recent" className="space-y-4">
          <TabsList>
            <TabsTrigger value="recent">Recent Payouts</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming Payouts</TabsTrigger>
          </TabsList>

          {/* Recent Payouts Tab */}
          <TabsContent value="recent" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Payouts</CardTitle>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search recent payouts..."
                      value={recentSearchTerm}
                      onChange={(e) => setRecentSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={recentSortBy} onValueChange={setRecentSortBy}>
                    <SelectTrigger className="w-full sm:w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date">Date</SelectItem>
                      <SelectItem value="amount">Amount</SelectItem>
                      <SelectItem value="vendor">Vendor</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRecentSortOrder(recentSortOrder === "asc" ? "desc" : "asc")}
                  >
                    {recentSortOrder === "asc" ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {recentLoading ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <Skeleton className="h-10 w-10 rounded-full" />
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-24" />
                          </div>
                        </div>
                        <div className="text-right space-y-2">
                          <Skeleton className="h-4 w-20" />
                          <Skeleton className="h-3 w-16" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Vendor</TableHead>
                          <TableHead>Item</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Date Paid</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRecentPayouts?.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8">
                              <p className="text-muted-foreground">No recent payouts found</p>
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredRecentPayouts?.map((payout) => (
                            <TableRow key={payout.payoutId}>
                              <TableCell>
                                <div className="flex items-center space-x-2">
                                  <Building className="h-4 w-4 text-muted-foreground" />
                                  <div>
                                    <div className="font-medium">{payout.vendor.name}</div>
                                    <div className="text-sm text-muted-foreground">{payout.vendor.email}</div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center space-x-2">
                                  {getItemIcon(payout.item.brand)}
                                  <div>
                                    <div className="font-medium">{payout.item.title}</div>
                                    <div className="text-sm text-muted-foreground">
                                      {payout.item.brand} {payout.item.model}
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="font-medium">{formatCurrency(payout.amount)}</div>
                                <div className="text-sm text-muted-foreground">
                                  of {formatCurrency(payout.item.salePrice)}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">{formatDateTime(payout.paidAt)}</div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center space-x-2">
                                  <Link href={`/vendors/${payout.vendor.vendorId}`}>
                                    <Button variant="ghost" size="sm">
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </Link>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Upcoming Payouts Tab */}
          <TabsContent value="upcoming" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Payouts</CardTitle>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search upcoming payouts..."
                      value={upcomingSearchTerm}
                      onChange={(e) => setUpcomingSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={upcomingStatusFilter} onValueChange={setUpcomingStatusFilter}>
                    <SelectTrigger className="w-full sm:w-40">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="ready">Ready for Payout</SelectItem>
                      <SelectItem value="partial">Partial Payment</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={upcomingSortBy} onValueChange={setUpcomingSortBy}>
                    <SelectTrigger className="w-full sm:w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="progress">Progress</SelectItem>
                      <SelectItem value="amount">Amount</SelectItem>
                      <SelectItem value="vendor">Vendor</SelectItem>
                      <SelectItem value="item">Item</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setUpcomingSortOrder(upcomingSortOrder === "asc" ? "desc" : "asc")}
                  >
                    {upcomingSortOrder === "asc" ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Payout Statistics */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <div>
                          <div className="text-sm font-medium text-muted-foreground">Ready</div>
                          <div className="text-2xl font-bold text-green-600">
                            {upcomingPayouts?.filter(p => p.isFullyPaid).length || 0}
                          </div>
                          <div className="text-xs text-muted-foreground">Fully paid</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-yellow-500" />
                        <div>
                          <div className="text-sm font-medium text-muted-foreground">In Progress</div>
                          <div className="text-2xl font-bold text-yellow-600">
                            {upcomingPayouts?.filter(p => !p.isFullyPaid).length || 0}
                          </div>
                          <div className="text-xs text-muted-foreground">Partial payment</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-2">
                        <DollarSign className="h-4 w-4 text-green-500" />
                        <div>
                          <div className="text-sm font-medium text-muted-foreground">Ready Amount</div>
                          <div className="text-2xl font-bold text-green-600">
                            {formatCurrency(upcomingPayouts?.filter(p => p.isFullyPaid).reduce((sum, p) => sum + p.vendorPayoutAmount, 0) || 0)}
                          </div>
                          <div className="text-xs text-muted-foreground">To pay out</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-2">
                        <Target className="h-4 w-4 text-blue-500" />
                        <div>
                          <div className="text-sm font-medium text-muted-foreground">Expected</div>
                          <div className="text-2xl font-bold text-blue-600">
                            {formatCurrency(upcomingPayouts?.reduce((sum, p) => sum + p.vendorPayoutAmount, 0) || 0)}
                          </div>
                          <div className="text-xs text-muted-foreground">Total potential</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {upcomingLoading ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <Skeleton className="h-10 w-10 rounded-full" />
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-24" />
                          </div>
                        </div>
                        <div className="text-right space-y-2">
                          <Skeleton className="h-4 w-20" />
                          <Skeleton className="h-3 w-16" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Vendor</TableHead>
                          <TableHead>Item</TableHead>
                          <TableHead>Payout Amount</TableHead>
                          <TableHead>Payment Progress</TableHead>
                          <TableHead>Payment Timeline</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUpcomingPayouts?.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-8">
                              <p className="text-muted-foreground">No upcoming payouts found</p>
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredUpcomingPayouts?.map((payout) => (
                            <TableRow key={payout.itemId} className={
                              payout.isFullyPaid ? "bg-green-50 border-l-4 border-l-green-500" : 
                              payout.paymentProgress >= 80 ? "bg-yellow-50 border-l-4 border-l-yellow-500" : ""
                            }>
                              <TableCell>
                                <div className="flex items-center space-x-2">
                                  <Building className="h-4 w-4 text-muted-foreground" />
                                  <div>
                                    <div className="font-medium">{payout.vendor.name}</div>
                                    <div className="text-sm text-muted-foreground">{payout.vendor.email}</div>
                                    <div className="text-xs text-muted-foreground">{payout.vendor.phone}</div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center space-x-2">
                                  {getItemIcon(payout.brand)}
                                  <div>
                                    <div className="font-medium">{payout.title}</div>
                                    <div className="text-sm text-muted-foreground">
                                      {payout.brand} {payout.model}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      Sale: {formatCurrency(payout.salePrice)}
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="font-medium text-lg">{formatCurrency(payout.vendorPayoutAmount)}</div>
                                <div className="text-sm text-muted-foreground">
                                  of {formatCurrency(payout.salePrice)}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">
                                      {formatCurrency(payout.totalPaid)} / {formatCurrency(payout.salePrice)}
                                    </span>
                                    <span className="text-sm text-muted-foreground">
                                      {payout.paymentProgress.toFixed(1)}%
                                    </span>
                                  </div>
                                  <Progress value={payout.paymentProgress} className="h-2" />
                                  {payout.remainingBalance > 0 && (
                                    <div className="text-xs text-muted-foreground">
                                      Remaining: {formatCurrency(payout.remainingBalance)}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="space-y-2">
                                  {payout.firstPaymentDate && (
                                    <div className="flex items-center space-x-2">
                                      <Calendar className="h-3 w-3 text-green-500" />
                                      <div>
                                        <div className="text-xs text-muted-foreground">First Payment</div>
                                        <div className="text-sm font-medium">
                                          {formatDate(payout.firstPaymentDate)}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                  {payout.lastPaymentDate && (
                                    <div className="flex items-center space-x-2">
                                      <Calendar className="h-3 w-3 text-blue-500" />
                                      <div>
                                        <div className="text-xs text-muted-foreground">
                                          {payout.isFullyPaid ? 'Last Payment' : 'Expected Final'}
                                        </div>
                                        <div className="text-sm font-medium">
                                          {formatDate(payout.lastPaymentDate)}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                  {!payout.firstPaymentDate && !payout.lastPaymentDate && (
                                    <div className="text-xs text-muted-foreground">
                                      No payment timeline available
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                {payout.isFullyPaid ? (
                                  <div className="space-y-1">
                                    {getStatusBadge('ready')}
                                    {payout.fullyPaidAt && (
                                      <div className="text-xs text-muted-foreground">
                                        Paid: {formatDate(payout.fullyPaidAt)}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  getStatusBadge('partial')
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center space-x-2">
                                  <Link href={`/vendors/${payout.vendor.vendorId}`}>
                                    <Button variant="ghost" size="sm">
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </Link>
                                  {payout.isFullyPaid && (
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => openPayoutModal(payout)}
                                      disabled={createPayoutMutation.isPending}
                                    >
                                      <Send className="h-4 w-4 mr-1" />
                                      Pay Out
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Payout Form Modal */}
      <Dialog open={isPayoutModalOpen} onOpenChange={setIsPayoutModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Process Payout</DialogTitle>
            <DialogDescription>
              {selectedPayout && (
                <>
                  Processing payout for <strong>{selectedPayout.brand} {selectedPayout.model}</strong> to vendor <strong>{selectedPayout.vendor.name}</strong>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...payoutForm}>
            <form onSubmit={payoutForm.handleSubmit(onPayoutSubmit)} className="space-y-4">
              <FormField
                control={payoutForm.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payout Amount</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01" 
                        placeholder="0.00" 
                        {...field}
                        data-testid="input-payout-amount"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={payoutForm.control}
                name="bankAccount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bank Account</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Which bank account did you send from?" 
                        {...field}
                        data-testid="input-bank-account"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={payoutForm.control}
                name="transferId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Transfer ID / Reference</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Bank transfer reference or ID" 
                        {...field}
                        data-testid="input-transfer-id"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={payoutForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Additional notes about this payout..." 
                        className="h-20"
                        {...field}
                        data-testid="textarea-payout-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsPayoutModalOpen(false)}
                  data-testid="button-cancel-payout"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createPayoutMutation.isPending}
                  data-testid="button-process-payout"
                >
                  {createPayoutMutation.isPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Process Payout
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}