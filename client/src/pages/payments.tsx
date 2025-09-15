import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
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
  Heart,
  Mail,
  Shield,
  Target,
  Activity,
  BarChart3,
} from "lucide-react";

interface PaymentMetrics {
  totalPaymentsReceived: number;
  totalPaymentsAmount: number;
  overduePayments: number;
  upcomingPayments: number;
  averagePaymentAmount: number;
  monthlyPaymentTrend: number;
}

interface FinancialHealthScore {
  score: number;
  grade: string;
  factors: {
    paymentTimeliness: number;
    cashFlow: number;
    inventoryTurnover: number;
    profitMargin: number;
    clientRetention: number;
  };
  recommendations: string[];
}

interface RecentPayment {
  paymentId: string;
  amount: number;
  paymentMethod: string;
  paidAt: string;
  item: {
    itemId: string;
    title: string;
    brand: string;
    model: string;
    minSalesPrice: number | null;
    maxSalesPrice: number | null;
    vendor: {
      name: string;
    };
  };
  client: {
    clientId: string;
    name: string;
    email: string;
    phone: string;
  };
}

interface UpcomingPayment {
  installmentId: string;
  amount: number;
  dueDate: string;
  status: string;
  item: {
    itemId: string;
    title: string;
    brand: string;
    model: string;
    minSalesPrice: number | null;
    maxSalesPrice: number | null;
    vendor: {
      name: string;
    };
  };
  client: {
    clientId: string;
    name: string;
    email: string;
    phone: string;
  };
}

function formatCurrency(amount: number | string) {
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(numAmount);
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(dateString: string) {
  return new Date(dateString).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getPaymentMethodBadge(method: string) {
  const config = {
    cash: { color: "bg-green-500", icon: DollarSign },
    credit_card: { color: "bg-blue-500", icon: CreditCard },
    debit_card: { color: "bg-purple-500", icon: CreditCard },
    bank_transfer: { color: "bg-orange-500", icon: TrendingUp },
    check: { color: "bg-gray-500", icon: CheckCircle },
  };

  const { color, icon: Icon } =
    config[method as keyof typeof config] || config.cash;

  return (
    <Badge className={`${color} text-white`}>
      <Icon className="w-3 h-3 mr-1" />
      {method.replace("_", " ").toUpperCase()}
    </Badge>
  );
}

function getStatusBadge(status: string) {
  const config = {
    pending: { color: "bg-yellow-500", icon: Clock },
    paid: { color: "bg-green-500", icon: CheckCircle },
    overdue: { color: "bg-red-500", icon: XCircle },
  };

  const { color, icon: Icon } =
    config[status as keyof typeof config] || config.pending;

  return (
    <Badge className={`${color} text-white`}>
      <Icon className="w-3 h-3 mr-1" />
      {status.toUpperCase()}
    </Badge>
  );
}

function getItemIcon(brand: string | null | undefined) {
  if (!brand) return <Gem className="h-4 w-4" />;
  const brandLower = brand.toLowerCase();
  if (
    brandLower.includes("rolex") ||
    brandLower.includes("omega") ||
    brandLower.includes("cartier")
  ) {
    return <Watch className="h-4 w-4" />;
  }
  if (
    brandLower.includes("louis") ||
    brandLower.includes("hermès") ||
    brandLower.includes("chanel")
  ) {
    return <Crown className="h-4 w-4" />;
  }
  return <Gem className="h-4 w-4" />;
}

function isOverdue(dueDate: string) {
  return new Date(dueDate) < new Date();
}

export default function Payments() {
  const [recentSearchTerm, setRecentSearchTerm] = useState("");
  const [upcomingSearchTerm, setUpcomingSearchTerm] = useState("");
  const [recentPaymentMethodFilter, setRecentPaymentMethodFilter] =
    useState("all");
  const [upcomingStatusFilter, setUpcomingStatusFilter] = useState("all");
  const [recentSortBy, setRecentSortBy] = useState("date");
  const [recentSortOrder, setRecentSortOrder] = useState<"asc" | "desc">(
    "desc",
  );
  const [upcomingSortBy, setUpcomingSortBy] = useState("date");
  const [upcomingSortOrder, setUpcomingSortOrder] = useState<"asc" | "desc">(
    "asc",
  );
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: metrics, isLoading: metricsLoading } = useQuery<PaymentMetrics>(
    {
      queryKey: ["/api/payments/metrics"],
      queryFn: async () => {
        const response = await fetch("/api/payments/metrics");
        if (!response.ok) throw new Error("Failed to fetch payment metrics");
        return response.json();
      },
    },
  );

  const { data: recentPayments, isLoading: recentLoading } = useQuery<
    RecentPayment[]
  >({
    queryKey: ["/api/payments/recent"],
    queryFn: async () => {
      const response = await fetch("/api/payments/recent?limit=50");
      if (!response.ok) throw new Error("Failed to fetch recent payments");
      return response.json();
    },
  });

  const { data: upcomingPayments, isLoading: upcomingLoading } = useQuery<
    UpcomingPayment[]
  >({
    queryKey: ["/api/payments/upcoming"],
    queryFn: async () => {
      const response = await fetch("/api/payments/upcoming?limit=50");
      if (!response.ok) throw new Error("Failed to fetch upcoming payments");
      return response.json();
    },
  });

  const { data: overduePayments, isLoading: overdueLoading } = useQuery<
    UpcomingPayment[]
  >({
    queryKey: ["/api/payments/overdue"],
    queryFn: async () => {
      const response = await fetch("/api/payments/overdue");
      if (!response.ok) throw new Error("Failed to fetch overdue payments");
      return response.json();
    },
  });

  const { data: financialHealth, isLoading: healthLoading } =
    useQuery<FinancialHealthScore>({
      queryKey: ["/api/financial-health"],
      queryFn: async () => {
        const response = await fetch("/api/financial-health");
        if (!response.ok) throw new Error("Failed to fetch financial health");
        return response.json();
      },
    });

  const markPaidMutation = useMutation({
    mutationFn: async (installmentId: string) => {
      return await apiRequest(
        `/api/installments/${installmentId}/mark-paid`,
        "PATCH",
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments/upcoming"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payments/overdue"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payments/metrics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/financial-health"] });
      toast({
        title: "Success",
        description: "Payment marked as paid",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to mark payment as paid",
        variant: "destructive",
      });
    },
  });

  const sendReminderMutation = useMutation({
    mutationFn: async (installmentId: string) => {
      return await apiRequest(
        `/api/installments/${installmentId}/send-reminder`,
        "POST",
      );
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Payment reminder sent",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send reminder",
        variant: "destructive",
      });
    },
  });

  const filteredRecentPayments = useMemo(() => {
    if (!recentPayments) return [];

    return recentPayments
      .filter((payment) => {
        const matchesSearch =
          payment.client.name
            .toLowerCase()
            .includes(recentSearchTerm.toLowerCase()) ||
          payment.item.title
            .toLowerCase()
            .includes(recentSearchTerm.toLowerCase()) ||
          (payment.item.brand || "")
            .toLowerCase()
            .includes(recentSearchTerm.toLowerCase());

        const matchesPaymentMethod =
          recentPaymentMethodFilter === "all" ||
          payment.paymentMethod === recentPaymentMethodFilter;

        return matchesSearch && matchesPaymentMethod;
      })
      .sort((a, b) => {
        let aValue: string | number;
        let bValue: string | number;

        switch (recentSortBy) {
          case "date":
            aValue = new Date(a.paidAt).getTime();
            bValue = new Date(b.paidAt).getTime();
            break;
          case "amount":
            aValue = a.amount;
            bValue = b.amount;
            break;
          case "client":
            aValue = a.client.name;
            bValue = b.client.name;
            break;
          case "item":
            aValue = a.item.title;
            bValue = b.item.title;
            break;
          default:
            aValue = new Date(a.paidAt).getTime();
            bValue = new Date(b.paidAt).getTime();
        }

        if (recentSortOrder === "asc") {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      });
  }, [
    recentPayments,
    recentSearchTerm,
    recentPaymentMethodFilter,
    recentSortBy,
    recentSortOrder,
  ]);

  const filteredUpcomingPayments = useMemo(() => {
    if (!upcomingPayments) return [];

    // Combine upcoming and overdue payments
    const allPayments = [...upcomingPayments, ...(overduePayments || [])];

    return allPayments
      .filter((payment) => {
        const matchesSearch =
          payment.client.name
            .toLowerCase()
            .includes(upcomingSearchTerm.toLowerCase()) ||
          payment.item.title
            .toLowerCase()
            .includes(upcomingSearchTerm.toLowerCase()) ||
          (payment.item.brand || "")
            .toLowerCase()
            .includes(upcomingSearchTerm.toLowerCase());

        const paymentStatus = isOverdue(payment.dueDate)
          ? "overdue"
          : payment.status;
        const matchesStatus =
          upcomingStatusFilter === "all" ||
          paymentStatus === upcomingStatusFilter;

        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        let aValue: string | number;
        let bValue: string | number;

        switch (upcomingSortBy) {
          case "date":
            aValue = new Date(a.dueDate).getTime();
            bValue = new Date(b.dueDate).getTime();
            break;
          case "amount":
            aValue = a.amount;
            bValue = b.amount;
            break;
          case "client":
            aValue = a.client.name;
            bValue = b.client.name;
            break;
          case "item":
            aValue = a.item.title;
            bValue = b.item.title;
            break;
          default:
            aValue = new Date(a.dueDate).getTime();
            bValue = new Date(b.dueDate).getTime();
        }

        if (upcomingSortOrder === "asc") {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      });
  }, [
    upcomingPayments,
    overduePayments,
    upcomingSearchTerm,
    upcomingStatusFilter,
    upcomingSortBy,
    upcomingSortOrder,
  ]);

  return (
    <MainLayout
      title="Payments"
      subtitle="Track client payments and manage payment schedules"
    >
      <div className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metricsLoading ? (
                  <Skeleton className="h-6 w-8" />
                ) : (
                  metrics?.upcomingPayments || 0
                )}
              </div>
              <p className="text-xs text-muted-foreground">Payments due soon</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {metricsLoading ? (
                  <Skeleton className="h-6 w-8" />
                ) : (
                  metrics?.overduePayments || 0
                )}
              </div>
              <p className="text-xs text-muted-foreground">Overdue payments</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Payments
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metricsLoading ? (
                  <Skeleton className="h-6 w-16" />
                ) : (
                  metrics?.totalPaymentsReceived || 0
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Total payments received
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Amount
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metricsLoading ? (
                  <Skeleton className="h-6 w-24" />
                ) : (
                  formatCurrency(metrics?.totalPaymentsAmount || 0)
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Total payment value
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Payment Tables */}
        <Tabs defaultValue="recent" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="recent">Recent Payments</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming Payments</TabsTrigger>
          </TabsList>

          {/* Recent Payments Tab */}
          <TabsContent value="recent" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Payments</CardTitle>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search payments..."
                      value={recentSearchTerm}
                      onChange={(e) => setRecentSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select
                    value={recentPaymentMethodFilter}
                    onValueChange={setRecentPaymentMethodFilter}
                  >
                    <SelectTrigger className="w-full sm:w-40">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Methods</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="credit_card">Credit Card</SelectItem>
                      <SelectItem value="debit_card">Debit Card</SelectItem>
                      <SelectItem value="bank_transfer">
                        Bank Transfer
                      </SelectItem>
                      <SelectItem value="check">Check</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={recentSortBy} onValueChange={setRecentSortBy}>
                    <SelectTrigger className="w-full sm:w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date">Date</SelectItem>
                      <SelectItem value="amount">Amount</SelectItem>
                      <SelectItem value="client">Client</SelectItem>
                      <SelectItem value="item">Item</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setRecentSortOrder(
                        recentSortOrder === "asc" ? "desc" : "asc",
                      )
                    }
                  >
                    {recentSortOrder === "asc" ? (
                      <SortAsc className="h-4 w-4" />
                    ) : (
                      <SortDesc className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {recentLoading ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center space-x-4">
                          <Skeleton className="h-10 w-10 rounded-full" />
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-40" />
                            <Skeleton className="h-3 w-32" />
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
                          <TableHead>Client</TableHead>
                          <TableHead>Item</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRecentPayments?.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8">
                              <p className="text-muted-foreground">
                                No payments found
                              </p>
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredRecentPayments?.map((payment) => (
                            <TableRow key={payment.paymentId}>
                              <TableCell>
                                <div className="flex items-center space-x-2">
                                  <User className="h-4 w-4 text-muted-foreground" />
                                  <div>
                                    <div className="font-medium">
                                      {payment.client.name}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                      {payment.client.email}
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center space-x-2">
                                  {getItemIcon(payment.item.brand)}
                                  <div>
                                    <div className="font-medium">
                                      {payment.item.title}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                      {payment.item.brand} {payment.item.model}
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="font-medium">
                                  {formatCurrency(payment.amount)}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  of{" "}
                                  {formatCurrency(
                                    payment.item.maxSalesPrice ?? 0,
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                {getPaymentMethodBadge(payment.paymentMethod)}
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  {formatDateTime(payment.paidAt)}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center space-x-2">
                                  <Link
                                    href={`/clients/${payment.client.clientId}`}
                                  >
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

          {/* Upcoming Payments Tab */}
          <TabsContent value="upcoming" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Payments</CardTitle>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search upcoming payments..."
                      value={upcomingSearchTerm}
                      onChange={(e) => setUpcomingSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select
                    value={upcomingStatusFilter}
                    onValueChange={setUpcomingStatusFilter}
                  >
                    <SelectTrigger className="w-full sm:w-40">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={upcomingSortBy}
                    onValueChange={setUpcomingSortBy}
                  >
                    <SelectTrigger className="w-full sm:w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date">Due Date</SelectItem>
                      <SelectItem value="amount">Amount</SelectItem>
                      <SelectItem value="client">Client</SelectItem>
                      <SelectItem value="item">Item</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setUpcomingSortOrder(
                        upcomingSortOrder === "asc" ? "desc" : "asc",
                      )
                    }
                  >
                    {upcomingSortOrder === "asc" ? (
                      <SortAsc className="h-4 w-4" />
                    ) : (
                      <SortDesc className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Priority Statistics */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                        <div>
                          <div className="text-sm font-medium text-muted-foreground">
                            Critical
                          </div>
                          <div className="text-2xl font-bold text-red-600">
                            {upcomingPayments?.filter((p) =>
                              isOverdue(p.dueDate),
                            ).length || 0}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Overdue
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-yellow-500" />
                        <div>
                          <div className="text-sm font-medium text-muted-foreground">
                            Urgent
                          </div>
                          <div className="text-2xl font-bold text-yellow-600">
                            {upcomingPayments?.filter((p) => {
                              const days = Math.ceil(
                                (new Date(p.dueDate).getTime() - Date.now()) /
                                  (1000 * 60 * 60 * 24),
                              );
                              return days <= 3 && days > 0;
                            }).length || 0}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            ≤ 3 days
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-blue-500" />
                        <div>
                          <div className="text-sm font-medium text-muted-foreground">
                            Soon
                          </div>
                          <div className="text-2xl font-bold text-blue-600">
                            {upcomingPayments?.filter((p) => {
                              const days = Math.ceil(
                                (new Date(p.dueDate).getTime() - Date.now()) /
                                  (1000 * 60 * 60 * 24),
                              );
                              return days <= 7 && days > 3;
                            }).length || 0}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            4-7 days
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-2">
                        <DollarSign className="h-4 w-4 text-green-500" />
                        <div>
                          <div className="text-sm font-medium text-muted-foreground">
                            Total Amount
                          </div>
                          <div className="text-2xl font-bold text-green-600">
                            {formatCurrency(
                              upcomingPayments?.reduce(
                                (sum, p) => sum + p.amount,
                                0,
                              ) || 0,
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Expected
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                {upcomingLoading || overdueLoading ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center space-x-4">
                          <Skeleton className="h-10 w-10 rounded-full" />
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-40" />
                            <Skeleton className="h-3 w-32" />
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
                          <TableHead>Client</TableHead>
                          <TableHead>Item</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Due Date</TableHead>
                          <TableHead>Priority</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUpcomingPayments?.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-8">
                              <p className="text-muted-foreground">
                                No upcoming payments found
                              </p>
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredUpcomingPayments?.map((payment) => {
                            const paymentIsOverdue = isOverdue(payment.dueDate);
                            const daysUntilDue = Math.ceil(
                              (new Date(payment.dueDate).getTime() -
                                Date.now()) /
                                (1000 * 60 * 60 * 24),
                            );
                            const daysOverdue = paymentIsOverdue
                              ? Math.ceil(
                                  (Date.now() -
                                    new Date(payment.dueDate).getTime()) /
                                    (1000 * 60 * 60 * 24),
                                )
                              : 0;

                            // Priority calculation
                            const getPriority = () => {
                              if (daysOverdue > 0)
                                return {
                                  level: "high",
                                  color: "red",
                                  text: "Critical",
                                };
                              if (daysUntilDue <= 3)
                                return {
                                  level: "medium",
                                  color: "yellow",
                                  text: "Urgent",
                                };
                              if (daysUntilDue <= 7)
                                return {
                                  level: "low",
                                  color: "blue",
                                  text: "Soon",
                                };
                              return {
                                level: "normal",
                                color: "green",
                                text: "Normal",
                              };
                            };

                            const priority = getPriority();

                            return (
                              <TableRow
                                key={payment.installmentId}
                                className={
                                  paymentIsOverdue
                                    ? "bg-red-50 border-l-4 border-l-red-500"
                                    : daysUntilDue <= 3
                                      ? "bg-yellow-50 border-l-4 border-l-yellow-500"
                                      : daysUntilDue <= 7
                                        ? "bg-blue-50 border-l-4 border-l-blue-500"
                                        : ""
                                }
                              >
                                <TableCell>
                                  <div className="flex items-center space-x-2">
                                    <User className="h-4 w-4 text-muted-foreground" />
                                    <div>
                                      <div className="font-medium">
                                        {payment.client.name}
                                      </div>
                                      <div className="text-sm text-muted-foreground">
                                        {payment.client.email}
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        {payment.client.phone}
                                      </div>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center space-x-2">
                                    {getItemIcon(payment.item.brand)}
                                    <div>
                                      <div className="font-medium">
                                        {payment.item.title}
                                      </div>
                                      <div className="text-sm text-muted-foreground">
                                        {payment.item.brand}{" "}
                                        {payment.item.model}
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        Vendor: {payment.item.vendor.name}
                                      </div>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="font-medium text-lg">
                                    {formatCurrency(payment.amount)}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    List:{" "}
                                    {formatCurrency(
                                      payment.item.maxSalesPrice ?? 0,
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center space-x-2">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    <div>
                                      <div
                                        className={`text-sm font-medium ${
                                          paymentIsOverdue
                                            ? "text-red-600"
                                            : daysUntilDue <= 3
                                              ? "text-yellow-600"
                                              : daysUntilDue <= 7
                                                ? "text-blue-600"
                                                : ""
                                        }`}
                                      >
                                        {formatDate(payment.dueDate)}
                                      </div>
                                      {paymentIsOverdue ? (
                                        <div className="text-xs text-red-600 font-medium">
                                          {daysOverdue} days overdue
                                        </div>
                                      ) : (
                                        <div className="text-xs text-muted-foreground">
                                          {daysUntilDue === 0
                                            ? "Due today"
                                            : `${daysUntilDue} days left`}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={
                                      priority.level === "high"
                                        ? "destructive"
                                        : priority.level === "medium"
                                          ? "secondary"
                                          : "outline"
                                    }
                                    className={
                                      priority.color === "red"
                                        ? "bg-red-100 text-red-800 border-red-200"
                                        : priority.color === "yellow"
                                          ? "bg-yellow-100 text-yellow-800 border-yellow-200"
                                          : priority.color === "blue"
                                            ? "bg-blue-100 text-blue-800 border-blue-200"
                                            : "bg-green-100 text-green-800 border-green-200"
                                    }
                                  >
                                    {priority.color === "red" && (
                                      <AlertTriangle className="h-3 w-3 mr-1" />
                                    )}
                                    {priority.color === "yellow" && (
                                      <Clock className="h-3 w-3 mr-1" />
                                    )}
                                    {priority.color === "blue" && (
                                      <Calendar className="h-3 w-3 mr-1" />
                                    )}
                                    {priority.color === "green" && (
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                    )}
                                    {priority.text}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {getStatusBadge(
                                    paymentIsOverdue
                                      ? "overdue"
                                      : payment.status,
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center space-x-2">
                                    <Link
                                      href={`/clients/${payment.client.clientId}`}
                                    >
                                      <Button variant="ghost" size="sm">
                                        <Eye className="h-4 w-4" />
                                      </Button>
                                    </Link>
                                    {paymentIsOverdue && (
                                      <>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() =>
                                            markPaidMutation.mutate(
                                              payment.installmentId,
                                            )
                                          }
                                          disabled={markPaidMutation.isPending}
                                        >
                                          <CheckCircle className="h-4 w-4 mr-1" />
                                          Mark Paid
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() =>
                                            sendReminderMutation.mutate(
                                              payment.installmentId,
                                            )
                                          }
                                          disabled={
                                            sendReminderMutation.isPending
                                          }
                                        >
                                          <Mail className="h-4 w-4 mr-1" />
                                          Remind
                                        </Button>
                                      </>
                                    )}
                                    {!paymentIsOverdue &&
                                      payment.status === "pending" && (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() =>
                                            markPaidMutation.mutate(
                                              payment.installmentId,
                                            )
                                          }
                                          disabled={markPaidMutation.isPending}
                                        >
                                          <CheckCircle className="h-4 w-4 mr-1" />
                                          Mark Paid
                                        </Button>
                                      )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })
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
    </MainLayout>
  );
}
