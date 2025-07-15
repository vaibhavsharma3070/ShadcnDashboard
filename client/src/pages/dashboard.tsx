import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

  const { data: paymentMetrics, isLoading: paymentMetricsLoading } = useQuery<
    PaymentMetrics
  >({
    queryKey: ["/api/payments/metrics"],
  });

  // Pagination logic for items
  const totalPages = Math.ceil((recentItems?.length || 0) / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = recentItems?.slice(startIndex, endIndex) || [];

  // Pagination logic for payments
  const totalPaymentPages = Math.ceil((recentPayments?.length || 0) / paymentsPerPage);
  const paymentsStartIndex = (paymentsPage - 1) * paymentsPerPage;
  const paymentsEndIndex = paymentsStartIndex + paymentsPerPage;
  const currentPayments = recentPayments?.slice(paymentsStartIndex, paymentsEndIndex) || [];

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

        {/* Top Performing Items */}
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {performingLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center space-x-4 p-3">
                    <Skeleton className="w-12 h-12 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <div className="text-right space-y-2">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-3 w-12" />
                    </div>
                  </div>
                ))
              ) : topPerforming && topPerforming.length > 0 ? (
                topPerforming.map((item) => {
                  const IconComponent = getItemIcon(item.brand);
                  return (
                    <div
                      key={item.itemId}
                      className="flex items-center space-x-4 p-3 hover:bg-accent rounded-lg"
                    >
                      <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                        <IconComponent className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-foreground">
                          {item.title}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {item.brand} • {item.model}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-foreground">
                          {formatCurrency(item.profit)}
                        </p>
                        <p className="text-sm text-emerald-600">+15.2%</p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    No performance data available
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Payments */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Payments</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => handleQuickAction("record-payment")}>
                View all
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {paymentsLoading ? (
                Array.from({ length: paymentsPerPage }).map((_, i) => (
                  <div key={i} className="flex items-center space-x-4 p-3 border border-border rounded-lg">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))
              ) : currentPayments && currentPayments.length > 0 ? (
                currentPayments.map((payment) => (
                  <div key={payment.paymentId} className="flex items-center space-x-4 p-3 border border-border rounded-lg hover:bg-accent">
                    <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                      <CreditCard className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{payment.client.name}</span>
                        <span className="text-sm text-muted-foreground">•</span>
                        <span className="text-sm text-muted-foreground">{payment.item.title}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {payment.paymentMethod} • {formatDate(payment.paidAt)}
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
                  <p className="text-muted-foreground">No recent payments</p>
                </div>
              )}
            </div>

            {/* Payments Pagination Controls */}
            {recentPayments && recentPayments.length > paymentsPerPage && (
              <div className="flex items-center justify-between pt-4 border-t border-border">
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <span>Showing {paymentsStartIndex + 1} to {Math.min(paymentsEndIndex, recentPayments.length)} of {recentPayments.length} payments</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPaymentsPage(Math.max(1, paymentsPage - 1))}
                    disabled={paymentsPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: totalPaymentPages }, (_, i) => i + 1).map((page) => (
                      <Button
                        key={page}
                        variant={paymentsPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPaymentsPage(page)}
                        className="w-8 h-8"
                      >
                        {page}
                      </Button>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPaymentsPage(Math.min(totalPaymentPages, paymentsPage + 1))}
                    disabled={paymentsPage === totalPaymentPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button className="w-full" size="lg" onClick={() => handleQuickAction("add-item")}>
                <Plus className="mr-2 h-4 w-4" />
                Add New Item
              </Button>

              <Button className="w-full" variant="outline" size="lg" onClick={() => handleQuickAction("record-payment")}>
                <CreditCard className="mr-2 h-4 w-4" />
                Record Payment
              </Button>

              <Button className="w-full" variant="outline" size="lg" onClick={() => handleQuickAction("process-payout")}>
                <DollarSign className="mr-2 h-4 w-4" />
                Process Payout
              </Button>

              <Button className="w-full" variant="outline" size="lg" onClick={() => handleQuickAction("add-vendor")}>
                <Handshake className="mr-2 h-4 w-4" />
                Add Vendor
              </Button>
            </div>

            {/* Attention Required */}
            {paymentMetrics && (paymentMetrics.overduePayments > 0 || paymentMetrics.upcomingPayments > 0) && (
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
                    <p>Pending payouts: {formatCurrency(metrics.pendingPayouts)}</p>
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

      {/* Recent Items Table */}
      <Card className="mt-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Items</CardTitle>
            <div className="flex items-center space-x-3">
              <select className="text-sm border border-input rounded-lg px-3 py-2 bg-background">
                <option>All Status</option>
                <option>In Store</option>
                <option>Reserved</option>
                <option>Sold</option>
              </select>
              <Select value={itemsPerPage.toString()} onValueChange={(value) => {
                setItemsPerPage(parseInt(value));
                setCurrentPage(1);
              }}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="ghost" size="sm" onClick={() => setLocation('/inventory')}>
                View all inventory
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-6 text-sm font-medium text-muted-foreground">
                    Item
                  </th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-muted-foreground">
                    Vendor
                  </th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-muted-foreground">
                    List Price
                  </th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-muted-foreground">
                    Added
                  </th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {itemsLoading ? (
                  Array.from({ length: itemsPerPage }).map((_, i) => (
                    <tr key={i} className="border-b border-border">
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-3">
                          <Skeleton className="w-10 h-10 rounded-lg" />
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-24" />
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-3 w-32" />
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <Skeleton className="h-4 w-16" />
                      </td>
                      <td className="py-4 px-6">
                        <Skeleton className="h-6 w-20 rounded-full" />
                      </td>
                      <td className="py-4 px-6">
                        <Skeleton className="h-4 w-16" />
                      </td>
                      <td className="py-4 px-6">
                        <Skeleton className="h-8 w-16" />
                      </td>
                    </tr>
                  ))
                ) : currentItems && currentItems.length > 0 ? (
                  currentItems.map((item) => {
                    const IconComponent = getItemIcon(item.brand);
                    return (
                      <tr
                        key={item.itemId}
                        className="border-b border-border hover:bg-accent"
                      >
                        <td className="py-4 px-6">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                              <IconComponent className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="font-medium text-foreground">
                                {item.title}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Model: {item.model}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <p className="text-sm font-medium text-foreground">
                            {item.vendor.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.vendor.email}
                          </p>
                        </td>
                        <td className="py-4 px-6">
                          <p className="font-semibold text-foreground">
                            {formatCurrency(Number(item.listPrice))}
                          </p>
                        </td>
                        <td className="py-4 px-6">
                          {getStatusBadge(item.status)}
                        </td>
                        <td className="py-4 px-6">
                          <p className="text-sm text-muted-foreground">
                            {formatDate(item.createdAt)}
                          </p>
                        </td>
                        <td className="py-4 px-6">
                          <Button variant="ghost" size="sm" onClick={() => setLocation(`/item/${item.itemId}`)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-8 text-center text-muted-foreground"
                    >
                      No items found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Controls */}
          {recentItems && recentItems.length > 0 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-border">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <span>Showing {startIndex + 1} to {Math.min(endIndex, recentItems.length)} of {recentItems.length} items</span>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <div className="flex items-center space-x-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className="w-8 h-8"
                    >
                      {page}
                    </Button>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </MainLayout>
  );
}
