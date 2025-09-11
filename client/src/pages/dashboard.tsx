import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DollarSign,
  Package,
  Users,
  TrendingUp,
  ArrowUp,
  Plus,
  CreditCard,
  Handshake,
  AlertTriangle,
  Watch,
  Gem,
  Crown,
  Eye,
  ChevronLeft,
  ChevronRight,
  User,
  Calendar,
} from "lucide-react";
import { MainLayout } from "@/components/layout/main-layout";
import { useState } from "react";
import { useLocation } from "wouter";

interface DashboardMetrics {
  totalRevenue: number;
  activeItems: number;
  pendingPayouts: number;
  netProfit: number;
}

interface Item {
  itemId: string;
  title: string;
  brand: string;
  model: string;
  listPrice: string;
  status: string;
  createdAt: string;
  vendor: {
    name: string;
    email: string;
  };
}

interface TopPerformingItem extends Item {
  profit: number;
}

interface RecentPayment {
  paymentId: string;
  amount: number;
  paymentMethod: string;
  paidAt: string;
  client: {
    name: string;
    email: string;
  };
  item: {
    title: string;
    brand: string;
    model: string;
    vendor: {
      name: string;
    };
  };
}

interface PaymentMetrics {
  totalPaymentsReceived: number;
  totalPaymentsAmount: number;
  overduePayments: number;
  upcomingPayments: number;
  averagePaymentAmount: number;
  monthlyPaymentTrend: number;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "1 day ago";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30)
    return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) !== 1 ? "s" : ""} ago`;
  return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) !== 1 ? "s" : ""} ago`;
}

function getStatusBadge(status: string) {
  const statusConfig = {
    "in-store": { label: "In Store", className: "status-in-store" },
    reserved: { label: "Reserved", className: "status-reserved" },
    sold: { label: "Sold", className: "status-sold" },
    returned: { label: "Returned", className: "status-returned" },
  };

  const config =
    statusConfig[status as keyof typeof statusConfig] ||
    statusConfig["in-store"];

  return (
    <Badge variant="outline" className={`status-badge ${config.className}`}>
      {config.label}
    </Badge>
  );
}

function getItemIcon(brand: string) {
  const brandIcons = {
    Rolex: Watch,
    Hermès: Gem,
    Cartier: Crown,
    "Louis Vuitton": Gem,
    Chanel: Gem,
  };

  const IconComponent = brandIcons[brand as keyof typeof brandIcons] || Watch;
  return IconComponent;
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [paymentsPage, setPaymentsPage] = useState(1);
  const paymentsPerPage = 5;

  const { data: metrics, isLoading: metricsLoading } =
    useQuery<DashboardMetrics>({
      queryKey: ["/api/dashboard/metrics"],
    });

  const { data: recentItems, isLoading: itemsLoading } = useQuery<Item[]>({
    queryKey: ["/api/dashboard/recent-items"],
  });

  const { data: topPerforming, isLoading: performingLoading } = useQuery<
    TopPerformingItem[]
  >({
    queryKey: ["/api/dashboard/top-performing"],
  });

  const { data: recentPayments, isLoading: paymentsLoading } = useQuery<
    RecentPayment[]
  >({
    queryKey: ["/api/payments/recent"],
  });

  const { data: paymentMetrics, isLoading: paymentMetricsLoading } =
    useQuery<PaymentMetrics>({
      queryKey: ["/api/payments/metrics"],
    });

  // Pagination logic for items
  const totalPages = Math.ceil((recentItems?.length || 0) / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = recentItems?.slice(startIndex, endIndex) || [];

  // Pagination logic for payments
  const totalPaymentPages = Math.ceil(
    (recentPayments?.length || 0) / paymentsPerPage,
  );
  const paymentsStartIndex = (paymentsPage - 1) * paymentsPerPage;
  const paymentsEndIndex = paymentsStartIndex + paymentsPerPage;
  const currentPayments =
    recentPayments?.slice(paymentsStartIndex, paymentsEndIndex) || [];

  const handleQuickAction = (action: string) => {
    switch (action) {
      case "add-item":
        setLocation("/inventory");
        break;
      case "record-payment":
        setLocation("/payments");
        break;
      case "process-payout":
        setLocation("/payouts");
        break;
      case "add-vendor":
        setLocation("/vendors");
        break;
    }
  };

  return (
    <MainLayout
      title="Dashboard"
      subtitle="Welcome back, here's what's happening today!"
    >
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="hover-lift">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Revenue
                </p>
                {metricsLoading ? (
                  <Skeleton className="h-8 w-24 mt-2" />
                ) : (
                  <p className="text-2xl font-bold text-foreground">
                    {formatCurrency(metrics?.totalRevenue || 0)}
                  </p>
                )}
                <p className="text-sm text-emerald-600 mt-1 flex items-center">
                  <ArrowUp className="h-3 w-3 mr-1" />
                  +12.5% from last month
                </p>
              </div>
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900 rounded-lg flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Active Items
                </p>
                {metricsLoading ? (
                  <Skeleton className="h-8 w-16 mt-2" />
                ) : (
                  <p className="text-2xl font-bold text-foreground">
                    {metrics?.activeItems || 0}
                  </p>
                )}
                <p className="text-sm text-blue-600 mt-1 flex items-center">
                  <Plus className="h-3 w-3 mr-1" />
                  23 new this week
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Pending Payouts
                </p>
                {metricsLoading ? (
                  <Skeleton className="h-8 w-24 mt-2" />
                ) : (
                  <p className="text-2xl font-bold text-foreground">
                    {formatCurrency(metrics?.pendingPayouts || 0)}
                  </p>
                )}
                <p className="text-sm text-amber-600 mt-1 flex items-center">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  15 vendors waiting
                </p>
              </div>
              <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Net Profit
                </p>
                {metricsLoading ? (
                  <Skeleton className="h-8 w-24 mt-2" />
                ) : (
                  <p className="text-2xl font-bold text-foreground">
                    {formatCurrency(metrics?.netProfit || 0)}
                  </p>
                )}
                <p className="text-sm text-emerald-600 mt-1 flex items-center">
                  <ArrowUp className="h-3 w-3 mr-1" />
                  35.5% margin
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Tables Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Revenue Chart Placeholder */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Revenue Overview</CardTitle>
              <select className="text-sm border border-input rounded-lg px-3 py-2 bg-background">
                <option>Last 30 days</option>
                <option>Last 90 days</option>
                <option>Last 12 months</option>
              </select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-muted rounded-lg flex items-center justify-center">
              <div className="text-center">
                <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">
                  Revenue chart will be implemented here
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button
                className="w-full"
                size="lg"
                onClick={() => handleQuickAction("add-item")}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add New Item
              </Button>

              <Button
                className="w-full"
                variant="outline"
                size="lg"
                onClick={() => handleQuickAction("record-payment")}
              >
                <CreditCard className="mr-2 h-4 w-4" />
                Record Payment
              </Button>

              <Button
                className="w-full"
                variant="outline"
                size="lg"
                onClick={() => handleQuickAction("process-payout")}
              >
                <DollarSign className="mr-2 h-4 w-4" />
                Process Payout
              </Button>

              <Button
                className="w-full"
                variant="outline"
                size="lg"
                onClick={() => handleQuickAction("add-vendor")}
              >
                <Handshake className="mr-2 h-4 w-4" />
                Add Vendor
              </Button>
            </div>

            {/* Attention Required */}
            {paymentMetrics &&
              (paymentMetrics.overduePayments > 0 ||
                paymentMetrics.upcomingPayments > 0) && (
                <div className="mt-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <h4 className="font-medium text-destructive">
                      Attention Required
                    </h4>
                  </div>
                  <div className="space-y-1 text-sm text-destructive/80">
                    {paymentMetrics.overduePayments > 0 && (
                      <p>{paymentMetrics.overduePayments} overdue payments</p>
                    )}
                    {paymentMetrics.upcomingPayments > 0 && (
                      <p>{paymentMetrics.upcomingPayments} upcoming payments</p>
                    )}
                    {metrics && metrics.pendingPayouts > 0 && (
                      <p>
                        Pending payouts:{" "}
                        {formatCurrency(metrics.pendingPayouts)}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="link"
                    className="mt-2 p-0 h-auto text-destructive"
                    onClick={() => handleQuickAction("record-payment")}
                  >
                    Review payments →
                  </Button>
                </div>
              )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8"></div>
    </MainLayout>
  );
}
